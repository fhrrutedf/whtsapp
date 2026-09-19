import { BaseSkill } from '../base.skill';
import { SkillCategory, SkillExecutionContext, SkillParameterSchema, SkillResult } from '../types';

export interface CartRecoveryArgs {
  abandonedPlanOrProduct: string;
  hoursElapsedSinceLinkSent?: number;
  obstacleType?: 'TECHNICAL_OR_PAYMENT_ISSUE' | 'HESITATION' | 'DISTRACTED' | 'BUDGET';
}

export class CartRecoverySkill extends BaseSkill {
  readonly name = 'cart_recovery';
  readonly displayName = 'خبير استعادة السلات المتروكة والصفقات المعلقة (Cart Recovery)';
  readonly category: SkillCategory = 'sales';

  readonly description =
    'تُستدعى لمتابعة العملاء الذين أخذوا رابط الدفع أو أبدوا رغبة بالشراء ولم يكملوا العملية بعد فترة زمنية، لتذليل عائق الدفع واستعادة الصفقة بلطف.';

  readonly parameters: SkillParameterSchema = {
    type: 'object',
    properties: {
      abandonedPlanOrProduct: {
        type: 'string',
        description: 'اسم الباقة أو المنتج الذي أخذ العميل رابطه ولم يسدد',
      },
      hoursElapsedSinceLinkSent: {
        type: 'number',
        description: 'عدد الساعات التقريبية التي مرت منذ إرسال الرابط (مثلاً 2، 12، 24)',
      },
      obstacleType: {
        type: 'string',
        description: 'العائق المتوقع (مشكلة دفع بنكي، تردد، انشغال)',
        enum: ['TECHNICAL_OR_PAYMENT_ISSUE', 'HESITATION', 'DISTRACTED', 'BUDGET'],
      },
    },
    required: ['abandonedPlanOrProduct'],
  };

  readonly systemPrompt = `
أنت خبير استعادة الزبائن دون إلحاح مزعج (Gentle Cart Recovery Specialist).
عند متابعة عميل لم يكمل الدفع، تذكر أن أغلب أسباب عدم الإكمال هي "انشغال مفاجئ" أو "رفض بطاقة بنكية" أو "تردد أخير".

#### 1. النبرة والأسلوب:
- تحدث بنبرة ودية غير ضاغطة تركز على "المساعدة والاطمئنان" وليس على "المطالبة بالفلوس":
  "يا هلا يا غالي.. طمني شفتك ما كملت عملية التفعيل، واجهتك أي مشكلة برابط الدفع أو البطاقة؟"
- اعرض طرقاً بديلة إذا كان البنك يرفض: "لو بتفضل تحويل بنكي مباشر أو طريقة تانية تكرم عينك بنرتبها معك."

#### 2. التكتيك:
- لا تعاتبه ولا تستعجله بشكل فج.
- ذكّره بأن مكانه أو العرض لا يزال محفوظاً له مؤقتاً لمساعدته.
`.trim();

  async execute(context: SkillExecutionContext, args: CartRecoveryArgs): Promise<SkillResult> {
    const plan = args.abandonedPlanOrProduct;
    const hours = args.hoursElapsedSinceLinkSent || 4;

    console.error(
      `[CartRecoverySkill] 🛒 Triggering cart recovery for ${context.contactPhone} | Plan: ${plan} | Elapsed: ${hours}h`
    );

    const message = `يا هلا يا غالي.. طمني شفتك ما كملت عملية تفعيل (${plan})، واجهتك أي مشكلة بالرابط أو بطاقة الدفع؟ أنا معك لو حابب نساعدك أو تفضل طريقة دفع بديلة.`;

    return {
      success: true,
      actionTaken: 'RECOVERY_FOLLOWUP_DISPATCHED',
      data: {
        plan,
        hoursElapsed: hours,
        recoveryStatus: 'PENDING_CUSTOMER_FEEDBACK',
      },
      suggestedMessage: message,
    };
  }
}
