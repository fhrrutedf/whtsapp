import { BaseSkill } from '../base.skill';
import { SkillExecutionContext, SkillResult } from '../types';

export interface BusinessGrowthRouterArgs {
  intent: string;
  customerMessage: string;
  accountArr?: number;
  openIssuesCount?: number;
}

export class BusinessGrowthRouterSkill extends BaseSkill {
  public name = 'business_growth_router';
  public displayName = 'الموجه الاستراتيجي لنمو الأعمال والإيرادات (Business Growth Router)';
  public category = 'operations' as const;
  public description =
    'Strategic routing orchestrator that classifies account lifecycle requests and delegates to Customer Success, Revenue Operations, Sales Engineering, or Sales Closing.';

  public parameters = {
    type: 'object' as const,
    properties: {
      intent: {
        type: 'string',
        description: 'Customer or operator goal (e.g. competitor_comparison, price_objection, cancel_threat, buy_now, pipeline_audit)',
      },
      customerMessage: { type: 'string', description: 'Raw message from contact or operator' },
      accountArr: { type: 'number', description: 'Annual recurring revenue or customer value' },
      openIssuesCount: { type: 'number', description: 'Number of unresolved complaints' },
    },
    required: ['intent', 'customerMessage'],
  };

  public systemPrompt = `
أنت الموجه الاستراتيجي العام لمنظومة نمو الإيرادات وخدمة العملاء.
مهمتك:
1. توجيه الطلب إلى المهارة التخصصية الأنسب (Customer Success للمشاكل، Sales Closer للشراء، Sales Engineer للمقارنات، RevOps للتحليلات).
2. ضمان تناغم مسار العميل وعدم ضياع أي فرصة بيعية أو تعريض حساب للإلغاء.
`.trim();

  async execute(context: SkillExecutionContext, args: BusinessGrowthRouterArgs): Promise<SkillResult> {
    const { intent, customerMessage, openIssuesCount = 0 } = args;

    console.error(`[BusinessGrowthRouter] 🧭 Routing Intent "${intent}"...`);

    const lower = (intent + ' ' + customerMessage).toLowerCase();

    let routedSkill = 'sales_closer';
    let strategyReason = '';

    if (lower.includes('manychat') || lower.includes('wati') || lower.includes('zendesk') || lower.includes('مقارنة') || lower.includes('ميزة')) {
      routedSkill = 'sales_engineer';
      strategyReason = 'Customer inquiries about competitive differences or technical architecture.';
    } else if (lower.includes('الغي') || lower.includes('سيئة') || lower.includes('شكوى') || openIssuesCount > 0) {
      routedSkill = 'customer_success_manager';
      strategyReason = 'Account health risk detected; routing to customer retention and CS telemetry.';
    } else if (lower.includes('تقرير') || lower.includes('احصائيات') || lower.includes('pipeline') || lower.includes('سرعة')) {
      routedSkill = 'revenue_operations';
      strategyReason = 'RevOps pipeline analysis requested by admin or agent.';
    } else if (lower.includes('غالي') || lower.includes('سعر') || lower.includes('تخفيض')) {
      routedSkill = 'objection_handler';
      strategyReason = 'Price objection detected; routing to value reframing.';
    } else {
      routedSkill = 'sales_closer';
      strategyReason = 'Direct commercial intent or general closing trajectory.';
    }

    return {
      success: true,
      actionTaken: 'ROUTED_STRATEGICALLY',
      data: {
        recommendedSkill: routedSkill,
        rationale: strategyReason,
        targetContext: context.conversationId,
      },
      suggestedMessage: `تم توجيه المحادثة إلى مهارة: ${routedSkill} بناءً على تحليل النوايا.`,
    };
  }
}
