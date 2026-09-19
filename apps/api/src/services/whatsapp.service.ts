import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WAMessage,
  WASocket,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import P from 'pino';
import fs from 'fs';
import path from 'path';
import { prisma, SenderType, MessageStatus } from '@omni/database';
import { ComplianceService } from './compliance.service';
import { getSocketGateway } from '../sockets/socketGateway';
import { 
  getTenantAuthState, 
  clearTenantAuthState, 
  resolvePhoneNumberFromJid, 
  listStoredTenantSessions, 
  hasExistingSession 
} from './whatsapp.session';
import { localStore } from './store.service';
import { GeminiService } from './gemini.service';
import { outgoingWhatsAppQueue, OutgoingWhatsAppJobData } from '../queues/outgoing.queue';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { BusinessHoursService } from './businessHours.service';
import { setConversationSla } from './sla.monitor';

// Suppress verbose Baileys pino logs in development
const logger = P({ level: 'silent' });

/**
 * Multi-Tenant WhatsApp Session Manager
 * Manages concurrent Baileys connections isolated by tenantId (Option A: One session per ChannelConfig).
 */
export class WhatsAppManager {
  // Map of active Baileys sockets: tenantId → WASocket
  private sessions = new Map<string, WASocket>();

  // Map of tenantId → channelConfigId
  private channelMap = new Map<string, string>();

  // Map of reconnection timers per tenant
  private reconnectTimers = new Map<string, NodeJS.Timeout>();

  // Map of tenantId:cleanPhone -> rawJid (supports sending replies back to @lid)
  private jidMap = new Map<string, string>();

  // Map of tenantId -> Daily micro-restart timer (Anti-Ban Stealth)
  private microRestartTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Startup hook: Fetch all active WHATSAPP ChannelConfigs across tenants and initialize connections.
   */
  public async initializeAllChannels(): Promise<void> {
    try {
      console.log('[WhatsAppManager] 🔍 Fetching active WhatsApp channels from ChannelConfig...');
      const channels = await prisma.channelConfig.findMany({
        where: { channel: 'WHATSAPP' },
      });

      console.log(`[WhatsAppManager] Found ${channels.length} WhatsApp channel(s) configured in DB.`);

      for (const channel of channels) {
        console.log(`[WhatsAppManager] 🔌 Initializing session for tenant: ${channel.tenantId} (ChannelConfig: ${channel.id})`);
        this.initSession(channel.tenantId, channel.id).catch((err) => {
          console.error(`[WhatsAppManager] Failed initializing session for tenant ${channel.tenantId}:`, err.message);
        });
      }

      // Also auto-resume any sessions already authenticated on disk
      const storedTenants = listStoredTenantSessions();
      for (const tId of storedTenants) {
        if (!this.sessions.has(tId) && hasExistingSession(tId)) {
          console.log(`[WhatsAppManager] 🔄 Auto-resuming saved disk session for tenant: ${tId}`);
          this.initSession(tId).catch((err) => {
            console.error(`[WhatsAppManager] Failed resuming session for ${tId}:`, err.message);
          });
        }
      }
    } catch (err: any) {
      console.error('[WhatsAppManager] Error initializing channels on startup:', err.message);
    }
  }

  /**
   * Initializes or returns a dedicated Baileys socket for a specific tenant.
   */
  public async initSession(tenantId: string, channelConfigId?: string): Promise<WASocket> {
    // Return existing active socket if already connected
    const existing = this.sessions.get(tenantId);
    if (existing) {
      return existing;
    }

    // Ensure ChannelConfig exists or fallback
    let activeChannelConfigId = channelConfigId;
    if (!activeChannelConfigId) {
      try {
        const channelConfig = await prisma.channelConfig.findFirst({
          where: { tenantId, channel: 'WHATSAPP' },
        });

        if (channelConfig) {
          activeChannelConfigId = channelConfig.id;
        } else {
          const createdConfig = await prisma.channelConfig.create({
            data: {
              tenantId,
              channel: 'WHATSAPP',
              providerName: `whatsapp_${tenantId}`,
              apiKeyEncrypted: 'baileys_local_session',
            },
          });
          activeChannelConfigId = createdConfig.id;
        }
      } catch (dbErr: any) {
        console.warn(`[WhatsAppManager:${tenantId}] DB ChannelConfig lookup note:`, dbErr.message);
        activeChannelConfigId = `channel_${tenantId}`;
      }
    }


    this.channelMap.set(tenantId, activeChannelConfigId);

    // Multi-tenant auth state isolated in apps/api/auth_info/{tenantId}/
    const { state, saveCreds } = await getTenantAuthState(tenantId);
    const { version } = await fetchLatestBaileysVersion();

    // Check for proxy_url in ChannelConfig
    let proxyUrl: string | null = null;
    try {
      const channelConfig = await prisma.channelConfig.findUnique({
        where: { id: activeChannelConfigId },
      });
      proxyUrl = channelConfig?.proxyUrl || process.env.WHATSAPP_PROXY_URL || null;
    } catch (err: any) {
      console.warn(`[WhatsAppManager:${tenantId}] Proxy lookup note:`, err.message);
    }

    let proxyAgent: any = undefined;
    if (proxyUrl) {
      console.log(`[WhatsAppManager:${tenantId}] 🛡️ Anti-Ban: Routing Baileys connection through proxy: ${proxyUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@')}`);
      proxyAgent = new HttpsProxyAgent(proxyUrl);
    }

    const sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      agent: proxyAgent,
      fetchAgent: proxyAgent,
      printQRInTerminal: false,
      browser: ['Omni Helpdesk', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: false,
    });

    this.sessions.set(tenantId, sock);

    // Credentials update (save session to apps/api/auth_info/{tenantId}/)
    sock.ev.on('creds.update', saveCreds);

