import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Zap, Bot, ArrowRight, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#060911] text-slate-100 flex flex-col justify-between overflow-x-hidden relative font-sans selection:bg-emerald-500/25 selection:text-emerald-200" dir="rtl">
      {/* Dynamic Background Mesh Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div 
          className="absolute inset-0 opacity-[0.025]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, 
            backgroundSize: '32px 32px' 
          }} 
        />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all">
            <div className="w-full h-full rounded-[15px] bg-[#090d16] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">OmniDesk</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                AI Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">منظومة مبيعات وخدمة عملاء واتساب الذكية</p>
          </div>
        </Link>

        <Link
          href="/"
          className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30"
        >
          <span>العودة للرئيسية</span>
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Link>
      </header>

      {/* Main Dual View Area */}
      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Form Container (Center / Right Column) */}
          <div className="lg:col-span-6 xl:col-span-5 w-full flex justify-center">
            <div className="w-full max-w-md">
              {children}
            </div>
          </div>

          {/* Brand Showcase (Left Column on RTL = visually left/secondary side) */}
          <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-center space-y-8 pr-6">
            {/* Value Proposition Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold w-fit">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>مُصمم للشركات الكبرى ورواد التجارة الإلكترونية بالمملكة والخليج</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.25]">
                ضاعف مبيعاتك عبر واتساب{' '}
                <span className="text-emerald-400">
                  بوكلاء ذكاء اصطناعي
                </span>{' '}
                يعملون على مدار الساعة
              </h1>
              <p className="text-slate-300 text-base leading-relaxed max-w-xl font-normal">
                منصة OmniDesk AI تجمع بين سرعة محادثات WhatsApp Live، وذكاء نماذج Gemini الاستثنائية، وضمانات عدم الحظر وفق أعلى معايير الأمان المعتمدة.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div className="p-4 rounded-2xl bg-[#0e1626]/80 border border-white/[0.08] backdrop-blur-md">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-3">
                  <Bot className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">وكلاء مبيعات متخصصون</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  معالجة اعتراضات الأسعار، وإتمام الصفقات المعلقة تلقائياً بنسبة نجاح تفوق 40%.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0e1626]/80 border border-white/[0.08] backdrop-blur-md">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mb-3">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">ربط فوري هجين</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  دعم متكامل لـ Meta Cloud API الرسمي و محرك WhatsApp Web بمسح رمز QR خلال 5 ثوانٍ.
                </p>
              </div>
            </div>

            {/* Proof Metric Strip */}
            <div className="pt-2 border-t border-white/[0.06] flex items-center gap-8 max-w-xl">
              <div>
                <div className="text-2xl font-black text-emerald-400 tabular-nums">99.9%</div>
                <div className="text-xs text-slate-400">استقرار واتصال آمن</div>
              </div>
              <div className="w-[1px] h-8 bg-white/[0.08]" />
              <div>
                <div className="text-2xl font-black text-cyan-400 tabular-nums">&lt; 3s</div>
                <div className="text-xs text-slate-400">متوسط سرعة الرد الذكي</div>
              </div>
              <div className="w-[1px] h-8 bg-white/[0.08]" />
              <div>
                <div className="text-2xl font-black text-white tabular-nums">50K+</div>
                <div className="text-xs text-slate-400">رسالة تمت معالجتها يومياً</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} OmniDesk Enterprise. جميع الحقوق محفوظة.</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hover:text-slate-400 cursor-pointer">سياسة الخصوصية والأمان</span>
          <span>&bull;</span>
          <span className="hover:text-slate-400 cursor-pointer">اتفاقية مستوى الخدمة (SLA)</span>
          <span>&bull;</span>
          <span className="hover:text-slate-400 cursor-pointer">مساعدة ودعم فني</span>
        </div>
      </footer>
    </div>
  );
}
