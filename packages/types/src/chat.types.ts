export type ChannelType = 'WHATSAPP' | 'MESSENGER' | 'WEB_WIDGET' | 'EMAIL';

export type SenderType = 'CUSTOMER' | 'AGENT' | 'BOT' | 'SYSTEM' | 'CONTACT';

export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface ChatMessageDTO {
  id: string;
  tenantId: string;
  conversationId: string;
  senderType: SenderType;
  senderId: string;
  senderName?: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'audio' | 'video' | 'document' | null;
  isTemplate: boolean;
  templateName?: string | null;
  metaMessageId?: string | null;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
}


export interface ConversationSummaryDTO {
  id: string;
  tenantId: string;
  channel: ChannelType;
  externalThreadId: string;
  contactId: string;
  contactName: string;
  contactPhone?: string | null;
  assignedAgentId?: string | null;
  lastCustomerMessageAt?: string | null;
  windowExpiresAt?: string | null;
  status: 'OPEN' | 'PENDING' | 'RESOLVED';
  lastMessageSnippet: string;
  unreadCount: number;
  updatedAt: string;
}

export interface WindowComplianceDTO {
  canSendFreeForm: boolean;
  remainingMs: number;
  expiresAt: string | null;
  requiresTemplate: boolean;
}
