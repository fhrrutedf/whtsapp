import { Readable } from 'stream';
import crypto from 'crypto';
import axios from 'axios';
import csvParser from 'csv-parser';
import { prisma } from '@omni/database';
import { localStore } from './store.service';
import { TenantService } from './tenant.service';

export interface IngestionResult {
  sourceId: string;
  title: string;
  totalChunks: number;
  totalCharacters: number;
  type: string;
}

export class FileIngestionService {
  /**
   * Universal text extractor supporting PDF, CSV, TXT, and DOCX
   */
  public static async extractRawText(
    buffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<string> {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // 1. PDF extraction via pdf-parse
    if (mimeType.includes('pdf') || ext === 'pdf') {
      try {
        // Dynamic require to handle ES/CJS differences smoothly
        const pdf = require('pdf-parse');
        const parsed = await pdf(buffer);
        return parsed.text || '';
      } catch (err: any) {
        console.warn(`[FileIngestion] pdf-parse warning: ${err.message}, fallback to text regex extract`);
        return buffer.toString('utf-8').replace(/[^\x20-\x7E\u0600-\u06FF\n\r\t]/g, ' ');
      }
    }

    // 2. CSV parsing via csv-parser
    if (mimeType.includes('csv') || ext === 'csv') {
      return new Promise<string>((resolve, reject) => {
        const rows: string[] = [];
        const stream = Readable.from(buffer);
        stream
          .pipe(csvParser())
          .on('data', (data) => {
            const formattedRow = Object.entries(data)
              .map(([key, val]) => `${key}: ${val}`)
              .join(' | ');
            rows.push(formattedRow);
          })
          .on('end', () => {
            resolve(rows.join('\n'));
          })
          .on('error', (err) => {
            console.warn('[FileIngestion] csv-parser error, fallback to raw lines:', err.message);
            resolve(buffer.toString('utf-8'));
          });
      });
    }

    // 3. DOCX extraction (Word documents)
    if (
      mimeType.includes('wordprocessingml') ||
      mimeType.includes('msword') ||
      ext === 'docx' ||
      ext === 'doc'
    ) {
      try {
        const textContent = buffer.toString('utf-8');
        // Extract XML text tags <w:t>...</w:t>
        const matches = textContent.match(/<w:t[^>]*>(.*?)<\/w:t>/gi);
        if (matches && matches.length > 0) {
          const docText = matches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ');
          if (docText.trim().length > 20) {
            return docText;
          }
        }
      } catch (docErr: any) {
        console.warn('[FileIngestion] Docx quick extract fallback:', docErr.message);
      }
      return buffer.toString('utf-8').replace(/[^\x20-\x7E\u0600-\u06FF\n\r\t]/g, ' ');
    }

    // 4. Default: TXT, Markdown, JSON, and plain text
    return buffer.toString('utf-8');
  }

  /**
   * Splits text into overlapping semantic chunks
   */
  public static chunkText(
    rawText: string,
    chunkSize: number = 700,
    overlap: number = 100
  ): string[] {
    const cleaned = rawText.replace(/\r\n/g, '\n').trim();
    if (!cleaned) return [];
    if (cleaned.length <= chunkSize) return [cleaned];

    const chunks: string[] = [];
    let start = 0;

    while (start < cleaned.length) {
      let end = start + chunkSize;

      // Try to break on newline or sentence boundary
      if (end < cleaned.length) {
        const nextBreak = cleaned.lastIndexOf('\n', end);
        const nextDot = cleaned.lastIndexOf('. ', end);
        const preferredBreak = Math.max(nextBreak, nextDot);

        if (preferredBreak > start + chunkSize / 2) {
          end = preferredBreak + 1;
        }
      }

      const chunk = cleaned.slice(start, end).trim();
      if (chunk.length > 10) {
        chunks.push(chunk);
      }

      start = end - overlap;
      if (start >= cleaned.length - overlap) break;
    }

    return chunks;
  }

  /**
   * Generates text embedding using Google Gemini text-embedding-004 if available
   */
  public static async generateEmbedding(text: string): Promise<number[] | null> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return null;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`;
      const res = await axios.post(
        url,
        {
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text: text.slice(0, 2048) }],
          },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
      );

      const values = res.data?.embedding?.values;
      if (Array.isArray(values)) {
        // Pad or truncate to 1536 if needed to match vector(1536) schema
        if (values.length === 1536) return values;
        if (values.length < 1536) {
          return values.concat(new Array(1536 - values.length).fill(0));
        }
        return values.slice(0, 1536);
      }
    } catch {
      // Graceful fallback if embedding API limit or failure
    }
    return null;
  }

  /**
   * Ingests a file, saves to KnowledgeBaseSource and KnowledgeChunk, and syncs to localStore
   */
  public static async processAndSaveFile(params: {
    tenantId: string;
    buffer: Buffer;
    filename: string;
    mimeType: string;
    fileUrl?: string;
  }): Promise<IngestionResult> {
    const { tenantId: rawTenantId, buffer, filename, mimeType, fileUrl } = params;

    const tenantId = await TenantService.resolveTenantId(rawTenantId);

    const rawText = await this.extractRawText(buffer, mimeType, filename);
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const chunks = this.chunkText(rawText);

    // Save Source Record
    const source = await prisma.knowledgeBaseSource.create({
      data: {
        tenantId,
        title: filename,
        type: 'FILE',
        fileUrl: fileUrl || null,
        mimeType: mimeType || 'application/octet-stream',
        contentHash,
        syncFrequency: 'NEVER',
        crawlDepth: 1,
        lastSyncedAt: new Date(),
      },
    });

    // Save Chunks with optional embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = await this.generateEmbedding(chunkText);

      if (embedding) {
        const vectorStr = `[${embedding.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "knowledge_chunks" ("id", "tenant_id", "source_id", "content", "metadata", "embedding", "weight", "created_at")
           VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::jsonb, $5::vector, 1.0, CURRENT_TIMESTAMP)`,
          tenantId,
          source.id,
          chunkText,
          JSON.stringify({ chunkIndex: i, filename, totalChunks: chunks.length }),
          vectorStr
        );
      } else {
        await prisma.knowledgeChunk.create({
          data: {
            tenantId,
            sourceId: source.id,
            content: chunkText,
            weight: 1.0,
            metadata: { chunkIndex: i, filename, totalChunks: chunks.length },
          },
        });
      }
    }

    // Mirror to localStore and KnowledgeItem for instant bot retrieval
    const targetKey = rawTenantId || 'demo-tenant-1';
    localStore.addKnowledgeItem(targetKey, {
      title: filename,
      type: 'file',
      content: rawText,
      source: fileUrl || filename,
      charCount: rawText.length,
    });
    if (targetKey !== tenantId) {
      localStore.addKnowledgeItem(tenantId, {
        title: filename,
        type: 'file',
        content: rawText,
        source: fileUrl || filename,
        charCount: rawText.length,
      });
    }

    await prisma.knowledgeItem.create({
      data: {
        tenantId,
        title: filename,
        type: 'file',
        content: rawText,
        source: fileUrl || filename,
        charCount: rawText.length,
      },
    }).catch((e: any) => console.warn('[FileIngestion] KnowledgeItem mirror note:', e.message));

    console.log(
      `[FileIngestion] 📄 Successfully processed ${filename}: ${chunks.length} chunks, ${rawText.length} chars.`
    );

    return {
      sourceId: source.id,
      title: filename,
      totalChunks: chunks.length,
      totalCharacters: rawText.length,
      type: 'FILE',
    };
  }
}
