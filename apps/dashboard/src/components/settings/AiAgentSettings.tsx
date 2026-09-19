'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Key, 
  Sparkles, 
  Check, 
  ExternalLink, 
  Sliders, 
  Zap, 
  Brain,
  MessageSquareCode,
  RotateCcw
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { AgenticSkillsManager } from '../AgenticSkillsManager';
import { SandboxChat } from '../SandboxChat';

export function AiAgentSettings() {
  const { tenantId } = useChatStore();

  const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [openrouterModel, setOpenrouterModel] = useState('google/gemini-2.5-flash');
  const [geminiSystemPrompt, setGeminiSystemPrompt] = useState(
    'أنت مساعد خدمة عملاء محترف للرد على استفسارات العملاء بدقة وإيجاز واحترافية عالية عبر الواتساب.'
  );
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [dialect, setDialect] = useState<string>('syrian');
  const [tone, setTone] = useState<string>('friendly');
  const [customDialectPrompt, setCustomDialectPrompt] = useState('');
  const [showSandbox, setShowSandbox] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetch(`${apiUrl}/api/settings`, { headers: { 'x-tenant-id': tenantId } })
      .then((res) => res.json())
      .then((data) => {
        if (data.aiProvider) setAiProvider(data.aiProvider);
        if (data.geminiApiKey) setGeminiApiKey(data.geminiApiKey);
        if (data.geminiModel) setGeminiModel(data.geminiModel);
        if (data.openrouterApiKey) setOpenrouterApiKey(data.openrouterApiKey);
        if (data.openrouterModel) setOpenrouterModel(data.openrouterModel);
        if (data.geminiSystemPrompt) setGeminiSystemPrompt(data.geminiSystemPrompt);
        if (data.autoReplyEnabled !== undefined) setAutoReplyEnabled(data.autoReplyEnabled);
        if (data.dialect) setDialect(data.dialect);
        if (data.tone) setTone(data.tone);
        if (data.customDialectPrompt) setCustomDialectPrompt(data.customDialectPrompt);
      })
      .catch(() => {});
  }, [apiUrl, tenantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          aiProvider,
          geminiApiKey,
          geminiModel,
          openrouterApiKey,
          openrouterModel,
          geminiSystemPrompt,
          autoReplyEnabled,
          dialect,
          tone,
          customDialectPrompt,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving AI settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            محرك الذكاء الاصطناعي وتوليد الردود (AI Engine)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إعداد نماذج Google Gemini و OpenRouter، توجيه الصياغة واللهجة، والتحكم بالمهارات البيعية المتقدمة.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSandbox(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>مختبر المعرفة (Sandbox)</span>
          </button>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              <span>تم الحفظ</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Dual AI Engine Provider Card */}
        <section className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-950/40">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  مزود ومحرك الذكاء الاصطناعي الرئيسي
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 tabular-nums">
                    Dual Engine
                  </span>
                </h3>
                <p className="text-xs text-slate-400">اختر المزود لتوليد الردود الذكية للعملاء</p>
              </div>
            </div>

            {/* Provider Switch Tabs */}
            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setAiProvider('gemini')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  aiProvider === 'gemini'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                Google Gemini
              </button>
              <button
                type="button"
                onClick={() => setAiProvider('openrouter')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  aiProvider === 'openrouter'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                OpenRouter.ai
              </button>
            </div>
          </div>

          {/* Gemini Specific Config */}
          {aiProvider === 'gemini' ? (
            <div className="p-5 rounded-2xl bg-[#070b14] border border-cyan-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  إعدادات Google AI Studio (Gemini Direct)
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                >
                  الحصول على مفتاح مجاني
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    مفتاح Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    نموذج Gemini المعتمد
                  </label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (الأسرع والأحدث - موصى به)</option>
                    <option value="gemini-flash-latest">Gemini Flash Latest</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[#070b14] border border-emerald-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  إعدادات بوابة OpenRouter المفتوحة
                </div>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                >
                  الحصول على مفتاح OpenRouter
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    مفتاح OpenRouter API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={openrouterApiKey}
                    onChange={(e) => setOpenrouterApiKey(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    معرف النموذج (Model ID)
                  </label>
                  <input
                    type="text"
                    placeholder="google/gemini-2.5-flash"
                    value={openrouterModel}
                    onChange={(e) => setOpenrouterModel(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. System Prompt & Personality */}
        <section className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-5">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-400" />
            التوجيه الأساسي وشخصية المساعد (System Prompt)
          </h3>

          <div>
            <textarea
              rows={4}
              value={geminiSystemPrompt}
              onChange={(e) => setGeminiSystemPrompt(e.target.value)}
              placeholder="اكتب التوجيهات العامة التي يجب أن يلتزم بها الذكاء الاصطناعي..."
              className="w-full bg-[#070b14] border border-white/[0.09] rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                اللهجة المعتمدة في الردود
              </label>
              <select
                value={dialect}
                onChange={(e) => setDialect(e.target.value)}
                className="w-full bg-[#070b14] border border-white/[0.09] rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
              >
                <option value="syrian">شامية / سورية (لطيفة ومرحبة)</option>
                <option value="saudi">سعودية / خليجية (رسمية وودودة)</option>
                <option value="egyptian">مصرية (حيوية وعملية)</option>
                <option value="msa">عربية فصحى مبسطة (Business MSA)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                نبرة الصوت (Tone of Voice)
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-[#070b14] border border-white/[0.09] rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
              >
                <option value="friendly">ودودة ومرحبة (Friendly & Helpful)</option>
                <option value="professional">مهنية ورسمية (Formal & Professional)</option>
                <option value="persuasive">بيعية ومقنعة (Sales & Conversion Focused)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. Enterprise Agentic Skills Suite */}
        <div className="pt-2">
          <AgenticSkillsManager tenantId={tenantId} />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? 'جاري الحفظ...' : (
              <>
                <Check className="w-4 h-4" />
                <span>حفظ إعدادات الذكاء الاصطناعي</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Sandbox Modal */}
      {showSandbox && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-3xl">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowSandbox(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                إغلاق الاختبار ✕
              </button>
            </div>
            <SandboxChat />
          </div>
        </div>
      )}
    </div>
  );
}
