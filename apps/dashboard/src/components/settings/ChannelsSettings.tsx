'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../store/useChatStore';
import {
  MessageSquare,
  QrCode,
  Check,
  RefreshCw,
  Trash2,
  Clock,
  UserX,
  Plus,
  X,
  Shield,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Smartphone,
  CheckCheck,
  Zap,
  Globe,
  Code2,
  Copy,
  Palette,
  Eye,
  Terminal,
} from 'lucide-react';

export function ChannelsSettings() {
  const {
    isWhatsAppConnected,
    connectedPhone,
    setWhatsAppModalOpen,
    disconnectWhatsApp,
    tenantId,
  } = useChatStore();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Anti-Ban & Timing State
  const [autoReplyDelaySeconds, setAutoReplyDelaySeconds] = useState<number>(30);
  const [interMessageDelaySeconds, setInterMessageDelaySeconds] = useState<number>(15);
  const [excludedPhoneNumbers, setExcludedPhoneNumbers] = useState<string[]>([]);
  const [newExcludedNumber, setNewExcludedNumber] = useState('');
  const [sendReadReceipts, setSendReadReceipts] = useState(false);

  // Accordion state for Anti-Ban
  const [antiBanExpanded, setAntiBanExpanded] = useState(false);

  // Web Chat Widget State
  const [widgetTitle, setWidgetTitle] = useState('مساعد OmniDesk الذكي');
  const [widgetWelcome, setWidgetWelcome] = useState('أهلاً بك! كيف أقدر أساعدك اليوم؟ يسعدني الإجابة عن أي استفسار.');
  const [widgetColor, setWidgetColor] = useState('#10b981');
  const [widgetPosition, setWidgetPosition] = useState<'right' | 'left'>('right');
  const [copiedWidgetCode, setCopiedWidgetCode] = useState(false);
  const [isWidgetTesting, setIsWidgetTesting] = useState(false);

  // Loading & notification states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiUrl}/api/settings`, {
      headers: { 'x-tenant-id': tenantId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.autoReplyDelaySeconds !== undefined) setAutoReplyDelaySeconds(data.autoReplyDelaySeconds);
        if (data.interMessageDelaySeconds !== undefined) setInterMessageDelaySeconds(data.interMessageDelaySeconds);
        if (Array.isArray(data.excludedPhoneNumbers)) setExcludedPhoneNumbers(data.excludedPhoneNumbers);
        if (typeof data.sendReadReceipts === 'boolean') setSendReadReceipts(data.sendReadReceipts);
      })
      .catch((err) => {
        console.error('Failed loading channel settings:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tenantId, apiUrl]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          autoReplyDelaySeconds,
          interMessageDelaySeconds,
          excludedPhoneNumbers,
          sendReadReceipts,
        }),
      });

      if (!res.ok) throw new Error('فشل حفظ إعدادات القناة');

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExcludedNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newExcludedNumber.trim();
    if (!clean) return;
    if (!excludedPhoneNumbers.includes(clean)) {
      setExcludedPhoneNumbers([...excludedPhoneNumbers, clean]);
      setNewExcludedNumber('');
    }
  };

  const handleRemoveExcludedNumber = (num: string) => {
    setExcludedPhoneNumbers(excludedPhoneNumbers.filter((n) => n !== num));
  };

  const widgetSnippetCode = `<!-- OmniDesk AI Live Chat Widget -->\n` +
