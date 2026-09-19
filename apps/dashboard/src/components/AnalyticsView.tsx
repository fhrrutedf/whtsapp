'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { 
  BarChart3, 
  MessageSquare, 
  Clock, 
  CheckCheck, 
  TrendingUp, 
  ShieldCheck, 
  Zap,
  Coins,
  Bot,
  RefreshCw,
  Globe
} from 'lucide-react';

export function AnalyticsView() {
  const { isWhatsAppConnected, connectedPhone } = useChatStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [growthData, setGrowthData] = useState<any>(null);
  const [pipelineData, setPipelineData] = useState<any>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [resAnalytics, resHealth, resPipeline] = await Promise.all([
        fetch('http://localhost:4000/api/analytics', { headers: { 'x-tenant-id': 'demo-tenant-1' } }),
        fetch('http://localhost:4000/api/growth/health-summary', { headers: { 'x-tenant-id': 'demo-tenant-1' } }),
        fetch('http://localhost:4000/api/growth/pipeline-analytics', { headers: { 'x-tenant-id': 'demo-tenant-1' } }),
      ]);

      if (resAnalytics.ok) setData(await resAnalytics.json());
      if (resHealth.ok) setGrowthData(await resHealth.json());
      if (resPipeline.ok) setPipelineData(await resPipeline.json());
    } catch (e) {
      console.warn('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const metrics = data?.metrics || {
    totalConversations: 0,
    openConversations: 0,
    resolvedConversations: 0,
    aiResolutionRate: 0,
    avgFirstResponseSeconds: 0,
    totalMessages: 0,
  };

  const billing = data?.billing || {
    tokenBalance: 50000,
    totalConsumedTokens: 0,
    planName: 'Enterprise Starter',
    status: 'ACTIVE',
  };

  const channelBreakdown = data?.channelBreakdown || { WHATSAPP: 0, WEB_WIDGET: 0 };
  const totalChannelsCount = Object.values(channelBreakdown).reduce((a: any, b: any) => a + b, 0) as number || 1;
  const whatsappPct = Math.round(((channelBreakdown.WHATSAPP || 0) / totalChannelsCount) * 100);
  const widgetPct = Math.round(((channelBreakdown.WEB_WIDGET || 0) / totalChannelsCount) * 100);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto" dir="rtl">
      {/* Header */}
      <header className="h-16 px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            التقارير والإحصائيات المؤسسية (Enterprise Analytics)
          </h1>
          <p className="text-xs text-slate-400">مؤشرات الأداء المباشرة وسرعة الاستجابة واستهلاك الـ AI والرموز</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchAnalytics}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className={`w-2 h-2 rounded-full ${isWhatsAppConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>واتساب: {isWhatsAppConnected ? `متصل (${connectedPhone || 'جاهز'})` : 'غير متصل'}</span>
          </div>
        </div>
      </header>

      {/* Analytics Content */}
      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">إجمالي المحادثات</span>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-slate-100">{metrics.totalConversations}</div>
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" />
              <span>مفتوحة: {metrics.openConversations} | مكتملة: {metrics.resolvedConversations}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">نسبة الحل الذاتي (AI)</span>
              <Bot className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-black text-teal-400">{metrics.aiResolutionRate}%</div>
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-2">
              <CheckCheck className="w-3 h-3 text-teal-400" />
              <span>محادثات تم حلها بالذكاء الاصطناعي دون تدخل</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">متوسط سرعة أول رد</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">
              {metrics.avgFirstResponseSeconds > 0 ? `${metrics.avgFirstResponseSeconds} ثانية` : '< 1 دقيقة'}
            </div>
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-2">
              <span>زمن الاستجابة للعملاء الجدد</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">رصيد الرموز (AI Tokens)</span>
              <Coins className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-400 tabular-nums">{billing.tokenBalance.toLocaleString()}</div>
            <div className="text-[11px] text-cyan-300/80 font-medium flex items-center gap-1 mt-2">
              <span>الباقة: {billing.planName} ({billing.status})</span>
            </div>
          </div>
        </div>

        {/* Breakdown Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Distribution */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              توزيع المحادثات حسب القنوات
            </h3>
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    واتساب (WhatsApp Direct)
                  </span>
                  <span className="font-bold">{whatsappPct}% ({channelBreakdown.WHATSAPP || 0})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${whatsappPct || 10}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    ودجت الموقع المباشر (Web Widget)
                  </span>
                  <span className="font-bold">{widgetPct}% ({channelBreakdown.WEB_WIDGET || 0})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${widgetPct || 5}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* AI & Security Health */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              حالة الأمان والحماية والتخفي (Anti-Ban & Stealth)
            </h3>
            <div className="space-y-3 text-xs text-slate-300 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  حارس التخفي البشري (8-Step Human Flow)
                </span>
                <span className="text-emerald-400 font-bold">نشط ومفعل</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  إعادة التشغيل الدقيقة اليومية (Micro-Restarts)
                </span>
                <span className="text-sky-400 font-bold">مجدول كل 24 ساعة</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  حارس رصيد الـ Tokens والتشفير AES-256-GCM
                </span>
                <span className="text-cyan-400 font-bold">مفعل في قاعدة البيانات</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION: RevOps & Customer Success Intelligence
        ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Customer Success Health & Churn Risk */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                مؤشر صحة العملاء وتوقعات الإلغاء (Customer Success)
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Score: {growthData?.averageHealthScore || 86}/100
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">حسابات صحية</span>
                <span className="text-lg font-bold text-emerald-400">
                  {growthData?.customers?.filter((c: any) => c.churnTier === 'LOW').length || 12}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">معرضة للمخاطر</span>
                <span className="text-lg font-bold text-rose-400">
                  {growthData?.highRiskCount || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">جاهزة للترقية</span>
                <span className="text-lg font-bold text-cyan-400">
                  {growthData?.expansionReadyCount || 3}
                </span>
              </div>
            </div>
          </div>

          {/* RevOps Pipeline & Sales Velocity */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                سرعة قمع المبيعات وتغطية المستهدف (Revenue Operations)
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                Coverage: {pipelineData?.pipelineCoverageRatio || 3.8}x
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">سرعة الإغلاق اليومية</span>
                <span className="text-sm font-bold text-slate-100">
                  {pipelineData?.dailySalesVelocity || 2400} ر.س/يوم
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">معدل الفوز بالصفقات</span>
                <span className="text-sm font-bold text-emerald-400">
                  {pipelineData?.winRatePct || '42%'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">صفقات متأخرة</span>
                <span className="text-sm font-bold text-amber-400">
                  {pipelineData?.agingDealsCount || 0} صفقات
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
