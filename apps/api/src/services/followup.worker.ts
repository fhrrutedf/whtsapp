/**
 * FollowUpWorker — Automated Lead Nurturing & Re-Engagement Engine
 *
 * Runs as a background interval. For every tenant with followUpEnabled=true,
 * scans inactive conversations and sends a warm follow-up message to re-engage leads.
 */
import { localStore } from './store.service';
import { whatsAppManager } from './whatsapp.service';

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

const followUpTemplates = [
  (name: string) =>
    `أهلاً ${name || ''} 👋 كنت بدي أسألك إذا في شي ما وضّح معك أو بتحتاج مساعدة قبل ما تقرر؟`,
  (name: string) =>
    `${name ? name + '،' : ''} مرحباً 😊 كنت بدي أعرف إذا الكورس مازال يناسبك وعندك أسئلة؟`,
  (name: string) =>
    `هلا ${name || ''} 🌟 الباقات المحدودة عم تنتهي بسرعة وكنت بدي أتأكد إنك ما تضيّع الفرصة. شو رأيك؟`,
  (name: string) =>
    `${name ? name + '،' : ''} صراحةً كثير من اللي اشتركوا كانوا عم يفكروا مثلك. تحب نحكي؟ 😊`,
];

// In-memory set to avoid re-sending within 24h (resets on server restart which is fine)
const recentlySent = new Map<string, number>();

function getTemplate(name: string): string {
  const fn = followUpTemplates[Math.floor(Math.random() * followUpTemplates.length)];
  return fn(name);
}

async function runFollowUps() {
  // Get all tenants by inspecting the settings store keys
  const allConversations = (localStore as any).data?.conversations as Record<string, any[]> | undefined;
  if (!allConversations) return;

  // Extract unique tenantIds from conversation keys (format: "tenantId:phone")
  const tenantIds = new Set<string>();
  Object.keys(allConversations).forEach((key) => {
    const parts = key.split(':');
    if (parts.length >= 2) tenantIds.add(parts[0]);
  });

  // Also check settings for any tenants that registered settings
  const allSettings = (localStore as any).data?.settings as Record<string, any> | undefined;
  if (allSettings) {
    Object.keys(allSettings).forEach((tid) => tenantIds.add(tid));
  }

  const now = Date.now();
  const SENT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

  for (const tenantId of tenantIds) {
    const settings = localStore.getSettings(tenantId);
    if (!settings.followUpEnabled) continue;
    if (!settings.geminiAutoReplyEnabled && !settings.aiProvider) continue;

    const delayHours =
      typeof settings.followUpDelayHours === 'number' ? settings.followUpDelayHours : 2;
    const delayMs = delayHours * 60 * 60 * 1000;
    const cutoff = new Date(now - delayMs).toISOString();
    const upperCutoff = new Date(now - delayMs - 6 * 60 * 60 * 1000).toISOString();

    const conversations = localStore.getConversations(tenantId);

    for (const conv of conversations) {
      const { contactPhone, lastActivityAt } = conv;
      if (!lastActivityAt) continue;

      // Only target conversations inactive between delayHours and (delayHours + 6h)
      if (lastActivityAt >= cutoff || lastActivityAt < upperCutoff) continue;

      // Cooldown check
      const cacheKey = `${tenantId}:${contactPhone}`;
      const lastSent = recentlySent.get(cacheKey);
      if (lastSent && now - lastSent < SENT_COOLDOWN) continue;

      // Skip opted-out contacts
      const contact = localStore.getContactByPhone(tenantId, contactPhone);
      if (contact?.isOptedOut) continue;

      const name =
        contact?.name && contact.name !== contactPhone ? contact.name.split(' ')[0] : '';
      const message = getTemplate(name);

      try {
        await whatsAppManager.sendMessage(tenantId, contactPhone, message);
        recentlySent.set(cacheKey, now);

        console.error(
          `[FollowUpWorker] ✅ Follow-up sent → ${contactPhone} (tenant: ${tenantId})`
        );
      } catch (err: any) {
        console.error(
          `[FollowUpWorker] ❌ Failed → ${contactPhone}:`,
          err.message
        );
      }
    }
  }
}

export function startFollowUpWorker() {
  console.error('[FollowUpWorker] 🚀 Automated follow-up worker started (every 15 min)');
  // Delay initial run by 3 minutes to let WA clients fully connect
  setTimeout(() => {
    runFollowUps().catch((e) => console.error('[FollowUpWorker] Runtime error:', e));
  }, 3 * 60 * 1000);

  setInterval(() => {
    runFollowUps().catch((e) => console.error('[FollowUpWorker] Runtime error:', e));
  }, CHECK_INTERVAL_MS);
}
