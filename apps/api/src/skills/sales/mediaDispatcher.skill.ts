import { BaseSkill } from '../base.skill';
import { SkillCategory, SkillExecutionContext, SkillParameterSchema, SkillResult } from '../types';
import { localStore } from '../../services/store.service';

export interface MediaDispatcherArgs {
  mediaCategory: 'brochure' | 'packages' | 'payment_qr' | 'catalog' | 'product_photo';
  productName?: string;
  captionText?: string;
}

export class MediaDispatcherSkill extends BaseSkill {
  readonly name = 'media_dispatcher';
  readonly displayName = 'خبير إرسال الصور والكتالوجات والبروشورات (Media Dispatcher)';
  readonly category: SkillCategory = 'sales';

  readonly description =
    'تُستدعى عندما يطلب العميل صراحة صوراً، بروشور باقات، كتالوج منتجات، أو باركود دفع (مثل: ارسل لي صور الباقات، وريني صورة المنتج، ابعتلي باركود الدفع).';

  readonly parameters: SkillParameterSchema = {
    type: 'object',
    properties: {
      mediaCategory: {
        type: 'string',
        enum: ['brochure', 'packages', 'payment_qr', 'catalog', 'product_photo'],
        description: 'تصنيف الصورة المطلوبة: بروشور، باقات، باركود دفع، أو كتالوج',
      },
      productName: {
        type: 'string',
        description: 'اسم المنتج أو الخدمة المراد إرسال صورتها إن وُجد',
      },
      captionText: {
        type: 'string',
        description: 'النص التوضيحي أو الترحيبي المصاحب للصورة',
      },
    },
    required: ['mediaCategory'],
  };

  readonly systemPrompt = `
عندما يطلب العميل رؤية بروشور الأسعار، باقات الاشتراك، باركود الدفع، أو صور المنتجات:
استدعِ أداة media_dispatcher فوراً مع تحديد mediaCategory المناسبة.
قدم النص المصاحب بأسلوب ودود ولطيف كإنسان على الواتساب.
`.trim();

  async execute(context: SkillExecutionContext, args: MediaDispatcherArgs): Promise<SkillResult> {
    const tenantId = context.tenantId || 'demo-tenant-1';
    const settings = localStore.getSettings(tenantId);
    const apiBase = process.env.API_BASE_URL || 'http://localhost:4000';

    // Check if tenant has customized media links in settings, or use standard brand assets
    let mediaUrl = '';
    let defaultCaption = '';

    switch (args.mediaCategory) {
      case 'brochure':
      case 'packages':
        mediaUrl = (settings as any)?.brochureImageUrl || `${apiBase}/media/brochures/omni_packages.png`;
        defaultCaption = 'تفضل يا غالي، هذا بروشور الباقات والميزات الكاملة بالتفصيل. أي باقة تحسها تناسب نشاطك أكثر؟';
        break;

      case 'payment_qr':
        mediaUrl = (settings as any)?.paymentQrImageUrl || `${apiBase}/media/payments/payment_qr.png`;
        defaultCaption = 'تفضل باركود الدفع المباشر والآمن. بمجرد إتمام التحويل ارسل لي صورة الإيصال لتفعيل حسابك فوراً!';
        break;

      case 'catalog':
      case 'product_photo':
      default:
        mediaUrl = (settings as any)?.catalogImageUrl || `${apiBase}/media/catalog/products_overview.png`;
        defaultCaption = args.productName
          ? `تفضل صورة تفاصيل ${args.productName}، متاح وجاهز للتوصيل الفوري!`
          : 'تفضل صور وتفاصيل منتجاتنا المميزة. تحب تعرف تفاصيل أكثر عن صنف معين؟';
        break;
    }

    const finalCaption = args.captionText || defaultCaption;
    const taggedMessage = `[MEDIA:${mediaUrl}] ${finalCaption}`;

    console.log(
      `[MediaDispatcherSkill] 📸 Dispatched media: category=${args.mediaCategory} | URL=${mediaUrl}`
    );

    return {
      success: true,
      actionTaken: 'MEDIA_DISPATCHED',
      data: {
        mediaUrl,
        mediaCategory: args.mediaCategory,
        productName: args.productName,
        caption: finalCaption,
      },
      suggestedMessage: taggedMessage,
    };
  }
}
