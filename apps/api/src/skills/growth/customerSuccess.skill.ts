import { BaseSkill } from '../base.skill';
import { SkillExecutionContext, SkillResult } from '../types';
import { localStore } from '../../services/store.service';

export interface CustomerSuccessArgs {
  action: 'HEALTH_SCORE' | 'CHURN_RISK' | 'EXPANSION_OPPORTUNITY';
  customerId?: string;
  phone?: string;
  loginFrequencyDays?: number;
  openSupportTickets?: number;
  unresolvedComplaints?: number;
  npsScore?: number;
  currentPlan?: string;
  activeUsersCount?: number;
}

export class CustomerSuccessSkill extends BaseSkill {
  public name = 'customer_success_manager';
  public displayName = 'مدير نجاح العملاء وحساب درجة الصحة ومخاطر الإلغاء (Customer Success Manager)';
  public category = 'operations' as const;
  public description =
    'Calculates customer health scores (0-100), predicts churn risk tiers (LOW, MEDIUM, HIGH, CRITICAL), and identifies expansion/upsell opportunities based on engagement and support telemetry.';

  public parameters = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['HEALTH_SCORE', 'CHURN_RISK', 'EXPANSION_OPPORTUNITY'],
        description: 'The specific CSM analysis to perform',
      },
      customerId: { type: 'string', description: 'Unique customer identifier' },
      phone: { type: 'string', description: 'Customer phone number' },
      loginFrequencyDays: { type: 'number', description: 'Days since last active interaction' },
      openSupportTickets: { type: 'number', description: 'Number of open support or complaint tickets' },
      unresolvedComplaints: { type: 'number', description: 'Unresolved negative feedback count' },
      npsScore: { type: 'number', description: 'Net promoter score 1-10 if available' },
      currentPlan: { type: 'string', description: 'Current tier: starter, pro, enterprise' },
      activeUsersCount: { type: 'number', description: 'Number of active team members or seats used' },
    },
    required: ['action'],
  };

  public systemPrompt = `
أنت الآن تعمل بصفتك خبير استراتيجي لنجاح العملاء (Customer Success Manager).
مهمتك:
1. تقييم صحة العميل (Health Score) وحساب احتمالية الإلغاء بدقة رياضية.
2. إذا كان العميل معرضاً للإلغاء (Churn Risk > 50%)، قدم تدخلاً فورياً، اعتذاراً راقياً، وعرض جدولة جلسة دعم خاصة.
3. إذا كان العميل يتمتع بصحة ممتازة (Health Score > 75) واستخدامه مرتفع، اقترح بذكاء ترقية الباقة لفتح مزايا أكبر.
`.trim();

  async execute(context: SkillExecutionContext, args: CustomerSuccessArgs): Promise<SkillResult> {
    const {
      action,
      phone = context.contactPhone,
      loginFrequencyDays = 2,
      openSupportTickets = 0,
      unresolvedComplaints = 0,
      npsScore = 8,
      currentPlan = 'pro',
      activeUsersCount = 5,
    } = args;

    console.error(`[CustomerSuccessSkill] 📊 Executing CSM Action "${action}" for ${phone}...`);

    // 1. Calculate Multi-Dimensional Health Score (0 - 100)
    // Usage weight: 30%, Engagement weight: 25%, Support weight: 25%, Sentiment/NPS: 20%
    let usageScore = Math.max(0, 100 - (loginFrequencyDays * 12));
    let supportScore = Math.max(0, 100 - (openSupportTickets * 20) - (unresolvedComplaints * 30));
    let sentimentScore = Math.min(100, (npsScore / 10) * 100);
    let engagementScore = Math.min(100, activeUsersCount * 18);

    const healthScore = Math.round(
      (usageScore * 0.30) +
      (engagementScore * 0.25) +
      (supportScore * 0.25) +
      (sentimentScore * 0.20)
    );

    // 2. Churn Risk Tiering
    let churnTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let churnProbability = Math.max(5, 100 - healthScore);
    if (healthScore < 35 || unresolvedComplaints >= 2) {
      churnTier = 'CRITICAL';
    } else if (healthScore < 55 || openSupportTickets >= 3) {
      churnTier = 'HIGH';
    } else if (healthScore < 75) {
      churnTier = 'MEDIUM';
    }

    // 3. Expansion Potential
    const isReadyForExpansion = healthScore >= 78 && activeUsersCount >= 4 && openSupportTickets === 0;
    const recommendedExpansion = isReadyForExpansion
      ? currentPlan === 'starter'
        ? 'PRO_UPGRADE'
        : 'ENTERPRISE_CUSTOM_SEATS'
      : 'NONE';

    // Store CSM telemetry into durable contact facts if contact exists
    if (phone && phone !== 'unknown') {
      try {
        const contact = localStore.getContactByPhone(context.tenantId, phone);
        if (contact) {
          const updatedFacts = (contact.memoryFacts || []).filter((f) => !f.startsWith('CSM:'));
          updatedFacts.push(`CSM: HealthScore=${healthScore}/100 | Risk=${churnTier}`);
          localStore.updateContactMemory(context.tenantId, phone, { memoryFacts: updatedFacts });
        }
      } catch (err: any) {
        console.error('[CustomerSuccessSkill] Non-blocking store sync error:', err.message);
      }
    }

    // Response message based on action
    let suggestedMessage = '';
    if (action === 'CHURN_RISK' && (churnTier === 'CRITICAL' || churnTier === 'HIGH')) {
      suggestedMessage = `أهلاً بك يا غالي.. يهمنا جداً رضاك وتجربتك معنا أولوية قصوى. لاحظنا وجود بعض الاستفسارات المعلقة، وحابين نخصص لك جلسة سريعة مع مدير نجاح العملاء للتأكد من حل كل شيء بامتياز. شو الوقت الأنسب لك اليوم؟`;
    } else if (action === 'EXPANSION_OPPORTUNITY' && isReadyForExpansion) {
      suggestedMessage = `ما شاء الله نلاحظ نمو وتفاعل فريقك الرائع مع المنصة! 🚀 حابين نقدم لك ميزة تجربة ترقية باقة (${recommendedExpansion === 'PRO_UPGRADE' ? 'الاحترافية Pro' : 'المؤسسات Enterprise'}) مجاناً للأسبوع القادم لفتح قنوات وأدوات ذكاء اصطناعي غير محدودة. تحب نفعّلها لك؟`;
    } else {
      suggestedMessage = `تم تحليل حالة الحساب بنجاح: مؤشر الصحة ${healthScore}/100، ومستوى المخاطر ${churnTier}.`;
    }

    return {
      success: true,
      actionTaken: `CSM_${action}_PROCESSED`,
      data: {
        healthScore,
        churnTier,
        churnProbability: `${churnProbability}%`,
        isReadyForExpansion,
        recommendedExpansion,
        breakdown: {
          usageScore,
          engagementScore,
          supportScore,
          sentimentScore,
        },
      },
      suggestedMessage,
    };
  }
}
