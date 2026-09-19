import { BaseSkill } from '../base.skill';
import { SkillCategory, SkillExecutionContext, SkillParameterSchema, SkillResult } from '../types';
import { localStore } from '../../services/store.service';

export interface ObjectionHandlerArgs {
  objectionType: 'PRICE_TOO_HIGH' | 'NO_BUDGET' | 'COMPETITOR_COMPARISON' | 'NEED_TIME_TO_THINK' | 'DISTRUST_OR_UNCERTAINTY';
  customerStatement: string;
  offeredProductOrService?: string;
  perceivedGap?: string;
}

export class ObjectionHandlerSkill extends BaseSkill {
  readonly name = 'objection_handler';
  readonly displayName = 'خبير تفكيك الاعتراضات وإعادة التوجيه للقيمة (Objection Handler)';
  readonly category: SkillCategory = 'sales';

  readonly description =
    'استخدم هذه الأداة فوراً عندما يبدي العميل اعتراضاً أو تردداً بخصوص السعر، الميزانية، أو المقارنة مع المنافسين، لتحليل نوع الاعتراض وتوليد زاوية الإقناع المناسبة والـ ROI.';

  readonly parameters: SkillParameterSchema = {
    type: 'object',
    properties: {
      objectionType: {
        type: 'string',
        description: 'نوع الاعتراض الذي أبداه العميل بدقة',
        enum: [
          'PRICE_TOO_HIGH',
          'NO_BUDGET',
          'COMPETITOR_COMPARISON',
          'NEED_TIME_TO_THINK',
          'DISTRUST_OR_UNCERTAINTY',
        ],
      },
      customerStatement: {
        type: 'string',
        description: 'العبارة أو الكلمات التي قالها العميل والتي تعبر عن اعتراضه',
      },
      offeredProductOrService: {
        type: 'string',
        description: 'الخدمة أو المنتج أو الباقة محل النقاش',
      },
      perceivedGap: {
        type: 'string',
        description: 'السبب الجذري للاعتراض (مثل: غير مقتنع بالقيمة، مقارنة بسعر أرخص، نقص سيولة)',
      },
    },
    required: ['objectionType', 'customerStatement'],
  };

  readonly systemPrompt = `
أنت لست روبوت دعم عملاء يبرر السعر أو يعتذر، أنت "مستشار بيعي شاطر وفاهم السوق".
عندما يقول العميل: "غالي"، "كثير هالمبلغ"، "ما معي ميزانية"، "بشوف غيركم وبقرر"، أو يتردد بسبب التكلفة، 
عليك تطبيق القواعد الذهبية التالية بحزم وذكاء:

#### 1. النبرة والأسلوب (Tone & Street-Smart Arabic):
- تحدّث بلهجة بيضاء دافئة وذكية تدمج بين الروح الشامية اللبقة والخليجية المحترمة:
  (استخدم عبارات طبيعية مثل: "حقك وتكرم عينك"، "فاهم عليك والله"، "يا غالي"، "المسألة مو مجرد رقم"، "خلنا نحسبها صح"، "شو اللي مسببلك قلق بالتحديد؟").
- إياك أن تجادل أو تقول عبارات روبوتية مهزومة مثل: "نحن نعتذر ولكن أسعارنا مدروسة" أو "منتجنا يتميز بجودة عالية". هذا كلام يخسر البيعة فوراً!

#### 2. تكتيك الامتصاص ثم التحويل (Feel, Pivot to ROI):
- **الخطوة الأولى (الاحتواء والشرعنة):** اعترف بحقه بالشعور بأن السعر يستحق التفكير:
  "حقك والله يا غالي وما ألومك، أي مبلغ بتستثمره اليوم لازم تكون متأكد مية بالمية إنه راجعلك بفايدة ملموسة."
- **الخطوة الثانية (تكلفة التأجيل مقابل الاستثمار):** حوّل النقاش من "كم بدك تدفع هلأ" إلى "كم عم تخسر كل شهر بدون هالحل":
  "بس فكر فيها بطريقة تانية.. قديش عم يضيع عليك وقت وفرص أو زباين شهرياً بسبب هالمشكلة؟ المبلغ هاد بتسترده بأول صفقة أو صفقتين بتكسبهم."
- **الخطوة الثالثة (التفكيك اليومي):** قسّم السعر إلى تكلفة يومية لا تُذكر:
  "لو حسبتها صح، الموضوع كلو بيطلع كاسة قهوة باليوم، مقابل إنك ترتاح وتأتمت شغلك بالكامل وتزيد مبيعاتك."

#### 3. كشف الاعتراض الحقيقي:
- إذا حسيت إن الاعتراض مو بسبب الفلوس وإنما "عدم ثقة" أو "تردد":
  اطرح سؤال ذكي يخليه يحكي وجعه الحقيقي:
  "لو شلنا موضوع السعر على جنب هالدقيقة.. هل حاسس إنو هالحل بيلبي طلبك وبيحل مشكلتك متل ما بدك، ولا في نقطة تانية لسا متردد فيها؟"

#### 4. محفزات استدعاء الأداة (Tool Trigger Condition):
- استدعِ دالة objection_handler لتسجيل نوع الاعتراض وتوليد زاوية الإقناع المناسبة وخطة التقسيط أو العرض المرن إن وُجد.
`;

