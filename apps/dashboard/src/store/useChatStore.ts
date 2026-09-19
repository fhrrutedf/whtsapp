import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { ChatMessageDTO, ConversationSummaryDTO } from '@omni/types';
import { playNotificationChime } from '../utils/notificationSound';

export type DashboardTab = 'chat' | 'contacts' | 'analytics' | 'settings';

interface ChatStore {
  socket: Socket | null;
  tenantId: string;
  currentTab: DashboardTab;
  conversations: ConversationSummaryDTO[];
  activeConversationId: string | null;
  messages: Record<string, ChatMessageDTO[]>; // conversationId -> messages
  drafts: Record<string, string>; // conversationId -> draft message text
  isSoundEnabled: boolean;
  isSocketConnected: boolean;

  // WhatsApp Connection State
  isWhatsAppModalOpen: boolean;
  qrCodeDataUrl: string | null;
  isWhatsAppConnected: boolean;
  connectedPhone: string | null;
  isConnectingWhatsApp: boolean;
  connectionError: string | null;

  setCurrentTab: (tab: DashboardTab) => void;
  setWhatsAppModalOpen: (open: boolean) => void;
  initSocket: (tenantId: string) => void;
  connectWhatsApp: () => Promise<void>;
  disconnectWhatsApp: () => Promise<void>;
  fetchWhatsAppStatus: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchMessagesForConversation: (conversationId: string) => Promise<void>;
  setActiveConversationId: (id: string) => void;
  setConversations: (conversations: ConversationSummaryDTO[]) => void;
  appendIncomingMessage: (msg: ChatMessageDTO) => void;
  updateMessageStatus: (messageId: string, status: string) => void;
  sendTextMessage: (conversationId: string, text: string) => void;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
  toggleSound: () => void;
}

// SSR-Safe Local Storage Cache Helpers
const getLocalCache = () => {
  if (typeof window === 'undefined') {
    return { conversations: [], messages: {}, activeId: null, drafts: {}, isSoundEnabled: true };
  }
  try {
    const raw = localStorage.getItem('omni_chat_cache_v2');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { conversations: [], messages: {}, activeId: null, drafts: {}, isSoundEnabled: true };
};

const saveLocalCache = (conversations: any[], messages: any, activeId?: string | null, drafts?: any, isSoundEnabled?: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    const prev = getLocalCache();
    localStorage.setItem(
      'omni_chat_cache_v2',
      JSON.stringify({
        conversations,
        messages,
        activeId: activeId ?? null,
        drafts: drafts ?? prev.drafts ?? {},
        isSoundEnabled: isSoundEnabled ?? prev.isSoundEnabled ?? true,
      })
    );
  } catch {}
};

