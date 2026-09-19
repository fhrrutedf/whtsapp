'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
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

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [successToast, setSuccessToast] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const ok = await login(email, password);
    if (ok) {
      setSuccessToast(true);
      setTimeout(() => {
        router.push('/');
      }, 500);
    }
  };

  const handleDemoFill = async () => {
    setEmail('admin@omni.sa');
    setPassword('Admin@123');
    clearError();
    const ok = await login('admin@omni.sa', 'Admin@123');
    if (ok) {
      setSuccessToast(true);
      setTimeout(() => {
        router.push('/');
      }, 500);
    }
  };

  return (
    <div className="w-full">
      {/* Main Glass Card */}
      <div className="rounded-3xl bg-[#0c121e]/90 border border-white/10 p-7 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        
        {/* Top ambient glow */}
        <div className="absolute top-0 right-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

        {/* Card Header */}
        <div className="mb-6 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            مرحباً بعودتك
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-normal">
            سجّل دخولك للوصول إلى لوحة تحكم ومحادثات واتساب
          </p>
        </div>

        {/* 1-Click Quick Demo Button */}
        <div className="mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">تجربة فورية بنقرة واحدة</div>
              <div className="text-[11px] text-slate-400">حساب تجريبي مُعد مسبقاً بكامل الصلاحيات</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDemoFill}
            disabled={isLoading}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 transition-all flex items-center gap-1 flex-shrink-0 shadow-md shadow-emerald-500/20 active:scale-95"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>دخول سريع</span>}
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-bold">تم تسجيل الدخول بنجاح! جاري تحويلك...</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              البريد الإلكتروني للعمل
            </label>
            <div className="relative">
              <input
                type="email"
                required
                suppressHydrationWarning
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
                placeholder="name@company.com"
                className="w-full pr-10 pl-4 py-3 rounded-xl bg-[#070b14] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                كلمة المرور
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert('يرجى التواصل مع مسؤول النظام لإعادة ضبط كلمة المرور أو استخدام الحساب التجريبي');
                }}
                className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                نسيت كلمة المرور؟
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
                placeholder="••••••••••••"
                className="w-full pr-10 pl-10 py-3 rounded-xl bg-[#070b14] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-sans"
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
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-[#070b14] border-white/20 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
            />
            <label htmlFor="remember" className="text-xs text-slate-400 cursor-pointer select-none">
              تذكر هذا الجهاز لمدة 30 يوماً
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحقق من البيانات...</span>
              </>
            ) : (
              <>
                <span>تسجيل الدخول إلى النظام</span>
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

        {/* Register Prompt */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            ليس لديك مساحة عمل حتى الآن؟{' '}
            <Link
              href="/register"
              className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-4"
            >
              إنشاء حساب جديد مجاناً
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
