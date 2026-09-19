'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [tenantName, setTenantName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  // Real-time password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['', 'ضعيفة', 'مقبولة', 'جيدة', 'قوية ومحمية'];
  const strengthColors = ['', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-emerald-500'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationMsg(null);

    if (password.length < 6) {
      setValidationMsg('يجب أن لا تقل كلمة المرور عن 6 خانات');
      return;
    }

    if (password !== confirmPassword) {
      setValidationMsg('كلمتا المرور غير متطابقتين، يرجى إعادة التأكد');
      return;
    }

    if (!agreeTerms) {
      setValidationMsg('يرجى الموافقة على شروط الاستخدام لمتابعة التسجيل');
      return;
    }

    const ok = await register({
      tenantName: tenantName.trim(),
      adminName: adminName.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim() || undefined,
    });

    if (ok) {
      setSuccessToast(true);
      setTimeout(() => {
        router.push('/');
      }, 700);
    }
  };

  return (
    <div className="w-full py-4">
      {/* Main Glass Card */}
      <div className="rounded-3xl bg-[#0c121e]/90 border border-white/10 p-7 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        
        {/* Top ambient glow */}
        <div className="absolute top-0 right-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

        {/* Card Header */}
        <div className="mb-6 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>حساب مساحة عمل جديد</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ابدأ تجربتك المجانية
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-normal">
            14 يوماً تجربة كاملة لكافة مزايا الذكاء الاصطناعي وبدون بطاقة بنكية
          </p>
        </div>

        {/* Validation or API Error Banner */}
        {(error || validationMsg) && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{validationMsg || error}</div>
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-bold">تم تأسيس مساحة عملك بنجاح! جاري التجهيز...</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              اسم المنشأة أو المتجر
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={tenantName}
                onChange={(e) => {
                  setTenantName(e.target.value);
                  if (error || validationMsg) clearError();
                }}
                placeholder="مثال: شركة التقنية الحديثة"
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
              />
              <Building2 className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Admin Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              الاسم الكامل للمسؤول
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => {
                  setAdminName(e.target.value);
                  if (error || validationMsg) clearError();
                }}
                placeholder="مثال: عبد العزيز العتيبي"
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Work Email & Phone Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  suppressHydrationWarning
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error || validationMsg) clearError();
                  }}
                  placeholder="admin@company.com"
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                رقم الواتساب للتواصل
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans text-right"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Password & Confirmation */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error || validationMsg) clearError();
                }}
                placeholder="6 خانات أو أكثر تشمل أرقام ورموز"
                className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="pt-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        step <= strength ? strengthColors[strength] : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>قوة كلمة المرور:</span>
                  <span className="font-semibold text-slate-300">{strengthLabels[strength]}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              تأكيد كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error || validationMsg) clearError();
                }}
                placeholder="أعد كتابة كلمة المرور"
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded bg-[#070b14] border-white/20 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
            />
            <label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer select-none">
              أوافق على{' '}
              <a href="#" className="text-cyan-400 hover:underline">شروط الاستخدام</a>
              {' '}و{' '}
              <a href="#" className="text-cyan-400 hover:underline">سياسة الخصوصية وأمان البيانات</a>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إنشاء الحساب ومساحة العمل...</span>
              </>
            ) : (
              <>
                <span>تأسيس مساحة العمل وبدء التجربة</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-white/[0.08]" />
          <span className="text-[11px] text-slate-500 font-medium">أو</span>
          <div className="flex-1 h-[1px] bg-white/[0.08]" />
        </div>

        {/* Login Prompt */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            لديك حساب مسجل بالفعل؟{' '}
            <Link
              href="/login"
              className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-4"
            >
              تسجيل الدخول هنا
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
