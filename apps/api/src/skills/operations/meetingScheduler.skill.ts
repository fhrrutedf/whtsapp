import { BaseSkill } from '../base.skill';
import { SkillCategory, SkillExecutionContext, SkillParameterSchema, SkillResult } from '../types';

export interface MeetingSchedulerArgs {
  meetingType: 'DEMO' | 'SALES_CONSULTATION' | 'TECHNICAL_SUPPORT';
  preferredDateOrTime?: string;
  topicOfInterest?: string;
}

export class MeetingSchedulerSkill extends BaseSkill {
  readonly name = 'meeting_scheduler';
  readonly displayName = 'حاجز المواعيد ومكالمات الديمو (Meeting Scheduler)';
  readonly category: SkillCategory = 'operations';

  readonly description =
    'تُستدعى عندما يطلب العميل مكالمة هاتفية، اجتماع زووم، أو جلسة ديمو مباشرة مع فريق المبيعات لتحديد الموعد وإرسال رابط الحجز التلقائي.';

  readonly parameters: SkillParameterSchema = {
    type: 'object',
    properties: {
      meetingType: {
        type: 'string',
        description: 'نوع الاجتماع المطلوب',
        enum: ['DEMO', 'SALES_CONSULTATION', 'TECHNICAL_SUPPORT'],
      },
      preferredDateOrTime: {
        type: 'string',
        description: 'الوقت أو اليوم المفضل للعميل إن ذكره (مثل: غداً العصر، الساعة 4)',
      },
      topicOfInterest: {
        type: 'string',
        description: 'الموضوع الأساسي المراد مناقشته في المكالمة',
      },
    },
    required: ['meetingType'],
  };

  readonly systemPrompt = `
أنت منسق الاجتماعات والمكالمات التنفيذية (Executive Scheduler).
عندما يطلب العميل اجتماعاً أو ديمو ("بدي أشوف ديمو"، "حابب أكلمكم مكالمة"):

#### 1. النبرة والأسلوب:
- رحب برغبته بالاجتماع وأكد له أن خبيرنا سيكون جاهزاً للإجابة عن كل استفساراته:
  "بكل سرور يا غالي.. بيسعدنا نلتقي فيك ونوريك المنصة لايف ونجاوبك على كل استفساراتك خطوة بخطوة."
- اعرض رابط الحجز السريع المباشر ليختار الوقت الأنسب لجدوله.
`.trim();

  async execute(context: SkillExecutionContext, args: MeetingSchedulerArgs): Promise<SkillResult> {
    const meetingType = args.meetingType || 'DEMO';
    const cleanPhone = context.contactPhone.replace(/\D/g, '');
    const bookingUrl = `https://meet.omnidesk.ai/schedule?tenant=${context.tenantId}&phone=${cleanPhone}&type=${meetingType}`;

    console.error(
      `[MeetingSchedulerSkill] 📅 Generated Calendar booking URL for ${context.contactPhone}: ${bookingUrl}`
    );

    const message = `بكل سرور يا غالي! 🤝\nيسعدنا نلتقي فيك ونوريك المنصة خطوة بخطوة ونجاوبك على كل تساؤلاتك.\n\nتقدر تختار الوقت الأنسب لجدولك مباشرة من هذا الرابط وسيقوم مستشارنا بلقائك فوراً:\n🔗 ${bookingUrl}`;

    return {
      success: true,
      actionTaken: 'MEETING_LINK_GENERATED',
      data: {
        bookingUrl,
        meetingType,
        preferredTime: args.preferredDateOrTime || 'ASAP',
      },
      suggestedMessage: message,
    };
  }
}
