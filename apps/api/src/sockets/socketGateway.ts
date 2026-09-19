import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '@omni/types';
import { prisma, SenderType, MessageStatus, ResolutionType } from '@omni/database';
import { ComplianceService } from '../services/compliance.service';
import { whatsAppManager } from '../services/whatsapp.service';

let ioInstance: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
let widgetNamespaceInstance: any = null;

export function initializeSocketGateway(
  httpServer: HttpServer,
  corsOrigin: string
): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth Middleware for main / dashboard namespace
  io.use((socket, next) => {
    const tenantId = socket.handshake.auth?.tenantId || (socket.handshake.query?.tenantId as string);
    if (!tenantId) {
      return next(new Error('Authentication failed: Missing tenantId'));
    }
    (socket as any).tenantId = tenantId;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const tenantId = (socket as any).tenantId as string;
    const roomName = `tenant:${tenantId}`;

    socket.join(roomName);
    console.log(`[Socket] Dashboard client ${socket.id} joined room ${roomName}`);

    // Handle agent sending reply via standard message:send
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, content, isTemplate, templateName } = data;

        let conversation: any = null;
        try {
          conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { contact: true },
          });
        } catch {}

        let targetPhone = conversation?.contact?.phoneNumber;
        if (!targetPhone && conversationId) {
          const match = conversationId.replace(/^[^_]*_/, '');
          if (match && /^\d+$/.test(match)) {
            targetPhone = match;
          }
        }

        const isWebWidget = conversation?.channel === 'WEB_WIDGET';

        // 1. 24-hour rule check (only applies to WhatsApp)
        if (conversation && !isWebWidget) {
          try {
            const windowStatus = await ComplianceService.checkConversationWindow(tenantId, conversationId);
            if (windowStatus.requiresTemplate && !isTemplate) {
              socket.emit('message:status', {
                messageId: `err_${Date.now()}`,
                status: 'FAILED_24H_EXPIRED',
              });
              return;
            }
          } catch {}
        }

        // 2. Dispatch message
        let providerMessageId: string | null = null;
        if (isWebWidget) {
          // Route live to website visitor in /widget namespace
          providerMessageId = `web_${Date.now()}`;
          if (widgetNamespaceInstance) {
            widgetNamespaceInstance.to(`conv:${conversationId}`).emit('widget:message', {
              id: providerMessageId,
              conversationId,
              senderType: 'AGENT',
              senderName: 'فريق الدعم',
              content,
              createdAt: new Date().toISOString(),
            });
          }
        } else if (targetPhone) {
          // Send via Baileys WhatsApp
          try {
            providerMessageId = await whatsAppManager.sendMessage(tenantId, targetPhone, content);
          } catch (err: any) {
            console.error('[Socket] Baileys send error:', err.message);
            socket.emit('message:status', {
              messageId: `err_${Date.now()}`,
              status: 'FAILED_SEND',
            });
            return;
          }
        }

        const msgId = providerMessageId || `sent_${Date.now()}`;

        // 3. Database persistence & Analytics timestamping
        try {
          if (conversation) {
            await prisma.message.create({
              data: {
                tenantId,
                conversationId,
                senderType: SenderType.AGENT,
                content,
                providerMessageId,
                deliveryStatus: MessageStatus.DELIVERED,
              },
            });

            const updatePayload: any = {
              lastMessageSnippet: content,
              lastActivityAt: new Date(),
            };

            // First response tracking for analytics
            if (!conversation.firstResponseAt) {
              updatePayload.firstResponseAt = new Date();
            }

            await prisma.conversation.update({
              where: { id: conversationId },
              data: updatePayload,
            });
          }
        } catch (dbErr: any) {
          console.warn('[Socket] Message DB save note:', dbErr.message);
        }

        // 4. Broadcast to all agents in this tenant room
        io.to(roomName).emit('message:new', {
          message: {
            id: msgId,
            tenantId,
            conversationId,
            senderType: 'AGENT',
            senderId: socket.id,
            senderName: 'Agent',
            content,
            isTemplate: !!isTemplate,
            templateName: templateName || null,
            metaMessageId: providerMessageId,
            deliveryStatus: 'SENT',
            createdAt: new Date().toISOString(),
          },
          windowExpiresAt: conversation?.windowExpiresAt?.toISOString() ?? null,
        });

      } catch (err: any) {
        console.error('[Socket Error] Error sending agent message:', err.message);
      }
    });

    // Handle agent updating conversation status (e.g. RESOLVE)
    socket.on('conversation:status:update' as any, async (data: any) => {
      try {
        const { conversationId, status, resolutionType } = data;
        const resType = resolutionType || ResolutionType.HUMAN_RESOLVED;

        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            status,
            resolvedAt: status === 'RESOLVED' ? new Date() : null,
            resolutionType: status === 'RESOLVED' ? resType : ResolutionType.PENDING,
          },
        });

        io.to(roomName).emit('conversation:updated' as any, {
          conversationId,
          status,
          resolutionType: resType,
        });
      } catch (err: any) {
        console.warn('[Socket] Failed to update conversation status:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Dashboard client ${socket.id} disconnected`);
    });
  });

  // ==============================================================================
  // Decoupled Socket.io Namespace: /widget (Live Chat Web Widget)
  // ==============================================================================
  const widgetNamespace = io.of('/widget');
  widgetNamespaceInstance = widgetNamespace;

  // Middleware: Verify Origin against ChannelConfig.allowed_domains
  widgetNamespace.use(async (socket, next) => {
    try {
      const tenantId =
        socket.handshake.auth?.tenantId ||
        (socket.handshake.query?.tenantId as string) ||
        (socket.handshake.headers['x-tenant-id'] as string) ||
        'demo-tenant-1';

      (socket as any).tenantId = tenantId;
      (socket as any).visitorSessionId =
        socket.handshake.auth?.visitorSessionId ||
        (socket.handshake.query?.visitorSessionId as string) ||
        socket.id;

      const origin = socket.handshake.headers.origin || socket.handshake.headers.referer || '';

      // Check ChannelConfig for WEB_WIDGET
      const channelConfig = await prisma.channelConfig.findFirst({
        where: {
          tenantId,
          channel: 'WEB_WIDGET',
        },
      });

      const allowedDomains = channelConfig?.allowedDomains || [];

      // If allowed_domains is configured, verify origin (allowing localhost/dev)
      if (allowedDomains.length > 0 && !allowedDomains.includes('*')) {
        let isAllowed = false;
        try {
          const originHost = new URL(origin).hostname;
          isAllowed = allowedDomains.some((domain) => {
            const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];
            return (
              originHost === cleanDomain ||
              originHost.endsWith('.' + cleanDomain) ||
              originHost === 'localhost' ||
              originHost === '127.0.0.1'
            );
          });
        } catch {
          isAllowed = false;
        }

        if (!isAllowed) {
          console.warn(`[WidgetSocket] 🚫 Origin rejected: ${origin} not in allowed_domains:`, allowedDomains);
          return next(new Error('CORS: Origin not authorized for this widget'));
        }
      }

      next();
    } catch (err: any) {
      next(new Error(`Widget Auth Error: ${err.message}`));
    }
  });

  widgetNamespace.on('connection', (socket: Socket) => {
    const tenantId = (socket as any).tenantId;
    const visitorSessionId = (socket as any).visitorSessionId;
    console.log(`[WidgetSocket] 💬 Visitor connected: ${socket.id} (Tenant: ${tenantId}, Session: ${visitorSessionId})`);

    // Helper: Find or create visitor contact & conversation
    async function getOrCreateVisitorConversation(visitorName?: string, visitorEmail?: string) {
      // Find existing contact by session or create new
      let contact = await prisma.contact.findFirst({
        where: {
          tenantId,
          phoneNumber: null,
          name: { contains: visitorSessionId.slice(-6) },
        },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            tenantId,
            name: visitorName || `زائر الموقع (${visitorSessionId.slice(-4)})`,
            email: visitorEmail || null,
            customAttributes: {
              visitorSessionId,
              channel: 'WEB_WIDGET',
            },
          },
        });
      }

      let conversation = await prisma.conversation.findFirst({
        where: {
          tenantId,
          contactId: contact.id,
          channel: 'WEB_WIDGET',
          status: 'OPEN',
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            tenantId,
            contactId: contact.id,
            channel: 'WEB_WIDGET',
            status: 'OPEN',
            lastMessageSnippet: 'محادثة جديدة عبر الموقع الإلكتروني',
          },
        });

        // Broadcast to dashboard agents
        io.to(`tenant:${tenantId}`).emit('conversation:created' as any, {
          id: conversation.id,
          tenantId,
          contactId: contact.id,
          channel: 'WEB_WIDGET',
          status: 'OPEN',
          contact: {
            id: contact.id,
            name: contact.name,
            email: contact.email,
          },
        });
      }

      return { contact, conversation };
    }

    // Event: widget:init
    socket.on('widget:init', async (data: { visitorName?: string; visitorEmail?: string }, callback: any) => {
      try {
        const { contact, conversation } = await getOrCreateVisitorConversation(
          data?.visitorName,
          data?.visitorEmail
        );
        socket.join(`conv:${conversation.id}`);

        const messages = await prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'asc' },
          take: 50,
        });

        const resData = {
          conversationId: conversation.id,
          contactId: contact.id,
          messages,
        };

        if (typeof callback === 'function') callback(resData);
        socket.emit('widget:ready', resData);
      } catch (err: any) {
        console.error('[WidgetSocket] widget:init error:', err.message);
      }
    });

    // Event: widget:message (Visitor sends message)
    socket.on('widget:message', async (data: { content: string; visitorName?: string }, callback: any) => {
      try {
        const content = String(data.content || '').trim();
        if (!content) return;

        const { contact, conversation } = await getOrCreateVisitorConversation(data?.visitorName);
        socket.join(`conv:${conversation.id}`);

        const message = await prisma.message.create({
          data: {
            tenantId,
            conversationId: conversation.id,
            senderType: SenderType.CONTACT,
            content,
            deliveryStatus: MessageStatus.DELIVERED,
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastActivityAt: new Date(),
            lastCustomerMessageAt: new Date(),
            lastMessageSnippet: content,
            unreadCount: { increment: 1 },
          },
        });

        // Broadcast to dashboard so human agents see website chats right next to WhatsApp chats
        io.to(`tenant:${tenantId}`).emit('message:new', {
          message: {
            id: message.id,
            tenantId,
            conversationId: conversation.id,
            senderType: 'CUSTOMER',
            senderId: contact.id,
            senderName: contact.name || 'زائر الموقع',
            content,
            isTemplate: false,
            templateName: null,
            deliveryStatus: 'DELIVERED',
            createdAt: message.createdAt.toISOString(),
          },
          windowExpiresAt: null,
        });

        if (typeof callback === 'function') callback({ success: true, messageId: message.id });
        socket.emit('widget:message:ack', { messageId: message.id });
      } catch (err: any) {
        console.error('[WidgetSocket] Error receiving visitor message:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[WidgetSocket] Visitor disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getSocketGateway(): Server<ClientToServerEvents, ServerToClientEvents> | null {
  return ioInstance;
}
