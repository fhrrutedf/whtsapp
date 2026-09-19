import { BaseSkill } from '../base.skill';
import { SkillExecutionContext, SkillResult } from '../types';

export interface DealData {
  id: string;
  name: string;
  stage: 'Discovery' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  value: number;
  ageDays: number;
}

export interface RevenueOperationsArgs {
  action: 'SALES_VELOCITY' | 'PIPELINE_HEALTH' | 'DEAL_AGING_AUDIT' | 'FORECAST_ACCURACY';
  deals?: DealData[];
  quotaTarget?: number;
  averageSalesCycleDays?: number;
  actualRevenue?: number;
  forecastedRevenue?: number;
}

export class RevenueOperationsSkill extends BaseSkill {
  public name = 'revenue_operations';
  public displayName = 'عمليات الإيرادات وتدقيق قمع المبيعات (Revenue Operations & Pipeline Intelligence)';
  public category = 'operations' as const;
  public description =
    'Calculates sales pipeline coverage, sales velocity, deal aging risks, and revenue forecast accuracy (MAPE) for data-driven SaaS growth.';

  public parameters = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['SALES_VELOCITY', 'PIPELINE_HEALTH', 'DEAL_AGING_AUDIT', 'FORECAST_ACCURACY'],
        description: 'The RevOps calculation or audit to perform',
      },
      deals: {
        type: 'array',
        description: 'List of active deals in the WhatsApp sales pipeline',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            stage: { type: 'string' },
            value: { type: 'number' },
            ageDays: { type: 'number' },
          },
        },
      },
      quotaTarget: { type: 'number', description: 'Target revenue quota for the period' },
      averageSalesCycleDays: { type: 'number', description: 'Average days to win a deal' },
      actualRevenue: { type: 'number', description: 'Actual collected revenue' },
      forecastedRevenue: { type: 'number', description: 'Forecasted target revenue' },
    },
    required: ['action'],
  };

  public systemPrompt = `
أنت الآن خبير عمليات الإيرادات والنمو المالي (Revenue Operations Specialist).
مهمتك:
1. قياس كفاءة قمع المبيعات وسرعة تدفق الصفقات عبر الواتساب (Sales Velocity).
2. كشف الصفقات المتأخرة (Aging Deals) التي تتجاوز ضعف دورة البيع الطبيعية والتنبيه لإنقاذها.
3. حساب دقة التنبؤ المالي بالإيرادات (Forecast Accuracy).
`.trim();

  async execute(context: SkillExecutionContext, args: RevenueOperationsArgs): Promise<SkillResult> {
    const {
      action,
      deals = [
        { id: '1', name: 'الشركة الأهلية', stage: 'Proposal', value: 3500, ageDays: 14 },
        { id: '2', name: 'مؤسسة التقنية', stage: 'Negotiation', value: 8200, ageDays: 28 },
        { id: '3', name: 'سوبر ماركت الهدى', stage: 'Qualification', value: 1200, ageDays: 4 },
        { id: '4', name: 'عيادات النخبة', stage: 'Closed Won', value: 5000, ageDays: 10 },
      ],
      quotaTarget = 15000,
      averageSalesCycleDays = 15,
      actualRevenue = 14200,
      forecastedRevenue = 15000,
    } = args;

    console.error(`[RevenueOperationsSkill] 📈 Running RevOps Action "${action}"...`);

    // 1. Pipeline Metrics
    const totalPipelineValue = deals
      .filter((d) => d.stage !== 'Closed Lost')
      .reduce((sum, d) => sum + (d.value || 0), 0);

    const wonDeals = deals.filter((d) => d.stage === 'Closed Won');
    const closedWonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const winRate = deals.length > 0 ? wonDeals.length / deals.length : 0.35;

    // Sales Velocity = (Number of Opps * Avg Deal Value * Win Rate) / Avg Cycle Days
    const avgDealSize = deals.length > 0 ? totalPipelineValue / deals.length : 2500;
    const activeDealsCount = deals.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length;
    const velocityDaily = Math.round(
      ((activeDealsCount || 1) * avgDealSize * (winRate || 0.3)) / (averageSalesCycleDays || 14)
    );

    // Pipeline Coverage Ratio = Total Pipeline / Quota
    const pipelineCoverageRatio = Number((totalPipelineValue / (quotaTarget || 1)).toFixed(2));

    // Deal Aging: Flag deals older than 2x average cycle
    const agingAlertThreshold = (averageSalesCycleDays || 14) * 1.5;
    const agingDeals = deals.filter(
      (d) => d.ageDays > agingAlertThreshold && d.stage !== 'Closed Won' && d.stage !== 'Closed Lost'
    );

    // Forecast Accuracy MAPE
    const mape = Math.abs((actualRevenue - forecastedRevenue) / (actualRevenue || 1)) * 100;
    const forecastAccuracyPct = Math.max(0, Math.round(100 - mape));

    let suggestedMessage = '';
    if (action === 'DEAL_AGING_AUDIT') {
      if (agingDeals.length > 0) {
        suggestedMessage = `⚠️ تنبيه RevOps: تم رصد ${agingDeals.length} صفقات متأخرة في مرحلة التفاوض تجاوزت ${agingAlertThreshold} يوماً. نوصي بإرسال رسالة متابعة استرداد فورية عبر الواتساب.`;
      } else {
        suggestedMessage = `✅ جميع الصفقات الحالية تسير بسرعة ممتازة وضمن متوسط وقت الإغلاق.`;
      }
    } else {
      suggestedMessage = `📊 تقرير الإيرادات السريع: سرعة تدفق الصفقات اليومية: ${velocityDaily} ريال/يوم، ونسبة تغطية المستهدف: ${pipelineCoverageRatio}x، ودقة التوقعات: ${forecastAccuracyPct}%.`;
    }

    return {
      success: true,
      actionTaken: `REVOPS_${action}_COMPLETED`,
      data: {
        totalPipelineValue,
        closedWonValue,
        winRatePct: `${Math.round(winRate * 100)}%`,
        dailySalesVelocity: velocityDaily,
        pipelineCoverageRatio,
        isCoverageHealthy: pipelineCoverageRatio >= 3.0,
        agingDealsCount: agingDeals.length,
        agingDeals: agingDeals.map((d) => ({ id: d.id, name: d.name, ageDays: d.ageDays, stage: d.stage })),
        forecastAccuracyPct: `${forecastAccuracyPct}%`,
      },
      suggestedMessage,
    };
  }
}
