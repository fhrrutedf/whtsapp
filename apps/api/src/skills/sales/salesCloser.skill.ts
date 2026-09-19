import { BaseSkill } from '../base.skill';
import { SkillCategory, SkillExecutionContext, SkillParameterSchema, SkillResult } from '../types';
import { localStore } from '../../services/store.service';

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
        description: 'العملة (مثلاً USD أو SAR)',
      },
    },
  };

  readonly systemPrompt = `
أنت الآن في مرحلة إغلاق البيعة والعميل جاهز للدفع والاشتراك.
- إذا كانت تفاصيل الدفع (رابط إلكتروني معتمد أو حسابات محددة) متوفرة في النظام، قدمها بأسلوب حاسم، مرحب، وواثق.
- إذا لم تكن تفاصيل الحساب المباشرة متوفرة بعد أو رغب العميل بالتحويل داخل سوريا: وضّح له الطرق المعتمدة (سيريتل كاش، شام كاش، الهرم، الفؤاد، بنك بيمو / خارج سوريا: بايبال وبطاقة بنكية) واسأله بلطف عن الطريقة الأنسب له ليتم تزويده بالبيانات الصحيحة وتثبيت مقعده فوراً.
- ⚠️ تحذير حاسم وإلزامي: ممنوع منعاً باتاً كتابة [LINK] أو [اضف رقم الحساب هنا] أو أي كلمات بين أقواس نائبة إطلاقاً! تحدث دائماً كإنسان حقيقي محترف.
`.trim();

  async execute(context: SkillExecutionContext, args: SalesCloserArgs): Promise<SkillResult> {
    const convId = context.conversationId || 'default';
    const settings = localStore.getSettings(context.tenantId);
    
    // Check if real online checkout URL is configured (do not use placeholder yourdomain.com)
    let checkoutUrl = settings.onlinePaymentUrl || '';
    if (!checkoutUrl && settings.checkoutBaseUrl && !settings.checkoutBaseUrl.includes('yourdomain.com')) {
      checkoutUrl = `${settings.checkoutBaseUrl}/${convId}`;
    }

    console.error(
      `[SalesCloserSkill] 🚀 Closing sale for Conversation: ${context.conversationId} | Has URL: ${!!checkoutUrl}`
    );

    let message = '';
    if (checkoutUrl) {
      message = `ممتاز يا غالي، تفضل رابط الدفع المباشر لتفعيل اشتراكك فوراً:\n🔗 ${checkoutUrl}\n\nوأنا معك هنا أول ما تخلص لنباشر خطوة بخطوة. ✨`;
    } else {
      message = `ع راسي يا غالي، اختيار ممتاز والله يباركلك! 🌸\nالكورس بسعر الإطلاق المخفض (22$ فقط) دفعة واحدة ومدى الحياة.\n\nلتثبيت مقعدك وتفعيل اشتراكك فوراً، اتركلي اسمك الثلاثي ومادتك التدريسية حتى حوّلك فوراً للمدرب أ. نواف ليزودك برابط وتفاصيل الدفع بثواني. 😊✨`;
    }

    return {
      success: true,
      actionTaken: 'PAYMENT_LINK_GENERATED',
      data: {
        checkoutUrl: checkoutUrl || undefined,
        conversationId: convId,
        productOrPlan: args.productOrPlan,
        amount: args.amount,
        currency: args.currency || 'USD',
      },
      suggestedMessage: message,
    };
  }
}
