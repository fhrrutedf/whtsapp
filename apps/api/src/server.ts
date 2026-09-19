import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import multer from 'multer';
import crypto from 'crypto';
import { MetaWebhookController } from './controllers/metaWebhook.controller';
import { verifyMetaSignature, RequestWithRawBody } from './middleware/metaSignature.middleware';
import { ComplianceService } from './services/compliance.service';
import { initializeSocketGateway, getSocketGateway } from './sockets/socketGateway';
import { startMetaWebhookWorker } from './workers/metaWebhook.worker';
import { startOutgoingWhatsAppWorker } from './workers/outgoingQueue.worker';
import { startKbSyncWorker } from './workers/kbSync.worker';
import { startWhatsAppSession, getActiveSession, whatsAppManager } from './services/whatsapp.service';
import { localStore } from './services/store.service';
import { GeminiService } from './services/gemini.service';
import { KnowledgeService } from './services/knowledge.service';
import { FileIngestionService } from './services/fileIngestion.service';
import { WebCrawlerService } from './services/webCrawler.service';
import { TenantService } from './services/tenant.service';
import { BillingService } from './services/billing.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { startCampaignWorker } from './workers/campaign.worker';
import { startSlaMonitor } from './services/sla.monitor';
import { startFollowUpWorker } from './services/followup.worker';
import { CampaignController } from './controllers/campaign.controller';
import { BusinessHoursController } from './controllers/businessHours.controller';
import { GdprController } from './controllers/gdpr.controller';
import { skillRegistry } from './skills/registry';
import { prisma } from '@omni/database';
import { AuthService } from './services/auth.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';

// Enable CORS
app.use(
  cors({
    origin: [DASHBOARD_URL, 'http://localhost:3000'],
    credentials: true,
  })
);

// Serve downloaded media files (audio voice notes, images, videos)
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/media', express.static(UPLOADS_DIR));


// CRITICAL FOR META HMAC: Capture raw buffer before JSON parsing
app.use(
  express.json({
    verify: (req: RequestWithRawBody, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

// ==========================================
// Authentication Routes (Zero-Config JWT + Scrypt)
// ==========================================
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل إنشاء الحساب' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const result = await AuthService.login(req.body);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'بيانات الدخول غير صحيحة' });
  }
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'غير مصرح بالدخول' });
    }
    const token = authHeader.split(' ')[1];
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'الجلسة منتهية، يرجى تسجيل الدخول مجدداً' });
    }
    const user = await AuthService.getMe(payload.userId);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    res.status(200).json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Meta Webhook Verification (Challenge Handshake)
app.get('/webhooks/meta', MetaWebhookController.verifyWebhook);

// Meta Webhook Ingestion (Signature Check -> Immediate 200 OK -> BullMQ Push)
app.post(
  '/webhooks/meta',
  verifyMetaSignature,
  MetaWebhookController.handleIncoming
);

