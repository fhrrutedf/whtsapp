'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  DollarSign,
  ShieldCheck,
  Calendar,
  UserCheck,
  TrendingUp,
  BarChart2,
  Sliders,
  Check,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Percent,
  Link2
} from 'lucide-react';

interface SkillItem {
  name: string;
  displayName: string;
  category: string;
  description: string;
  isEnabled: boolean;
}

interface SkillsSettings {
  enabledSkills: string[];
  checkoutBaseUrl: string;
  meetingSchedulerUrl: string;
  defaultDiscountPercentage: number;
}

interface AgenticSkillsManagerProps {
  tenantId: string;
}

export function AgenticSkillsManager({ tenantId }: AgenticSkillsManagerProps) {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [settings, setSettings] = useState<SkillsSettings>({
    enabledSkills: [],
    checkoutBaseUrl: 'https://pay.yourdomain.com/checkout',
    meetingSchedulerUrl: 'https://meet.omnidesk.ai/schedule',
    defaultDiscountPercentage: 20,
  });
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'sales' | 'operations'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/skills`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills || []);
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.warn('Failed loading skills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [tenantId]);

  const toggleSkill = (skillName: string) => {
    const isCurrentlyEnabled = settings.enabledSkills.includes(skillName);
    const updated = isCurrentlyEnabled
      ? settings.enabledSkills.filter((s) => s !== skillName)
      : [...settings.enabledSkills, skillName];

    setSettings((prev) => ({ ...prev, enabledSkills: updated }));
    setSkills((prev) =>
      prev.map((s) => (s.name === skillName ? { ...s, isEnabled: !isCurrentlyEnabled } : s))
    );
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/skills/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setToastMessage('✅ تم حفظ إعدادات المهارات بنجاح!');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      setToastMessage('❌ حدث خطأ أثناء الحفظ.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getSkillIcon = (name: string) => {
    switch (name) {
      case 'sales_closer':
      case 'upsell_cross_sell':
        return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case 'objection_handler':
      case 'sales_engineer':
        return <ShieldCheck className="w-5 h-5 text-amber-400" />;
      case 'meeting_scheduler':
        return <Calendar className="w-5 h-5 text-cyan-400" />;
      case 'customer_success_manager':
      case 'churn_risk_detector':
        return <UserCheck className="w-5 h-5 text-rose-400" />;
      case 'revenue_operations':
      case 'business_growth_router':
        return <TrendingUp className="w-5 h-5 text-cyan-400" />;
      default:
        return <Zap className="w-5 h-5 text-teal-400" />;
    }
  };

  const filteredSkills = activeCategory === 'ALL'
    ? skills
    : skills.filter((s) => s.category === activeCategory);

  return (
    <section className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-xl" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-lg shadow-emerald-950">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                منظومة المهارات الذكية والنمو (Enterprise Agentic Skills)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                11 Skills Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              مهارات ذكاء اصطناعي متخصصة للتحويل البيعي، تفكيك الاعتراضات، عمليات الإيرادات، ونجاح العملاء
            </p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeCategory === 'ALL'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الكل ({skills.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('sales')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeCategory === 'sales'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            المبيعات والإغلاق
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('operations')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeCategory === 'operations'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            العمليات والـ RevOps
          </button>
        </div>
      </div>

      {/* Global Skill Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
        <div>
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            رابط بوابة الدفع الافتراضي (Checkout URL)
          </label>
          <input
            type="text"
            value={settings.checkoutBaseUrl}
            onChange={(e) => setSettings({ ...settings, checkoutBaseUrl: e.target.value })}
            placeholder="https://pay.yourdomain.com/checkout"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700/70 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <p className="text-[10px] text-slate-500 mt-1">يستخدمه مغلق الصفقات (sales_closer) لتوليد روابط دفع فورية</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            رابط حجز المواعيد (Cal.com / Zoom)
          </label>
          <input
            type="text"
            value={settings.meetingSchedulerUrl}
            onChange={(e) => setSettings({ ...settings, meetingSchedulerUrl: e.target.value })}
            placeholder="https://meet.omnidesk.ai/schedule"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700/70 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <p className="text-[10px] text-slate-500 mt-1">توليد روابط المواعيد لعملاء B2B والعروض التوضيحية</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
            <Percent className="w-3.5 h-3.5 text-amber-400" />
            نسبة خصم الـ Upsell والترقية (%)
          </label>
          <input
            type="number"
            value={settings.defaultDiscountPercentage}
            onChange={(e) => setSettings({ ...settings, defaultDiscountPercentage: Number(e.target.value) })}
            min={5}
            max={50}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700/70 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          />
          <p className="text-[10px] text-slate-500 mt-1">الخصم الحصري المقدم تلقائياً بعد إتمام العميل للشراء</p>
        </div>
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">جاري تحميل المهارات المسجلة...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredSkills.map((skill) => {
            const isEnabled = settings.enabledSkills.includes(skill.name);
            return (
              <div
                key={skill.name}
                className={`p-4 rounded-xl border transition-all ${
                  isEnabled
                    ? 'bg-slate-900/90 border-slate-700/90 shadow-md shadow-slate-950/50'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 shrink-0">
                      {getSkillIcon(skill.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-100">{skill.displayName}</h3>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {skill.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {skill.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => toggleSkill(skill.name)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? '-translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Button & Status */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <span className="text-xs text-slate-400">
          {toastMessage && <span className="font-semibold text-emerald-400">{toastMessage}</span>}
        </span>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : (
            <>
              <Check className="w-4 h-4" />
              حفظ إعدادات المهارات
            </>
          )}
        </button>
      </div>
    </section>
  );
}