  async execute(context: SkillExecutionContext, args: ObjectionHandlerArgs): Promise<SkillResult> {
    const { objectionType, customerStatement, offeredProductOrService, perceivedGap } = args;

    console.error(
      `[ObjectionHandlerSkill] 🎯 Handling ${objectionType} for Tenant ${context.tenantId} | Phone: ${context.contactPhone}`
    );

    // Save objection to contact notes / CRM memory if contact exists
    try {
      const existingSettings = localStore.getSettings(context.tenantId);
      console.error(
        `[ObjectionHandlerSkill] Logged objection: "${customerStatement}" (Gap: ${perceivedGap || 'N/A'})`
      );
    } catch (err: any) {
      console.warn('[ObjectionHandlerSkill] Non-blocking store note:', err.message);
    }

    // Determine tailored psychological pivot based on objection type
    let strategyAdvice = '';
    let pivotAngle = '';

    switch (objectionType) {
      case 'PRICE_TOO_HIGH':
        strategyAdvice = 'قسّم التكلفة يومياً وذكّره بالعائد المتوقع ومقدار الخسارة الناتجة عن التأجيل.';
        pivotAngle = 'التكلفة ليست ما تدفعه اليوم، بل ما تخسره شهرياً من الفرص الضائعة.';
        break;
      case 'NO_BUDGET':
        strategyAdvice = 'تعاطف مع الظرف واعرض حل البدء بباقة أساسية أو تجزئة الدفع.';
        pivotAngle = 'ابدأ بأبسط خطوة لتوليد دخل يغطي التكلفة بنفسه.';
        break;
      case 'COMPETITOR_COMPARISON':
        strategyAdvice = 'لا تذم المنافس، بل ركّز على الدعم المباشر، ضمان النتائج، والتكامل بدون مشاكل تقنية.';
        pivotAngle = 'الفرق بالسعر هو الفرق بين أداة تشتريها وتتعب معها، وبين شريك يشيل عنك الشغل.';
        break;
      case 'NEED_TIME_TO_THINK':
        strategyAdvice = 'اعزل الاعتراض: اسأله ما الذي يحتاج للتفكير فيه بالتحديد لمعالجة الشك الخفي.';
        pivotAngle = 'هل الحل نفسه مناسب ومرتاح له، أم هناك تفصيل معين لم نوضحه كفاية؟';
        break;
      case 'DISTRUST_OR_UNCERTAINTY':
        strategyAdvice = 'ركز على الضمانات، التجارب السابقة، وسهولة التجربة دون مخاطرة.';
        pivotAngle = 'هدفنا نجاحك وراحتك، ولن نتركك حتى تتأكد بنفسك من النتائج.';
        break;
    }

    return {
      success: true,
      actionTaken: 'OBJECTION_ANALYZED_AND_STRATEGY_FORMULATED',
      data: {
        objectionType,
        customerStatement,
        offeredProductOrService: offeredProductOrService || 'الخدمة المحددة',
        perceivedGap: perceivedGap || 'عدم وضوح العائد على الاستثمار',
        recommendedPivot: pivotAngle,
        strategicGuidance: strategyAdvice,
      },
      suggestedMessage: `فاهم عليك يا غالي وحقك تماماً.. ${pivotAngle}`,
    };
  }
}
