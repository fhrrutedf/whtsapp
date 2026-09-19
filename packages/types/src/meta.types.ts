// Meta WhatsApp Cloud API Webhook Types

export interface MetaWebhookEntry {
  id: string;
  changes: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  field: string;
  value: MetaWebhookValue;
}

export interface MetaWebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: {
      name: string;
    };
    wa_id: string;
  }>;
  messages?: MetaIncomingMessage[];
  statuses?: MetaMessageStatus[];
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
}

export type MetaMessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'interactive' | 'button' | 'location';

export interface MetaIncomingMessage {
  from: string; // WhatsApp ID / Phone number
  id: string;   // wamid.HBg...
  timestamp: string;
  type: MetaMessageType;
  text?: {
    body: string;
  };
  image?: {
    mime_type: string;
    sha256: string;
    id: string;
    caption?: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  context?: {
    from: string;
    id: string;
  };
}

export interface MetaMessageStatus {
  id: string; // message ID
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  conversation?: {
    id: string;
    origin?: {
      type: 'user_initiated' | 'business_initiated' | 'referral_conversion';
    };
    expiration_timestamp?: string;
  };
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
  }>;
}

export interface MetaWebhookPayload {
  object: 'whatsapp_business_account';
  entry: MetaWebhookEntry[];
}