// REST endpoint to query 24-hour compliance for active UI
app.get('/api/conversations/:conversationId/compliance', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default-tenant';
    const conversationId = String(req.params.conversationId);

    const compliance = await ComplianceService.checkConversationWindow(tenantId, conversationId);
    res.status(200).json(compliance);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// REST: List conversations for a tenant (Persistent with localStore fallback)
app.get('/api/conversations', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  try {
    const dbConversations = await prisma.conversation.findMany({
      where: { tenantId },
      include: {
        contact: true,
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    if (dbConversations && dbConversations.length > 0) {
      return res.status(200).json(dbConversations);
    }
  } catch (err: any) {
    console.warn('[REST] Prisma conversation lookup note, using local store:', err.message);
  }

  // Local persistent storage
  const stored = localStore.getConversations(tenantId);
  const formatted = stored.map((c) => ({
    id: c.id,
    tenantId: c.tenantId,
    channel: c.channel,
    externalThreadId: c.contactPhone,
    contactId: c.contactId,
    contact: {
      id: c.contactId,
      name: c.contactName,
      phoneNumber: c.contactPhone,
    },
    contactName: c.contactName,
    contactPhone: c.contactPhone,
    lastMessageSnippet: c.lastMessageSnippet,
    unreadCount: c.unreadCount,
    lastActivityAt: c.lastActivityAt,
    updatedAt: c.lastActivityAt,
  }));
  res.status(200).json(formatted);
});

// REST: Get full messages history for a conversation
app.get('/api/conversations/:id/messages', async (req: Request, res: Response) => {
  const conversationId = String(req.params.id);
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';

  try {
    const dbMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    if (dbMessages && dbMessages.length > 0) {
      return res.status(200).json(dbMessages);
    }
  } catch {}

  const storedMessages = localStore.getMessages(conversationId);
  res.status(200).json(storedMessages);
});

// REST: Upload and send media (image/document) in a conversation
app.post('/api/conversations/:id/media', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const conversationId = String(req.params.id);
    const caption = (req.body.caption as string) || '';

    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم إرفاق أي ملف' });
    }

    const tenantUploadDir = path.resolve(__dirname, '../uploads', tenantId);
    if (!fs.existsSync(tenantUploadDir)) {
      fs.mkdirSync(tenantUploadDir, { recursive: true });
    }

    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
    const filePath = path.join(tenantUploadDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const mediaUrl = `${apiBaseUrl}/media/${tenantId}/${filename}`;

    // Extract target phone from conversation
    let targetPhone = '';
    const conv = localStore.getConversations(tenantId).find((c) => c.id === conversationId);
    if (conv?.contactPhone) {
      targetPhone = conv.contactPhone;
    } else {
      const match = conversationId.replace(/^[^_]*_/, '');
      if (match && /^\d+$/.test(match)) targetPhone = match;
    }

    let messageId: string | null = null;
    if (targetPhone) {
      messageId = await whatsAppManager.sendMediaMessage(
        tenantId,
        targetPhone,
        mediaUrl,
        'image',
        caption
      );
    } else {
      // Local fallback for web/demo conversation
      const sentId = `media_${Date.now()}`;
      const messageRecord = {
        id: sentId,
        tenantId,
        conversationId,
        senderType: 'AGENT' as const,
        senderId: 'agent',
        senderName: 'You (Agent)',
        content: caption || '[صورة]',
        mediaUrl,
        mediaType: 'image' as const,
        deliveryStatus: 'SENT' as const,
        createdAt: new Date().toISOString(),
      };
      localStore.saveMessage(messageRecord);
      const io = getSocketGateway();
      if (io) {
        io.to(`tenant:${tenantId}`).emit('message:new', {
          message: { ...messageRecord, isTemplate: false, templateName: null, metaMessageId: sentId },
        });
      }
      messageId = sentId;
    }

    res.status(200).json({
      success: true,
      mediaUrl,
      messageId,
      filename,
    });
  } catch (err: any) {
    console.error('[REST] Error uploading conversation media:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// REST: List all contacts
app.get('/api/contacts', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const contacts = localStore.getContacts(tenantId);
  res.status(200).json(contacts);
});

// REST: CRM Leads — full contact intelligence table
app.get('/api/leads', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  try {
    // Fetch from Supabase (has the new CRM columns)
    const dbContacts = await prisma.contact.findMany({
      where: { tenantId },
      orderBy: [
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        email: true,
        notes: true,
        memoryFacts: true,
        isOptedOut: true,
        lastSeenAt: true,
        createdAt: true,
        customAttributes: true,
      },
    });

    // Merge with localStore for CRM fields (stored via updateContactLeadScore)
    const localContacts = localStore.getContacts(tenantId);
    const localByPhone = new Map(localContacts.map((c) => [c.phoneNumber, c]));

    const leads = dbContacts.map((db) => {
      const local = db.phoneNumber ? localByPhone.get(db.phoneNumber) : null;
      const custom = (db.customAttributes as Record<string, any>) || {};

      // CRM fields live in customAttributes until Prisma client regenerates
      return {
        id: db.id,
        name: db.name || local?.name,
        whatsappPushName: local?.whatsappPushName || custom.whatsapp_push_name,
        phoneNumber: db.phoneNumber,
        email: db.email,
        notes: db.notes,
        memoryFacts: db.memoryFacts || local?.memoryFacts || [],
        isOptedOut: db.isOptedOut,
        lastSeenAt: db.lastSeenAt?.toISOString() || local?.lastSeenAt,
        firstContactAt: db.createdAt?.toISOString(),
        // CRM intelligence — from customAttributes (written by LeadScoringService)
        countryCode: custom.country_code || local?.whatsappPushName?.startsWith('+') ? undefined : undefined,
        countryName: custom.country_name,
        interestLevel: custom.interest_level || 'UNKNOWN',
        interestScore: custom.interest_score ?? 0,
        interestNotes: custom.interest_notes,
        lastInterestUpdatedAt: custom.last_interest_updated_at,
        paidAt: custom.paid_at,
        courseDeliveredAt: custom.course_delivered_at,
        leadSource: custom.lead_source,
      };
    });

    // Sort by interest score descending
    leads.sort((a, b) => (b.interestScore ?? 0) - (a.interestScore ?? 0));

    res.json(leads);
  } catch (err: any) {
    // Fallback to localStore if DB fails
    const localContacts = localStore.getContacts(tenantId);
    res.json(localContacts.map((c) => ({
      id: c.id,
      name: c.name !== c.phoneNumber ? c.name : undefined,
      whatsappPushName: c.whatsappPushName,
      phoneNumber: c.phoneNumber,
      notes: c.notes,
      memoryFacts: c.memoryFacts || [],
      isOptedOut: c.isOptedOut,
      lastSeenAt: c.lastSeenAt,
      interestLevel: 'UNKNOWN',
      interestScore: 0,
    })));
  }
});

// REST: Get Settings (Gemini config & AI agent settings)
app.get('/api/settings', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  let dbSettings: any = null;
  try {
    const [config, tenant] = await Promise.all([
      prisma.aIAgentConfig.findFirst({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
      }),
    ]);

    if (config) {
      dbSettings = {
        aiProvider: config.provider?.toLowerCase() === 'openrouter' ? 'openrouter' : 'gemini',
        geminiModel: config.modelName || 'gemini-2.5-flash',
        openrouterModel: config.modelName || 'google/gemini-2.5-flash',
        geminiSystemPrompt: config.systemPrompt,
        geminiAutoReplyEnabled: config.isActive,
        dialect: config.dialect,
        tone: config.tone,
        customDialectPrompt: config.customDialectPrompt || '',
        autoReplyDelaySeconds: config.autoReplyDelaySeconds,
        interMessageDelaySeconds: config.interMessageDelaySeconds,
        sendReadReceipts: config.sendReadReceipts,
        excludedPhoneNumbers: config.excludedPhoneNumbers || [],
        escalationEnabled: config.escalationEnabled,
        escalationRules: config.escalationRules || '',
        escalationPreActions: config.escalationPreActions || '',
        handoffKeywords: config.handoffKeywords || [],
        handoffMaxTurns: config.handoffMaxTurns,
        handoffStopNotification: config.handoffStopNotification || '',
        safetyGuardrails: config.safetyGuardrails || '',
        errorRecovery: config.errorRecovery || '',
        userMemoryEnabled: config.userMemoryEnabled,
        userMemoryPrompt: config.userMemoryPrompt || '',
      };
    }

    if (tenant) {
      dbSettings = {
        ...(dbSettings || {}),
        companyName: tenant.name,
        brandingLogo: tenant.brandingLogo || '',
        timezone: (tenant as any).timezone || 'Asia/Riyadh',
        currency: (tenant as any).currency || 'SAR',
        supportEmail: (tenant as any).supportEmail || '',
      };
    }
  } catch (err: any) {
    console.warn('[REST Settings GET] Prisma lookup note, using local store:', err.message);
  }

  const local = localStore.getSettings(tenantId);
  const merged = { ...local, ...(dbSettings || {}) };
  res.status(200).json(merged);
});

// ==========================================
// Media Catalog & Visual Assets Endpoints
// ==========================================
app.get('/api/settings/media', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const settings = localStore.getSettings(tenantId);
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000';

  res.status(200).json({
    brochureImageUrl: settings.brochureImageUrl || `${apiBaseUrl}/media/brochures/omni_packages.png`,
    paymentQrImageUrl: settings.paymentQrImageUrl || `${apiBaseUrl}/media/payments/payment_qr.png`,
    catalogImageUrl: settings.catalogImageUrl || `${apiBaseUrl}/media/brochures/omni_packages.png`,
    products: settings.products || [],
  });
});

app.post('/api/settings/media/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const category = (req.body.category as string) || 'product';

    if (!req.file) {
      return res.status(400).json({ error: 'يرجى اختيار صورة للرفع' });
    }

    const tenantUploadDir = path.resolve(__dirname, '../uploads', tenantId, 'catalog');
    if (!fs.existsSync(tenantUploadDir)) {
      fs.mkdirSync(tenantUploadDir, { recursive: true });
    }

    const ext = path.extname(req.file.originalname) || '.png';
    const filename = `${category}_${Date.now()}${ext}`;
    const filePath = path.join(tenantUploadDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const mediaUrl = `${apiBaseUrl}/media/${tenantId}/catalog/${filename}`;

    const currentSettings = localStore.getSettings(tenantId);

    if (category === 'brochure' || category === 'packages') {
      localStore.updateSettings(tenantId, { brochureImageUrl: mediaUrl });
    } else if (category === 'payment_qr') {
      localStore.updateSettings(tenantId, { paymentQrImageUrl: mediaUrl });
    } else if (category === 'catalog') {
      localStore.updateSettings(tenantId, { catalogImageUrl: mediaUrl });
    } else {
      // Add product item
      const productItem = {
        id: `prod_${Date.now()}`,
        name: req.body.name || 'منتج جديد',
        price: req.body.price || '',
        description: req.body.description || '',
        imageUrl: mediaUrl,
        createdAt: new Date().toISOString(),
      };
      const existingProducts = currentSettings.products || [];
      localStore.updateSettings(tenantId, {
        products: [productItem, ...existingProducts],
      });
    }

    const updated = localStore.getSettings(tenantId);

    // Sync to Supabase PostgreSQL
    try {
      const resolvedTenantId = await TenantService.resolveTenantId(tenantId);
      if (category === 'brochure' || category === 'packages') {
        await prisma.$executeRawUnsafe(
          `UPDATE "tenants" SET "brochure_image_url" = $1 WHERE "id" = $2::uuid`,
          mediaUrl,
          resolvedTenantId
        );
      } else if (category === 'payment_qr') {
        await prisma.$executeRawUnsafe(
          `UPDATE "tenants" SET "payment_qr_image_url" = $1 WHERE "id" = $2::uuid`,
          mediaUrl,
          resolvedTenantId
        );
      } else if (category === 'catalog') {
        await prisma.$executeRawUnsafe(
          `UPDATE "tenants" SET "catalog_image_url" = $1 WHERE "id" = $2::uuid`,
          mediaUrl,
          resolvedTenantId
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "tenants" SET "products" = $1::jsonb WHERE "id" = $2::uuid`,
          JSON.stringify(updated.products || []),
          resolvedTenantId
        );
      }
    } catch (dbErr: any) {
      console.warn('[REST Media Upload] DB Sync warning:', dbErr.message);
    }

    res.status(200).json({
      success: true,
      mediaUrl,
      settings: updated,
    });
  } catch (err: any) {
    console.error('[REST Media Upload] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/settings/media/products/:productId', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const productId = String(req.params.productId);
    const settings = localStore.getSettings(tenantId);
    const updatedProducts = (settings.products || []).filter((p) => p.id !== productId);
    localStore.updateSettings(tenantId, { products: updatedProducts });

    // Sync to Supabase PostgreSQL
    try {
      const resolvedTenantId = await TenantService.resolveTenantId(tenantId);
      await prisma.$executeRawUnsafe(
        `UPDATE "tenants" SET "products" = $1::jsonb WHERE "id" = $2::uuid`,
        JSON.stringify(updatedProducts),
        resolvedTenantId
      );
    } catch (dbErr: any) {
      console.warn('[REST Media Delete] DB Sync warning:', dbErr.message);
    }

    res.status(200).json({ success: true, products: updatedProducts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// REST: Update Settings (Gemini config & AI agent settings)
const handleUpdateSettings = async (req: Request, res: Response) => {
  const rawTenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const updated = localStore.updateSettings(rawTenantId, req.body);

  // Sync to Prisma (Supabase)
  try {
    const tenantId = await TenantService.resolveTenantId(rawTenantId);
    if (rawTenantId !== tenantId) {
      localStore.updateSettings(tenantId, req.body);
    }
    const provider = req.body.aiProvider === 'openrouter' ? 'OPENROUTER' : 'GEMINI';
    const modelName = req.body.aiProvider === 'openrouter' ? req.body.openrouterModel : (req.body.geminiModel || 'gemini-3.6-flash');

    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {
        ...(req.body.companyName ? { name: req.body.companyName } : {}),
        ...(req.body.brandingLogo !== undefined ? { brandingLogo: req.body.brandingLogo } : {}),
        ...(req.body.timezone ? { timezone: req.body.timezone } : {}),
        ...(req.body.currency ? { currency: req.body.currency } : {}),
        ...(req.body.supportEmail !== undefined ? { supportEmail: req.body.supportEmail } : {}),
      } as any,
      create: {
        id: tenantId,
        name: req.body.companyName || rawTenantId,
        brandingLogo: req.body.brandingLogo || null,
        timezone: req.body.timezone || 'Asia/Riyadh',
        currency: req.body.currency || 'SAR',
        supportEmail: req.body.supportEmail || null,
      } as any,
    });

    await prisma.aIAgentConfig.upsert({
      where: { tenantId_provider: { tenantId, provider } },
      create: {
        tenantId,
        provider,
        modelName: modelName || 'gemini-3.6-flash',
        systemPrompt: req.body.geminiSystemPrompt || '',
        isActive: req.body.geminiAutoReplyEnabled !== false,
        dialect: req.body.dialect || 'syrian',
        tone: req.body.tone || 'friendly',
        customDialectPrompt: req.body.customDialectPrompt || null,
        autoReplyDelaySeconds: req.body.autoReplyDelaySeconds !== undefined ? req.body.autoReplyDelaySeconds : 30,
        interMessageDelaySeconds: req.body.interMessageDelaySeconds !== undefined ? req.body.interMessageDelaySeconds : 15,
        sendReadReceipts: req.body.sendReadReceipts === true,
        excludedPhoneNumbers: req.body.excludedPhoneNumbers || [],
        escalationEnabled: req.body.escalationEnabled !== false,
        escalationRules: req.body.escalationRules || null,
        escalationPreActions: req.body.escalationPreActions || null,
        handoffKeywords: req.body.handoffKeywords || [],
        handoffMaxTurns: req.body.handoffMaxTurns !== undefined ? req.body.handoffMaxTurns : 5,
        handoffStopNotification: req.body.handoffStopNotification || null,
        safetyGuardrails: req.body.safetyGuardrails || null,
        errorRecovery: req.body.errorRecovery || null,
        userMemoryEnabled: req.body.userMemoryEnabled !== false,
        userMemoryPrompt: req.body.userMemoryPrompt || null,
      },
      update: {
        modelName: modelName || 'gemini-3.6-flash',
        systemPrompt: req.body.geminiSystemPrompt || '',
        isActive: req.body.geminiAutoReplyEnabled !== false,
        dialect: req.body.dialect || 'syrian',
        tone: req.body.tone || 'friendly',
        customDialectPrompt: req.body.customDialectPrompt || null,
        autoReplyDelaySeconds: req.body.autoReplyDelaySeconds !== undefined ? req.body.autoReplyDelaySeconds : 30,
        interMessageDelaySeconds: req.body.interMessageDelaySeconds !== undefined ? req.body.interMessageDelaySeconds : 15,
        sendReadReceipts: req.body.sendReadReceipts === true,
        excludedPhoneNumbers: req.body.excludedPhoneNumbers || [],
        escalationEnabled: req.body.escalationEnabled !== false,
        escalationRules: req.body.escalationRules || null,
        escalationPreActions: req.body.escalationPreActions || null,
        handoffKeywords: req.body.handoffKeywords || [],
        handoffMaxTurns: req.body.handoffMaxTurns !== undefined ? req.body.handoffMaxTurns : 5,
        handoffStopNotification: req.body.handoffStopNotification || null,
        safetyGuardrails: req.body.safetyGuardrails || null,
        errorRecovery: req.body.errorRecovery || null,
        userMemoryEnabled: req.body.userMemoryEnabled !== false,
        userMemoryPrompt: req.body.userMemoryPrompt || null,
      },
    });
    console.log(`[REST Settings POST] 🚀 Synced AI agent settings to Prisma/Supabase for ${tenantId}`);
  } catch (err: any) {
    console.warn('[REST Settings POST] Prisma sync note:', err.message);
  }

  res.status(200).json(updated);
};

app.post('/api/settings', handleUpdateSettings);
app.put('/api/settings', handleUpdateSettings);

// REST: Universal Test AI Provider & Agent Endpoint Connection
app.post('/api/settings/ai/test', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, baseUrl, model } = req.body;
    const result = await GeminiService.testAiConnection({ provider, apiKey, baseUrl, model });
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// REST: Pause AI Auto-Reply for a conversation
app.post('/api/conversations/:id/pause-ai', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const convId = String(req.params.id);
  localStore.pauseConversationAutoReply(tenantId, convId);
  res.status(200).json({ paused: true, conversationId: convId });
});

// REST: Resume AI Auto-Reply for a conversation
app.post('/api/conversations/:id/resume-ai', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const convId = String(req.params.id);
  localStore.resumeConversationAutoReply(tenantId, convId);
  res.status(200).json({ paused: false, conversationId: convId });
});

// REST: Generate Gemini AI Smart Reply
app.post('/api/ai/suggest', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const { conversationId, instruction } = req.body;

    const messages = localStore.getMessages(conversationId);
    let mediaBase64: string | undefined;
    let mediaMimeType: string | undefined;

    // Check if the latest message from customer has an audio or image file
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.mediaUrl && (lastMsg.mediaType === 'audio' || lastMsg.mediaType === 'image')) {
      try {
        const urlParts = lastMsg.mediaUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = path.resolve(__dirname, '../uploads', tenantId, fileName);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          mediaBase64 = fileBuffer.toString('base64');
          mediaMimeType = lastMsg.mediaType === 'audio' ? 'audio/ogg' : 'image/jpeg';
          console.log(`[REST Suggest] 🎙️ Attached multimodal media: ${fileName} (${lastMsg.mediaType})`);
        }
      } catch (err: any) {
        console.warn('[REST Suggest] Could not attach media file:', err.message);
      }
    }

    const contactPhone = req.body.contactPhone || (req.body.conversationId ? req.body.conversationId.replace('conv_', '') : undefined);
    const rawSuggestion = await GeminiService.generateSmartReply(
      tenantId,
      messages,
      instruction,
      mediaBase64,
      mediaMimeType,
      contactPhone
    );
    const suggestion = GeminiService.cleanTextForHumanWhatsApp(rawSuggestion);
    res.status(200).json({ suggestion });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Contact Persistent Memory REST endpoints (Supabase + LocalStore)
// ─────────────────────────────────────────────────────────────

// GET /api/contacts/:phone/memory
app.get('/api/contacts/:phone/memory', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const phone = req.params.phone as string;

  try {
    const dbContact = await prisma.contact.findFirst({
      where: {
        tenantId,
        phoneNumber: phone,
      },
    });
    if (dbContact) {
      return res.status(200).json({
        phoneNumber: dbContact.phoneNumber,
        name: dbContact.name,
        notes: dbContact.notes || '',
        memoryFacts: dbContact.memoryFacts || [],
      });
    }
  } catch (err: any) {
    console.warn('[Contact Memory GET] Prisma note:', err.message);
  }

  const contact = localStore.getContactByPhone(tenantId, phone) || localStore.upsertContact(tenantId, phone);
  res.status(200).json({
    phoneNumber: contact.phoneNumber,
    name: contact.name,
    notes: contact.notes || '',
    memoryFacts: contact.memoryFacts || [],
  });
});

// POST /api/contacts/:phone/memory
app.post('/api/contacts/:phone/memory', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const phone = req.params.phone as string;
  const { name, notes, memoryFacts } = req.body;
  const updated = localStore.updateContactMemory(tenantId, phone, { name, notes, memoryFacts });

  // Sync to Prisma (Supabase)
  try {
    await prisma.contact.upsert({
      where: { tenantId_phoneNumber: { tenantId, phoneNumber: phone } },
      create: {
        tenantId,
        phoneNumber: phone,
        name: name || phone,
        notes: notes || null,
        memoryFacts: Array.isArray(memoryFacts) ? memoryFacts : [],
      },
      update: {
        name: name || undefined,
        notes: notes !== undefined ? notes : undefined,
        memoryFacts: Array.isArray(memoryFacts) ? memoryFacts : undefined,
      },
    });
    console.log(`[Contact Memory POST] 🧠 Synced durable memory to Prisma/Supabase for ${phone}`);
  } catch (err: any) {
    console.warn('[Contact Memory POST] Prisma sync note:', err.message);
  }

  res.status(200).json(updated);
});

// POST /api/contacts/:phone/memory/add-fact
app.post('/api/contacts/:phone/memory/add-fact', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const phone = req.params.phone as string;
  const { fact } = req.body;
  if (!fact || !fact.trim()) {
    return res.status(400).json({ error: 'نص الحقيقة مطلوب' });
  }
  const updated = localStore.addContactMemoryFact(tenantId, phone, fact);

  // Sync to Prisma (Supabase)
  try {
    const contact = await prisma.contact.findFirst({
      where: { tenantId, phoneNumber: phone },
    });
    if (contact) {
      const currentFacts = contact.memoryFacts || [];
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          memoryFacts: [...currentFacts, fact.trim()],
        },
      });
    }
  } catch (err: any) {
    console.warn('[Add Fact POST] Prisma sync note:', err.message);
  }

  res.status(200).json(updated);
});

// DELETE /api/contacts/:phone/memory/:index
app.delete('/api/contacts/:phone/memory/:index', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const phone = req.params.phone as string;
  const index = parseInt(req.params.index as string, 10);
  const contact = localStore.getContactByPhone(tenantId, phone);
  if (!contact || !contact.memoryFacts || isNaN(index) || index < 0 || index >= contact.memoryFacts.length) {
    return res.status(404).json({ error: 'الحقيقة غير موجودة' });
  }
  contact.memoryFacts.splice(index, 1);
  localStore.updateContactMemory(tenantId, phone, { memoryFacts: contact.memoryFacts });

  // Sync to Prisma (Supabase)
  try {
    const dbContact = await prisma.contact.findFirst({
      where: { tenantId, phoneNumber: phone },
    });
    if (dbContact && dbContact.memoryFacts) {
      const updatedList = [...dbContact.memoryFacts];
      if (index >= 0 && index < updatedList.length) {
        updatedList.splice(index, 1);
        await prisma.contact.update({
          where: { id: dbContact.id },
          data: { memoryFacts: updatedList },
        });
      }
    }
  } catch (err: any) {
    console.warn('[Delete Fact] Prisma sync note:', err.message);
  }

  res.status(200).json(contact);
});

// ─────────────────────────────────────────────────────────────
// Teams Endpoint (for Smart Human Handoff routing)
// ─────────────────────────────────────────────────────────────
app.get('/api/teams', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  try {
    const teams = await prisma.team.findMany({
      where: { tenantId },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
    if (teams && teams.length > 0) {
      return res.status(200).json(teams);
    }
  } catch (err: any) {
    console.warn('[Teams GET] Prisma note:', err.message);
  }

  // Fallback default teams
  const defaultTeams = [
    { id: 'bbbbbbbb-0000-0000-0000-000000000001', name: 'دعم فني', description: 'حل المشاكل التقنية والشكاوى' },
    { id: 'bbbbbbbb-0000-0000-0000-000000000002', name: 'المبيعات', description: 'طلبات الشراء والأسعار والاشتراكات' },
    { id: 'bbbbbbbb-0000-0000-0000-000000000003', name: 'الفوترة', description: 'الدفع والتحويلات المالية والفواتير' },
  ];
  res.status(200).json(defaultTeams);
});

// ─────────────────────────────────────────────────────────────
// Feature 4: Durable Contact Memory REST Endpoints (GET & PUT)
// ─────────────────────────────────────────────────────────────
app.get('/api/contacts/:id/memory', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const idOrPhone = req.params.id as string;

  try {
    const dbContact = await prisma.contact.findFirst({
      where: {
        tenantId,
        OR: [
          { id: idOrPhone },
          { phoneNumber: idOrPhone },
        ],
      },
    });

    if (dbContact) {
      const customAttrs = (dbContact.customAttributes as Record<string, any>) || {};
      return res.status(200).json({
        id: dbContact.id,
        phoneNumber: dbContact.phoneNumber,
        name: dbContact.name,
        notes: dbContact.notes || '',
        memoryFacts: dbContact.memoryFacts || [],
        aiMemory: customAttrs.ai_memory || dbContact.memoryFacts || [],
        customAttributes: customAttrs,
      });
    }
  } catch (err: any) {
    console.warn('[Contact Memory GET :id] Prisma note:', err.message);
  }

  // Fallback to localStore
  const local = localStore.getContactByPhone(tenantId, idOrPhone) || {
    id: idOrPhone,
    phoneNumber: idOrPhone,
    name: idOrPhone,
    notes: '',
    memoryFacts: [],
    customAttributes: {},
  };

  const custom = (local.customAttributes as Record<string, any>) || {};
  res.status(200).json({
    id: local.id,
    phoneNumber: local.phoneNumber,
    name: local.name,
    notes: local.notes || '',
    memoryFacts: local.memoryFacts || [],
    aiMemory: custom.ai_memory || local.memoryFacts || [],
    customAttributes: custom,
  });
});

app.put('/api/contacts/:id/memory', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const idOrPhone = req.params.id as string;
  const { notes, memoryFacts, aiMemory, customAttributes } = req.body;

  const factsToSave = Array.isArray(memoryFacts) ? memoryFacts : Array.isArray(aiMemory) ? aiMemory : [];

  // Update localStore
  const updatedLocal = localStore.updateContactMemory(tenantId, idOrPhone, {
    notes,
    memoryFacts: factsToSave,
    customAttributes: {
      ...(customAttributes || {}),
      ai_memory: factsToSave,
    },
  });

  // Sync to Prisma (Supabase)
  try {
    const existing = await prisma.contact.findFirst({
      where: {
        tenantId,
        OR: [{ id: idOrPhone }, { phoneNumber: idOrPhone }],
      },
    });

    if (existing) {
      const prevAttrs = (existing.customAttributes as Record<string, any>) || {};
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          notes: notes !== undefined ? notes : undefined,
          memoryFacts: factsToSave,
          customAttributes: {
            ...prevAttrs,
            ...(customAttributes || {}),
            ai_memory: factsToSave,
          },
        },
      });
    } else {
      await prisma.contact.upsert({
        where: { tenantId_phoneNumber: { tenantId, phoneNumber: idOrPhone } },
        create: {
          tenantId,
          phoneNumber: idOrPhone,
          name: idOrPhone,
          notes: notes || null,
          memoryFacts: factsToSave,
          customAttributes: { ai_memory: factsToSave },
        },
        update: {
          notes: notes !== undefined ? notes : undefined,
          memoryFacts: factsToSave,
          customAttributes: { ai_memory: factsToSave },
        },
      });
    }
  } catch (err: any) {
    console.warn('[Contact Memory PUT] Prisma note:', err.message);
  }

  res.status(200).json({
    success: true,
    contact: updatedLocal,
    memoryFacts: factsToSave,
    notes: notes !== undefined ? notes : updatedLocal?.notes,
  });
});

// ─────────────────────────────────────────────────────────────
// Feature 1: Knowledge Base Sandbox (Playground) REST Endpoint
// ─────────────────────────────────────────────────────────────
app.post('/api/ai/sandbox/chat', async (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const { message, history, systemPromptOverride } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'نص الرسالة مطلوب للاختبار' });
  }

  try {
    const formattedHistory: any[] = (history || []).map((h: any) => ({
      senderType: h.role === 'user' ? 'CUSTOMER' : 'AGENT',
      senderName: h.role === 'user' ? 'Tester' : 'AI Assistant',
      content: h.content,
    }));

    // Append current message
    formattedHistory.push({
      senderType: 'CUSTOMER',
      senderName: 'Tester',
      content: message.trim(),
    });

    const result = await GeminiService.testSandboxChat(
      tenantId,
      formattedHistory,
      systemPromptOverride
    );

    res.status(200).json(result);
  } catch (err: any) {
    console.error('[AI Sandbox Error]:', err.message);
    res.status(500).json({ error: err.message || 'حدث خطأ أثناء اختبار الذكاء الاصطناعي' });
  }
});

// ─────────────────────────────────────────────────────────────
// Knowledge Base (Botpress-like) REST endpoints (Supabase + LocalStore)
// ─────────────────────────────────────────────────────────────

// GET /api/knowledge  →  Get all knowledge items
app.get('/api/knowledge', async (req: Request, res: Response) => {
  const rawTenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  try {
    const tenantId = await TenantService.resolveTenantId(rawTenantId);
    const dbItems = await prisma.knowledgeItem.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (dbItems && dbItems.length > 0) {
      return res.status(200).json(dbItems);
    }
  } catch (err: any) {
    console.warn('[Knowledge GET] Prisma note:', err.message);
  }

  let items = localStore.getKnowledgeItems(rawTenantId);
  if ((!items || items.length === 0) && rawTenantId !== 'demo-tenant-1') {
    items = localStore.getKnowledgeItems('demo-tenant-1');
  }
  res.status(200).json(items || []);
});

// POST /api/knowledge/text  →  Add custom text or FAQ
app.post('/api/knowledge/text', async (req: Request, res: Response) => {
  try {
    const rawTenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const tenantId = await TenantService.resolveTenantId(rawTenantId);
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'العنوان والمحتوى مطلوبان' });
    }
    const item = localStore.addKnowledgeItem(rawTenantId, {
      title: String(title).trim(),
      type: 'text',
      content: String(content).trim(),
    });
    if (rawTenantId !== tenantId) {
      localStore.addKnowledgeItem(tenantId, {
        title: String(title).trim(),
        type: 'text',
        content: String(content).trim(),
      });
    }

    // Sync to Prisma (Supabase)
    try {
      await prisma.knowledgeItem.create({
        data: {
          id: item.id,
          tenantId,
          title: item.title,
          type: 'text',
          content: item.content,
          charCount: item.charCount,
        },
      });
      console.log(`[Knowledge Text POST] 📚 Synced knowledge item to Prisma/Supabase: ${item.title}`);
    } catch (err: any) {
      console.warn('[Knowledge Text POST] Prisma sync note:', err.message);
    }

    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/knowledge/url  →  Advanced Web Crawler (supports crawl_depth & sync_frequency)
app.post('/api/knowledge/url', async (req: Request, res: Response) => {
  try {
    const rawTenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const { url, title, crawl_depth, sync_frequency } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'رابط الموقع الإلكتروني مطلوب' });
    }

    const crawlDepth = Number(crawl_depth) || 1;
    const syncFreq = ['NEVER', 'DAILY', 'WEEKLY'].includes(sync_frequency) ? sync_frequency : 'NEVER';

    const result = await WebCrawlerService.crawlAndIngest({
      tenantId: rawTenantId,
      url: String(url).trim(),
      type: url.includes('.xml') ? 'SITEMAP' : 'URL',
      title: title ? String(title).trim() : undefined,
      crawlDepth,
      syncFrequency: syncFreq,
    });

    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Knowledge URL Error]', err.message);
    res.status(500).json({ error: `فشل جلب وزحف محتوى الرابط: ${err.message}` });
  }
});

// POST /api/knowledge/upload  →  Universal File Ingestion (PDF, DOCX, CSV, TXT)
app.post('/api/knowledge/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const rawTenantId =
      (req.headers['x-tenant-id'] as string) || (req.body.tenantId as string) || 'demo-tenant-1';
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'لم يتم إرسال أي ملف عبر النموذج (file field is required)' });
    }

    const result = await FileIngestionService.processAndSaveFile({
      tenantId: rawTenantId,
      buffer: file.buffer,
      filename: Buffer.from(file.originalname, 'latin1').toString('utf8'), // handle utf-8 names cleanly
      mimeType: file.mimetype,
    });

    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Knowledge Upload Error]', err.message);
    res.status(500).json({ error: `فشل استيعاب ومعالجة الملف: ${err.message}` });
  }
});

// POST /api/knowledge-base/learn  →  Human-in-the-Loop (Self-Learning from Agents)
app.post('/api/knowledge-base/learn', async (req: Request, res: Response) => {
  try {
    const rawTenantId = (req.headers['x-tenant-id'] as string) || req.body.tenantId || 'demo-tenant-1';
    const tenantId = await TenantService.resolveTenantId(rawTenantId);
    const { user_question, agent_answer } = req.body;

    if (!user_question || !agent_answer) {
      return res.status(400).json({
        error: 'سؤال المستخدم وإجابة الموظف مطلوبان (user_question and agent_answer are required)',
      });
    }

    const trainingString = `Q: ${String(user_question).trim()}\nA: ${String(agent_answer).trim()}`;
    const title = `تصحيح بشري: ${String(user_question).slice(0, 45)}...`;

    // 1. Create KnowledgeBaseSource with type AGENT_CORRECTION
    const source = await prisma.knowledgeBaseSource.create({
      data: {
        tenantId,
        title,
        type: 'AGENT_CORRECTION',
        contentHash: crypto.createHash('sha256').update(trainingString).digest('hex'),
        syncFrequency: 'NEVER',
        crawlDepth: 1,
        lastSyncedAt: new Date(),
      },
    });

    // 2. Generate embedding and insert KnowledgeChunk with weight 2.0 (highest semantic weight)
    const embedding = await FileIngestionService.generateEmbedding(trainingString);
    if (embedding) {
      const vectorStr = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "knowledge_chunks" ("id", "tenant_id", "source_id", "content", "metadata", "embedding", "weight", "created_at")
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::jsonb, $5::vector, 2.0, CURRENT_TIMESTAMP)`,
        tenantId,
        source.id,
        trainingString,
        JSON.stringify({ user_question, agent_answer, isCorrection: true }),
        vectorStr
      );
    } else {
      await prisma.knowledgeChunk.create({
        data: {
          tenantId,
          sourceId: source.id,
          content: trainingString,
          weight: 2.0,
          metadata: { user_question, agent_answer, isCorrection: true },
        },
      });
    }

    // 3. Mirror to localStore & KnowledgeItem for immediate prompt availability
    localStore.addKnowledgeItem(rawTenantId, {
      title,
      type: 'text',
      content: trainingString,
      source: 'AGENT_CORRECTION',
      charCount: trainingString.length,
    });
    if (rawTenantId !== tenantId) {
      localStore.addKnowledgeItem(tenantId, {
        title,
        type: 'text',
        content: trainingString,
        source: 'AGENT_CORRECTION',
        charCount: trainingString.length,
      });
    }

    await prisma.knowledgeItem.create({
      data: {
        tenantId,
        title,
        type: 'text',
        content: trainingString,
        source: 'AGENT_CORRECTION',
        charCount: trainingString.length,
      },
    }).catch((e: any) => console.warn('[Knowledge Learn] KnowledgeItem mirror note:', e.message));

    console.log(`[Knowledge Learn] 🧠 Self-learning Q&A pair saved with 2.0 weight for tenant ${tenantId}`);

    return res.status(201).json({
      success: true,
      message: 'تم حفظ التدريب والتصحيح بنجاح في قاعدة المعرفة الموجهة (Highest Semantic Weight: 2.0)',
      sourceId: source.id,
      trainingString,
      weight: 2.0,
    });
  } catch (err: any) {
    console.error('[Knowledge Learn Error]', err.message);
    return res.status(500).json({ error: `فشل حفظ التدريب: ${err.message}` });
  }
});

// POST /api/knowledge/file  →  Add document/file text content
app.post('/api/knowledge/file', async (req: Request, res: Response) => {
  try {
    const rawTenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const tenantId = await TenantService.resolveTenantId(rawTenantId);
    const { title, fileName, content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'محتوى الملف مطلوب' });
    }
    const item = localStore.addKnowledgeItem(rawTenantId, {
      title: title ? String(title).trim() : fileName || 'مستند بدون عنوان',
      type: 'file',
      source: fileName,
      content: String(content).trim().slice(0, 30000),
    });
    if (rawTenantId !== tenantId) {
      localStore.addKnowledgeItem(tenantId, {
        title: title ? String(title).trim() : fileName || 'مستند بدون عنوان',
        type: 'file',
        source: fileName,
        content: String(content).trim().slice(0, 30000),
      });
    }

    // Sync to Prisma (Supabase)
    try {
      await prisma.knowledgeItem.create({
        data: {
          id: item.id,
          tenantId,
          title: item.title,
          type: 'file',
          source: item.source || null,
          content: item.content,
          charCount: item.charCount,
        },
      });
      console.log(`[Knowledge File POST] 📚 Synced File knowledge to Prisma/Supabase: ${item.title}`);
    } catch (err: any) {
      console.warn('[Knowledge File POST] Prisma sync note:', err.message);
    }

    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/knowledge/:id  →  Delete knowledge item
app.delete('/api/knowledge/:id', async (req: Request, res: Response) => {
  const rawTenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
  const id = String(req.params.id);
  const success = localStore.deleteKnowledgeItem(rawTenantId, id);

  // Sync to Prisma (Supabase)
  try {
    const tenantId = await TenantService.resolveTenantId(rawTenantId);
    localStore.deleteKnowledgeItem(tenantId, id);
    await prisma.knowledgeItem.deleteMany({
      where: { id, tenantId },
    });
    await prisma.knowledgeBaseSource.deleteMany({
      where: { id, tenantId },
    });
  } catch (err: any) {
    console.warn('[Knowledge DELETE] Prisma sync note:', err.message);
  }

  res.status(200).json({ success, id });
});


// ─────────────────────────────────────────────────────────────
// WhatsApp (Baileys) REST endpoints
// ─────────────────────────────────────────────────────────────

// POST /api/whatsapp/connect  →  Start a Baileys session (generates QR)
app.post('/api/whatsapp/connect', async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers['x-tenant-id'] as string);
    const channelConfigId = req.body.channelConfigId;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    // Check session already active
    const existing = getActiveSession(tenantId);
    if (existing && existing.user) {
      const phone = existing.user.id?.split(':')[0]?.split('@')[0] ?? null;
      return res.status(200).json({ status: 'already_connected', tenantId, phone });
    }

    // Start session async — QR will be emitted via Socket.io to tenant room
    whatsAppManager.initSession(tenantId, channelConfigId).catch((err) => {
      console.error(`[WhatsApp] Failed to start session for ${tenantId}:`, err.message);
    });

    res.status(202).json({
      status: 'connecting',
      message: 'QR Code will be emitted via Socket.io on event whatsapp:qr',
      tenantId,
      channelConfigId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/disconnect  →  Disconnect and clear session
app.post('/api/whatsapp/disconnect', async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers['x-tenant-id'] as string);
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    await whatsAppManager.disconnectSession(tenantId);
    res.status(200).json({ status: 'disconnected', tenantId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/status  →  Check active sessions
app.get('/api/whatsapp/status', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string);
  const session = tenantId ? getActiveSession(tenantId) : null;
  const isConnected = !!(session && session.user);
  res.json({
    tenantId,
    connected: isConnected,
    phone: session?.user?.id?.split(':')[0]?.split('@')[0] ?? null,
  });
});


// GET /api/analytics  →  Aggregated SaaS, AI, and response metrics
app.get('/api/analytics', AnalyticsController.getAnalytics);

// GET /api/billing/summary  →  Tenant token balance and subscription overview
app.get('/api/billing/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string) || 'demo-tenant-1';
    const summary = await BillingService.getTenantBillingSummary(tenantId);
    res.json({ success: true, ...summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/recharge  →  Add/refill tokens for tenant
app.post('/api/billing/recharge', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || req.body.tenantId || 'demo-tenant-1';
    const { amount, description } = req.body;
    const tokens = Number(amount);
    if (!tokens || tokens <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number of tokens' });
    }

    const result = await BillingService.rechargeTokens(tenantId, tokens, description);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ENTERPRISE MODULES: CAMPAIGNS, BUSINESS HOURS, GDPR, SLA
// ─────────────────────────────────────────────────────────────

// WhatsApp Drip Campaigns (Anti-Ban Broadcasts)
app.post('/api/campaigns', CampaignController.createCampaign);
app.post('/api/campaigns/:id/start', CampaignController.startCampaign);
app.get('/api/campaigns', CampaignController.getCampaigns);
app.get('/api/campaigns/:id', CampaignController.getCampaignById);
app.post('/api/campaigns/:id/cancel', CampaignController.cancelCampaign);

// Business Hours Routing & Management
app.get('/api/business-hours', BusinessHoursController.getHours);
app.put('/api/business-hours', BusinessHoursController.updateHours);

// GDPR Compliance (Article 17 & 20)
app.get('/api/contacts/:id/export', GdprController.exportContactData);
app.delete('/api/contacts/:id/forget', GdprController.forgetContact);

// ─────────────────────────────────────────────────────────────
// AGENTIC SKILLS HUB & REVOPS GROWTH MODULES
// ─────────────────────────────────────────────────────────────

// 1. List all available agentic skills and tenant configurations
app.get('/api/skills', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const settings = localStore.getSettings(tenantId);
    const defaultEnabled = [
      'objection_handler',
      'sales_closer',
      'lead_gen_collector',
      'upsell_cross_sell',
      'cart_recovery',
      'churn_risk_detector',
      'meeting_scheduler',
      'customer_success_manager',
      'revenue_operations',
      'sales_engineer',
      'business_growth_router',
    ];
    const enabledSkills = settings.enabledSkills || defaultEnabled;

    const all = skillRegistry.getAll().map((s) => ({
      name: s.name,
      displayName: s.displayName,
      category: s.category,
      description: s.description,
      parameters: s.parameters,
      isEnabled: enabledSkills.includes(s.name),
    }));

    res.json({
      skills: all,
      settings: {
        enabledSkills,
        checkoutBaseUrl: settings.checkoutBaseUrl || 'https://pay.yourdomain.com/checkout',
        meetingSchedulerUrl: settings.meetingSchedulerUrl || 'https://meet.omnidesk.ai/schedule',
        defaultDiscountPercentage: settings.defaultDiscountPercentage || 20,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Update skills configuration & toggles
app.put('/api/skills/settings', (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const { enabledSkills, checkoutBaseUrl, meetingSchedulerUrl, defaultDiscountPercentage } = req.body;

    const updated = localStore.updateSettings(tenantId, {
      enabledSkills,
      checkoutBaseUrl,
      meetingSchedulerUrl,
      defaultDiscountPercentage,
    });
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Customer Success: Health scores & churn telemetry
app.get('/api/growth/health-summary', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const contacts = localStore.getContacts(tenantId);

    const csmSkill = skillRegistry.get('customer_success_manager');
    const summaries = await Promise.all(
      contacts.slice(0, 15).map(async (c) => {
        const result = await csmSkill?.execute(
          {
            tenantId,
            conversationId: `conv_${c.phoneNumber.replace(/\D/g, '')}`,
            contactPhone: c.phoneNumber,
            customerName: c.name,
          },
          { action: 'HEALTH_SCORE', phone: c.phoneNumber }
        );
        return {
          contactId: c.id,
          name: c.name || c.phoneNumber,
          phone: c.phoneNumber,
          healthScore: result?.data?.healthScore || 85,
          churnTier: result?.data?.churnTier || 'LOW',
          isReadyForExpansion: result?.data?.isReadyForExpansion || false,
        };
      })
    );

    const highRiskCount = summaries.filter((s) => s.churnTier === 'CRITICAL' || s.churnTier === 'HIGH').length;
    const expansionReadyCount = summaries.filter((s) => s.isReadyForExpansion).length;
    const avgScore = summaries.length > 0 ? Math.round(summaries.reduce((acc, s) => acc + s.healthScore, 0) / summaries.length) : 84;

    res.json({
      averageHealthScore: avgScore,
      highRiskCount,
      expansionReadyCount,
      customers: summaries,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Revenue Operations: Sales velocity and pipeline metrics
app.get('/api/growth/pipeline-analytics', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'demo-tenant-1';
    const revopsSkill = skillRegistry.get('revenue_operations');
    const result = await revopsSkill?.execute(
      { tenantId, conversationId: 'revops_audit', contactPhone: 'unknown' },
      { action: 'PIPELINE_HEALTH' }
    );
    res.json(result?.data || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize Socket.io (Dashboard /chat & Website /widget)
initializeSocketGateway(server, DASHBOARD_URL);

// Start Baileys WhatsApp Sessions for all active ChannelConfigs
whatsAppManager.initializeAllChannels().catch((err) => {
  console.error('⚠️ [WhatsApp] Failed initializing channels on startup:', err.message);
});

// Start BullMQ Workers & SLA Monitor
try {
  startMetaWebhookWorker();
  startOutgoingWhatsAppWorker();
  startKbSyncWorker();
  startCampaignWorker();
  startSlaMonitor();
  console.log('🚀 BullMQ Workers (Meta, Outgoing, KB Sync, Campaigns) & SLA Monitor initialized');
} catch (err: any) {
  console.warn('⚠️ BullMQ Workers failed to connect to Redis:', err.message);
}

// Start Automated Follow-Up Worker (re-engages inactive leads)
try {
  startFollowUpWorker();
} catch (err: any) {
  console.warn('⚠️ Follow-up worker failed to start:', (err as Error).message);
}

server.listen(PORT, () => {
  console.log(`🚀 Omnichannel API server running on port ${PORT}`);
});

