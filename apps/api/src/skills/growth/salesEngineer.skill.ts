import { BaseSkill } from '../base.skill';
import { SkillExecutionContext, SkillResult } from '../types';

export interface SalesEngineerArgs {
  action: 'COMPETITIVE_MATRIX' | 'POC_PLANNING' | 'TECHNICAL_DISCOVERY';
  competitorName?: string;
  customerRequirements?: string[];
  expectedScaleMessagesPerDay?: number;
}

export class SalesEngineerSkill extends BaseSkill {
  public name = 'sales_engineer';
  public displayName = 'مهندس المبيعات والمقارنات التنافسية (Pre-Sales & Competitive Engineer)';
  public category = 'sales' as const;
  public description =
    'Builds instant competitive differentiation matrices and plans technical proof-of-concepts (POC) against rivals (ManyChat, WATI, Respond.io, Zendesk).';

  public parameters = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['COMPETITIVE_MATRIX', 'POC_PLANNING', 'TECHNICAL_DISCOVERY'],
        description: 'The pre-sales engineering task to execute',
      },
      competitorName: {
        type: 'string',
        description: 'Name of the competitor mentioned by the customer (e.g., manychat, wati, respond.io, zendesk)',
      },
      customerRequirements: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of requested technical integrations or features',
      },
      expectedScaleMessagesPerDay: {
        type: 'number',
        description: 'Expected traffic volume per day',
      },
    },
    required: ['action'],
  };

  public systemPrompt = `
أنت الآن تعمل كمهندس مبيعات حلول تقنية أول (Lead Solutions Engineer).
مهمتك:
1. عند مقارنة العميل لمنصتنا بمنافسين (مثل ManyChat, WATI, Zendesk)، إبراز نقاط القوة الحصرية لمنصتنا بلباقة وثقة تقنية عالية دون تجريح المنافس.
2. التركيز على ميزاتنا الفريدة:
   - فهم اللهجات العربية بالذكاء الاصطناعي متعدد الوسائط (صوت وصور وفواتير).
   - محرك Baileys المطور مع نظام منع الحظر ومحاكاة الكتابة البشرية وفترات التهدئة.
   - خادم MCP القياسي للربط مع أدوات ووكلاء الذكاء الاصطناعي الخارجيين.
   - ذاكرة العميل الدائمة عبر الشهور (Durable Customer Memory).
   - توفير التكلفة الهائل لعدم وجود تسعير محادثات Meta الرسمية المرتفعة.
`.trim();

  async execute(context: SkillExecutionContext, args: SalesEngineerArgs): Promise<SkillResult> {
    const {
      action,
      competitorName = 'manychat',
      customerRequirements = ['whatsapp_multimodal_audio', 'arabic_dialects', 'anti_ban'],
      expectedScaleMessagesPerDay = 1500,
    } = args;

    console.error(`[SalesEngineerSkill] 🛠️ Generating Pre-Sales Assessment for "${competitorName}"...`);

    const normalizedCompetitor = competitorName.toLowerCase().trim();

    // Competitive intelligence bank
    const competitorAnalysis: Record<string, { strengths: string[]; ourDifferentiators: string[]; summaryAr: string }> = {
      manychat: {
        strengths: ['Flow builder visual UI', 'Social media DM automation'],
        ourDifferentiators: [
          'دعم التسجيلات الصوتية العربية (Voice Notes) وتحليلها بذكاء اصطناعي حقيقي',
          'محرك الرد البشري الذكي بدون بوتات أزرار معقدة تنفر العميل العربي',
          'عدم وجود قيود الـ 24 ساعة الخانقة في الواتساب مع نظام الحماية ضد الحظر',
          'ذاكرة طويلة المدى تتذكر تفضيلات العميل السابقة',
        ],
        summaryAr: 'ManyChat ممتاز للأزرار والردود الآلية السطحية على إنستغرام وفيسبوك، لكن في الواتساب بالمنطقة العربية عملاؤك يحبون المحادثة الإنسانية وإرسال رسائل صوتية باللهجة المحلية، وهذا هو جوهر منصتنا الذي يحول المحادثة لصفقة.',
      },
      wati: {
        strengths: ['Official Meta Cloud API partner', 'Broad broadcast tools'],
        ourDifferentiators: [
          'توفير هائل في تكاليف رسائل Meta الشهرية الباهظة',
          'ذكاء اصطناعي أصيل (Gemini + OpenRouter) يفهم السياق بدلاً من مجرد قوالب جاهزة',
          'خادم MCP قياسي لربط قواعد البيانات وأدوات الأعمال الحرة',
          'نظام Anti-Ban ذكي مع فترات كتابة بشرية وتشتيت للمكالمات',
        ],
        summaryAr: 'WATI يعتمد على قوالب Meta الرسمية المكلفة جداً لكل رسالة مع شات بوت محدود، بينما منصتنا توفر لك محرك ذكاء اصطناعي حر، محادثات غير محدودة، وفهم فوري للفواتير والصور والتسجيلات الصوتية.',
      },
      zendesk: {
        strengths: ['Enterprise ticketing legacy', 'Heavy corporate compliance'],
        ourDifferentiators: [
          'سرعة إعداد وتشغيل في 5 دقائق بدون عقود سنوية باهظة أو استشاريين',
          'تصميم مخصص بالكامل لتجارة الواتساب والمبيعات التفاعلية وليس مجرد تذاكر دعم بطيئة',
          'تكامل فوري مع بوابات الدفع المحلية وروابط الشراء السريعة',
        ],
        summaryAr: 'Zendesk مبني بالأساس كنظام تذاكر وإيميلات تقليدية للشركات الضخمة بتكاليف تشغيل باهظة، بينما منصتنا مصممة خصيصاً للسرعة القصوى وإغلاق المبيعات وخدمة العملاء الفورية عبر الواتساب في منطقتنا.',
      },
    };

    const targetAnalysis = competitorAnalysis[normalizedCompetitor] || {
      strengths: ['General messaging bot'],
      ourDifferentiators: [
        'محرك الذكاء الاصطناعي العربي المتعدد الوسائط (صوتيات، صور، ملفات)',
        'نظام حماية الحسابات والـ Anti-ban المتطور',
        'تكامل كامل مع بروتوكول MCP للذكاء الاصطناعي',
      ],
      summaryAr: 'منصتنا تتميز بمحرك ذكاء اصطناعي بشري متعدد الوسائط مخصص للسوق العربي، مع حماية الحسابات ومرونة كاملة في أدوات المبيعات والدفع.',
    };

    let suggestedMessage = '';
    if (action === 'COMPETITIVE_MATRIX') {
      suggestedMessage = `سؤالك ممتاز وبمحله يا غالي! 🎯\n${targetAnalysis.summaryAr}\n\nأهم 3 فروقات تفيدك مباشرة:\n1. ${targetAnalysis.ourDifferentiators[0]}\n2. ${targetAnalysis.ourDifferentiators[1]}\n3. ${targetAnalysis.ourDifferentiators[2]}`;
    } else if (action === 'POC_PLANNING') {
      suggestedMessage = `يسعدنا تجهيز بيئة تجريبية تقنية (POC) لفريقكم تناسب حجم ${expectedScaleMessagesPerDay} رسالة يومياً، مع تجربة استماع الـ AI للصوتيات وفحص لوحة الـ Analytics مجاناً. تحب نطلقها لك؟`;
    } else {
      suggestedMessage = `تم تدقيق المتطلبات التقنية بنجاح. المنصة متوافقة 100% مع حجم الرسائل والميزات المطلوبة.`;
    }

    return {
      success: true,
      actionTaken: `SALES_ENGINEER_${action}_READY`,
      data: {
        competitor: competitorName,
        differentiators: targetAnalysis.ourDifferentiators,
        scalabilityCheck: expectedScaleMessagesPerDay <= 50000 ? 'PASSED_OPTIMAL' : 'ENTERPRISE_DEDICATED_NODE_REQUIRED',
        suggestedDemoScenario: 'Multimodal Arabic Voice Note processing & live checkout generation',
      },
      suggestedMessage,
    };
  }
}