    // Connection Lifecycle
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Handle QR Code Generation -> Broadcast ONLY to specific tenant room
      if (qr) {
        console.log(`[WhatsAppManager:${tenantId}] 📷 QR Code generated — broadcasting to tenant room`);
        try {
          const qrDataUrl = await QRCode.toDataURL(qr);
          const io = getSocketGateway();
          if (io) {
            io.to(`tenant:${tenantId}`).emit('whatsapp:qr', {
              tenantId,
              channelConfigId: activeChannelConfigId,
              qr,
              qrDataUrl,
            });
          }
        } catch (qrErr: any) {
          console.error(`[WhatsAppManager:${tenantId}] QR generation error:`, qrErr.message);
        }
      }

      // Connection Established
      if (connection === 'open') {
        const phone = sock.user?.id?.split(':')[0]?.split('@')[0] ?? 'unknown';
        console.log(`[WhatsAppManager:${tenantId}] ✅ Connected as +${phone}`);

        // Screen-Off Stealth: Permanently default presence to 'unavailable' right after connecting
        try {
          await sock.sendPresenceUpdate('unavailable');
          console.log(`[WhatsAppManager:${tenantId}] 📴 Screen-off Stealth: Default presence set to 'unavailable'`);
        } catch (err: any) {
          console.warn(`[WhatsAppManager:${tenantId}] Default presence update notice:`, err.message);
        }

        // Daily Micro-Restarts: Schedule graceful socket restart once every 24h (± 1 to 3h jitter)
        this.scheduleDailyMicroRestart(tenantId, sock);

        const io = getSocketGateway();
        if (io) {
          io.to(`tenant:${tenantId}`).emit('whatsapp:connected', {
            tenantId,
            channelConfigId: activeChannelConfigId,
            phone,
          });
        }
      }

      // Connection Closed
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const shouldReconnect = !isLoggedOut;

        // Clear daily micro-restart timer on close
        const restartTimer = this.microRestartTimers.get(tenantId);
        if (restartTimer) {
          clearTimeout(restartTimer);
          this.microRestartTimers.delete(tenantId);
        }

        console.log(
          `[WhatsAppManager:${tenantId}] Connection closed. StatusCode: ${statusCode}. WillReconnect: ${shouldReconnect}`
        );

        this.sessions.delete(tenantId);

        const io = getSocketGateway();
        if (io) {
          io.to(`tenant:${tenantId}`).emit('whatsapp:disconnected', {
            tenantId,
            channelConfigId: activeChannelConfigId,
            reason: String(statusCode),
            willReconnect: shouldReconnect,
          });
        }

