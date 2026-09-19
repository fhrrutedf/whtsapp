import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { prisma } from '@omni/database';
import { localStore } from './store.service';
import { FileIngestionService } from './fileIngestion.service';
import { TenantService } from './tenant.service';

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

export interface CrawlResult {
  sourceId: string;
  title: string;
  type: 'URL' | 'SITEMAP';
  totalPages: number;
  totalCharacters: number;
  totalChunks: number;
  contentHash: string;
}

export class WebCrawlerService {
  /**
   * Scrapes single web page with cheerio, stripping boilerplate and extracting internal links
   */
  public static async scrapePage(targetUrl: string): Promise<{
    title: string;
    text: string;
    internalLinks: string[];
  }> {
    try {
      const res = await axios.get(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniBot/2.0 (Helpdesk Crawler)',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
        maxRedirects: 5,
      });

      const html = res.data;
      if (typeof html !== 'string') return { title: targetUrl, text: '', internalLinks: [] };

      const $ = cheerio.load(html);

      // Extract title
      const title = $('title').text().trim() || $('h1').first().text().trim() || targetUrl;

      // Clean unwanted elements
      $('script, style, noscript, iframe, svg, nav, footer, header, form, link, meta').remove();

      // Extract body text
      const bodyText = ($('main').length ? $('main').text() : $('article').length ? $('article').text() : $('body').text())
        .replace(/\s+/g, ' ')
        .trim();

      // Extract internal links
      const currentHost = new URL(targetUrl).hostname;
      const internalLinks: string[] = [];

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const resolved = new URL(href, targetUrl);
          // Only keep HTTP/HTTPS on the same host, ignore fragments and media files
          if (
            (resolved.protocol === 'http:' || resolved.protocol === 'https:') &&
            resolved.hostname === currentHost &&
            !resolved.pathname.match(/\.(png|jpg|jpeg|gif|pdf|zip|css|js|svg|webp)$/i)
          ) {
            resolved.hash = '';
            const normalized = resolved.toString();
            if (!internalLinks.includes(normalized) && normalized !== targetUrl) {
              internalLinks.push(normalized);
            }
          }
        } catch {
          // ignore invalid URLs
        }
      });

      return { title, text: bodyText, internalLinks };
    } catch (err: any) {
      console.warn(`[WebCrawler] Failed to scrape ${targetUrl}:`, err.message);
      return { title: targetUrl, text: '', internalLinks: [] };
    }
  }

  /**
   * Parses XML sitemap to extract page URLs
   */
  public static async parseSitemap(sitemapUrl: string): Promise<string[]> {
    try {
      const res = await axios.get(sitemapUrl, {
        headers: { 'User-Agent': 'OmniBot/2.0' },
        timeout: 15000,
      });

      const xml = res.data;
      if (typeof xml !== 'string') return [];

      const $ = cheerio.load(xml, { xmlMode: true });
      const urls: string[] = [];

      $('url > loc').each((_, el) => {
        const loc = $(el).text().trim();
        if (loc && !urls.includes(loc)) {
          urls.push(loc);
        }
      });

      // Handle sitemap index
      $('sitemap > loc').each((_, el) => {
        const subSitemap = $(el).text().trim();
        if (subSitemap && !urls.includes(subSitemap)) {
          urls.push(subSitemap);
        }
      });

      return urls.slice(0, 30); // Cap to 30 pages for safety
    } catch (err: any) {
      console.warn(`[WebCrawler] Failed to parse sitemap ${sitemapUrl}:`, err.message);
      return [];
    }
  }

  /**
   * Crawls URL or Sitemap respecting crawl_depth
   */
  public static async crawl(
    urlOrSitemap: string,
    isSitemap: boolean,
    crawlDepth: number = 1
  ): Promise<{ pages: CrawledPage[]; primaryTitle: string }> {
    const visited = new Set<string>();
    const pages: CrawledPage[] = [];
    let primaryTitle = urlOrSitemap;

    if (isSitemap) {
      const sitemapUrls = await this.parseSitemap(urlOrSitemap);
      console.log(`[WebCrawler] 🗺️ Found ${sitemapUrls.length} links in sitemap: ${urlOrSitemap}`);

      for (const link of sitemapUrls.slice(0, 15)) {
        if (visited.has(link)) continue;
        visited.add(link);
        const { title, text } = await this.scrapePage(link);
        if (text.length > 50) {
          pages.push({ url: link, title, text });
          if (!primaryTitle || primaryTitle === urlOrSitemap) primaryTitle = title;
        }
      }
    } else {
      // BFS Crawl with depth tracking
      const queue: Array<{ url: string; depth: number }> = [{ url: urlOrSitemap, depth: 1 }];
      visited.add(urlOrSitemap);

      while (queue.length > 0 && pages.length < 20) {
        const current = queue.shift()!;
        const { title, text, internalLinks } = await this.scrapePage(current.url);

        if (text.length > 50) {
          pages.push({ url: current.url, title, text });
          if (current.depth === 1) primaryTitle = title;
        }

        if (current.depth < crawlDepth) {
          for (const nextUrl of internalLinks) {
            if (!visited.has(nextUrl) && visited.size < 25) {
              visited.add(nextUrl);
              queue.push({ url: nextUrl, depth: current.depth + 1 });
            }
          }
        }
      }
    }

    return { pages, primaryTitle };
  }

  /**
   * Full pipeline: Crawls, hashes, chunks, generates embeddings and saves to database
   */
  public static async crawlAndIngest(params: {
    tenantId: string;
    url: string;
    type?: 'URL' | 'SITEMAP';
    title?: string;
    crawlDepth?: number;
    syncFrequency?: 'NEVER' | 'DAILY' | 'WEEKLY';
  }): Promise<CrawlResult> {
    const {
      tenantId: rawTenantId,
      url,
      type = 'URL',
      title: customTitle,
      crawlDepth = 1,
      syncFrequency = 'NEVER',
    } = params;

    const tenantId = await TenantService.resolveTenantId(rawTenantId);

    console.log(`[WebCrawler] 🚀 Ingesting ${type}: ${url} (depth: ${crawlDepth}, sync: ${syncFrequency}, tenant: ${tenantId})`);

    const isSitemap = type === 'SITEMAP' || url.endsWith('.xml') || url.includes('sitemap');
    const { pages, primaryTitle } = await this.crawl(url, isSitemap, crawlDepth);

    const fullTitle = customTitle || primaryTitle || url;
    const combinedContent = pages
      .map((p) => `=== [Page: ${p.title}] (${p.url}) ===\n${p.text}`)
      .join('\n\n');

    const contentHash = crypto.createHash('sha256').update(combinedContent).digest('hex');
    const chunks = FileIngestionService.chunkText(combinedContent);

    // Save or update KnowledgeBaseSource
    const source = await prisma.knowledgeBaseSource.create({
      data: {
        tenantId,
        title: fullTitle,
        type: isSitemap ? 'SITEMAP' : 'URL',
        url,
        contentHash,
        syncFrequency: (syncFrequency as any) || 'NEVER',
        crawlDepth,
        lastSyncedAt: new Date(),
      },
    });

    // Save chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = await FileIngestionService.generateEmbedding(chunkText);

      if (embedding) {
        const vectorStr = `[${embedding.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "knowledge_chunks" ("id", "tenant_id", "source_id", "content", "metadata", "embedding", "weight", "created_at")
           VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::jsonb, $5::vector, 1.0, CURRENT_TIMESTAMP)`,
          tenantId,
          source.id,
          chunkText,
          JSON.stringify({ chunkIndex: i, url, totalChunks: chunks.length }),
          vectorStr
        );
      } else {
        await prisma.knowledgeChunk.create({
          data: {
            tenantId,
            sourceId: source.id,
            content: chunkText,
            weight: 1.0,
            metadata: { chunkIndex: i, url, totalChunks: chunks.length },
          },
        });
      }
    }

    // Mirror to localStore & KnowledgeItem for immediate bot replies
    const targetKey = rawTenantId || 'demo-tenant-1';
    localStore.addKnowledgeItem(targetKey, {
      title: fullTitle,
      type: 'url',
      source: url,
      content: combinedContent,
      charCount: combinedContent.length,
    });
    if (targetKey !== tenantId) {
      localStore.addKnowledgeItem(tenantId, {
        title: fullTitle,
        type: 'url',
        source: url,
        content: combinedContent,
        charCount: combinedContent.length,
      });
    }

    await prisma.knowledgeItem.create({
      data: {
        tenantId,
        title: fullTitle,
        type: 'url',
        source: url,
        content: combinedContent,
        charCount: combinedContent.length,
      },
    }).catch((e: any) => console.warn('[WebCrawler] KnowledgeItem mirror note:', e.message));

    console.log(
      `[WebCrawler] ✅ Successfully ingested ${pages.length} pages (${chunks.length} chunks) for ${url}`
    );

    return {
      sourceId: source.id,
      title: fullTitle,
      type: isSitemap ? 'SITEMAP' : 'URL',
      totalPages: pages.length,
      totalCharacters: combinedContent.length,
      totalChunks: chunks.length,
      contentHash,
    };
  }
}
