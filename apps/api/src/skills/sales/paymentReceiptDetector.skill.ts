import { BaseSkill } from '../base.skill';
import { SkillCategory, SkillExecutionContext, SkillParameterSchema, SkillResult } from '../types';
import { localStore } from '../../services/store.service';

/**
 * PaymentReceiptDetectorSkill
 * Triggered when AI detects a payment receipt image or transfer confirmation.
 * Auto-confirms payment and delivers the course Telegram link immediately.
 */
export class PaymentReceiptDetectorSkill extends BaseSkill {
  readonly name = 'payment_receipt_detector';
  readonly displayName = 'تأكيد إيصال الدفع وتسليم الكورس التلقائي 💳';
  readonly category: SkillCategory = 'sales';

  readonly description =
    'يُستدعى عند كشف صورة إيصال دفع أو تحويل بنكي. يؤكد استلام الدفع ويرسل رابط الكورس على تيليجرام تلقائياً بدون تدخل بشري.';

  readonly systemPrompt =
    '[payment_receipt_detector] عند وصول صورة إيصال بنكي أو تحويل مالي (سيريتل كاش / شام كاش / بايبال / بنك / فيزا):\n' +
    '1. استدعِ هذه الأداة فوراً لتأكيد استلام الدفع.\n' +
    '2. بعد التأكيد، أرسل رسالة تهنئة حارة للعميل مع رابط انضمام الكورس التلقائي.\n' +
    '3. لا تنتظر موافقة بشرية لإرسال الرابط — التفعيل آلي فوري.';

  readonly parameters: SkillParameterSchema = {
    type: 'object',
    properties: {
      amount: { type: 'string', description: 'المبلغ المحوّل كما يظهر في الإيصال' },
      bankName: { type: 'string', description: 'اسم البنك أو جهة التحويل (سيريتل كاش، شام كاش، ...)' },
      senderName: { type: 'string', description: 'اسم المحوّل كما في الإيصال (اختياري)' },
      referenceNumber: { type: 'string', description: 'رقم مرجعي للعملية (اختياري)' },
    },
    required: [],
  };

  async execute(
    context: SkillExecutionContext,
    args: { amount?: string; bankName?: string; senderName?: string; referenceNumber?: string }
  ): Promise<SkillResult> {
    const { tenantId, contactPhone } = context;
    const settings = localStore.getSettings(tenantId);
    const telegramUrl = settings.courseAccessTelegramUrl;

    const amountStr = args.amount ? ` بمبلغ ${args.amount}` : '';
    const bankStr = args.bankName ? ` عبر ${args.bankName}` : '';
    const refStr = args.referenceNumber ? ` (رقم العملية: ${args.referenceNumber})` : '';

    // Log payment to customer persistent memory
    if (contactPhone) {
      try {
        const contact = localStore.getContactByPhone(tenantId, contactPhone);
        if (contact) {
          const paymentFact = `دفع الكورس${amountStr}${bankStr}${refStr} بتاريخ ${new Date().toLocaleDateString('ar-SY')}`;
          const existingFacts = contact.memoryFacts || [];
          localStore.updateContactMemory(tenantId, contactPhone, {
            memoryFacts: [...existingFacts, paymentFact],
          });
        }
      } catch (_) { /* non-critical */ }
    }

    let suggestedMessage =
      `مبروك عليك الانضمام! 🎉 الإيصال${amountStr}${bankStr}${refStr} وصلنا بكل سلامة.\n` +
      `الله يعطيك العافية ويبارك في وقتك 🌟\n\n`;

    if (telegramUrl) {
      suggestedMessage +=
        `تفضل رابط مجموعتك على تيليجرام اللي فيها جميع الدروس والمواد:\n` +
        `${telegramUrl}\n\n` +
        `نوّر معنا! ويارب الكورس يفيدك ويكون بالخير والبركة 💪`;
    } else {
      suggestedMessage +=
        `جاري تفعيل انضمامك الآن وسيتواصل معك الفريق خلال دقائق لإرسال رابط الدخول.`;
    }

    return {
      success: true,
      actionTaken: 'PAYMENT_CONFIRMED_AND_COURSE_DELIVERED',
      suggestedMessage,
      data: {
        telegramUrl: telegramUrl || null,
        paymentDetails: { amount: args.amount, bank: args.bankName, ref: args.referenceNumber },
      },
    };
  }
}
