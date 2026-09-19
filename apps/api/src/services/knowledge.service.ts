import axios from 'axios';
import { localStore, KnowledgeItem } from './store.service';

export class KnowledgeService {
  /**
   * Cleans and strips HTML tags, styles, scripts and redundant whitespace to extract readable text.
   */
  public static extractTextFromHtml(html: string): string {
    if (!html) return '';

    // Remove script and style tags completely
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
    text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
    text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
    text = text.replace(/<!--[\s\S]*?-->/g, ' ');

    // Replace structural block tags with newlines
    text = text.replace(/<(?:br|p|div|h[1-6]|li|tr|table|article|section)\b[^>]*>/gi, '\n');

    // Remove remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode standard HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    // Normalize spacing and newlines
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Limit text to ~20,000 characters to fit easily into context window
    return lines.join('\n').slice(0, 20000);
  }

  /**
   * Fetches a web page by URL, extracts the page title and clean body text.
   */
  public static async fetchAndExtractUrl(url: string): Promise<{ title: string; content: string }> {
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    console.log(`[KnowledgeService] 🌐 Fetching website content from: ${normalizedUrl}`);
    const res = await axios.get(normalizedUrl, {
      timeout: 12000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US,en;q=0.9',
      },
    });

    const html = String(res.data);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : normalizedUrl;
    const content = this.extractTextFromHtml(html);

    if (!content || content.length < 10) {
      throw new Error('لم يتم العثور على محتوى نصي كافٍ في هذا الرابط.');
    }

    return { title: pageTitle, content };
  }

  /**
   * Builds the formatted Knowledge Base context to inject into Gemini's system prompt.
   */
  public static getKnowledgeContext(tenantId: string): string {
    // Gather all knowledge items across tenant IDs and deduplicate by title
    const allCandidates = [
      ...localStore.getKnowledgeItems(tenantId),
      ...localStore.getKnowledgeItems('demo-tenant-1'),
      ...localStore.getKnowledgeItems('8c579042-01a0-4736-87e0-a24e9d4e6c07'),
      ...localStore.getKnowledgeItems('aaaaaaaa-0000-0000-0000-000000000001'),
    ];

    const seenTitles = new Set<string>();
    const items: KnowledgeItem[] = [];
    for (const item of allCandidates) {
      const normalizedTitle = (item.title || '').trim().toLowerCase();
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        items.push(item);
      }
    }

    if (items.length === 0) return '';

    const sections = items.map((item, index) => {
      const typeLabel =
        item.type === 'url' ? 'موقع إلكتروني' : item.type === 'file' ? 'مستند/ملف' : 'نص مخصص/أسئلة وأجوبة';
      return `--- [مصدر ${index + 1}: ${item.title} (${typeLabel})] ---\n${item.content}`;
    });

    return (
      `\n\n══════════════════════════════════════════════════════════════\n` +
      `قاعدة المعرفة الخاصة بالشركة / النشاط التجاري (Knowledge Base):\n` +
      `استخدم المعلومات التالية بدقة للإجابة على العميل. إذا سأل العميل عن أي معلومة موجودة في قاعدة المعرفة (مثل الأسعار، الخدمات، أوقات العمل، الروابط، السياسات، المنتجات)، اعتمد عليها بالكامل وقدم الإجابة بدقة ووضوح:\n\n` +
      sections.join('\n\n') +
      `\n══════════════════════════════════════════════════════════════\n`
    );
  }
}