export const useChatStore = create<ChatStore>((set, get) => {
  const initialCache = getLocalCache();

  return {
    socket: null,
    tenantId: 'demo-tenant-1',
    currentTab: 'chat',
    conversations: [],
    activeConversationId: null,
    messages: {},
    drafts: initialCache.drafts || {},
    isSoundEnabled: initialCache.isSoundEnabled !== false,
    isSocketConnected: false,

    // WhatsApp Connection State
    isWhatsAppModalOpen: false,
    qrCodeDataUrl: null,
    isWhatsAppConnected: false,
    connectedPhone: null,
    isConnectingWhatsApp: false,
    connectionError: null,

    setCurrentTab: (tab: DashboardTab) => set({ currentTab: tab }),
    setWhatsAppModalOpen: (open: boolean) => set({ isWhatsAppModalOpen: open }),

    toggleSound: () => {
      set((state) => {
        const next = !state.isSoundEnabled;
        saveLocalCache(state.conversations, state.messages, state.activeConversationId, state.drafts, next);
        return { isSoundEnabled: next };
      });
    },

    setDraft: (conversationId: string, text: string) => {
      set((state) => {
        const updatedDrafts = { ...state.drafts, [conversationId]: text };
        saveLocalCache(state.conversations, state.messages, state.activeConversationId, updatedDrafts, state.isSoundEnabled);
        return { drafts: updatedDrafts };
      });
    },

    clearDraft: (conversationId: string) => {
      set((state) => {
        const updatedDrafts = { ...state.drafts };
        delete updatedDrafts[conversationId];
        saveLocalCache(state.conversations, state.messages, state.activeConversationId, updatedDrafts, state.isSoundEnabled);
        return { drafts: updatedDrafts };
      });
    },

    initSocket: (tenantId: string) => {
      // Re-hydrate local cache safely on client mount
      const cache = getLocalCache();
      if (cache.conversations && cache.conversations.length > 0) {
        set({
          conversations: cache.conversations,
          messages: cache.messages || {},
          drafts: cache.drafts || {},
          isSoundEnabled: cache.isSoundEnabled !== false,
          activeConversationId: cache.activeId || cache.conversations[0]?.id || null,
        });
      }

      if (get().socket?.connected) return;

      const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const socket = io(socketUrl, {
        auth: { tenantId },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log('⚡ Socket connected to tenant room:', tenantId);
        set({ isSocketConnected: true });
        get().fetchWhatsAppStatus();
        get().fetchConversations();
      });

      socket.on('disconnect', () => {
        set({ isSocketConnected: false });
      });

      socket.on('message:new', ({ message }) => {
        get().appendIncomingMessage(message);
      });

      socket.on('message:status', ({ messageId, status }) => {
        get().updateMessageStatus(messageId, status);
      });

      // Baileys WhatsApp events
      socket.on('whatsapp:qr' as any, (data: any) => {
        console.log('📷 WhatsApp QR Code received:', data);
        set({
          qrCodeDataUrl: data.qrDataUrl || data.qr,
          isConnectingWhatsApp: false,
          isWhatsAppConnected: false,
          connectionError: null,
        });
      });

      socket.on('whatsapp:connected' as any, (data: any) => {
        console.log('✅ WhatsApp Connected:', data);
        set({
          isWhatsAppConnected: true,
          connectedPhone: data.phone || null,
          qrCodeDataUrl: null,
          isConnectingWhatsApp: false,
          connectionError: null,
        });
        get().fetchConversations();
      });

      socket.on('whatsapp:disconnected' as any, (data: any) => {
        console.log('⚠️ WhatsApp Disconnected:', data);
        set({
          isWhatsAppConnected: false,
          connectedPhone: null,
          isConnectingWhatsApp: data.willReconnect || false,
        });
      });

      set({ socket, tenantId });
    },

    connectWhatsApp: async () => {
      set({ isConnectingWhatsApp: true, connectionError: null });
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/whatsapp/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': get().tenantId,
          },
          body: JSON.stringify({ tenantId: get().tenantId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'فشل بدء الاتصال');
        }
        if (data.status === 'already_connected') {
          set({
            isWhatsAppConnected: true,
            connectedPhone: data.phone || null,
            isConnectingWhatsApp: false,
            qrCodeDataUrl: null,
          });
        }
      } catch (err: any) {
        console.error('Error connecting WhatsApp:', err.message);
        set({ isConnectingWhatsApp: false, connectionError: err.message });
      }
    },

    disconnectWhatsApp: async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        await fetch(`${apiUrl}/api/whatsapp/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': get().tenantId,
          },
          body: JSON.stringify({ tenantId: get().tenantId }),
        });
        set({
          isWhatsAppConnected: false,
          connectedPhone: null,
          qrCodeDataUrl: null,
        });
      } catch (err: any) {
        console.error('Error disconnecting WhatsApp:', err.message);
      }
    },

    fetchWhatsAppStatus: async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/whatsapp/status`, {
          headers: { 'x-tenant-id': get().tenantId },
        });
        if (res.ok) {
          const data = await res.json();
          set({
            isWhatsAppConnected: !!data.connected,
            connectedPhone: data.phone || null,
          });
        }
      } catch {
        // ignore
      }
    },

    fetchConversations: async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/conversations`, {
          headers: { 'x-tenant-id': get().tenantId },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const mapped: ConversationSummaryDTO[] = data.map((c: any) => ({
              id: c.id,
              tenantId: c.tenantId,
              channel: 'WHATSAPP',
              externalThreadId: c.contact?.phoneNumber || c.contactPhone || c.id,
              contactId: c.contactId,
              contactName: c.contact?.name || c.contactName || c.contact?.phoneNumber || 'عميل واتساب',
              contactPhone: c.contact?.phoneNumber || c.contactPhone,
              status: 'OPEN',
              lastMessageSnippet: c.lastMessageSnippet || '',
              unreadCount: c.unreadCount || 0,
              updatedAt: c.updatedAt || c.lastActivityAt || new Date().toISOString(),
            }));

            // Merge with current state without losing local messages
            set((state) => {
              const existingMap = new Map(state.conversations.map((conv) => [conv.id, conv]));
              for (const item of mapped) {
                existingMap.set(item.id, {
                  ...(existingMap.get(item.id) || {}),
                  ...item,
                });
              }
              const merged = Array.from(existingMap.values());
              const nextActive = state.activeConversationId || (merged[0]?.id ?? null);

              saveLocalCache(merged, state.messages, nextActive);

              return {
                conversations: merged,
                activeConversationId: nextActive,
              };
            });

            if (get().activeConversationId) {
              get().fetchMessagesForConversation(get().activeConversationId!);
            }
          }
        }
      } catch {
        // ignore
      }
    },

    fetchMessagesForConversation: async (conversationId: string) => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/conversations/${conversationId}/messages`, {
          headers: { 'x-tenant-id': get().tenantId },
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            set((state) => {
              const updatedMessages = {
                ...state.messages,
                [conversationId]: list,
              };
              saveLocalCache(state.conversations, updatedMessages, state.activeConversationId);
              return { messages: updatedMessages };
            });
          }
        }
      } catch {}
    },

    setActiveConversationId: (id: string) => {
      set((state) => {
        const updatedConvs = state.conversations.map((c) =>
          c.id === id ? { ...c, unreadCount: 0 } : c
        );
        saveLocalCache(updatedConvs, state.messages, id);
        return {
          activeConversationId: id,
          conversations: updatedConvs,
        };
      });
      get().fetchMessagesForConversation(id);
    },

    setConversations: (conversations) => {
      set((state) => {
        saveLocalCache(conversations, state.messages, state.activeConversationId);
        return { conversations };
      });
    },

    appendIncomingMessage: (msg) => {
      set((state) => {
        console.log('📥 Dashboard appendIncomingMessage received:', msg);
        const convMessages = state.messages[msg.conversationId] || [];

        // Avoid duplicate messages
        if (convMessages.some((m) => m.id === msg.id || (m.metaMessageId && m.metaMessageId === msg.metaMessageId))) {
          return state;
        }

        const existingIndex = state.conversations.findIndex((c) => c.id === msg.conversationId);
        let updatedConversations: ConversationSummaryDTO[];

        if (existingIndex >= 0) {
          updatedConversations = state.conversations.map((c) => {
            if (c.id === msg.conversationId) {
              return {
                ...c,
                lastMessageSnippet: msg.content,
                unreadCount: state.activeConversationId === c.id ? 0 : c.unreadCount + 1,
                updatedAt: msg.createdAt,
              };
            }
            return c;
          });
        } else {
          // Create new conversation in the list immediately!
          const cleanPhone = msg.senderId?.startsWith('+') ? msg.senderId : `+${msg.senderId}`;
          const newConv: ConversationSummaryDTO = {
            id: msg.conversationId,
            tenantId: msg.tenantId,
            channel: 'WHATSAPP',
            externalThreadId: cleanPhone,
            contactId: msg.senderId || msg.conversationId,
            contactName: msg.senderName || cleanPhone,
            contactPhone: cleanPhone,
            status: 'OPEN',
            lastMessageSnippet: msg.content,
            unreadCount: state.activeConversationId === msg.conversationId ? 0 : 1,
            updatedAt: msg.createdAt,
          };
          updatedConversations = [newConv, ...state.conversations];
        }

        const nextActiveId = state.activeConversationId || msg.conversationId;
        const updatedMessages = {
          ...state.messages,
          [msg.conversationId]: [...convMessages, msg],
        };

        saveLocalCache(updatedConversations, updatedMessages, nextActiveId, state.drafts, state.isSoundEnabled);

        // Trigger subtle audio notification if message is from customer
        if ((msg.senderType === 'CUSTOMER' || msg.senderType === 'CONTACT') && state.isSoundEnabled) {
          const isEscalated = /موظف|بشري|شكوى|مدير|مهم|مشكلة|ضروري/i.test(msg.content || '');
          playNotificationChime(isEscalated);
        }

        return {
          activeConversationId: nextActiveId,
          messages: updatedMessages,
          conversations: updatedConversations,
        };
      });
    },

    updateMessageStatus: (messageId, status) => {
      set((state) => {
        const newMessages = { ...state.messages };
        for (const convId of Object.keys(newMessages)) {
          newMessages[convId] = newMessages[convId].map((m) =>
            m.id === messageId || m.metaMessageId === messageId
              ? { ...m, deliveryStatus: status as any }
              : m
          );
        }
        saveLocalCache(state.conversations, newMessages, state.activeConversationId);
        return { messages: newMessages };
      });
    },

    sendTextMessage: (conversationId, text) => {
      const tempId = `temp_${Date.now()}`;
      const optimisticMsg: ChatMessageDTO = {
        id: tempId,
        tenantId: get().tenantId,
        conversationId,
        senderType: 'AGENT',
        senderId: 'current-agent',
        senderName: 'You (Agent)',
        content: text,
        isTemplate: false,
        deliveryStatus: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      set((state) => {
        const updatedMessages = {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] || []), optimisticMsg],
        };
        const updatedConvs = state.conversations.map((c) =>
          c.id === conversationId ? { ...c, lastMessageSnippet: text } : c
        );
        const updatedDrafts = { ...state.drafts };
        delete updatedDrafts[conversationId];

        saveLocalCache(updatedConvs, updatedMessages, state.activeConversationId, updatedDrafts, state.isSoundEnabled);
        return {
          messages: updatedMessages,
          conversations: updatedConvs,
          drafts: updatedDrafts,
        };
      });

      get().socket?.emit('message:send', {
        conversationId,
        content: text,
        isTemplate: false,
      });
    },
  };
});
