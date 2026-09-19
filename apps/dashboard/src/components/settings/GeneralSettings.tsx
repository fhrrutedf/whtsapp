'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Mail, 
  Globe, 
  Clock, 
  UploadCloud, 
  Check, 
  Sliders,
  Sparkles,
  Link2,
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';

export function GeneralSettings() {
  const { tenantId } = useChatStore();
  const [companyName, setCompanyName] = useState('OmniDesk Global Enterprise');
  const [brandTagline, setBrandTagline] = useState('منصة خدمة العملاء الذكية متعددة القنوات');
  const [supportEmail, setSupportEmail] = useState('support@omnidesk.ai');
  const [timezone, setTimezone] = useState('Asia/Riyadh');
  const [currency, setCurrency] = useState('USD');
  const [checkoutBaseUrl, setCheckoutBaseUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetch(`${apiUrl}/api/settings`, { headers: { 'x-tenant-id': tenantId } })
      .then((res) => res.json())
      .then((data) => {
        if (data.companyName) setCompanyName(data.companyName);
        if (data.brandTagline) setBrandTagline(data.brandTagline);
        if (data.supportEmail) setSupportEmail(data.supportEmail);
        if (data.timezone) setTimezone(data.timezone);
        if (data.currency) setCurrency(data.currency);
        if (data.checkoutBaseUrl) setCheckoutBaseUrl(data.checkoutBaseUrl);
      })
      .catch(() => {});
  }, [apiUrl, tenantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          companyName,
          brandTagline,
          supportEmail,
          timezone,
          currency,
          checkoutBaseUrl,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving general settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            الملف العام وهوية المنشأة
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إدارة البيانات الأساسية للشركة، الشعار، والمنطقة الزمنية المعتمدة لجدولة الرسائل.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-fadeIn">
            <Check className="w-3.5 h-3.5" />
            <span>تم حفظ التعديلات بنجاح</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand & Profile Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-5">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            بيانات المنشأة والعلامة التجارية
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                اسم المنشأة / الشركة
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="أدخل اسم شركتك..."
                className="w-full bg-[#070b14] border border-white/[0.09] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                البريد الإلكتروني للدعم الفني
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  suppressHydrationWarning
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@company.com"
                  className="w-full bg-[#070b14] border border-white/[0.09] rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                الشعار اللفظي أو الوصف المختصر (Tagline)
              </label>
              <input
                type="text"
                value={brandTagline}
                onChange={(e) => setBrandTagline(e.target.value)}
                placeholder="مثلاً: المنصة الرائدة في خدمات الدعم الفني الفوري"
                className="w-full bg-[#070b14] border border-white/[0.09] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>
        </div>

        {/* Logo & Assets Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            شعار الشركة والأصول المرئية
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-[#070b14] border border-dashed border-white/10 hover:border-emerald-500/30 transition">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1.5px] shadow-lg shadow-emerald-500/20 shrink-0">
              <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center font-black text-2xl text-emerald-400 select-none">
                Ω
              </div>
            </div>

            <div className="space-y-1 text-center sm:text-right">
              <div className="text-xs font-bold text-slate-200">شعار المنصة الحالي (SVG / PNG)</div>
              <p className="text-[11px] text-slate-400">يدعم صيغ SVG، PNG، WEBP الشفافة بحجم أقصى 2MB.</p>
            </div>
          </div>
        </div>

        {/* Regional & Timezone Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-5">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            الإعدادات الإقليمية والمنطقة الزمنية
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                المنطقة الزمنية (Timezone)
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#070b14] border border-white/[0.09] rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
              >
                <option value="Asia/Riyadh">الرياض، مكة المكرمة (GMT+3)</option>
                <option value="Asia/Dubai">دبي، أبوظبي (GMT+4)</option>
                <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                <option value="Asia/Amman">عمان، دمشق، بيروت (GMT+3)</option>
                <option value="Europe/London">لندن (GMT+0)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                العملة الافتراضية
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#070b14] border border-white/[0.09] rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="AED">درهم إماراتي (AED)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="EUR">يورو (EUR)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payment Link Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-400" />
              <span>رابط الدفع المعتمد (Payment Link)</span>
            </h3>
            <span className="text-[11px] text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              رابط الدفع المباشر
            </span>
          </div>
          <p className="text-xs text-slate-400">
            ضع رابط الدفع الشامل الخاص بك هنا. عند طلب أي عميل للدفع، يرسل له الذكاء الاصطناعي هذا الرابط مباشرة وبسرعة.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              رابط الدفع:
            </label>
            <input
              type="url"
              placeholder="https://... رابط صفحة الدفع الخاصة بك"
              value={checkoutBaseUrl}
              onChange={(e) => setCheckoutBaseUrl(e.target.value)}
              className="w-full bg-[#070b14] border border-white/[0.09] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500/50"
              dir="ltr"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? 'جاري الحفظ...' : (
              <>
                <Check className="w-4 h-4" />
                <span>حفظ التعديلات العامة</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
