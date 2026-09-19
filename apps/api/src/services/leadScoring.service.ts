/**
 * LeadScoringService
 * Analyzes conversation history and auto-updates the contact interest level in DB.
 * Called after every AI reply to keep the CRM fresh and accurate.
 *
 * Interest Levels:
 *   UNKNOWN       — new, no signal yet
 *   COLD          — responded but no interest expressed
 *   WARM          — asking questions, curious
 *   HOT           — asking price, asking to pay, strong buying signals
 *   PAID          — confirmed payment
 *   UNINTERESTED  — said no, asked to stop
 */
import { prisma } from '@omni/database';
import { ChatContextMessage } from './gemini.service';
import { localStore } from './store.service';

export interface LeadScore {
  level: 'UNKNOWN' | 'COLD' | 'WARM' | 'HOT' | 'PAID' | 'UNINTERESTED';
  score: number; // 0-100
  notes: string;
}

// Phone number → country mapping (prefix based)
const COUNTRY_PREFIXES: { prefix: string; code: string; name: string }[] = [
  { prefix: '963', code: 'SY', name: 'سوريا' },
  { prefix: '966', code: 'SA', name: 'السعودية' },
  { prefix: '971', code: 'AE', name: 'الإمارات' },
  { prefix: '962', code: 'JO', name: 'الأردن' },
  { prefix: '961', code: 'LB', name: 'لبنان' },
  { prefix: '964', code: 'IQ', name: 'العراق' },
  { prefix: '965', code: 'KW', name: 'الكويت' },
  { prefix: '974', code: 'QA', name: 'قطر' },
  { prefix: '973', code: 'BH', name: 'البحرين' },
  { prefix: '968', code: 'OM', name: 'عُمان' },
  { prefix: '967', code: 'YE', name: 'اليمن' },
  { prefix: '20',  code: 'EG', name: 'مصر' },
  { prefix: '212', code: 'MA', name: 'المغرب' },
  { prefix: '216', code: 'TN', name: 'تونس' },
  { prefix: '213', code: 'DZ', name: 'الجزائر' },
  { prefix: '249', code: 'SD', name: 'السودان' },
  { prefix: '218', code: 'LY', name: 'ليبيا' },
  { prefix: '970', code: 'PS', name: 'فلسطين' },
  { prefix: '1',   code: 'US', name: 'الولايات المتحدة' },
  { prefix: '44',  code: 'GB', name: 'بريطانيا' },
  { prefix: '49',  code: 'DE', name: 'ألمانيا' },
  { prefix: '33',  code: 'FR', name: 'فرنسا' },
  { prefix: '46',  code: 'SE', name: 'السويد' },
  { prefix: '31',  code: 'NL', name: 'هولندا' },
  { prefix: '47',  code: 'NO', name: 'النرويج' },
  { prefix: '45',  code: 'DK', name: 'الدنمارك' },
  { prefix: '90',  code: 'TR', name: 'تركيا' },
  { prefix: '7',   code: 'RU', name: 'روسيا' },
];

export function detectCountry(phoneNumber: string): { code: string; name: string } | null {
  const clean = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
  const sorted = [...COUNTRY_PREFIXES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const entry of sorted) {
    if (clean.startsWith(entry.prefix)) {
      return { code: entry.code, name: entry.name };
    }
  }
  return null;
}

// Keywords for scoring
const HOT_KEYWORDS = [
  'بدي اشترك', 'اشتراك', 'كيف ادفع', 'كيف الدفع', 'رابط الدفع', 'باركود',
  'قنص', 'سعر', 'كم السعر', 'how much', 'price', 'subscribe', 'pay',
  'بدي اسجل', 'اسجلني', 'ارسل الرابط', 'كيف التسجيل', 'بكم', 'بدي اشتري',
];
const WARM_KEYWORDS = [
  'كيف', 'شو', 'ما هو', 'ايش', 'وين', 'متى', 'ليش', 'هل', 'ممكن', 'اخبرني',
  'what is', 'how', 'tell me', 'info', 'معلومات', 'تفاصيل', 'شرح', 'وضح',
  'ايه', 'عايز اعرف', 'بتعلم', 'الكورس', 'course', 'بما يخص',
];
const UNINTERESTED_KEYWORDS = [
  'لا شكرا', 'مش مهتم', 'مو مهتم', 'stop', 'بوقف', 'مش محتاج', 'مو محتاج',
  'لا يهمني', 'not interested', 'no thanks', 'please stop', 'ما بدي',
];
const PAID_KEYWORDS = [
  'دفعت', 'حولت', 'ارسلت الإيصال', 'تمام دفعت', 'تم الدفع',
  'paid', 'transferred', 'sent receipt', 'payment done',
];

