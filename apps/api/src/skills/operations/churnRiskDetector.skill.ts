import { BaseSkill } from '../base.skill';
import { SkillCategory, SkillExecutionContext, SkillParameterSchema, SkillResult } from '../types';
import { localStore } from '../../services/store.service';
import { getSocketGateway } from '../../sockets/socketGateway';

export interface ChurnRiskArgs {
  riskLevel: 'LOW' | 'MEDIUM' | 'CRITICAL';
  dissatisfactionReason: string;
  customerFrustrationSignal: string;
  recommendedRetentionAction?: string;
}

export class ChurnRiskDetectorSkill extends BaseSkill {
  readonly name = 'churn_risk_detector';
  readonly displayName = 'كاشف خطر الإلغاء والإنقاذ الفوري (Churn Risk & Retention)';
  readonly category: SkillCategory = 'operations';

  readonly description =
    'تُستدعى فوراً عند استشعار غضب العميل، تلويحه بإلغاء الاشتراك، أو التهديد بمغادرة الخدمة، لتفعيل بروتوكول الإنقاذ الفوري وتنبيه الإدارة.';

  readonly parameters: SkillParameterSchema = {
    type: 'object',
    properties: {
      riskLevel: {
        type: 'string',
        description: 'مستوى خطورة فقدان العميل',
        enum: ['LOW', 'MEDIUM', 'CRITICAL'],
      },
      dissatisfactionReason: {
        type: 'string',
        description: 'السبب الأساسي لاستياء العميل (مشكلة فنية، بطء دعم، تسعير، عدم تحقيق نتائج)',
      },
      customerFrustrationSignal: {
        type: 'string',
        description: 'العبارة أو الكلمات التي قالها العميل وأشارت لغضبه أو رغبته بالإلغاء',
      },
      recommendedRetentionAction: {
        type: 'string',
        description: 'الإجراء المقترح للاحتفاظ به (مثل: تعويض، شهر مجاني، تحويل فوري للمدير)',
      },
    },
    required: ['riskLevel', 'dissatisfactionReason', 'customerFrustrationSignal'],
  };

  readonly systemPrompt = `
أنت درع الحماية من إلغاء الاشتراكات (Retention & De-escalation Specialist).
عندما يكون العميل غاضباً أو يطلب الإلغاء ("بدي ألغي"، "خدمتكم سيئة"، "ضيعتولي وقتي"):

#### 1. القواعد الصارمة:
1. **الاعتذار الصادق والامتصاص الفوري:** لا تبرر ولا تقل "ولكن". العميل الغاضب يحتاج أن يشعر بأن صوته مسموع ومقدّر:
   "حقك علينا واعتذارنا الشديد منك يا غالي.. زعلك ما بيهون علينا أبداً وأنا شخصياً متولي موضوعك هلأ."
2. **إيقاف الردود الآلية المكررة:** استدعِ هذه الأداة فوراً لإيقاف الرد الآلي وتنبيه المشرف البشري.
3. **تقديم حل ملموس وتعويض:** "قبل ما تاخد أي قرار، خليني أحل المشكلة فوراً ونعوضك عن أي تأخير صار."
`.trim();

  async execute(context: SkillExecutionContext, args: ChurnRiskArgs): Promise<SkillResult> {
    console.warn(
      `[ChurnRiskDetectorSkill] 🚨 CHURN RISK [${args.riskLevel}] for Tenant: ${context.tenantId} | Phone: ${context.contactPhone}`
    );

    // 1. Pause auto-reply so human can take over if critical
    if (args.riskLevel === 'CRITICAL' || args.riskLevel === 'MEDIUM') {
      try {
        localStore.pauseConversationAutoReply(context.tenantId, context.conversationId);
      } catch {}
    }

    // 2. Alert dashboard admins via Socket.io
    const gateway = getSocketGateway();
    if (gateway) {
      (gateway as any).to(`tenant:${context.tenantId}`).emit('churn:risk_detected', {
        conversationId: context.conversationId,
        contactPhone: context.contactPhone,
        riskLevel: args.riskLevel,
        reason: args.dissatisfactionReason,
        signal: args.customerFrustrationSignal,
        timestamp: new Date().toISOString(),
      });
    }

    const empathyResponse = `حقك علينا واعتذارنا الشديد منك يا غالي.. زعلك ورضاك أهم شي عندنا، وأنا هلأ عم بتابع موضوعك مع الإدارة مباشرة لحتى نحله بشكل يرضيك تماماً.`;

    return {
      success: true,
      actionTaken: 'CHURN_RISK_LOGGED_AND_ADMIN_ALERTED',
      data: {
        riskLevel: args.riskLevel,
        reason: args.dissatisfactionReason,
        signal: args.customerFrustrationSignal,
        autoReplyPaused: args.riskLevel !== 'LOW',
      },
      suggestedMessage: empathyResponse,
    };
  }
}