`<script\n` +
`  src="${apiUrl}/widget.js"\n` +
`  data-tenant-id="${tenantId || 'tenant_default'}"\n` +
`  data-api-url="${apiUrl}"\n` +
`  data-title="${widgetTitle}"\n` +
`  data-welcome="${widgetWelcome}"\n` +
`  data-color="${widgetColor}"\n` +
`  data-position="${widgetPosition}"\n` +
`  defer>\n` +
`</` + `script>`;

  const handleCopyWidgetCode = () => {
    navigator.clipboard.writeText(widgetSnippetCode);
    setCopiedWidgetCode(true);
    setTimeout(() => setCopiedWidgetCode(false), 3000);
  };

  const handleTestWidget = () => {
    const existing = document.getElementById('omni-widget-container');
    if (existing) {
      const toggle = document.getElementById('omni-widget-toggle') as HTMLButtonElement;
      if (toggle) toggle.click();
      return;
    }
    const script = document.createElement('script');
    script.src = `${apiUrl}/widget.js`;
    script.dataset.tenantId = tenantId || 'tenant_default';
    script.dataset.apiUrl = apiUrl;
    script.dataset.title = widgetTitle;
    script.dataset.welcome = widgetWelcome;
    script.dataset.color = widgetColor;
    script.dataset.position = widgetPosition;
    script.defer = true;
    document.body.appendChild(script);
    setIsWidgetTesting(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            قنوات الاتصال والربط (Communication Channels)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إدارة جلسة واتساب المباشرة، فحص حالة الاتصال، وضبط آليات الأمان ومنع الحظر (Anti-Ban Engine).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4" /> تم الحفظ بنجاح!
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main WhatsApp Direct Session Card */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-950/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-100">جلسة واتساب المباشرة (WhatsApp Baileys Direct)</h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                    isWhatsAppConnected
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isWhatsAppConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {isWhatsAppConnected ? 'متصل وجاهز للعمل' : 'غير متصل'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ربط عبر مسح رمز الاستجابة السريعة (QR Code) دون الحاجة لـ Meta Cloud API المعقدة أو الرسوم الشهرية.
              </p>
            </div>
          </div>
        </div>

        {/* Status & Connection Actions */}
        <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-300">الرقم المتصل بالجلسة حالياً:</div>
            <div className="text-sm font-mono font-bold text-emerald-400 tabular-nums flex items-center gap-2">
              {connectedPhone ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>+{connectedPhone}</span>
                </>
              ) : (
                <span className="text-slate-500 text-xs font-sans">لم يتم تسجيل أو ربط رقم حتى الآن</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setWhatsAppModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950"
            >
              <QrCode className="w-4 h-4" />
              <span>{isWhatsAppConnected ? 'إعادة مسح رمز QR' : 'ربط واتساب بالرمز QR'}</span>
            </button>

            {isWhatsAppConnected && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('هل أنت متأكد من تسجيل خروج جلسة الواتساب؟ سيتوقف الرد التلقائي.')) {
                    disconnectWhatsApp();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-bold transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>تسجيل خروج الجلسة</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          COLLAPSIBLE ACCORDION: Advanced Anti-Ban Settings (إعدادات حماية الحساب)
      ══════════════════════════════════════════════════════════════ */}
      <section className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setAntiBanExpanded(!antiBanExpanded)}
          className="w-full p-6 flex items-center justify-between text-right hover:bg-slate-800/30 transition"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-950/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-100">
                  إعدادات مكافحة الحظر والمحاكاة البشرية (Advanced Anti-Ban Settings)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  موصى به لحماية رقمك
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ضبط فترات التأخير البشري، فواصل الرسائل، قائمة الاستثناءات، ومحاكاة حالة الكتابة لمنع حظر واتساب.
              </p>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300">
            {antiBanExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {antiBanExpanded && (
          <div className="p-6 pt-2 border-t border-slate-800 space-y-6 animate-in fade-in duration-200">
            {/* 1. Natural Response Delay */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>وقت الانتظار قبل بدء الرد الأول (Initial Response Delay):</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    الرد الفوري خلال أجزاء من الثانية يكشف أنك تستخدم بوت آلي. منح فاصل زمني طبيعي يماثل سرعة القراءة البشرية.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/50 tabular-nums">
                  {autoReplyDelaySeconds} ثانية
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                {[
                  { sec: 3, label: '⚡ فوري (3 ثوانٍ)' },
                  { sec: 15, label: '⏱️ 15 ثانية' },
                  { sec: 30, label: '⏱️ 30 ثانية (موصى به)' },
                  { sec: 45, label: '⏱️ 45 ثانية' },
                  { sec: 60, label: '⏱️ 60 ثانية (دقيقة)' },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => setAutoReplyDelaySeconds(item.sec)}
                    className={`p-3 rounded-xl border text-center transition font-bold text-xs ${
                      autoReplyDelaySeconds === item.sec
                        ? 'bg-amber-950/70 border-amber-500 text-amber-200 shadow-md shadow-amber-950'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Inter-Message Delay */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>الفارق الزمني بين الرسائل والفقاعات المتتالية (Inter-Message Delay):</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    عندما يرسل المساعد أكثر من رسالة واحدة في الرد، ينتظر هذه المدة مع إظهار حالة &quot;يكتب الآن...&quot; على واتساب.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/50 tabular-nums">
                  {interMessageDelaySeconds} ثانية
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {[
                  { sec: 10, label: '⏱️ 10 ثوانٍ' },
                  { sec: 15, label: '⏱️ 15 ثانية (موصى به وطبيعي)' },
                  { sec: 20, label: '⏱️ 20 ثانية' },
                  { sec: 30, label: '⏱️ 30 ثانية' },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => setInterMessageDelaySeconds(item.sec)}
                    className={`p-3 rounded-xl border text-center transition font-bold text-xs ${
                      interMessageDelaySeconds === item.sec
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                  <CheckCheck className="w-4 h-4" />
                  <span>محاكاة السلوك البشري 100%:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  يقوم النظام بإرسال إشارة <code className="text-emerald-300 font-mono">composing (يكتب الآن...)</code> أثناء فترة الانتظار، مما يمنح العميل انطباعاً كاملاً بأنه يتحدث مع موظف خدمة عملاء يكتب رده يدوياً.
                </p>
              </div>
            </div>

            {/* 3. Read Receipts Toggle */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-cyan-400" />
                  <span>إرسال إشعار قراءة الرسائل (Read Receipts - الصحين الزرق):</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  تحديد الرسائل المستلمة كـ &quot;مقروءة&quot; فوراً قبل إرسال الرد الذكي.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={sendReadReceipts}
                  onChange={(e) => setSendReadReceipts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* 4. Blacklist / Excluded Numbers */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-bold text-slate-200">
                  قائمة الأرقام المستثناة (ممنوع الرد عليها تلقائياً):
                </h4>
              </div>
              <p className="text-[11px] text-slate-400">
                أرقام العائلة، الأصدقاء، الموردين، أو أرقام معينة تريد أن يتجاهلها الذكاء الاصطناعي تماماً ولا يرد عليها آلياً.
              </p>

              <form onSubmit={handleAddExcludedNumber} className="flex gap-2">
                <input
                  type="text"
                  placeholder="اكتب رقم الهاتف مع مفتاح الدولة (مثال: +963985323170 أو +96650...)"
                  value={newExcludedNumber}
                  onChange={(e) => setNewExcludedNumber(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                  dir="ltr"
                />
                <button
                  type="submit"
                  disabled={!newExcludedNumber.trim()}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة للقائمة</span>
                </button>
              </form>

              {/* Badges List */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-semibold text-slate-300">
                  الأرقام المستثناة حالياً ({excludedPhoneNumbers.length}):
                </div>
                {excludedPhoneNumbers.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    لا توجد أرقام مستثناة حالياً. الذكاء الاصطناعي سيرد على كافة الأرقام الواردة ما لم يتم إيقافه.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {excludedPhoneNumbers.map((num) => (
                      <span
                        key={num}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs font-mono"
                      >
                        <span>{num}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExcludedNumber(num)}
                          className="hover:text-rose-100 p-0.5 rounded transition"
                          title="إزالة من القائمة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Web Chat Widget Section (Omnichannel Website Chatbot) */}
      <section className="bg-slate-900/60 border border-slate-800/80 backdrop-blur rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                ودجت الدردشة للموقع الإلكتروني (Web Chatbot Widget)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                متعدد القنوات (Omnichannel)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              انسخ كوداً واحداً وضعه في موقعك أو متجرك الإلكتروني (سلة، زد، شوبيفاي، ووردبريس، أو HTML) ليتحول لمساعد ذكي فوري يتحدث بنفس قواعد المعرفة، المنتجات، والمهارات!
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestWidget}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/40 text-xs font-semibold transition"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>{isWidgetTesting ? 'فتح الودجت في الصفحة' : 'تجربة الودجت الآن مباشرة'}</span>
          </button>
        </div>

        {/* Customization Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-emerald-400" />
              <span>تخصيص المظهر والنصوص (Appearance & Behavior)</span>
            </h4>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                اسم المساعد في رأس الودجت:
              </label>
              <input
                type="text"
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="مساعد OmniDesk الذكي"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Welcome message */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                رسالة الترحيب الأولى التلقائية:
              </label>
              <textarea
                rows={2}
                value={widgetWelcome}
                onChange={(e) => setWidgetWelcome(e.target.value)}
                placeholder="أهلاً بك! كيف يمكنني مساعدتك اليوم؟"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Colors & Position in two columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Color Picker */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  اللون الأساسي (Primary Color):
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center">
                    <input
                      type="color"
                      value={widgetColor}
                      onChange={(e) => setWidgetColor(e.target.value)}
                      className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['#10b981', '#6366f1', '#0ea5e9', '#8b5cf6', '#f43f5e', '#d97706'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setWidgetColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          widgetColor.toLowerCase() === c.toLowerCase()
                            ? 'border-white scale-110 shadow-lg'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  موضع الزر العائم في الصفحة:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWidgetPosition('right')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                      widgetPosition === 'right'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    أسفل اليمين (Right)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidgetPosition('left')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                      widgetPosition === 'left'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    أسفل اليسار (Left)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Embed Code Snippet */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>كود التضمين للموقع (HTML Embed Code)</span>
              </h4>
              <button
                type="button"
                onClick={handleCopyWidgetCode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  copiedWidgetCode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30'
                }`}
              >
                {copiedWidgetCode ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الكود</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Box */}
            <div className="relative group">
              <pre
                dir="ltr"
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto select-all"
              >
                {widgetSnippetCode}
              </pre>
            </div>

            {/* Integration Instructions */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-[11px] text-slate-400">
              <div className="font-bold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span>أين أضع هذا الكود؟</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 leading-relaxed pr-1">
                <li>
                  <strong className="text-slate-200">سلة (Salla) أو زد (Zid):</strong> إعدادات المتجر &gt; الأكواد المخصصة (Custom JS / Tracking Scripts).
                </li>
                <li>
                  <strong className="text-slate-200">Shopify:</strong> Online Store &gt; Themes &gt; Edit code &gt; <code className="text-emerald-400 font-mono">theme.liquid</code> قبل وسم <code className="text-emerald-400 font-mono">&lt;/body&gt;</code>.
                </li>
                <li>
                  <strong className="text-slate-200">WordPress / WooCommerce:</strong> عبر إضافة Header &amp; Footer Code أو في قالب الموقع.
                </li>
                <li>
                  <strong className="text-slate-200">أي موقع HTML مخصص:</strong> الصق الكود مباشرة قبل وسم الإغلاق <code className="text-emerald-400 font-mono">&lt;/body&gt;</code>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
