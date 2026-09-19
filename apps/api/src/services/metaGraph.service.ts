import axios, { AxiosError } from 'axios';
import { prisma } from '@omni/database';
import { ComplianceService } from './compliance.service';

export interface SendWhatsAppTextMessageParams {
  tenantId: string;
  conversationId: string;
  toPhone: string;
  phoneNumberId: string;
  accessToken: string;
  text: string;
}

export interface SendWhatsAppTemplateMessageParams {
  tenantId: string;
  conversationId: string;
  toPhone: string;
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  languageCode: string;
  components?: any[];
}

export class MetaGraphService {
  private static readonly GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';

  /**
   * Dispatches free-form text message to WhatsApp Cloud API.
   * Performs 24-hour window compliance check and outgoing rate-limit throttling first.
   */
  public static async sendTextMessage(params: SendWhatsAppTextMessageParams): Promise<{ metaMessageId: string }> {
    const { tenantId, conversationId, toPhone, phoneNumberId, accessToken, text } = params;

    // 1. Check 24-Hour Rule
    const windowStatus = await ComplianceService.checkConversationWindow(tenantId, conversationId);
    if (windowStatus.requiresTemplate) {
      throw new Error(
        'POLICY_VIOLATION_24H_RULE: The 24-hour customer window is closed. You must send a pre-approved template message.'
      );
    }

    // 2. Throttle outgoing messages per tenant
    const rateLimit = await ComplianceService.throttleOutgoingMessage(tenantId);
    if (!rateLimit.allowed) {
      throw new Error(`RATE_LIMIT_EXCEEDED: Retry after ${rateLimit.retryAfterMs}ms`);
    }

    const url = `https://graph.facebook.com/${this.GRAPH_API_VERSION}/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    return this.executeWithExponentialBackoff(async () => {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const messageId = response.data?.messages?.[0]?.id;
      return { metaMessageId: messageId };
    });
  }

  /**
   * Dispatches pre-approved Meta template message to WhatsApp Cloud API.
   * Allowed at ANY time, even if the 24-hour window is closed.
   */
  public static async sendTemplateMessage(params: SendWhatsAppTemplateMessageParams): Promise<{ metaMessageId: string }> {
    const { tenantId, toPhone, phoneNumberId, accessToken, templateName, languageCode, components } = params;

    const rateLimit = await ComplianceService.throttleOutgoingMessage(tenantId);
    if (!rateLimit.allowed) {
      throw new Error(`RATE_LIMIT_EXCEEDED: Retry after ${rateLimit.retryAfterMs}ms`);
    }

    const url = `https://graph.facebook.com/${this.GRAPH_API_VERSION}/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode || 'ar',
        },
        components: components || [],
      },
    };

    return this.executeWithExponentialBackoff(async () => {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const messageId = response.data?.messages?.[0]?.id;
      return { metaMessageId: messageId };
    });
  }

  /**
   * Resilient execution with exponential backoff for network/5xx failures
   */
  private static async executeWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isAxiosError = axios.isAxiosError(error);
      const status = isAxiosError ? error.response?.status : null;

      // Do not retry 4xx errors except 429
      if (status && status >= 400 && status < 500 && status !== 429) {
        console.error('Meta API Client Error:', error.response?.data);
        throw new Error(`Meta API Client Error: ${JSON.stringify(error.response?.data)}`);
      }

      if (retries <= 1) {
        throw error;
      }

      console.warn(`[Meta API Retry] Retrying request in ${delay}ms... attempts left: ${retries - 1}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.executeWithExponentialBackoff(operation, retries - 1, delay * 2);
    }
  }
}
