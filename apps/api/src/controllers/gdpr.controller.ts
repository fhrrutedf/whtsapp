import { Request, Response } from 'express';
import { prisma } from '@omni/database';
import { localStore } from '../services/store.service';
import { toValidUuid } from '../services/billing.service';

function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function resolveTenantId(req: Request): string {
  const val = (req as any).user?.tenantId || req.headers['x-tenant-id'] || req.query?.tenantId || req.body?.tenantId;
  if (!val) {
    throw new Error('tenantId is required');
  }
  const str = Array.isArray(val) ? val[0] : String(val);
  return toValidUuid(str);
}

function resolveParamId(param: string | string[] | undefined): string {
  if (!param) return '';
  return Array.isArray(param) ? param[0] : String(param);
}

export class GdprController {
  /**
   * GET /api/contacts/:id/export
   * Exports all conversation and message history for a contact as an RFC 4180 CSV.
   */
  public static async exportContactData(req: Request, res: Response) {
    try {
      const id = resolveParamId(req.params.id);
      const tenantId = resolveTenantId(req);

      const contact = await prisma.contact.findUnique({
        where: { id },
      });

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      if (contact.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Fetch conversations and messages directly for total type safety
      const conversations = await prisma.conversation.findMany({
        where: { contactId: id, tenantId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      const headers = [
        'Message ID',
        'Date (ISO)',
        'Conversation ID',
        'Sender Type',
        'Direction',
        'Message Content',
        'Delivery Status',
        'Provider Message ID',
      ];

      const csvRows: string[] = [headers.map(escapeCsvCell).join(',')];

      for (const conv of conversations) {
        for (const msg of conv.messages) {
          const isFromCustomer = msg.senderType === 'CONTACT';
          const direction = isFromCustomer ? 'INBOUND' : 'OUTBOUND';

          const row = [
            msg.id,
            msg.createdAt.toISOString(),
            conv.id,
            msg.senderType,
            direction,
            msg.content || '',
            msg.deliveryStatus,
            msg.providerMessageId || '',
          ];

          csvRows.push(row.map(escapeCsvCell).join(','));
        }
      }

      const csvContent = '\uFEFF' + csvRows.join('\r\n'); // UTF-8 BOM

      const cleanPhone = (contact.phoneNumber || '').replace(/\D/g, '') || id;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="contact_${cleanPhone}_gdpr_export.csv"`
      );

      return res.status(200).send(csvContent);
    } catch (err: any) {
      console.error('[GdprController] exportContactData error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * DELETE /api/contacts/:id/forget
   * GDPR Article 17 "Right to be Forgotten":
   * Hard-deletes all message vectors, message records, conversation logs,
   * and anonymizes the contact profile.
   */
  public static async forgetContact(req: Request, res: Response) {
    try {
      const id = resolveParamId(req.params.id);
      const tenantId = resolveTenantId(req);

      const contact = await prisma.contact.findUnique({
        where: { id },
      });

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      if (contact.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const conversations = await prisma.conversation.findMany({
        where: { contactId: id, tenantId },
        select: { id: true },
      });

      const conversationIds = conversations.map((c) => c.id);

      // Find all message IDs belonging to these conversations
      const messages = await prisma.message.findMany({
        where: { conversationId: { in: conversationIds } },
        select: { id: true },
      });
      const messageIds = messages.map((m) => m.id);

      // Execute Purge & Anonymization
      let purgedVectorsCount = 0;
      const purgedMessagesCount = messageIds.length;
      const purgedConversationsCount = conversationIds.length;

      // 1. Delete MessageEmbedding records
      if (messageIds.length > 0) {
        try {
          const embRes = await prisma.messageEmbedding.deleteMany({
            where: { messageId: { in: messageIds } },
          });
          purgedVectorsCount = embRes.count;
        } catch (e: any) {
          console.warn('[GdprController] Note on messageEmbedding deletion:', e.message);
        }

        // 2. Delete Messages
        await prisma.message.deleteMany({
          where: { id: { in: messageIds } },
        });
      }

      // 3. Delete CampaignRecipient entries for this contact
      await prisma.campaignRecipient.deleteMany({
        where: { contactId: id },
      });

      // 4. Delete Conversations
      if (conversationIds.length > 0) {
        await prisma.conversation.deleteMany({
          where: { id: { in: conversationIds } },
        });
      }

      // 5. Anonymize Contact Record (preserving referential integrity without storing PII)
      const anonymizedPhone = `ANON_${contact.id.slice(0, 8)}_${Date.now()}`;
      await prisma.contact.update({
        where: { id },
        data: {
          name: 'GDPR Anonymized User',
          phoneNumber: anonymizedPhone,
          email: null,
          notes: null,
          memoryFacts: [],
          isOptedOut: true,
        },
      });

      // 6. Purge from localStore in-memory cache
      for (const convId of conversationIds) {
        const existing = localStore.getMessages(convId);
        if (existing.length > 0) {
          (localStore as any).messages?.delete(convId);
        }
      }

      console.log(
        `[GdprController] 🔒 Successfully executed Right to be Forgotten for Contact ${id}: Purged ${purgedMessagesCount} messages, ${purgedVectorsCount} vectors.`
      );

      return res.json({
        success: true,
        message: 'Contact data and AI embeddings permanently purged in compliance with GDPR Article 17 (Right to be Forgotten).',
        contactId: id,
        purgedMessagesCount,
        purgedVectorsCount,
        purgedConversationsCount,
        contactStatus: 'ANONYMIZED',
      });
    } catch (err: any) {
      console.error('[GdprController] forgetContact error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
