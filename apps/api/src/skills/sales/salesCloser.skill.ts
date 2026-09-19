import { BaseSkill } from '../base.skill';
import { SkillCategory, SkillExecutionContext, SkillParameterSchema, SkillResult } from '../types';

export interface SalesCloserArgs {
  productOrPlan?: string;
  amount?: number;
  currency?: string;
}

export class SalesCloserSkill extends BaseSkill {
  readonly name = 'sales_closer';
  readonly displayName = 'خبير إغلاق الصفقات وتوليد روابط الدفع (Sales Closer)';
  readonly category: SkillCategory = 'sales';

  readonly description =
    'تُستدعى عندما يظهر المستخدم صراحة نية عالية للدفع، الاشتراك، أو الشراء (مثل: بدي ادفع، كيف اشترك، ابعت الرابط).';

  readonly parameters: SkillParameterSchema = {
    type: 'object',
    properties: {
      productOrPlan: {
        type: 'string',
        description: 'اسم الباقة أو الخدمة أو المنتج المراد شراؤه',
      },
      amount: {
        type: 'number',
        description: 'المبلغ الإجمالي للدفع إن وُجد',
      },
      currency: {
        type: 'string',
        description: 'العملة (مثلاً SAR أو USD)',
      },
    },
  };

  readonly systemPrompt = `
أنت الآن في مرحلة إغلاق البيعة. العميل جاهز للدفع. يمنع منعاً باتاً طرح أي أسئلة إضافية أو طلب تلخيص. قدم رابط الدفع بأسلوب حاسم، مرحب، وواثق. استخدم عبارات مثل: 'ممتاز يا غالي، تفضل رابط الدفع المباشر لتفعيل اشتراكك فوراً: [LINK]. وأنا معك هنا أول ما تخلص'. لا تضف أي حشو كلامي.
`.trim();

  async execute(context: SkillExecutionContext, args: SalesCloserArgs): Promise<SkillResult> {
    const convId = context.conversationId || 'default';
    const checkoutUrl = `https://pay.yourdomain.com/checkout/${convId}`;

    console.error(
      `[SalesCloserSkill] 🚀 Generated Checkout URL for Conversation: ${context.conversationId} | URL: ${checkoutUrl}`
    );

    const message = `ممتاز يا غالي، تفضل رابط الدفع المباشر لتفعيل اشتراكك فوراً:\n🔗 ${checkoutUrl}\n\nوأنا معك هنا أول ما تخلص.`;

    return {
      success: true,
      actionTaken: 'PAYMENT_LINK_GENERATED',
      data: {
        checkoutUrl,
        conversationId: convId,
        productOrPlan: args.productOrPlan,
        amount: args.amount,
        currency: args.currency || 'SAR',
      },
      suggestedMessage: message,
    };
  }
}
