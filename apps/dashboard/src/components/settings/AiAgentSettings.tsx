'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Key, 
  Sparkles, 
  Check, 
  ExternalLink, 
  Zap, 
  Brain,
  Cpu,
  Globe,
  Radio,
  Server,
  Activity,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { AgenticSkillsManager } from '../AgenticSkillsManager';
import { SandboxChat } from '../SandboxChat';

type AiProviderType = 'gemini' | 'openai' | 'groq' | 'deepseek' | 'openrouter' | 'custom';

export function AiAgentSettings() {
  const { tenantId } = useChatStore();

  const [aiProvider, setAiProvider] = useState<AiProviderType>('gemini');

  // Google Gemini
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.6-flash');

  // OpenAI
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');

  // Groq
  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');

  // DeepSeek
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [deepseekModel, setDeepseekModel] = useState('deepseek-chat');

  // OpenRouter
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [openrouterModel, setOpenrouterModel] = useState('google/gemini-2.5-flash');

  // Custom Agent / Any External AI API
  const [customApiBaseUrl, setCustomApiBaseUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customModel, setCustomModel] = useState('default');

  // Prompts & Personality
  const [geminiSystemPrompt, setGeminiSystemPrompt] = useState(
    'أنت مساعد خدمة عملاء محترف للرد على استفسارات العملاء بدقة وإيجاز واحترافية عالية عبر الواتساب.'
  );
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [dialect, setDialect] = useState<string>('syrian');
  const [tone, setTone] = useState<string>('friendly');
  const [customDialectPrompt, setCustomDialectPrompt] = useState('');

  // UI States
  const [showSandbox, setShowSandbox] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live Test State
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    reply?: string;
    error?: string;
  } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetch(`${apiUrl}/api/settings`, { headers: { 'x-tenant-id': tenantId } })
      .then((res) => res.json())
      .then((data) => {
        if (data.aiProvider) setAiProvider(data.aiProvider);
        if (data.geminiApiKey) setGeminiApiKey(data.geminiApiKey);
        if (data.geminiModel) setGeminiModel(data.geminiModel);
        if (data.openaiApiKey) setOpenaiApiKey(data.openaiApiKey);
        if (data.openaiModel) setOpenaiModel(data.openaiModel);
        if (data.groqApiKey) setGroqApiKey(data.groqApiKey);
        if (data.groqModel) setGroqModel(data.groqModel);
        if (data.deepseekApiKey) setDeepseekApiKey(data.deepseekApiKey);
        if (data.deepseekModel) setDeepseekModel(data.deepseekModel);
        if (data.openrouterApiKey) setOpenrouterApiKey(data.openrouterApiKey);
        if (data.openrouterModel) setOpenrouterModel(data.openrouterModel);
        if (data.customApiBaseUrl) setCustomApiBaseUrl(data.customApiBaseUrl);
        if (data.customApiKey) setCustomApiKey(data.customApiKey);
        if (data.customModel) setCustomModel(data.customModel);
        if (data.geminiSystemPrompt) setGeminiSystemPrompt(data.geminiSystemPrompt);
        if (data.autoReplyEnabled !== undefined) setAutoReplyEnabled(data.autoReplyEnabled);
        if (data.dialect) setDialect(data.dialect);
        if (data.tone) setTone(data.tone);
        if (data.customDialectPrompt) setCustomDialectPrompt(data.customDialectPrompt);
      })
      .catch(() => {});
  }, [apiUrl, tenantId]);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    let keyToTest = '';
    let modelToTest = '';
    let baseUrlToTest = '';

    if (aiProvider === 'gemini') {
      keyToTest = geminiApiKey;
      modelToTest = geminiModel;
    } else if (aiProvider === 'openai') {
      keyToTest = openaiApiKey;
      modelToTest = openaiModel;
    } else if (aiProvider === 'groq') {
      keyToTest = groqApiKey;
      modelToTest = groqModel;
    } else if (aiProvider === 'deepseek') {
      keyToTest = deepseekApiKey;
      modelToTest = deepseekModel;
    } else if (aiProvider === 'openrouter') {
      keyToTest = openrouterApiKey;
      modelToTest = openrouterModel;
    } else if (aiProvider === 'custom') {
      keyToTest = customApiKey;
      modelToTest = customModel;
      baseUrlToTest = customApiBaseUrl;
    }

    try {
      const res = await fetch(`${apiUrl}/api/settings/ai/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey: keyToTest,
          model: modelToTest,
          baseUrl: baseUrlToTest,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'تعذر الوصول إلى سيرفر API للاختبار',
      });
    } finally {
      setTestingConnection(false);
    }
  };

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
          openaiApiKey,
          openaiModel,
          groqApiKey,
          groqModel,
          deepseekApiKey,
          deepseekModel,
          openrouterApiKey,
          openrouterModel,
          customApiBaseUrl,
          customApiKey,
          customModel,
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

  const providersConfig = [
    {
      id: 'gemini' as AiProviderType,
      title: 'Google Gemini',
      subtitle: 'سريع واقتصادي وموصى به',
      badge: 'الافتراضي',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      icon: Bot,
    },
    {
      id: 'openai' as AiProviderType,
      title: 'OpenAI (ChatGPT)',
      subtitle: 'GPT-4o و GPT-4o-mini',
      badge: 'ذكاء متقدم',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: Brain,
    },
    {
      id: 'groq' as AiProviderType,
      title: 'Groq Cloud',
      subtitle: 'فائق السرعة (Llama 3.3)',
      badge: 'أسرع استجابة',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: Zap,
    },
    {
      id: 'deepseek' as AiProviderType,
      title: 'DeepSeek API',
      subtitle: 'DeepSeek Chat & V3',
      badge: 'منخفض التكلفة',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: Cpu,
    },
    {
      id: 'openrouter' as AiProviderType,
      title: 'OpenRouter.ai',
      subtitle: 'بوابة النماذج العالمية المفتوحة',
      badge: 'شامل ومفتوح',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      icon: Globe,
    },
    {
      id: 'custom' as AiProviderType,
      title: 'أي وكيل مخصص (Custom Agent)',
      subtitle: 'ربط أي سيرفر أو API خارجي',
      badge: 'حر ومرن',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      icon: Server,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            منظومة الاتصال بمزودي الذكاء الاصطناعي والوكلاء المخصصين (Universal AI Hub)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ربط أي وكيل مخصص أو مزود API عالمي (Gemini, OpenAI, Groq, DeepSeek, OpenRouter) مع اختبار فوري للاتصال والتصفيح ضد استنفاد الحصص.
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
        {/* 1. Multi-Provider Selection Grid */}
        <section className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-950/40">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  اختر المزود أو الوكيل الذكي المعتمد
                </h3>
                <p className="text-xs text-slate-400">حدد الخدمة التي ترغب بالاتصال بها لتوليد ردود الواتساب التلقائية</p>
              </div>
            </div>
          </div>

          {/* Provider Cards Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {providersConfig.map((p) => {
              const Icon = p.icon;
              const isSelected = aiProvider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setAiProvider(p.id);
                    setTestResult(null);
                  }}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 relative overflow-hidden ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/40'
                      : 'bg-[#070b14]/70 border-white/[0.06] hover:border-white/[0.15] hover:bg-[#090e1a]'
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100">{p.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{p.subtitle}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-semibold mt-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>المزود النشط حالياً</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* Provider Specific Configuration Box */}
          {/* ───────────────────────────────────────────────────────────── */}

          {/* 1. Google Gemini Config */}
          {aiProvider === 'gemini' && (
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
                  الحصول على مفتاح API مجاني
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
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash (الأحدث، عالي الاستقرار والسرعة - موصى به)</option>
                    <option value="gemini-flash-lite-latest">Gemini Flash Lite Latest (سريع جداً واقتصادي)</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 2. OpenAI Config */}
          {aiProvider === 'openai' && (
            <div className="p-5 rounded-2xl bg-[#070b14] border border-emerald-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  إعدادات OpenAI الرسمية (ChatGPT)
                </div>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                >
                  الحصول على مفتاح OpenAI
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    مفتاح OpenAI API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-proj-..."
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    نموذج OpenAI
                  </label>
                  <select
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="gpt-4o-mini">GPT-4o-mini (الأسرع والأقل تكلفة - موصى به)</option>
                    <option value="gpt-4o">GPT-4o (القدرات القصوى والذكاء العالي)</option>
                    <option value="o3-mini">o3-mini (الاستدلال والتفكير العميق)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3. Groq Config */}
          {aiProvider === 'groq' && (
            <div className="p-5 rounded-2xl bg-[#070b14] border border-amber-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  إعدادات Groq Cloud LPU (استجابة فائقة السرعة)
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                >
                  الحصول على مفتاح Groq مجاني
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    مفتاح Groq API Key
                  </label>
                  <input
                    type="password"
                    placeholder="gsk_..."
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    نموذج Groq
                  </label>
                  <select
                    value={groqModel}
                    onChange={(e) => setGroqModel(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (الأفضل والافتراضي)</option>
                    <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 Distill Llama 70B</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 4. DeepSeek Config */}
          {aiProvider === 'deepseek' && (
            <div className="p-5 rounded-2xl bg-[#070b14] border border-blue-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  إعدادات DeepSeek API
                </div>
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                >
                  الحصول على مفتاح DeepSeek
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-400" />
                    مفتاح DeepSeek API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={deepseekApiKey}
                    onChange={(e) => setDeepseekApiKey(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    نموذج DeepSeek
                  </label>
                  <select
                    value={deepseekModel}
                    onChange={(e) => setDeepseekModel(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="deepseek-chat">DeepSeek Chat (V3 - ممتاز وسريع للمحادثات)</option>
                    <option value="deepseek-reasoner">DeepSeek Reasoner (R1 - التفكير المعقد)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 5. OpenRouter Config */}
          {aiProvider === 'openrouter' && (
            <div className="p-5 rounded-2xl bg-[#070b14] border border-purple-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                  <Globe className="w-4 h-4 text-purple-400" />
                  إعدادات بوابة OpenRouter المفتوحة
                </div>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline"
                >
                  الحصول على مفتاح OpenRouter
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    مفتاح OpenRouter API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={openrouterApiKey}
                    onChange={(e) => setOpenrouterApiKey(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
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
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. Custom Agent / Any Base URL Config */}
          {aiProvider === 'custom' && (
            <div className="p-5 rounded-2xl bg-[#070b14] border border-rose-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                  <Server className="w-4 h-4 text-rose-400" />
                  ربط وكيل خارجي أو سيرفر محلي (Custom OpenAI-Compatible Endpoint)
                </div>
                <span className="text-[11px] text-slate-400">
                  يدعم Ollama, vLLM, LM Studio, LiteLLM, LangChain, n8n
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-rose-400" />
                    رابط API الأساسي (Base URL)
                  </label>
                  <input
                    type="text"
                    placeholder="https://api.my-agent.com/v1 أو http://localhost:11434/v1"
                    value={customApiBaseUrl}
                    onChange={(e) => setCustomApiBaseUrl(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    سيتم إرسال الطلبات تلقائياً إلى مسار <code className="text-rose-300">/chat/completions</code> التابع له.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    اسم النموذج (Model Name)
                  </label>
                  <input
                    type="text"
                    placeholder="llama3, mistral, default"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-rose-400" />
                    مفتاح API للوكيل (API Key / Bearer Token - اختياري)
                  </label>
                  <input
                    type="password"
                    placeholder="Bearer token أو اترك فارغاً إذا كان محلياً..."
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    className="w-full bg-[#060911] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Test Connection Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                اختبار الاتصال المباشر بالوكيل
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تأكد من صحة المفتاح وسرعة استجابة المزود المختار قبل الحفظ
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 transition shadow-sm disabled:opacity-50"
            >
              {testingConnection ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري اختبار الاتصال...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>اختبار الاتصال الآن</span>
                </>
              )}
            </button>
          </div>

          {/* Test Connection Results Badge */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed transition animate-fadeIn ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {testResult.success ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>تم الاتصال بالوكيل بنجاح! ⚡ سرعة الاستجابة: {testResult.latencyMs}ms</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>فشل الاتصال:</span>
                  </>
                )}
              </div>
              <p className="text-[11px] opacity-90">
                {testResult.success ? `رد الوكيل التجريبي: "${testResult.reply}"` : testResult.error}
              </p>
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
                <option value="iraqi">عراقية (ودية ومحببة)</option>
                <option value="modern_standard">عربية فصحى معاصرة (Business MSA)</option>
                <option value="custom">لهجة مخصصة</option>
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
                <option value="formal">مهنية ورسمية (Formal & Professional)</option>
                <option value="sales">بيعية ومقنعة (Sales & Conversion Focused)</option>
                <option value="concise">مختصرة ومباشرة (Concise & Direct)</option>
                <option value="empathetic">صبورة ومتعاطفة (Empathetic & Caring)</option>
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
                <span>حفظ إعدادات الذكاء الاصطناعي والوكيل</span>
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
