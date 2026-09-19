import { ChatMessageDTO, ConversationSummaryDTO } from './chat.types';

export interface ServerToClientEvents {
  'message:new': (payload: { message: ChatMessageDTO; windowExpiresAt?: string | null }) => void;
  'message:status': (payload: { messageId: string; status: string }) => void;
  'conversation:updated': (payload: ConversationSummaryDTO) => void;
  'agent:typing': (payload: { conversationId: string; agentId: string; isTyping: boolean }) => void;
  'whatsapp:qr': (payload: { tenantId: string; channelConfigId?: string; qr: string; qrDataUrl?: string }) => void;
  'whatsapp:connected': (payload: { tenantId: string; channelConfigId?: string; phone: string }) => void;
  'whatsapp:disconnected': (payload: { tenantId: string; channelConfigId?: string; reason?: string; willReconnect?: boolean }) => void;
  'conversation:assigned': (payload: {
    conversationId: string;
    teamId: string | null;
    teamName?: string | null;
    keyword?: string;
    customerPhone?: string;
    timestamp: string;
  }) => void;
}

export interface ClientToServerEvents {
  'join:tenant': (payload: { tenantId: string }) => void;
  'leave:tenant': (payload: { tenantId: string }) => void;
  'message:send': (payload: {
    conversationId: string;
    content: string;
    isTemplate?: boolean;
    templateName?: string;
    templateParams?: Record<string, string>;
  }) => void;
  'whatsapp:send': (payload: {
    conversationId?: string;
    toPhone?: string;
    content: string;
  }) => void;
  'typing:start': (payload: { conversationId: string }) => void;
  'typing:stop': (payload: { conversationId: string }) => void;
}