export function scoreConversation(history: ChatContextMessage[]): LeadScore {
  const customerMessages = history
    .filter((m) => m.senderType === 'CUSTOMER' || m.senderType === 'CONTACT')
    .map((m) => (typeof m.content === 'string' ? m.content : '').toLowerCase());

  const allText = customerMessages.join(' ');
  const messageCount = customerMessages.length;

  // Check PAID first (highest priority)
  if (PAID_KEYWORDS.some((k) => allText.includes(k.toLowerCase()))) {
    return { level: 'PAID', score: 100, notes: 'أكّد العميل إتمام الدفع' };
  }

  // Check UNINTERESTED
  if (UNINTERESTED_KEYWORDS.some((k) => allText.includes(k.toLowerCase()))) {
    return { level: 'UNINTERESTED', score: 5, notes: 'أبدى العميل عدم الاهتمام' };
  }

  // Score HOT signals
  const hotMatches = HOT_KEYWORDS.filter((k) => allText.includes(k.toLowerCase()));
  if (hotMatches.length >= 1 || allText.includes('سعر') || allText.includes('price')) {
    const score = Math.min(90, 70 + hotMatches.length * 5);
    return {
      level: 'HOT',
      score,
      notes: `إشارات شراء قوية: ${hotMatches.slice(0, 3).join('، ')}`,
    };
  }

  // Score WARM signals
  const warmMatches = WARM_KEYWORDS.filter((k) => allText.includes(k.toLowerCase()));
  if (warmMatches.length >= 2 || messageCount >= 3) {
    const score = Math.min(65, 35 + warmMatches.length * 5 + messageCount * 2);
    return {
      level: 'WARM',
      score,
      notes: `استفسارات متعددة (${messageCount} رسائل)`,
    };
  }

  // COLD — responded but no strong signal
  if (messageCount >= 1) {
    return {
      level: 'COLD',
      score: Math.min(30, 10 + messageCount * 3),
      notes: 'تواصل مع وجود اهتمام ضعيف',
    };
  }

  return { level: 'UNKNOWN', score: 0, notes: 'لا رسائل بعد' };
}

/**
 * Main entry point: called after every customer interaction to update the DB
 */
export async function updateContactLeadScore(
  tenantId: string,
  phoneNumber: string,
  history: ChatContextMessage[],
  extras?: { paidAt?: Date; courseDeliveredAt?: Date; pushName?: string }
): Promise<void> {
  const score = scoreConversation(history);
  const country = detectCountry(phoneNumber);

  try {
    // Read current customAttributes first
    const existing = await prisma.contact.findFirst({
      where: { tenantId, phoneNumber },
      select: { customAttributes: true },
    });
    const current = (existing?.customAttributes as Record<string, any>) || {};

    const updatedAttrs: Record<string, any> = {
      ...current,
      interest_level: score.level,
      interest_score: score.score,
      interest_notes: score.notes,
      last_interest_updated_at: new Date().toISOString(),
    };

    if (country) {
      updatedAttrs.country_code = country.code;
      updatedAttrs.country_name = country.name;
    }
    if (extras?.paidAt) updatedAttrs.paid_at = extras.paidAt.toISOString();
    if (extras?.courseDeliveredAt) updatedAttrs.course_delivered_at = extras.courseDeliveredAt.toISOString();
    if (extras?.pushName) updatedAttrs.whatsapp_push_name = extras.pushName;

    await prisma.contact.updateMany({
      where: { tenantId, phoneNumber },
      data: { customAttributes: updatedAttrs },
    });

    // Also update local store pushName if provided
    if (extras?.pushName) {
      const contact = localStore.getContactByPhone(tenantId, phoneNumber);
      if (contact && !contact.whatsappPushName) {
        localStore.updateContactMemory(tenantId, phoneNumber, {});
        // Note: whatsappPushName is on the StoredContact but updateContactMemory
        // only handles name/notes/memoryFacts. We rely on upsertContact for this.
      }
    }
  } catch (err: any) {
    // Non-critical — don't block the main flow
    console.error('[LeadScoring] Failed to update score:', err.message);
  }
}

