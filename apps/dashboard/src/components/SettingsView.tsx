'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { 
  Settings, 
  Sparkles, 
  Key, 
  Bot, 
  MessageSquare, 
  Check, 
  QrCode, 
  Trash2,
  RefreshCw,
  BookOpen,
  Globe,
  FileText,
  Plus,
  ExternalLink,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Database,
  Layers,
  Clock,
  UserX,
  ShieldAlert,
  Smile,
  Sliders,
  X,
  Volume2,
  Cpu,
  Zap,
  Brain,
  CheckCheck,
  Shield,
  Users,
} from 'lucide-react';
import { SandboxChat } from './SandboxChat';
import { AgenticSkillsManager } from './AgenticSkillsManager';

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface TeamRoutingRule {
  keyword: string;
  teamId: string;
  teamName: string;
}

interface KnowledgeItem {
  id: string;
  tenantId: string;
  title: string;
  type: 'text' | 'url' | 'file';
  content: string;
  source?: string;
  charCount: number;
  createdAt: string;
}

export function SettingsView() {
  const { 
    isWhatsAppConnected, 
    connectedPhone, 
    setWhatsAppModalOpen, 
    disconnectWhatsApp,
    tenantId 
  } = useChatStore();

  // AI Provider & Model State
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [openrouterModel, setOpenrouterModel] = useState('google/gemini-2.5-flash');
  const [isCustomOpenrouterModel, setIsCustomOpenrouterModel] = useState(false);
  const [customOpenrouterModel, setCustomOpenrouterModel] = useState('');
  const [geminiSystemPrompt, setGeminiSystemPrompt] = useState(
    'أنت مساعد خدمة عملاء محترف للرد على استفسارات العملاء بدقة وإيجاز واحترافية عالية عبر الواتساب.'
  );
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);

  // 1. Dialect & Tone State
  const [dialect, setDialect] = useState<string>('syrian');
  const [tone, setTone] = useState<string>('friendly');
  const [customDialectPrompt, setCustomDialectPrompt] = useState('');

  // 2. Blacklist / Excluded Numbers
  const [excludedPhoneNumbers, setExcludedPhoneNumbers] = useState<string[]>([]);
  const [newExcludedNumber, setNewExcludedNumber] = useState('');

  // 3. Response Delay
  const [autoReplyDelaySeconds, setAutoReplyDelaySeconds] = useState<number>(30);
  const [interMessageDelaySeconds, setInterMessageDelaySeconds] = useState<number>(15);

  // 4. Human Handoff Rules & Smart Team Routing
  const [handoffKeywords, setHandoffKeywords] = useState<string[]>([
    'موظف', 'بشري', 'شكوى', 'مدير', 'اتصال', 'تحويل', 'إلغاء'
  ]);
  const [newKeyword, setNewKeyword] = useState('');
  const [handoffMaxTurns, setHandoffMaxTurns] = useState<number>(5);
  const [handoffStopNotification, setHandoffStopNotification] = useState(
    'تم تحويل محادثتك إلى أحد موظفي خدمة العملاء وسيقوم بالرد عليك مباشرة في أقرب وقت ممكن. شكراً لصبرك!'
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [handoffTeamRouting, setHandoffTeamRouting] = useState<TeamRoutingRule[]>([]);
  const [newRoutingKeyword, setNewRoutingKeyword] = useState('');
  const [selectedRoutingTeamId, setSelectedRoutingTeamId] = useState('');

  // 5. User Memory & Read Receipts (ذاكرة المستخدم والصحين الزرق)
  const [userMemoryEnabled, setUserMemoryEnabled] = useState(true);
  const [userMemoryPrompt, setUserMemoryPrompt] = useState(
    'Remember durable, useful facts about this user so future conversations feel continuous and personalized across sessions — their explicit preferences, how they like to be addressed (name / preferred surname), their language, country and timezone, and any stated communication preferences or recurring needs. Focus on information that stays true over time and helps you serve them better next time. Do NOT store sensitive or regulated information — passwords, full credit-card or payment details, government IDs, health data, or similar — unless the user has explicitly asked you to remember it.'
  );
  const [sendReadReceipts, setSendReadReceipts] = useState(false);

  // 6. Safety Guardrails & Error Recovery (حواجز الأمان واستعادة الأخطاء - Botpress)
  const [safetyGuardrails, setSafetyGuardrails] = useState(
    'لا تجمع أبداً عبر الدردشة بيانات حساسة: رقم بطاقة كامل، كلمات مرور، مفاتيح API، أو رموز OTP/صور، أو أكواد التحقق، أرقام هويات حكومية كاملة. لا تدّعي أنك تحققت من هوية المستخدم بنفسك. لا تؤكد أي معلومة غير موجودة بقاعدة المعرفة ولا تخمّن (خصوصاً السعر الأصلي المتضارب، التقسيط، أو أي تفاصيل تشغيلية غير مذكورة). عند نقص/تعارض المعلومات استخدم عبارة التحقق المحددة من أستاذ نواف، واصعّد مع تلخيص واضح لسؤال المستخدم وسياق المحادثة. لا توجّه المستخدم لموقع إلكتروني/رابط حجز غير مؤكد لأنه لا يوجد موقع مثبت.'
  );
  const [errorRecovery, setErrorRecovery] = useState(
    'إذا صار خطأ أو تعثّر تقني، اعتذر باختصار وجرّب مرة ثانية أو اقترح خطوة بديلة بسيطة (مثلاً إعادة المحاولة على تيليجرام/تأكيد نوع الجهاز). لا تذكر تفاصيل داخلية أو أسماء أدوات/أخطاء نظام. إذا استمرّت المشكلة أو كانت خارج قاعدة المعرفة، اعرض تحويلها للمدرب مع تلخيص للسياق.'
  );

  // 7. Advanced Escalation Rules (قواعد التصعيد والتسليم لبشري)
  const [escalationEnabled, setEscalationEnabled] = useState(true);
  const [escalationRules, setEscalationRules] = useState(
    'Escalate when:\n\n- Human request: Hand off immediately when the customer asks for a human.\n- High-stakes topics: Always hand off for Refunds & cancellations; Billing disputes; Account security; Legal & compliance; Outages & incidents; Enterprise contracts; اذا طلب دفع.\n- Failed resolution: Escalate after 2 failed attempts.\n- Frustration signals: Hand off for Repeated complaint.'
  );
  const [escalationPreActions, setEscalationPreActions] = useState(
    'Collect relevant context, complete any checks, and set expectations.'
  );

  const [instructionTab, setInstructionTab] = useState<'safety' | 'memory' | 'communication' | 'identity'>('safety');

  // General State
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Knowledge Base State
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'url' | 'file'>('url');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Knowledge Add Inputs
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');

  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');

  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileTitle, setFileTitle] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Load Settings and Knowledge on Mount
  useEffect(() => {
    fetch(`${apiUrl}/api/settings`, {
      headers: { 'x-tenant-id': tenantId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.aiProvider) setAiProvider(data.aiProvider);
        if (data.geminiApiKey) setGeminiApiKey(data.geminiApiKey);
        if (data.geminiModel) setGeminiModel(data.geminiModel);
        if (data.openrouterApiKey) setOpenrouterApiKey(data.openrouterApiKey);
        if (data.openrouterModel) {
          setOpenrouterModel(data.openrouterModel);
          const popularModels = [
            'google/gemini-2.5-flash',
            'deepseek/deepseek-chat',
            'openai/gpt-4o-mini',
            'anthropic/claude-3.5-sonnet',
            'meta-llama/llama-3.3-70b-instruct'
          ];
          if (!popularModels.includes(data.openrouterModel)) {
            setIsCustomOpenrouterModel(true);
            setCustomOpenrouterModel(data.openrouterModel);
          }
        }
        if (data.geminiSystemPrompt) setGeminiSystemPrompt(data.geminiSystemPrompt);
        if (typeof data.geminiAutoReplyEnabled === 'boolean') {
          setAutoReplyEnabled(data.geminiAutoReplyEnabled);
        }
        if (data.dialect) setDialect(data.dialect);
        if (data.tone) setTone(data.tone);
        if (data.customDialectPrompt) setCustomDialectPrompt(data.customDialectPrompt);
        if (Array.isArray(data.excludedPhoneNumbers)) setExcludedPhoneNumbers(data.excludedPhoneNumbers);
        if (data.autoReplyDelaySeconds !== undefined) setAutoReplyDelaySeconds(data.autoReplyDelaySeconds);
        if (data.interMessageDelaySeconds !== undefined) setInterMessageDelaySeconds(data.interMessageDelaySeconds);
        if (Array.isArray(data.handoffKeywords)) setHandoffKeywords(data.handoffKeywords);
        if (Array.isArray(data.handoffTeamRouting)) setHandoffTeamRouting(data.handoffTeamRouting);
        if (data.handoffMaxTurns !== undefined) setHandoffMaxTurns(data.handoffMaxTurns);
        if (data.handoffStopNotification) setHandoffStopNotification(data.handoffStopNotification);
        if (typeof data.userMemoryEnabled === 'boolean') setUserMemoryEnabled(data.userMemoryEnabled);
        if (data.userMemoryPrompt) setUserMemoryPrompt(data.userMemoryPrompt);
        if (typeof data.sendReadReceipts === 'boolean') setSendReadReceipts(data.sendReadReceipts);
        if (data.safetyGuardrails) setSafetyGuardrails(data.safetyGuardrails);
        if (data.errorRecovery) setErrorRecovery(data.errorRecovery);
        if (typeof data.escalationEnabled === 'boolean') setEscalationEnabled(data.escalationEnabled);
        if (data.escalationRules) setEscalationRules(data.escalationRules);
        if (data.escalationPreActions) setEscalationPreActions(data.escalationPreActions);
      })
      .catch(() => {});

    // Fetch tenant teams for team routing
    fetch(`${apiUrl}/api/teams`, {
      headers: { 'x-tenant-id': tenantId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeams(data);
          if (data.length > 0 && !selectedRoutingTeamId) {
            setSelectedRoutingTeamId(data[0].id);
          }
        }
      })
      .catch(() => {});

    loadKnowledge();
  }, [tenantId, apiUrl, selectedRoutingTeamId]);

  const loadKnowledge = async () => {
    setKnowledgeLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/knowledge`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setKnowledgeItems(data);
      }
    } catch (err: any) {
      console.error('Failed loading knowledge:', err.message);
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      await fetch(`${apiUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          aiProvider,
          openrouterApiKey,
          openrouterModel: isCustomOpenrouterModel ? customOpenrouterModel : openrouterModel,
          geminiApiKey,
          geminiModel,
          geminiSystemPrompt,
          geminiAutoReplyEnabled: autoReplyEnabled,
          dialect,
          tone,
          customDialectPrompt,
          excludedPhoneNumbers,
          autoReplyDelaySeconds,
          interMessageDelaySeconds,
          handoffKeywords,
          handoffTeamRouting,
          handoffMaxTurns,
          handoffStopNotification,
          userMemoryEnabled,
          userMemoryPrompt,
          sendReadReceipts,
          safetyGuardrails,
          errorRecovery,
          escalationEnabled,
          escalationRules,
          escalationPreActions,
        }),
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed saving settings:', err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Blacklist Management
  const handleAddExcludedNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newExcludedNumber.trim();
    if (!clean) return;
    if (!excludedPhoneNumbers.includes(clean)) {
      const updated = [...excludedPhoneNumbers, clean];
      setExcludedPhoneNumbers(updated);
      setNewExcludedNumber('');
    }
  };

  const handleRemoveExcludedNumber = (num: string) => {
    setExcludedPhoneNumbers(excludedPhoneNumbers.filter((n) => n !== num));
  };

  // Handoff Keyword Management
  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newKeyword.trim();
    if (!clean) return;
    if (!handoffKeywords.includes(clean)) {
      setHandoffKeywords([...handoffKeywords, clean]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setHandoffKeywords(handoffKeywords.filter((k) => k !== kw));
  };

  // Smart Team Routing Management
  const handleAddTeamRouting = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newRoutingKeyword.trim();
    if (!clean) return;
    const targetTeam = teams.find((t) => t.id === selectedRoutingTeamId) || teams[0];
    if (!targetTeam) return;

    const filtered = handoffTeamRouting.filter(
      (r) => r.keyword.toLowerCase() !== clean.toLowerCase()
    );
    setHandoffTeamRouting([
      ...filtered,
      {
        keyword: clean,
        teamId: targetTeam.id,
        teamName: targetTeam.name,
      },
    ]);
    setNewRoutingKeyword('');
  };

  const handleRemoveTeamRouting = (keyword: string) => {
    setHandoffTeamRouting(handoffTeamRouting.filter((r) => r.keyword !== keyword));
  };

  // Knowledge Base Actions
  const handleAddText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customContent.trim()) {
      setActionError('يرجى كتابة العنوان والمحتوى');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/api/knowledge/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          title: customTitle.trim(),
          content: customContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت إضافة النص');

      setCustomTitle('');
      setCustomContent('');
      setActionSuccess('تمت إضافة النص إلى قاعدة المعرفة بنجاح!');
      setTimeout(() => setActionSuccess(null), 3000);
      loadKnowledge();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setActionError('يرجى إدخال رابط الموقع');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/api/knowledge/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          url: urlInput.trim(),
          title: urlTitle.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل جلب الموقع واستخراج البيانات');

      setUrlInput('');
      setUrlTitle('');
      setActionSuccess('تم جلب محتوى الموقع وإضافته لقاعدة المعرفة بنجاح!');
      setTimeout(() => setActionSuccess(null), 3000);
      loadKnowledge();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!fileTitle) {
      setFileTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setFileContent(result);
      }
    };
    reader.readAsText(file);
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileContent.trim()) {
      setActionError('يرجى اختيار ملف يحتوي على نصوص');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/api/knowledge/file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          title: fileTitle.trim() || fileName,
          fileName,
          content: fileContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت إضافة المستند');

      setFileName('');
      setFileTitle('');
      setFileContent('');
      setActionSuccess('تم حفظ المستند في قاعدة المعرفة بنجاح!');
      setTimeout(() => setActionSuccess(null), 3000);
      loadKnowledge();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصدر من قاعدة المعرفة؟')) return;
    try {
      const res = await fetch(`${apiUrl}/api/knowledge/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) {
        setKnowledgeItems((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err: any) {
      console.error('Failed deleting knowledge item:', err.message);
    }
  };

  const totalChars = knowledgeItems.reduce((acc, curr) => acc + (curr.charCount || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto">
      {/* Top Header */}
      <header className="h-16 px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            الإعدادات المتقدمة وقواعد الذكاء الاصطناعي
          </h1>
          <p className="text-xs text-slate-400">
            تخصيص اللهجة والنبرة، قواعد استثناء الأرقام، وقت التأخير، وقواعد التحويل للدعم البشري
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4" /> تم الحفظ بنجاح!
            </span>
          )}
          <button
            onClick={() => handleSaveSettings()}
            disabled={savingSettings}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950 disabled:opacity-50"
          >
            {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>حفظ جميع الإعدادات</span>
          </button>
        </div>
      </header>

      {/* Main Content Form */}
      <div className="p-8 max-w-5xl w-full mx-auto space-y-8 pb-20">

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1: Agent Instructions, Memory & Persona (تعليمات، ذاكرة، هوية)
        ══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                تعليمات
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Agent Core
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                من هو وكيلك، وكيف يتواصل معك، والقواعد التي يتبعها.
              </p>
            </div>

            {/* Tabs: أمان | ذاكرة | تواصل | هوية (مطابق لتبويبات Botpress بالصورة 1) */}
            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setInstructionTab('safety')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  instructionTab === 'safety'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                أمان
              </button>
              <button
                type="button"
                onClick={() => setInstructionTab('memory')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  instructionTab === 'memory'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                ذاكرة
              </button>
              <button
                type="button"
                onClick={() => setInstructionTab('communication')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  instructionTab === 'communication'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                تواصل
              </button>
              <button
                type="button"
                onClick={() => setInstructionTab('identity')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  instructionTab === 'identity'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                هوية
              </button>
            </div>
          </div>

          {/* TAB 1: أمان (حواجز الأمان واستعادة الأخطاء - مطابق تماماً للصورة 1) */}
          {instructionTab === 'safety' && (
            <div className="space-y-6">
              {/* 1. حواجز الأمان */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      حواجز الأمان
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      قواعد صارمة لا يجوز للوكيل مخالفتها أبداً.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {safetyGuardrails.length} حرف
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={safetyGuardrails}
                  onChange={(e) => setSafetyGuardrails(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="لا تجمع أبداً عبر الدردشة بيانات حساسة..."
                />
              </div>

              {/* 2. استعادة الأخطاء */}
              <div className="space-y-2 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      استعادة الأخطاء
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      كيفية التعامل مع الأخطاء والصعوبات التقنية - ما هو المسموح قوله، وما يبقى داخلياً.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {errorRecovery.length} حرف
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={errorRecovery}
                  onChange={(e) => setErrorRecovery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="إذا صار خطأ أو تعثّر تقني، اعتذر باختصار..."
                />
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 text-xs text-rose-200/90 leading-relaxed flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong>قواعد أمان نشطة ومحمية:</strong> يلتزم الذكاء الاصطناعي بشكل صارم بعدم جمع أي بيانات حساسة، وعدم تخمين أي معلومات مالية أو تشغيلية غير موجودة بقاعدة المعرفة، والرجوع لعبارة التحقق المعتمدة من أستاذ نواف عند أي تعارض.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ذاكرة (Memory) */}
          {instructionTab === 'memory' && (
            <div className="space-y-6">
              {/* تمكين ذاكرة المستخدم */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-400" />
                    تمكين ذاكرة المستخدم
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    عند تفعيل هذه الخاصية، يقوم البرنامج بتخزين واسترجاع تفاصيل كل مستخدم عبر المحادثات باستخدام الموجه أدناه، ليتذكر الشخص وتفضيلاته حتى لو عاد للتواصل بعد 3 أو 4 أشهر.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={userMemoryEnabled}
                    onChange={(e) => setUserMemoryEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* مطالبة الذاكرة */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    مطالبة الذاكرة
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {userMemoryPrompt.length} / 1000
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  ما يجب على الموظف تذكره عن كل مستخدم.
                </p>
                <textarea
                  rows={6}
                  value={userMemoryPrompt}
                  onChange={(e) => setUserMemoryPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Remember durable, useful facts about this user..."
                />
              </div>

              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200/90 leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong>التعلم الذاتي التلقائي المستمر:</strong> يقوم الذكاء الاصطناعي في الخلفية باستخراج الاسم المفضل للعميل، مدينته، وطلباته وتفضيلاته وتخزينها في قاعدة البيانات لكل رقم هاتف، لتكون جاهزة دائماً في كل جلسة قادمة.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: هوية وتواصل (Dialect & Tone) */}
          {instructionTab === 'identity' && (
            <div className="space-y-5">
              {/* Dialect Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2">
                  1. اختيار اللهجة الأساسية (Dialect):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {[
                    { id: 'syrian', name: 'سورية / شامية', desc: 'تكرم عينك، ع راسي، شو الأخبار' },
                    { id: 'saudi', name: 'سعودية / خليجية', desc: 'يا هلا والله، أبشر، سم، طال عمرك' },
                    { id: 'egyptian', name: 'مصرية', desc: 'أهلاً بيك يا فندم، منور، تحت أمرك' },
                    { id: 'iraqi', name: 'عراقية', desc: 'هلا بيك، تدلل، ع راسي، شكو ماكو' },
                    { id: 'modern_standard', name: 'فصحى معاصرة', desc: 'لغة عربية واضحة ورسمية وأنيقة' },
                    { id: 'custom', name: 'لهجة مخصصة', desc: 'كتابة تعليمات لهجة خاصة بك' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDialect(item.id)}
                      className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                        dialect === item.id
                          ? 'bg-purple-950/60 border-purple-500 text-purple-200 shadow-md shadow-purple-950'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold block">{item.name}</span>
                      <span className="text-[10px] text-slate-500 mt-1 line-clamp-1">{item.desc}</span>
                    </button>
                  ))}
                </div>

                {dialect === 'custom' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="مثال: تحدث بلهجة مغاربية ممزوجة بالفرنسية البسيطة، أو لهجة أردنية لطيفة..."
                      value={customDialectPrompt}
                      onChange={(e) => setCustomDialectPrompt(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Tone Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2">
                  2. نبرة الرد والشعور (Tone & Vibe):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {[
                    { id: 'friendly', name: '😊 ودود ومرح', desc: 'دافئ، بشوش، ترحيبي مع إيموجي لطيف' },
                    { id: 'formal', name: '👔 رسمي وجاد', desc: 'مهني ورصين بدون إيموجي مفرط' },
                    { id: 'sales', name: '🚀 تسويقي ومقنع', desc: 'حماسي يبرز مميزات المنتجات ويشجع الشراء' },
                    { id: 'concise', name: '⚡ مختصر ومباشر', desc: 'إجابات محددة بدون مقدمات طويلة' },
                    { id: 'empathetic', name: '🤍 صبور ومتعاطف', desc: 'يحتوي مشاكل العميل ويعتذر بلطف' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTone(item.id)}
                      className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                        tone === item.id
                          ? 'bg-pink-950/60 border-pink-500 text-pink-200 shadow-md shadow-pink-950'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold block">{item.name}</span>
                      <span className="text-[10px] text-slate-500 mt-1 line-clamp-1">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: تواصل (الصحين الزرق وسرعة الرد) */}
          {instructionTab === 'communication' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    إخفاء الصحين الزرق (قراءة الرسائل)
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {!sendReadReceipts 
                      ? 'مفعّل حالياً (الوضع الموصى به): تظل علامة الاستلام بلون رمادي (صحين رماديين) ولا تتحول إلى اللون الأزرق، مما يمنع معرفة أنك فتحت الرسالة فوراً.'
                      : 'معطّل حالياً: تظهر الصحين الزرق للعميل بمجرد وصول الرسالة.'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!sendReadReceipts}
                    onChange={(e) => setSendReadReceipts(!e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200/90 leading-relaxed flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>خصوصية تامة:</strong> عندما ترسل الرسائل تلقائياً بعد مهلة الرد، يظل مؤشر القراءة غير مقروء (صحين رماديين) إلى أن يتم الرد فعلياً.
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2: Response Delay (تأخير الرد التلقائي لمحاكاة البشري)
        ══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-950">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                توقيت وتأخير الرد التلقائي (Natural Response Delay)
              </h2>
              <p className="text-xs text-slate-400">
                منح المحادثة طابعاً بشرياً طبيعياً عبر تأخير إرسال الرد بدلاً من الرد الفوري الميكانيكي
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                1. وقت الانتظار قبل بدء الرد الأول (Initial Response Delay):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-md shadow-amber-950'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>2. الفارق الزمني بين الرسائل والفقاعات المتتالية (Inter-Message Delay):</span>
                <span className="text-[11px] text-amber-400 font-mono">الحالي: {interMessageDelaySeconds} ثانية</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                        ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-amber-400 text-amber-100 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-[11px] leading-relaxed">
                <div>
                  <strong>محاكاة واقعية 100%:</strong> ينتظر النظام {interMessageDelaySeconds} ثانية بين إرسال الرسالة الأولى والتالية، ويقوم بإظهار حالة <em>"يكتب الآن..." (typing...)</em> على الواتساب قبل إرسال كل فقاعة.
                </div>
                <div>
                  <strong>إلغاء تلقائي عند التدخل البشري:</strong> إذا رد موظف بشري أو قام بإيقاف الرد أثناء الانتظار، يتوقف الذكاء الاصطناعي فوراً ويلغي إرسال باقي الرسائل.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3: Blacklist (أرقام ممنوع الرد عليها - لا ترد عليها)
        ══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-lg shadow-rose-950">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                قائمة الأرقام المستثناة (ممنوع الرد عليها تلقائياً)
              </h2>
              <p className="text-xs text-slate-400">
                أرقام العائلة، الأصدقاء، أو أرقام معينة تريد أن يتجاهلها الذكاء الاصطناعي تماماً ولا يرد عليها آلياً
              </p>
            </div>
          </div>

          <form onSubmit={handleAddExcludedNumber} className="flex gap-2">
            <input
              type="text"
              placeholder="اكتب رقم الهاتف مع مفتاح الدولة (مثال: +963985323170 أو 0985...)"
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

          {/* List of Excluded Numbers */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-slate-300">
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
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 4: Human Handoff Rules (متى يوقف الرد وقواعد التحويل لبشري)
        ══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-950">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                قواعد إيقاف الرد والتحويل للدعم البشري (Human Handoff & Escalation)
              </h2>
              <p className="text-xs text-slate-400">
                تحديد متى يتوقف الذكاء الاصطناعي عن الرد ويترك المحادثة لموظف بشري (كلمات مفتاحية، عدد الردود، رسالة التحويل)
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. Toggle تفعيل التصعيد (Matching Image 2) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  تفعيل التصعيد
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  عند تفعيل هذه الخاصية، يمكن للوكيل تحويل المحادثات إلى شخص بناءً على القواعد التالية.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={escalationEnabled}
                  onChange={(e) => setEscalationEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            {/* 2. متى يجب التصعيد (Matching Image 2) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-200">
                    متى يجب التصعيد
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    المواقف التي تستدعي تسليم الأمر إلى شخص.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                  قواعد إلزامية
                </span>
              </div>
              <textarea
                rows={7}
                value={escalationRules}
                onChange={(e) => setEscalationRules(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-cyan-500"
                dir="ltr"
                placeholder="Escalate when:&#10;&#10;- Human request: Hand off immediately when the customer asks for a human..."
              />
            </div>

            {/* 3. الإجراءات قبل التسليم (Matching Image 2) */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-bold text-slate-200">
                  الإجراءات قبل التسليم
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  خطوات اختيارية قبل التسليم. اترك هذا الحقل فارغاً للانتقال مباشرة إلى المكتب. اكتب &quot;/&quot; لإضافة أدوات أو خطط عمل.
                </p>
              </div>
              <textarea
                rows={2}
                value={escalationPreActions}
                onChange={(e) => setEscalationPreActions(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-cyan-500"
                dir="ltr"
                placeholder="e.g. Collect relevant context, complete any checks, and set expectations."
              />
            </div>

            {/* 4. الكلمات المفتاحية السريعة للتحويل */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                الكلمات المفتاحية السريعة للتحويل الفوري لموظف:
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                إذا احتوت رسالة العميل على أي من هذه الكلمات، يتوقف الذكاء الاصطناعي فوراً ويرسل رسالة التحويل.
              </p>

              <form onSubmit={handleAddKeyword} className="flex gap-2 mb-2.5">
                <input
                  type="text"
                  placeholder="أضف كلمة جديدة (مثال: شكوى، تحويل، اشتريت، غلط، الغاء...)"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!newKeyword.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                {handoffKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 text-xs font-bold"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="hover:text-cyan-100 p-0.5 rounded transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 2. Max AI Turns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  2. الحد الأقصى لعدد ردود الذكاء الاصطناعي (Max AI Turns):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={handoffMaxTurns}
                    onChange={(e) => setHandoffMaxTurns(parseInt(e.target.value) || 0)}
                    className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono text-center focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-400">
                    {handoffMaxTurns === 0 ? 'ردود غير محدودة' : `بعد ${handoffMaxTurns} ردود يتم التحويل لبشري تلقائياً`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  3. رسالة إشعار العميل عند التحويل لموظف:
                </label>
                <textarea
                  rows={2}
                  value={handoffStopNotification}
                  onChange={(e) => setHandoffStopNotification(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* 4. Smart Team Routing by Keyword (توجيه الكلمات للفرق المتخصصة) */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    توجيه الكلمات المفتاحية لأقسام وفِرق العمل (Smart Team Routing)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    عند رصد هذه الكلمات، يتوقف الرد التلقائي فوراً ويتم تعيين المحادثة للقسم المعني وإشعار أعضائه.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                  توجيه مخصص
                </span>
              </div>

              <form onSubmit={handleAddTeamRouting} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="الكلمة المفتاحية (مثال: شكوى، شراء، فاتورة، تجديد...)"
                  value={newRoutingKeyword}
                  onChange={(e) => setNewRoutingKeyword(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <select
                  value={selectedRoutingTeamId}
                  onChange={(e) => setSelectedRoutingTeamId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  {teams.length === 0 ? (
                    <option value="">جاري تحميل الفِرق...</option>
                  ) : (
                    teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="submit"
                  disabled={!newRoutingKeyword.trim() || teams.length === 0}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ربط الكلمة بالقسم</span>
                </button>
              </form>

              {/* List of active routing rules */}
              <div className="space-y-2 pt-1">
                {handoffTeamRouting.length === 0 ? (
                  <div className="p-3.5 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    لم يتم ربط كلمات مفتاحية بأقسام محددة بعد. (إذا كانت القائمة فارغة، سيتم التحويل العام بدون تعيين قسم).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {handoffTeamRouting.map((rule) => (
                      <div
                        key={rule.keyword}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-xs text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/50 truncate">
                            {rule.keyword}
                          </span>
                          <span className="text-slate-500 text-xs">←</span>
                          <span className="text-xs text-slate-300 truncate">
                            {rule.teamName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamRouting(rule.keyword)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition shrink-0"
                          title="حذف الربط"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 5: Botpress Knowledge Base
        ══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-950">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  قاعدة المعرفة والبيانات (Knowledge Base)
                  <span className="text-[11px] bg-emerald-900/80 text-emerald-300 font-normal px-2 py-0.5 rounded-full border border-emerald-700/50">
                    مثل Botpress
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  تغذية الذكاء الاصطناعي ببيانات المنتجات والمواقع والأسعار للإجابة منها بدقة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>المصادر:</span>
                <span className="font-bold text-emerald-400">{knowledgeItems.length}</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Layers className="w-4 h-4 text-teal-400" />
                <span>إجمالي النصوص:</span>
                <span className="font-mono font-bold text-slate-200" suppressHydrationWarning>
                  {totalChars.toLocaleString('en-US')} حرف
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation for Adding Knowledge */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <button
                type="button"
                onClick={() => { setActiveTab('url'); setActionError(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'url'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>إضافة موقع إلكتروني (Website URL)</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('text'); setActionError(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'text'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>نصوص وأسئلة شائعة (Text / FAQ)</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('file'); setActionError(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'file'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>رفع مستند أو ملف (Upload Doc)</span>
              </button>
            </div>

            {/* Notification messages */}
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{actionError}</span>
              </div>
            )}
            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/70 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* TAB 1: Add URL */}
            {activeTab === 'url' && (
              <form onSubmit={handleAddUrl} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      رابط الصفحة أو الموقع (URL)
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/services"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      اسم المصدر (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: صفحة خدماتنا وأسعارنا"
                      value={urlTitle}
                      onChange={(e) => setUrlTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionLoading || !urlInput.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md shadow-emerald-950"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري جلب الموقع واستخراج النصوص...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>استخراج وإضافة إلى قاعدة المعرفة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Add Custom Text */}
            {activeTab === 'text' && (
              <form onSubmit={handleAddText} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    عنوان المصدر أو الموضوع
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: أوقات الدوام الرسمي وسياسة الإرجاع"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    المحتوى / الأسئلة والأجوبة التفصيلية
                  </label>
                  <textarea
                    rows={4}
                    placeholder="اكتب هنا أي معلومات ترغب أن يعرفها الذكاء الاصطناعي: الأسعار، العروض، العناوين..."
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionLoading || !customTitle.trim() || !customContent.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md shadow-emerald-950"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>حفظ النص في قاعدة المعرفة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Upload Document */}
            {activeTab === 'file' && (
              <form onSubmit={handleAddFile} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      اختر ملفاً (TXT, MD, CSV, JSON)
                    </label>
                    <input
                      type="file"
                      accept=".txt,.md,.markdown,.csv,.json"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-emerald-500/30 file:text-xs file:font-semibold file:bg-emerald-500/15 file:text-emerald-300 hover:file:bg-emerald-500/25 cursor-pointer bg-slate-900 border border-slate-800 rounded-xl p-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      عنوان المستند
                    </label>
                    <input
                      type="text"
                      placeholder="اسم المستند التعريفي"
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {fileContent && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 font-mono max-h-24 overflow-y-auto">
                    <span className="text-emerald-400 font-sans block mb-1">معاينة محتوى الملف ({fileContent.length} حرف):</span>
                    {fileContent.slice(0, 250)}...
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={actionLoading || !fileContent.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md shadow-emerald-950"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري حفظ المستند...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة المستند إلى قاعدة المعرفة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Knowledge Items List */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>المصادر النشطة في قاعدة المعرفة:</span>
              {knowledgeLoading && <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
            </h3>

            {knowledgeItems.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 space-y-1">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>قاعدة المعرفة فارغة حالياً.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {knowledgeItems.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition overflow-hidden"
                    >
                      <div className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg ${
                            item.type === 'url'
                              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                              : item.type === 'file'
                              ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {item.type === 'url' ? <Globe className="w-4 h-4" /> : item.type === 'file' ? <FileText className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-200 truncate">
                                {item.title}
                              </h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono" suppressHydrationWarning>
                                {item.charCount ? `${item.charCount.toLocaleString('en-US')} حرف` : ''}
                              </span>
                            </div>
                            {item.source && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1 font-mono" dir="ltr">
                                {item.source}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-1 transition"
                          >
                            <span>{isExpanded ? 'إخفاء' : 'معاينة'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition"
                            title="حذف من قاعدة المعرفة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content Preview */}
                      {isExpanded && (
                        <div className="px-4 pb-3.5 pt-1 border-t border-slate-900 text-xs text-slate-300 bg-slate-950/80">
                          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 font-sans whitespace-pre-wrap max-h-56 overflow-y-auto text-[11px] leading-relaxed text-slate-300">
                            {item.content}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION: Knowledge Base Sandbox (مختبر واختبار الـ AI / Playground)
        ══════════════════════════════════════════════════════════════ */}
        <SandboxChat tenantId={tenantId} />

        {/* ══════════════════════════════════════════════════════════════
            SECTION: Agentic Skills Hub (منظومة المهارات الذكية والنمو)
        ══════════════════════════════════════════════════════════════ */}
        <AgenticSkillsManager tenantId={tenantId} />

        {/* ══════════════════════════════════════════════════════════════
            SECTION 6: AI Engine Provider (Google Gemini & OpenRouter)
        ══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-950/40">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  مزود ومحرك الذكاء الاصطناعي (AI Provider)
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Dual Engine
                  </span>
                </h2>
                <p className="text-xs text-slate-400">اختر المزود الرئيسي لتوليد الردود الذكية (Google Gemini أو OpenRouter)</p>
              </div>
            </div>

            {/* Provider Switch Tabs */}
            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
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

          {/* Provider Specific Configuration */}
          {aiProvider === 'gemini' ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-900/40 space-y-4">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    نموذج Gemini
                  </label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (الأسرع والأحدث - موصى به)</option>
                    <option value="gemini-flash-latest">Gemini Flash Latest</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/25 border border-cyan-800/35 text-[11px] text-cyan-200/90 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">ميزة الحماية التلقائية (Auto-Fallback):</strong> في حال نفدت الحصة المجانية لـ Gemini أو واجهت خطأ 429، سيقوم النظام بالتبديل تلقائياً إلى OpenRouter (إذا قمت بإدخال مفتاحه أدناه) لضمان عدم انقطاع ردود العملاء أبداً!
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  إعدادات OpenRouter.ai (بوابة النماذج العالمية المفتوحة والمتقدمة)
                </div>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                >
                  الحصول على مفتاح من OpenRouter.ai
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">يبدأ عادةً بـ sk-or-v1- من حسابك في openrouter.ai</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    النموذج المختار من OpenRouter
                  </label>
                  <select
                    value={isCustomOpenrouterModel ? 'custom' : openrouterModel}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomOpenrouterModel(true);
                      } else {
                        setIsCustomOpenrouterModel(false);
                        setOpenrouterModel(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (سريع جداً وعالي الدقة)</option>
                    <option value="deepseek/deepseek-chat">DeepSeek V3 (ذكي جداً واقتصادي للغاية)</option>
                    <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini (سريع ومستقر)</option>
                    <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (أعلى جودة إجابات وتفكير عميق)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct">Meta Llama 3.3 70B (مفتوح المصدر وخارق)</option>
                    <option value="custom">نموذج مخصص آخر (Custom Model)...</option>
                  </select>

                  {isCustomOpenrouterModel && (
                    <input
                      type="text"
                      placeholder="مثال: qwen/qwen-2.5-72b-instruct"
                      value={customOpenrouterModel}
                      onChange={(e) => setCustomOpenrouterModel(e.target.value)}
                      className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-200/90 leading-relaxed flex items-start gap-2">
                <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">بوابة OpenRouter:</strong> تتيح لك الوصول الفوري لجميع نماذج الذكاء الاصطناعي العالمية برصيد موحد ومعدلات طلبات فائقة السرعة بدون قيود جغرافية.
                </div>
              </div>
            </div>
          )}

          {/* Fallback API Key quick input if Gemini is selected */}
          {aiProvider === 'gemini' && (
            <div className="pt-1">
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                مفتاح OpenRouter الاحتياطي (اختياري للتبديل التلقائي عند انقطاع Gemini):
              </label>
              <input
                type="password"
                placeholder="sk-or-v1-... (احتياطي)"
                value={openrouterApiKey}
                onChange={(e) => setOpenrouterApiKey(e.target.value)}
                className="w-full max-w-md bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              تعليمات عامة إضافية للنظام (System Prompt المشترك)
            </label>
            <textarea
              rows={2}
              value={geminiSystemPrompt}
              onChange={(e) => setGeminiSystemPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoReplyEnabled}
                onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
            <span className="text-xs text-slate-300 font-medium">
              {autoReplyEnabled ? 'الرد التلقائي الذكي مفعّل لجميع الرسائل الواردة' : 'الرد التلقائي معطل (يدوي فقط)'}
            </span>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 7: WhatsApp Session Management
        ══════════════════════════════════════════════════════════════ */}
        <section className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">جلسة واتساب المباشرة (WhatsApp Direct)</h2>
                <p className="text-xs text-slate-400">حالة الربط والتحكم بالجلسة الحالية</p>
              </div>
            </div>

            <span
              className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                isWhatsAppConnected
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isWhatsAppConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              {isWhatsAppConnected ? 'متصل وجاهز' : 'غير متصل'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
            <div>
              <div className="text-slate-300 font-semibold">الرقم المتصل حالياً:</div>
              <div className="text-slate-400 font-mono mt-0.5">
                {connectedPhone ? `+${connectedPhone}` : 'لا يوجد رقم مسجل حالياً'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setWhatsAppModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isWhatsAppConnected ? 'تحديث / إعادة ربط' : 'ربط عبر QR'}</span>
              </button>

              {isWhatsAppConnected && (
                <button
                  onClick={disconnectWhatsApp}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تسجيل خروج الجلسة</span>
                </button>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