        if (isLoggedOut) {
          console.log(`[WhatsAppManager:${tenantId}] Logged out. Clearing credentials for tenant.`);
          await clearTenantAuthState(tenantId);
        } else if (shouldReconnect) {
          const existingTimer = this.reconnectTimers.get(tenantId);
          if (existingTimer) clearTimeout(existingTimer);

          const timer = setTimeout(() => {
            this.reconnectTimers.delete(tenantId);
            console.log(`[WhatsAppManager:${tenantId}] Reconnecting session...`);
            this.initSession(tenantId, activeChannelConfigId).catch((err) => {
              console.error(`[WhatsAppManager:${tenantId}] Reconnection attempt failed:`, err.message);
            });
          }, 3000);

          this.reconnectTimers.set(tenantId, timer);
        }
      }
    });

    // Handle Incoming Messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      console.log(`[WhatsAppManager:${tenantId}] 📥 messages.upsert received ${messages.length} messages (type: ${type})`);
      for (const msg of messages) {
        await this.handleIncomingMessage(tenantId, activeChannelConfigId!, msg, sock);
      }
    });

    return sock;
  }

  /**
   * Process and persist incoming messages per tenant and contact.
   */
  private async handleIncomingMessage(
    tenantId: string,
    channelConfigId: string,
    msg: WAMessage,
    sock: WASocket
  ): Promise<void> {
    try {
      const jid = msg.key.remoteJid ?? '';
      console.log(`[WhatsAppManager:${tenantId}] 📩 Processing message: JID=${jid}, fromMe=${msg.key.fromMe}, id=${msg.key.id}`);

      // Exclude group chats, broadcasts, and newsletters
      if (!jid || jid.includes('@g.us') || jid === 'status@broadcast' || jid.includes('@newsletter')) {
        console.log(`[WhatsAppManager:${tenantId}] ⏩ Skipping non-direct message: ${jid}`);
        return;
      }

      const isFromMe = !!msg.key.fromMe;

      // Resolve true phone number (handles @lid and @s.whatsapp.net)
      const rawPhone = resolvePhoneNumberFromJid(tenantId, jid);
      const cleanPhone = rawPhone.replace(/\D/g, '') || rawPhone;
      const displayPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
      if (!cleanPhone) return;

      // Remember JID mapping so outbound replies route accurately back to LID or JID
      this.jidMap.set(`${tenantId}:${cleanPhone}`, jid);
      this.jidMap.set(`${tenantId}:${displayPhone}`, jid);
      this.jidMap.set(`${tenantId}:${rawPhone}`, jid);

      const msgId = msg.key.id || `wa_${Date.now()}`;
      const messageDate = new Date(
        (Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000
      );

      // Extract media & text content
      let textContent = this.extractTextContent(msg);
      let mediaUrl: string | null = null;
      let mediaType: 'image' | 'audio' | 'video' | 'document' | null = null;
      let mediaBufferForAi: Buffer | null = null;
      let mediaMimeTypeForAi: string | null = null;

      const mediaInfo = this.extractMediaInfo(msg);
      if (mediaInfo) {
        mediaType = mediaInfo.type;
        try {
          console.log(`[WhatsAppManager:${tenantId}] 📥 Downloading ${mediaType} media for message ${msgId}...`);
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
              logger,
              reuploadRequest: sock.updateMediaMessage,
            }
          );

          if (buffer) {
            const uploadDir = path.resolve(__dirname, '../../uploads', tenantId);
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }

            const fileName = `${msgId}.${mediaInfo.ext}`;
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, buffer as Buffer);

            // Store buffer for Gemini Multimodal
            if (mediaType === 'audio') {
              mediaBufferForAi = buffer as Buffer;
              mediaMimeTypeForAi = 'audio/ogg';
            } else if (mediaType === 'image') {
              mediaBufferForAi = buffer as Buffer;
              mediaMimeTypeForAi = 'image/jpeg';
            }

            // API server serves uploads statically at /media
            const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
            mediaUrl = `${apiBaseUrl}/media/${tenantId}/${fileName}`;
            console.log(`[WhatsAppManager:${tenantId}] ✅ Media saved: ${filePath} -> ${mediaUrl} (Multimodal: ${!!mediaBufferForAi})`);
          }
        } catch (mediaErr: any) {
          console.error(`[WhatsAppManager:${tenantId}] ⚠️ Failed to download media:`, mediaErr.message);
        }
      }

      // Friendly fallback label if text content is empty
      if (!textContent) {
        if (mediaType === 'audio') textContent = '🎤 رسالة صوتية (Voice Note)';
        else if (mediaType === 'image') textContent = '📷 صورة (Photo)';
        else if (mediaType === 'video') textContent = '🎥 فيديو (Video)';
        else if (mediaType === 'document') textContent = '📄 مستند (Document)';
      }

      const pushName = msg.pushName || displayPhone;
      let convId = `conv_${cleanPhone}`;
      let contactId = displayPhone;
      let contactName = pushName;

      // Always persist in localStore so conversations and messages never get lost
      const storedContact = localStore.upsertContact(tenantId, displayPhone, pushName);
      localStore.upsertConversation(convId, tenantId, storedContact, textContent || '[Media]', !isFromMe);
      localStore.saveMessage({
        id: msgId,
        tenantId,
        conversationId: convId,
        senderType: isFromMe ? 'AGENT' : 'CUSTOMER',
        senderId: displayPhone,
        senderName: isFromMe ? 'You (Agent)' : pushName,
        content: textContent || '',
        mediaUrl,
        mediaType,
        deliveryStatus: 'DELIVERED',
        createdAt: messageDate.toISOString(),
      });

      // ─────────────────────────────────────────────────────────────
      // Anti-Ban & Compliance: Immediate Auto Opt-Out Check
      // Matches exact text: ["stop", "إلغاء", "توقف"]
      // ─────────────────────────────────────────────────────────────
      const normalizedIncoming = (textContent || '').trim().toLowerCase();
      const isExactOptOut = ['stop', 'إلغاء', 'توقف'].includes(normalizedIncoming);

      if (isExactOptOut && !isFromMe) {
        console.log(`[WhatsAppManager:${tenantId}] ⛔ Auto Opt-Out triggered by ${displayPhone} with keyword "${normalizedIncoming}"`);

        // 1. Immediately update DB setting Contact.is_opted_out = true
        try {
          await prisma.contact.updateMany({
            where: {
              tenantId,
              OR: [
                { phoneNumber: displayPhone },
                { phoneNumber: cleanPhone },
              ],
            },
            data: { isOptedOut: true },
          });
        } catch (dbErr: any) {
          console.warn(`[WhatsAppManager:${tenantId}] Error updating isOptedOut in Prisma:`, dbErr.message);
        }

        // Update localStore
        if (storedContact) {
          storedContact.isOptedOut = true;
        }

        // Pause AI auto-reply for this conversation permanently
        localStore.pauseConversationAutoReply(tenantId, convId);

        // 2. Send final automated reply ("تم إيقاف الرسائل")
        const optOutConfirmation = 'تم إيقاف الرسائل';
        try {
          await this.simulateTypingAndSend(tenantId, displayPhone, optOutConfirmation, {
            conversationId: convId,
            senderType: 'BOT',
            senderId: 'compliance-system',
            senderName: 'النظام',
            bypassOptOutCheck: true,
          });
        } catch (sendErr: any) {
          console.error(`[WhatsAppManager:${tenantId}] Error sending opt-out confirmation:`, sendErr.message);
        }

        // 3. Halt any further processing / AI routing for this user
        return;
      }

      // If user has opted out, halt any further automated replies
      if (storedContact?.isOptedOut) {
        console.log(`[WhatsAppManager:${tenantId}] ⛔ Contact ${displayPhone} is opted out. Dropping automated reply.`);
        return;
      }

      // Gemini AI Auto-Reply with Delay, Blacklist, and Human Handoff Rules
      if (!isFromMe && textContent && !msg.key.fromMe) {
        const settings = localStore.getSettings(tenantId);
        const hasKey = !!(settings.geminiApiKey || process.env.GEMINI_API_KEY);
        const isAutoReplyOn = settings.geminiAutoReplyEnabled !== false;

        // 1. Check Blacklist / Excluded Phone Numbers
        const excludedList = settings.excludedPhoneNumbers || [];
        const isExcluded = excludedList.some((num) => {
          if (!num) return false;
          const cleanTarget = num.replace(/\D/g, '');
          const cleanCurrent = cleanPhone.replace(/\D/g, '');
          return cleanTarget && (cleanCurrent.endsWith(cleanTarget) || cleanTarget.endsWith(cleanCurrent));
        });

        if (isExcluded) {
          console.log(`[WhatsAppManager:${tenantId}] ⛔ Auto-reply skipped for ${displayPhone}: Number is in excluded blacklist.`);
        } else if (settings.pausedConversations?.includes(convId)) {
          console.log(`[WhatsAppManager:${tenantId}] ⏸️ Auto-reply skipped for ${displayPhone}: Conversation is paused for human agent.`);
        } else if (isAutoReplyOn && hasKey) {
          // 2. Check Human Handoff & Escalation Rules
          const isEscalationActive = settings.escalationEnabled !== false;
          const handoffKeywords = settings.handoffKeywords || ['موظف', 'بشري', 'شكوى', 'مدير', 'اتصال', 'تحويل', 'إلغاء'];
          const lowerText = textContent.toLowerCase();

          // Check keyword in general keywords OR team routing rules
          const matchingRouting = settings.handoffTeamRouting?.find(
            (r) => r.keyword && lowerText.includes(r.keyword.trim().toLowerCase())
          );
          const triggersGeneral = handoffKeywords.some((kw) => kw && lowerText.includes(kw.trim().toLowerCase()));
          const triggersHandoff = isEscalationActive && (triggersGeneral || !!matchingRouting);

          if (triggersHandoff) {
            const assignedTeamId = matchingRouting ? matchingRouting.teamId : null;
            const assignedTeamName = matchingRouting ? matchingRouting.teamName : null;
            console.log(`[WhatsAppManager:${tenantId}] 🚨 Human handoff triggered by keyword in: "${textContent}" -> Routed to: ${assignedTeamName || 'General Support'}`);
            localStore.pauseConversationAutoReply(tenantId, convId);

            // Update Conversation assignedTeamId in Prisma
            if (assignedTeamId) {
              prisma.conversation.update({
                where: { id: convId },
                data: { assignedTeamId },
              }).catch((e: any) => console.warn('[Handoff] Error updating assignedTeamId in Prisma:', e.message));
            }

            // Emit Socket.io event for real-time team notification
            const gateway = getSocketGateway();
            if (gateway) {
              const eventPayload = {
                conversationId: convId,
                teamId: assignedTeamId,
                teamName: assignedTeamName,
                keyword: matchingRouting?.keyword || 'general_handoff',
                customerPhone: displayPhone,
                timestamp: new Date().toISOString(),
              };
              gateway.to(`tenant:${tenantId}`).emit('conversation:assigned', eventPayload);
              if (assignedTeamId) {
                gateway.to(`team:${assignedTeamId}`).emit('conversation:assigned', eventPayload);
              }
            }

            setTimeout(async () => {
              try {
                // Business Hours Routing Check
                const isWithinHours = await BusinessHoursService.isWithinBusinessHours(tenantId);
                const handoffMsg = isWithinHours
                  ? (settings.handoffStopNotification ||
                     'تم تحويل محادثتك إلى أحد موظفي خدمة العملاء وسيقوم بالرد عليك مباشرة في أقرب وقت ممكن. شكراً لصبرك!')
                  : (settings.outOfOfficeMessage ||
                     'مرحباً بك! فريق خدمة العملاء غير متواجد حالياً خارج أوقات العمل الرسمية. تم تسجيل استفسارك وسيقوم موظفنا بالتواصل معك في أقرب وقت مع بداية دوام العمل القادم. شكراً لتفهمك!');

                // If within operating hours, arm SLA response timer (15 minutes)
                if (isWithinHours) {
                  setConversationSla(convId, 15).catch(() => {});
                }

                const autoMsgId = await this.sendMessage(tenantId, displayPhone, handoffMsg);
                const replyObj = {
                  id: autoMsgId || `handoff_${Date.now()}`,
                  tenantId,
                  conversationId: convId,
                  senderType: 'AGENT' as const,
                  senderId: 'system-handoff',
                  senderName: isWithinHours ? 'الدعم البشري' : 'الرد الآلي (خارج أوقات العمل)',
                  content: handoffMsg,
                  deliveryStatus: 'SENT' as const,
                  createdAt: new Date().toISOString(),
                };
                localStore.saveMessage(replyObj);
                localStore.upsertConversation(convId, tenantId, storedContact, handoffMsg, false);
                const gw = getSocketGateway();
                if (gw) {
                  gw.to(`tenant:${tenantId}`).emit('message:new', {
                    message: { ...replyObj, isTemplate: false, templateName: null, metaMessageId: autoMsgId },
                  });
                }
              } catch (e: any) {
                console.error('[WhatsAppManager] Failed sending handoff message:', e.message);
              }
            }, 1000);
          } else {
            // 3. Check Max Turns Rule
            const maxTurns = settings.handoffMaxTurns || 0;
            const existingMessages = localStore.getMessages(convId);
            const aiTurnsCount = existingMessages.filter((m) => m.senderId === 'gemini-ai').length;

            if (maxTurns > 0 && aiTurnsCount >= maxTurns) {
              console.log(`[WhatsAppManager:${tenantId}] 🛑 Max AI turns reached (${aiTurnsCount}/${maxTurns}) for ${convId}. Handing off to human.`);
              localStore.pauseConversationAutoReply(tenantId, convId);

              setTimeout(async () => {
                try {
                  const isWithinHours = await BusinessHoursService.isWithinBusinessHours(tenantId);
                  const handoffMsg = isWithinHours
                    ? (settings.handoffStopNotification ||
                       'تم تحويل محادثتك إلى أحد موظفي خدمة العملاء لمتابعة استفسارك بشكل مباشر. شكراً لصبرك!')
                    : (settings.outOfOfficeMessage ||
                       'مرحباً بك! فريق خدمة العملاء غير متواجد حالياً خارج أوقات العمل الرسمية. تم تسجيل استفسارك وسيقوم موظفنا بالتواصل معك في أقرب وقت مع بداية دوام العمل القادم. شكراً لتفهمك!');

                  if (isWithinHours) {
                    setConversationSla(convId, 15).catch(() => {});
                  }

                  const autoMsgId = await this.sendMessage(tenantId, displayPhone, handoffMsg);
                  const replyObj = {
                    id: autoMsgId || `handoff_${Date.now()}`,
                    tenantId,
                    conversationId: convId,
                    senderType: 'AGENT' as const,
                    senderId: 'system-handoff',
                    senderName: isWithinHours ? 'الدعم البشري' : 'الرد الآلي (خارج أوقات العمل)',
                    content: handoffMsg,
                    deliveryStatus: 'SENT' as const,
                    createdAt: new Date().toISOString(),
                  };
                  localStore.saveMessage(replyObj);
                  localStore.upsertConversation(convId, tenantId, storedContact, handoffMsg, false);
                  const gateway = getSocketGateway();
                  if (gateway) {
                    gateway.to(`tenant:${tenantId}`).emit('message:new', {
                      message: { ...replyObj, isTemplate: false, templateName: null, metaMessageId: autoMsgId },
                    });
                  }
                } catch (e: any) {
                  console.error('[WhatsAppManager] Failed sending max-turns handoff message:', e.message);
                }
              }, 1000);
            } else {
              // 4. Configurable Natural Delay (e.g. 30 to 60 seconds or custom)
              const delaySeconds = settings.autoReplyDelaySeconds !== undefined ? settings.autoReplyDelaySeconds : 30;
              const delayMs = Math.max(1000, delaySeconds * 1000);

              console.log(`[WhatsAppManager:${tenantId}] ⏳ Natural delay scheduled: will reply in ${delaySeconds}s to ${displayPhone}...`);

              setTimeout(async () => {
                try {
                  // Re-check before replying: Did a human agent already intervene during the delay?
                  const latestHistory = localStore.getMessages(convId);
                  const lastMsg = latestHistory[latestHistory.length - 1];
                  if (lastMsg && lastMsg.senderType === 'AGENT' && lastMsg.senderId !== 'gemini-ai') {
                    console.log(`[WhatsAppManager:${tenantId}] 🛑 Human agent intervened during delay. Cancelling AI auto-reply.`);
                    return;
                  }

                  // Re-check: Did conversation get paused?
                  const currentSettings = localStore.getSettings(tenantId);
                  if (currentSettings.pausedConversations?.includes(convId)) {
                    console.log(`[WhatsAppManager:${tenantId}] 🛑 Conversation paused during delay. Cancelling AI auto-reply.`);
                    return;
                  }

                  console.log(`[WhatsAppManager:${tenantId}] 🧠 AI is generating reply for ${displayPhone}...`);
                  
                  // Show typing presence while generating
                  const sock = this.sessions.get(tenantId);
                  const targetJid = this.getTargetJid(tenantId, displayPhone);
                  if (sock && targetJid) {
                    try { await sock.sendPresenceUpdate('composing', targetJid); } catch {}
                  }

                  const aiReply = await GeminiService.generateSmartReply(
                    tenantId,
                    latestHistory,
                    undefined,
                    mediaBufferForAi ? mediaBufferForAi.toString('base64') : undefined,
                    mediaMimeTypeForAi || undefined,
                    displayPhone
                  );

                  // Extract and update persistent customer memory in background
                  GeminiService.extractAndSaveMemoryFacts(tenantId, displayPhone, latestHistory).catch(() => {});

                  if (aiReply && !aiReply.startsWith('تنبيه:') && !aiReply.startsWith('تعذر')) {
                    // 1. Clean asterisks and robot formatting
                    const cleanedReply = GeminiService.cleanTextForHumanWhatsApp(aiReply);

                    // 2. Split into natural WhatsApp bubbles (1 to 3 messages)
                    const bubbles = GeminiService.splitIntoNaturalBubbles(cleanedReply);

                    for (let i = 0; i < bubbles.length; i++) {
                      const bubble = bubbles[i];
                      if (!bubble || !bubble.trim()) continue;

                      console.log(
                        `[WhatsAppManager:${tenantId}] 📥 Pushing AI bubble ${i + 1}/${bubbles.length} for ${displayPhone} to OutgoingWhatsAppQueue...`
                      );

                      await this.enqueueOutgoingMessage({
                        tenantId,
                        toPhone: displayPhone,
                        text: bubble,
                        conversationId: convId,
                        senderType: 'BOT',
                        senderId: 'gemini-ai',
                        senderName: 'Gemini AI',
                        metadata: {
                          bubbleIndex: i,
                          totalBubbles: bubbles.length,
                        },
                      });
                    }
                  } else {
                    console.warn(`[WhatsAppManager:${tenantId}] Gemini did not return a valid reply:`, aiReply);
                  }
                } catch (aiErr: any) {
                  console.error('[WhatsAppManager] Gemini auto-reply error:', aiErr.message);
                }
              }, delayMs);
            }
          }
        }
      }

      // Try Database Persistence if DB is active
      try {
        // 1. Upsert Contact associated with tenantId
        const contact = await prisma.contact.upsert({
          where: { tenantId_phoneNumber: { tenantId, phoneNumber: displayPhone } },
          update: {
            name: msg.pushName || undefined,
            lastSeenAt: new Date(),
          },
          create: {
            tenantId,
            phoneNumber: displayPhone,
            name: pushName,
            lastSeenAt: new Date(),
          },
        });
        contactId = contact.id;
        contactName = contact.name || pushName;

        // 2. Upsert Conversation for this contact and channelConfig
        const snippet = textContent || '[WhatsApp Message]';
        let conversation = await prisma.conversation.findFirst({
          where: {
            tenantId,
            contactId: contact.id,
            channel: 'WHATSAPP',
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              tenantId,
              contactId: contact.id,
              channelConfigId: (channelConfigId && channelConfigId.length > 20) ? channelConfigId : null,
              channel: 'WHATSAPP',
              status: 'OPEN',
              lastMessageSnippet: snippet,
              lastActivityAt: new Date(),
              unreadCount: isFromMe ? 0 : 1,
            },
          });
        } else {
          conversation = await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageSnippet: snippet,
              lastActivityAt: new Date(),
              unreadCount: isFromMe ? conversation.unreadCount : { increment: 1 },
              status: 'OPEN',
            },
          });
        }
        convId = conversation.id;

        // 3. Reset 24-hour compliance window
        try {
          await ComplianceService.resetCustomerWindow(tenantId, conversation.id, messageDate);
        } catch {}

        // 4. Persist message using Prisma Message model
        await prisma.message.upsert({
          where: { providerMessageId: msgId },
          update: {},
          create: {
            tenantId,
            conversationId: conversation.id,
            senderType: isFromMe ? SenderType.AGENT : SenderType.CONTACT,
            content: textContent,
            mediaId: mediaInfo?.ext ?? null,
            mediaUrl: mediaUrl ?? null,
            providerMessageId: msgId,
            deliveryStatus: MessageStatus.DELIVERED,
            createdAt: messageDate,
          },
        });
      } catch (dbErr: any) {
        console.warn(`[WhatsAppManager:${tenantId}] DB persistence notice:`, dbErr.message);
      }

      // 5. Send read receipt if incoming from customer (Gated by settings - disabled by default to prevent blue checkmarks)
      const currentTenantSettings = localStore.getSettings(tenantId);
      if (!isFromMe && currentTenantSettings.sendReadReceipts === true) {
        try {
          await sock.readMessages([msg.key]);
        } catch {}
      }

      // 6. REAL-TIME BROADCAST TO DASHBOARD VIA SOCKET.IO (Guaranteed delivery)
      const io = getSocketGateway();
      if (io) {
        console.log(`[WhatsAppManager:${tenantId}] 📢 Broadcasting message:new to room tenant:${tenantId} for ${displayPhone}`);
        io.to(`tenant:${tenantId}`).emit('message:new', {
          message: {
            id: msgId,
            tenantId,
            conversationId: convId,
            senderType: isFromMe ? 'AGENT' : 'CUSTOMER',
            senderId: displayPhone,
            senderName: isFromMe ? 'You (Agent)' : pushName,
            content: textContent || '',
            mediaUrl,
            mediaType,
            isTemplate: false,
            templateName: null,
            metaMessageId: msgId,
            deliveryStatus: 'DELIVERED',
            createdAt: messageDate.toISOString(),
          },
          windowExpiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        });
      }

      console.log(`[WhatsAppManager:${tenantId}] ✅ Successfully processed message from ${displayPhone}: ${textContent ?? '[Media]'}`);
    } catch (err: any) {
      console.error(`[WhatsAppManager:${tenantId}] Error handling incoming message:`, err.message);
    }
  }

  /**
   * Helper to resolve target WhatsApp JID
   */
  public getTargetJid(tenantId: string, toPhone: string): string {
    const cleanPhone = toPhone.replace(/\D/g, '');
    const mappedJid =
      this.jidMap.get(`${tenantId}:${cleanPhone}`) ||
      this.jidMap.get(`${tenantId}:+${cleanPhone}`) ||
      this.jidMap.get(`${tenantId}:${toPhone}`);
    return mappedJid || `${cleanPhone}@s.whatsapp.net`;
  }

  /**
   * Pushes an outgoing message to the OutgoingWhatsAppQueue (BullMQ).
   * Enforces the architectural rule: NEVER send a message directly to the Baileys socket.
   * All outgoing AI or human agent responses MUST be queued.
   */
  public async enqueueOutgoingMessage(data: OutgoingWhatsAppJobData): Promise<string> {
    // Anti-Ban Outbound Rule: Strictly prevent dispatching to opted-out contacts
    const optedOut = await this.isContactOptedOut(data.tenantId, data.toPhone);
    if (optedOut) {
      console.warn(
        `[WhatsAppManager:${data.tenantId}] ⛔ Message queueing blocked: Contact ${data.toPhone} is opted out (is_opted_out = true)`
      );
      return `blocked_opted_out_${Date.now()}`;
    }

    const jobId = `out_${data.tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await outgoingWhatsAppQueue.add('send-whatsapp-message', {
        ...data,
        enqueuedAt: new Date().toISOString(),
      }, {
        jobId,
      });
      console.log(`[WhatsAppManager:${data.tenantId}] 📥 Queued message to ${data.toPhone} in OutgoingWhatsAppQueue (Job: ${jobId})`);
      return jobId;
    } catch (err: any) {
      console.warn(`[WhatsAppManager:${data.tenantId}] ⚠️ BullMQ/Redis unavailable, executing stealth direct send fallback:`, err.message);
      const sentId = await this.simulateTypingAndSend(data.tenantId, data.toPhone, data.text, {
        conversationId: data.conversationId,
        senderType: data.senderType,
        senderId: data.senderId,
        senderName: data.senderName,
      });
      return sentId || jobId;
    }
  }

  /**
   * Natural Typing Simulation & Screen-Off Stealth (The Humanizer):
   * Inside worker processing logic, executes the exact 8-step stealth sequence:
   * 1. Wait a random delay (3 to 10 seconds).
   * 2. Send read receipt (socket.readMessages).
   * 3. Change presence to 'available'.
   * 4. Wait a random delay (1 to 3 seconds).
   * 5. Change presence to 'composing'.
   * 6. Wait dynamically based on response length (50ms per character with ±15% jitter).
   * 7. Send the actual message.
   * 8. Immediately revert presence to 'unavailable'.
   */
  public async simulateTypingAndSend(
    tenantId: string,
    toPhone: string,
    text: string,
    options?: {
      conversationId?: string;
      senderType?: 'AGENT' | 'BOT';
      senderId?: string;
      senderName?: string;
      bypassOptOutCheck?: boolean;
      replyToMessageId?: string;
      messageKey?: any;
    }
  ): Promise<string | null> {
    // 0. Outbound Rule: Strictly prevent dispatching to opted-out contacts
    if (!options?.bypassOptOutCheck) {
      const isOptedOut = await this.isContactOptedOut(tenantId, toPhone);
      if (isOptedOut) {
        console.warn(
          `[WhatsAppManager:${tenantId}] ⛔ Outbound message blocked: Contact ${toPhone} is opted out (is_opted_out = true)`
        );
        return null;
      }
    }

    const sock = this.sessions.get(tenantId);
    if (!sock) {
      throw new Error(`No active WhatsApp session for tenant ${tenantId}`);
    }

    const cleanPhone = toPhone.replace(/\D/g, '');
    const targetJid = this.getTargetJid(tenantId, toPhone);

    // ─────────────────────────────────────────────────────────────
    // Screen-Off Stealth & Human Message Flow (Strict 8-Step Sequence)
    // ─────────────────────────────────────────────────────────────

    // Step 1: Wait a random delay (3 to 10 seconds)
    const step1DelayMs = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
    console.log(`[The Humanizer:${tenantId}] 1/8 ⏳ Initial natural human pause: ${step1DelayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, step1DelayMs));

    // Step 2: Send read receipt (socket.readMessages)
    try {
      if (options?.messageKey) {
        await sock.readMessages([options.messageKey]);
      } else if (options?.replyToMessageId) {
        await sock.readMessages([{ remoteJid: targetJid, id: options.replyToMessageId, fromMe: false }]);
      }
      console.log(`[The Humanizer:${tenantId}] 2/8 👁️ Read receipt sent for ${targetJid}`);
    } catch (readErr: any) {
      console.warn(`[The Humanizer:${tenantId}] readMessages note:`, readErr.message);
    }

    // Step 3: Change presence to 'available'
    try {
      await sock.sendPresenceUpdate('available', targetJid);
      console.log(`[The Humanizer:${tenantId}] 3/8 🟢 Presence switched to 'available'`);
    } catch (presenceErr: any) {
      console.warn(`[The Humanizer:${tenantId}] sendPresenceUpdate('available') warning:`, presenceErr.message);
    }

    // Step 4: Wait a random delay (1 to 3 seconds)
    const step4DelayMs = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
    console.log(`[The Humanizer:${tenantId}] 4/8 ⏳ Pre-typing pause: ${step4DelayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, step4DelayMs));

    // Step 5: Change presence to 'composing'
    try {
      await sock.sendPresenceUpdate('composing', targetJid);
      console.log(`[The Humanizer:${tenantId}] 5/8 ⌨️ Presence switched to 'composing' (typing...)`);
    } catch (presenceErr: any) {
      console.warn(`[The Humanizer:${tenantId}] sendPresenceUpdate('composing') warning:`, presenceErr.message);
    }

    // Step 6: Wait dynamically based on response length (50ms per character + ±15% jitter)
    const baseDelayMs = text.length * 50;
    const clampedDelayMs = Math.min(Math.max(baseDelayMs, 2000), 20000);
    const jitterMultiplier = 1 + (Math.random() * 0.30 - 0.15);
    const finalTypingDelayMs = Math.round(clampedDelayMs * jitterMultiplier);
    console.log(`[The Humanizer:${tenantId}] 6/8 ⌨️ Active typing duration: ${finalTypingDelayMs}ms (${text.length} chars)...`);
    await new Promise((resolve) => setTimeout(resolve, finalTypingDelayMs));

    // Step 7: Send the actual message
    console.log(`[The Humanizer:${tenantId}] 7/8 📤 Dispatching message to ${targetJid}: "${text.slice(0, 60)}..."`);
    const sent = await sock.sendMessage(targetJid, { text });
    const sentId = sent?.key?.id || `out_${Date.now()}`;

    // Step 8: Immediately revert presence to 'unavailable' (Screen-off stealth)
    try {
      await sock.sendPresenceUpdate('unavailable', targetJid);
      console.log(`[The Humanizer:${tenantId}] 8/8 📴 Presence reverted to 'unavailable' (Screen-off Stealth)`);
    } catch (presenceErr: any) {
      console.warn(`[The Humanizer:${tenantId}] sendPresenceUpdate('unavailable') warning:`, presenceErr.message);
    }

    // Store update, DB persistence, and Socket.io broadcast
    const displayPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
    const convId = options?.conversationId || `conv_${cleanPhone}`;
    const senderType = options?.senderType || 'AGENT';
    const senderId = options?.senderId || 'agent';
    const senderName = options?.senderName || (senderType === 'BOT' ? 'Gemini AI' : 'You (Agent)');

    const contact = localStore.upsertContact(tenantId, displayPhone);
    localStore.upsertConversation(convId, tenantId, contact, text, false);

    const messageRecord = {
      id: sentId,
      tenantId,
      conversationId: convId,
      senderType: senderType as any,
      senderId,
      senderName,
      content: text,
      deliveryStatus: 'SENT' as const,
      createdAt: new Date().toISOString(),
    };
    localStore.saveMessage(messageRecord);

    const io = getSocketGateway();
    if (io) {
      io.to(`tenant:${tenantId}`).emit('message:new', {
        message: {
          ...messageRecord,
          isTemplate: false,
          templateName: null,
          metaMessageId: sentId,
        },
      });
    }

    try {
      prisma.message.create({
        data: {
          tenantId,
          conversationId: convId,
          senderType: senderType === 'BOT' ? SenderType.BOT : SenderType.AGENT,
          content: text,
          providerMessageId: sentId,
          deliveryStatus: MessageStatus.SENT,
        },
      }).catch(() => {});
    } catch {}

    return sentId;
  }

  /**
   * Outgoing Message Gateway:
   * Enforces requirement: NEVER send a message directly to the Baileys socket.
   * All outgoing AI or human agent responses MUST be pushed to OutgoingWhatsAppQueue.
   */
  public async sendMessage(tenantId: string, toPhone: string, text: string): Promise<string | null> {
    return this.enqueueOutgoingMessage({
      tenantId,
      toPhone,
      text,
      senderType: 'AGENT',
      senderId: 'agent',
      senderName: 'You (Agent)',
    });
  }

  /**
   * Retrieve active session socket for a tenant
   */
  public getSession(tenantId: string): WASocket | null {
    return this.sessions.get(tenantId) ?? null;
  }

  /**
   * Disconnect and remove session for a tenant
   */
  public async disconnectSession(tenantId: string): Promise<void> {
    const restartTimer = this.microRestartTimers.get(tenantId);
    if (restartTimer) {
      clearTimeout(restartTimer);
      this.microRestartTimers.delete(tenantId);
    }

    const sock = this.sessions.get(tenantId);
    if (sock) {
      try {
        await sock.logout();
      } catch {
        sock.end(undefined);
      }
      this.sessions.delete(tenantId);
    }
    await clearTenantAuthState(tenantId);
  }

  /**
   * Daily Micro-Restarts (Anti-Ban Stealth):
   * Gracefully restarts the Baileys WebSocket once every 24 hours (± 1 to 3 hours jitter)
   * to eliminate the suspicious "100% continuous uptime" bot signature.
   */
  private scheduleDailyMicroRestart(tenantId: string, sock: WASocket): void {
    const existing = this.microRestartTimers.get(tenantId);
    if (existing) clearTimeout(existing);

    // 24 hours in ms: 86,400,000 ms ± (1 to 3 hours random jitter)
    const base24hMs = 24 * 60 * 60 * 1000;
    const jitterHours = 1 + Math.random() * 2; // 1 to 3 hours
    const jitterSign = Math.random() > 0.5 ? 1 : -1;
    const restartDelayMs = Math.round(base24hMs + (jitterSign * jitterHours * 3600 * 1000));

    const hoursFormatted = (restartDelayMs / (1000 * 3600)).toFixed(2);
    console.log(
      `[WhatsAppManager:${tenantId}] ⏱️ Stealth Anti-Ban: Daily micro-restart scheduled in ${hoursFormatted} hours`
    );

    const timer = setTimeout(() => {
      console.log(
        `[WhatsAppManager:${tenantId}] 🔄 Executing scheduled daily micro-restart (graceful socket close to break bot uptime signature)...`
      );
      try {
        if ((sock as any).ws) {
          (sock as any).ws.close();
        } else {
          sock.end(undefined);
        }
      } catch (err: any) {
        console.warn(`[WhatsAppManager:${tenantId}] Daily micro-restart close error:`, err.message);
      }
    }, restartDelayMs);

    this.microRestartTimers.set(tenantId, timer);
  }

  /**
   * Helper: Check if Contact is opted out
   */
  public async isContactOptedOut(tenantId: string, toPhone: string): Promise<boolean> {
    const cleanPhone = toPhone.replace(/\D/g, '');
    const displayPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

    const local =
      localStore.getContactByPhone(tenantId, displayPhone) ||
      localStore.getContactByPhone(tenantId, cleanPhone);
    if (local?.isOptedOut) return true;

    try {
      const dbContact = await prisma.contact.findFirst({
        where: {
          tenantId,
          OR: [
            { phoneNumber: displayPhone },
            { phoneNumber: cleanPhone },
            { phoneNumber: toPhone },
          ],
        },
        select: { isOptedOut: true },
      });
      if (dbContact?.isOptedOut) {
        if (local) local.isOptedOut = true;
        return true;
      }
    } catch {}

    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  private extractTextContent(msg: WAMessage): string | null {
    let m = msg.message;
    if (!m) return null;
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;

    return (
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.documentMessage?.caption ||
      null
    );
  }

  private extractMediaInfo(msg: WAMessage): {
    type: 'image' | 'audio' | 'video' | 'document';
    ext: string;
    caption: string | null;
  } | null {
    let m = msg.message;
    if (!m) return null;
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;

    if (m.imageMessage) {
      const isPng = m.imageMessage.mimetype?.includes('png');
      return {
        type: 'image',
        ext: isPng ? 'png' : 'jpg',
        caption: m.imageMessage.caption || null,
      };
    }
    if (m.audioMessage) {
      const isM4a = m.audioMessage.mimetype?.includes('mp4') || m.audioMessage.mimetype?.includes('m4a');
      return {
        type: 'audio',
        ext: isM4a ? 'm4a' : 'ogg',
        caption: null,
      };
    }
    if (m.videoMessage) {
      return {
        type: 'video',
        ext: 'mp4',
        caption: m.videoMessage.caption || null,
      };
    }
    if (m.documentMessage) {
      const fileName = m.documentMessage.fileName || '';
      const dotExt = path.extname(fileName).replace('.', '').toLowerCase();
      return {
        type: 'document',
        ext: dotExt || 'pdf',
        caption: m.documentMessage.caption || fileName || null,
      };
    }
    return null;
  }

  private extractMediaId(msg: WAMessage): string | null {
    let m = msg.message;
    if (!m) return null;
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;

    const sha =
      m.imageMessage?.fileEncSha256 ||
      m.videoMessage?.fileEncSha256 ||
      m.audioMessage?.fileEncSha256 ||
      m.documentMessage?.fileEncSha256 ||
      m.stickerMessage?.fileEncSha256;

    if (sha) {
      return Buffer.from(sha).toString('base64');
    }
    return null;
  }
}

// Global Singleton Instance
export const whatsAppManager = new WhatsAppManager();

// Backward compatibility exports
export const startWhatsAppSession = (tenantId: string, channelConfigId?: string) =>
  whatsAppManager.initSession(tenantId, channelConfigId);

export const sendWhatsAppMessage = (tenantId: string, toPhone: string, text: string) =>
  whatsAppManager.sendMessage(tenantId, toPhone, text);

export const getActiveSession = (tenantId: string) =>
  whatsAppManager.getSession(tenantId);
