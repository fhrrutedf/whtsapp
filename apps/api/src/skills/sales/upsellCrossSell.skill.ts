import { BaseSkill } from '../base.skill';
import { SkillCategory, SkillExecutionContext, SkillParameterSchema, SkillResult } from '../types';

export interface UpsellArgs {
  baseProductOrPlan: string;
  recommendedAddon: string;
  discountPercentage?: number;
  reasonForRecommendation?: string;
}

export class UpsellCrossSellSkill extends BaseSkill {
  readonly name = 'upsell_cross_sell';
  readonly displayName = 'خبير البيع الإضافي والمتقاطع (Upsell & Cross-Sell)';
  readonly category: SkillCategory = 'sales';

  readonly description =
    'تُستدعى عندما يقرر العميل شراء باقة أو منتج، لاقتراح ميزة مكملة أو باقة إضافية بخصم حصري ومؤقت لزيادة قيمة الصفقة.';

  readonly parameters: SkillParameterSchema = {
    type: 'object',
    properties: {
      baseProductOrPlan: {
        type: 'string',
        description: 'الباقة أو المنتج الأساسي الذي اختاره العميل',
      },
      recommendedAddon: {
        type: 'string',
        description: 'الخدمة أو الميزة المكملة المقترحة (مثل: دعم VIP، رصيد رسائل مضاعف، ربط إضافي)',
      },
      discountPercentage: {
        type: 'number',
        description: 'نسبة الخصم الحصري الممنوحة للإضافة (افتراضي 30% إلى 50%)',
      },
      reasonForRecommendation: {
        type: 'string',
        description: 'الفائدة المباشرة للعميل من إضافة هذه الميزة الآن',
      },
    },
    required: ['baseProductOrPlan', 'recommendedAddon'],
  };

  readonly systemPrompt = `
أنت خبير تعظيم قيمة الصفقة (Upsell & Cross-Sell Specialist).
توقيتك المثالي هو "فور موافقة العميل على الباقة الأساسية وقبل إغلاق الحديث نهائياً".

#### 1. النبرة والأسلوب:
- تحدث بنبرة المحب الناصح الذي يقدم "فرصة حصرية" وليس كبائع جشع يحاول فرض بضاعة إضافية:
  "ألف مبروك اختيارك يا غالي.. وبما إنك عم تبدأ معنا اليوم كعميل جديد، حابب أقدملك ميزة حصرية بتفيدك كتير..."
- اجعل العرض مرتبطاً بنجاحه في الباقة الأساسية: "لحتى تضمن أعلى نتيجة من أول أسبوع، بننصحك تضيف..."

#### 2. التكتيك:
1. التهنئة بالباقة الأساسية.
2. تقديم الإضافة كعرض خاص لليوم فقط (Special Onboarding Deal).
3. توضيح الفارق مع الخصم: "بدل ما تدفع سعرها كامل بعدين، بنضيفلك ياها اليوم بخصم خاص".
`.trim();

  async execute(context: SkillExecutionContext, args: UpsellArgs): Promise<SkillResult> {
    const discount = args.discountPercentage || 40;
    const addon = args.recommendedAddon;
    const base = args.baseProductOrPlan;

    console.error(
      `[UpsellCrossSellSkill] 🎁 Generated Upsell for ${context.conversationId}: ${addon} (${discount}% OFF)`
    );

    const pitch = `ألف مبروك اختيارك لـ (${base}) يا غالي! 🌟\nوعلشان تنطلق بأقوى أداء من أول يوم، في عندنا عرض ترحيبي خاص لليوم فقط: شو رأيك نفعّل لك (${addon}) بخصم ${discount}% فوري مع باقتك؟`;

    return {
      success: true,
      actionTaken: 'UPSELL_OFFER_GENERATED',
      data: {
        baseProduct: base,
        recommendedAddon: addon,
        discountPercentage: discount,
        reason: args.reasonForRecommendation || 'تسريع النتائج وتحقيق أفضل أداء',
      },
      suggestedMessage: pitch,
    };
  }
}
