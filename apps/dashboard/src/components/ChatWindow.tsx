'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { 
  Send, 
  ShieldCheck, 
  Check, 
  CheckCheck, 
  Clock, 
  AlertTriangle,
  FileText, 
  Mic, 
  Download, 
  Sparkles,
  RefreshCw,
  Bot,
  UserCheck,
  User,
  PanelRightOpen,
  PanelRightClose,
  Plus,
  Trash2,
  Paperclip,
  Smile,
  Info,
  CheckCircle2,
  Volume2,
  VolumeX,
  Zap,
  BookOpen
} from 'lucide-react';
import type { DeliveryStatus } from '@omni/types';
import { MemoryManager } from './MemoryManager';
import { DEFAULT_CANNED_RESPONSES, CannedResponse } from '../utils/cannedResponses';

export function ChatWindow() {
  const { 
    conversations, 
    activeConversationId, 
    messages, 
    sendTextMessage,
    tenantId,
    drafts,
    setDraft,
    clearDraft,
    isSoundEnabled,
    toggleSound
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiPaused, setIsAiPaused] = useState(false);
  const [showCrmPanel, setShowCrmPanel] = useState(false);
  const [showSnippetsMenu, setShowSnippetsMenu] = useState(false);
  const [snippetFilter, setSnippetFilter] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [contactMemory, setContactMemory] = useState<{ notes: string; memoryFacts: string[] }>({
    notes: '',
    memoryFacts: [],
  });
  const [newFact, setNewFact] = useState('');
  const [isSavingFact, setIsSavingFact] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync draft message when switching conversations
  useEffect(() => {
    if (activeConversationId) {
      setInputMessage(drafts[activeConversationId] || '');
    } else {
      setInputMessage('');
    }
    setShowSnippetsMenu(false);
  }, [activeConversationId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Check if AI is paused for this conversation
  useEffect(() => {
    if (!activeConversationId) return;
    fetch(`${apiUrl}/api/settings`, { headers: { 'x-tenant-id': tenantId } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.pausedConversations)) {
          setIsAiPaused(data.pausedConversations.includes(activeConversationId));
        }
      })
      .catch(() => {});
  }, [activeConversationId, tenantId, apiUrl]);

  // Load Contact CRM data (memory_facts, notes)
  useEffect(() => {
    if (!activeConversation || !activeConversation.contactPhone) return;
    fetch(`${apiUrl}/api/contacts/${activeConversation.contactPhone}`, {
      headers: { 'x-tenant-id': tenantId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.contact) {
          setContactMemory({
            notes: data.contact.notes || '',
            memoryFacts: data.contact.memoryFacts || [],
          });
        }
      })
      .catch(() => {});
  }, [activeConversation, tenantId, apiUrl]);

  const toggleAiPause = async () => {
    if (!activeConversationId) return;
    const action = isAiPaused ? 'resume-ai' : 'pause-ai';
    try {
      await fetch(`${apiUrl}/api/conversations/${activeConversationId}/${action}`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
      });
      setIsAiPaused(!isAiPaused);
    } catch (err: any) {
      console.error('Error toggling AI pause:', err.message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMessage(val);
    if (activeConversationId) {
      setDraft(activeConversationId, val);
    }
    if (val.startsWith('/')) {
      setShowSnippetsMenu(true);
      setSnippetFilter(val.slice(1).trim().toLowerCase());
    } else {
      setShowSnippetsMenu(false);
    }
  };

  const handleSelectSnippet = (snippet: CannedResponse) => {
    setInputMessage(snippet.text);
    if (activeConversationId) {
      setDraft(activeConversationId, snippet.text);
    }
    setShowSnippetsMenu(false);
  };

  const filteredSnippets = DEFAULT_CANNED_RESPONSES.filter((item) => {
    if (!snippetFilter) return true;
    return (
      item.shortcut.toLowerCase().includes(snippetFilter) ||
      item.title.toLowerCase().includes(snippetFilter) ||
      item.text.toLowerCase().includes(snippetFilter)
    );
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversationId || isSending) return;

    setIsSending(true);
    try {
      sendTextMessage(activeConversationId, inputMessage.trim());
      setInputMessage('');
      clearDraft(activeConversationId);
      setShowSnippetsMenu(false);
    } finally {
      setTimeout(() => setIsSending(false), 200);
    }
  };

  // Gemini AI Smart Reply Suggestion
  const handleGeminiSuggest = async () => {
    if (!activeConversationId) return;
    setIsAiLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/ai/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ conversationId: activeConversationId }),
      });
      const data = await res.json();
      if (data.suggestion) {
        setInputMessage(data.suggestion);
      }
    } catch (err: any) {
      console.error('Error generating AI suggestion:', err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Add a new memory fact for this customer
  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim() || !activeConversation?.contactPhone) return;
    setIsSavingFact(true);
    try {
      const res = await fetch(`${apiUrl}/api/contacts/${activeConversation.contactPhone}/facts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ fact: newFact.trim() }),
      });
      const data = await res.json();
      if (data.contact) {
        setContactMemory({
          notes: data.contact.notes || '',
          memoryFacts: data.contact.memoryFacts || [],
        });
        setNewFact('');
      }
    } catch (err) {
      console.error('Error saving fact:', err);
    } finally {
      setIsSavingFact(false);
    }
  };

  // Delete a memory fact
  const handleDeleteFact = async (index: number) => {
    if (!activeConversation?.contactPhone) return;
    try {
      const res = await fetch(`${apiUrl}/api/contacts/${activeConversation.contactPhone}/facts/${index}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      const data = await res.json();
      if (data.contact) {
        setContactMemory({
          notes: data.contact.notes || '',
          memoryFacts: data.contact.memoryFacts || [],
        });
      }
    } catch (err) {
      console.error('Error deleting fact:', err);
    }
  };

  const renderStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span title="قيد المعالجة والإرسال للخادم..." className="flex items-center text-slate-400">
            <Clock className="w-3 h-3 animate-pulse" />
          </span>
        );
      case 'SENT':
        return (
          <span title="تم الإرسال لخادم واتساب بنجاح ✓" className="flex items-center text-slate-400">
            <Check className="w-3.5 h-3.5" />
          </span>
        );
      case 'DELIVERED':
        return (
          <span title="تم تسليم الرسالة لجهاز العميل ✓✓" className="flex items-center text-slate-400">
            <CheckCheck className="w-3.5 h-3.5" />
          </span>
        );
      case 'READ':
        return (
          <span title="قرأ العميل الرسالة ✓✓" className="flex items-center text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
            <CheckCheck className="w-3.5 h-3.5" />
          </span>
        );
      case 'FAILED':
        return (
          <span title="فشل تسليم الرسالة (تحقق من اتصال الهاتف أو صحة الرقم)" className="flex items-center text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" />
          </span>
        );
      default:
        return null;
    }
  };

  if (!mounted || !activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[#060911] relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-radial-gradient opacity-30 pointer-events-none" />
        <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-4 shadow-2xl">
          <ShieldCheck className="w-10 h-10 text-emerald-400/70" />
        </div>
        <h3 className="text-base font-bold text-slate-200 mb-1">مساحة العمل الموحدة</h3>
        <p className="text-xs text-slate-400 max-w-sm text-center leading-relaxed">
          اختر أي محادثة من القائمة للبدء في إدارة الرسائل، التحكم بالذكاء الاصطناعي، أو التحدث المباشر مع العميل.
        </p>
      </div>
    );
  }

  const contactInitial = Array.from(activeConversation.contactName.trim())[0] || 'U';

  return (
    <div className="flex-1 flex h-full bg-[#060911] relative overflow-hidden">
      {/* Central Chat Stream */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* 1. Global Brand Header */}
        <header className="h-16 px-6 border-b border-white/[0.07] bg-[#090d16]/80 backdrop-blur-2xl flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3.5">
            {/* Contact Avatar */}
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-emerald-950/40">
                {contactInitial}
              </div>
              <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#090d16]" />
            </div>

            {/* Name, Phone & Verified Tag */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 tracking-tight">{activeConversation.contactName}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>WhatsApp Verified</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono tracking-wide">
                {activeConversation.contactPhone || activeConversation.externalThreadId}
              </p>
            </div>
          </div>

          {/* Quick Actions & AI Switcher */}
          <div className="flex items-center gap-2.5">
            {/* AI Pause / Human Takeover Switch */}
            <button
              type="button"
              onClick={toggleAiPause}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 shadow-sm ${
                isAiPaused
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
              }`}
              title={
                isAiPaused
                  ? 'الرد الذكي موقوف لهذه المحادثة - اضغط لإعادة تشغيل الرد الآلي'
                  : 'الرد الذكي نشط - اضغط للتدخل البشري وإيقاف الرد الآلي'
              }
            >
              {isAiPaused ? <UserCheck className="w-3.5 h-3.5 text-amber-400" /> : <Bot className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isAiPaused ? 'تحكم بشري (الـ AI موقوف)' : 'الرد الذكي نشط 🤖'}</span>
            </button>

            {/* Gemini Suggestion Button */}
            <button
              onClick={handleGeminiSuggest}
              disabled={isAiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition disabled:opacity-50 shadow-sm"
              title="اقتراح رد ذكي ملائم عبر Google Gemini"
            >
              {isAiLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{isAiLoading ? 'صياغة...' : 'اقتراح Gemini'}</span>
            </button>

            {/* Audio Notification Toggle Button */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition ${
                isSoundEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300'
              }`}
              title={isSoundEnabled ? 'التنبيهات الصوتية مفعلة (اضغط للكتم)' : 'التنبيهات الصوتية صامتة (اضغط للتفعيل)'}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Toggle CRM Memory Panel */}
            <button
              onClick={() => setShowCrmPanel(!showCrmPanel)}
              className={`p-2 rounded-xl border transition ${
                showCrmPanel
                  ? 'bg-white/10 text-white border-white/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] border-white/[0.08]'
              }`}
              title="عرض ذاكرة العميل وملاحظات الـ CRM"
            >
              {showCrmPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* 2. Messages Canvas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 relative">
          {activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <Sparkles className="w-8 h-8 text-emerald-400/40 animate-pulse" />
              <span>بدء محادثة جديدة</span>
              <span className="text-[11px] text-slate-600">اكتب أول رد في الأسفل لتبدأ المحادثة المباشرة</span>
            </div>
          ) : (
            activeMessages.map((msg) => {
              const isAgent = msg.senderType === 'AGENT';
              const isAudio =
                msg.mediaType === 'audio' ||
                (!!msg.mediaUrl && /\.(ogg|opus|mp3|m4a|wav)($|\?)/i.test(msg.mediaUrl));
              const isImage =
                msg.mediaType === 'image' ||
                (!!msg.mediaUrl && /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(msg.mediaUrl));
              const isVideo =
                msg.mediaType === 'video' ||
                (!!msg.mediaUrl && /\.(mp4|webm|mov)($|\?)/i.test(msg.mediaUrl));
              const isDocument =
                msg.mediaType === 'document' ||
                (!!msg.mediaUrl && !isAudio && !isImage && !isVideo);

              const isPureAudioPlaceholder =
                isAudio && msg.content && msg.content.includes('رسالة صوتية');

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} transition-all`}
                >
                  <div
                    className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg relative ${
                      isAgent
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-bl-none shadow-emerald-950/30'
                        : 'bg-[#111726]/90 border border-white/[0.08] text-slate-100 rounded-br-none shadow-black/40'
                    }`}
                  >
                    {/* Image Preview */}
                    {isImage && msg.mediaUrl && (
                      <div className="mb-2.5 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={msg.mediaUrl}
                            alt="مرفق وسائط"
                            className="w-full max-h-72 object-contain hover:scale-[1.01] transition"
                            loading="lazy"
                          />
                        </a>
                      </div>
                    )}

                    {/* Audio Player with Waveform Simulation */}
                    {isAudio && msg.mediaUrl && (
                      <div className="mb-2 p-3 rounded-xl bg-black/30 border border-white/10 flex flex-col gap-2 min-w-[280px]">
                        <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                          <Mic className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>رسالة صوتية من واتساب</span>
                        </div>
                        <audio
                          controls
                          src={msg.mediaUrl}
                          className="w-full h-9 rounded-lg"
                          preload="metadata"
                        />
                      </div>
                    )}

                    {/* Video Player */}
                    {isVideo && msg.mediaUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                        <video
                          controls
                          src={msg.mediaUrl}
                          className="w-full max-h-72 rounded-lg"
                          preload="metadata"
                        />
                      </div>
                    )}

                    {/* Document */}
                    {isDocument && msg.mediaUrl && (
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="mb-2 p-3 rounded-xl bg-white/[0.06] border border-white/10 flex items-center gap-3 hover:bg-white/[0.1] transition text-slate-100 text-xs"
                      >
                        <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="truncate flex-1 font-mono">{msg.content || 'مستند مرفق'}</span>
                        <Download className="w-4 h-4 text-slate-400 shrink-0" />
                      </a>
                    )}

                    {/* Text Message */}
                    {msg.content && !isPureAudioPlaceholder && (
                      <p className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-relaxed" dir="auto">
                        {msg.content}
                      </p>
                    )}
                  </div>

                  {/* Timestamp & Delivery Receipt */}
                  <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400">
                    <span suppressHydrationWarning>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isAgent && renderStatusIcon(msg.deliveryStatus)}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 3. Floating Brand Input Composer with Snippets */}
        <footer className="p-4 border-t border-white/[0.07] bg-[#090d16]/90 backdrop-blur-2xl relative">
          {/* Canned Responses Popover Menu */}
          {showSnippetsMenu && filteredSnippets.length > 0 && (
            <div className="absolute bottom-full mb-3 right-4 left-4 max-w-2xl mx-auto rounded-2xl bg-[#0b111e]/98 border border-emerald-500/30 shadow-2xl backdrop-blur-2xl p-2.5 z-50 animate-fadeIn">
              <div className="flex items-center justify-between px-2 pb-2 mb-1.5 border-b border-white/[0.08] text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  ردود سريعة جاهزة (Canned Snippets)
                </span>
                <span className="text-slate-400 text-[10px]">انقر لاختيار الرد أو اكتب الاختصار</span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {filteredSnippets.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSnippet(item)}
                    className="w-full text-right p-2.5 rounded-xl hover:bg-emerald-500/15 border border-transparent hover:border-emerald-500/30 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-emerald-400 border border-white/10">
                          {item.shortcut}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.text}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 shrink-0 font-medium">
                      إدراج ↵
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2 max-w-5xl mx-auto">
            {/* Quick Canned Snippets Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowSnippetsMenu(!showSnippetsMenu);
                setSnippetFilter('');
              }}
              className={`p-2.5 rounded-xl border transition ${
                showSnippetsMenu
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-md shadow-emerald-950/40'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border-white/[0.08]'
              }`}
              title="الردود الجاهزة السريعة (اضغط هنا أو اكتب /)"
            >
              <Zap className="w-4 h-4" />
            </button>

            {/* AI Suggest Pill */}
            <button
              type="button"
              onClick={handleGeminiSuggest}
              disabled={isAiLoading}
              className="p-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 transition disabled:opacity-50"
              title="اقتراح رد ذكي عبر Gemini"
            >
              {isAiLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>

            {/* Input Text Box with Draft Preservation */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                placeholder="اكتب ردك للعميل (اكتب / للردود السريعة، أو Enter للإرسال)..."
                className="w-full bg-[#070a12] border border-white/[0.09] rounded-2xl px-4 py-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition shadow-inner"
              />
            </div>

            {/* Send Action */}
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:hover:from-emerald-500 disabled:hover:to-teal-500 text-emerald-950 font-black rounded-2xl flex items-center justify-center transition shadow-lg shadow-emerald-500/25"
              title="إرسال عبر واتساب"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </footer>
      </div>

      {/* 4. Customer CRM & Memory Drawer (Collapsible Right Panel) */}
      {showCrmPanel && (
        <aside className="w-80 border-r border-white/[0.07] bg-[#090d16]/95 backdrop-blur-2xl flex flex-col h-full z-20 shrink-0 shadow-2xl animate-fadeIn">
          {/* Drawer Header */}
          <div className="p-4 border-b border-white/[0.07] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-100">ذاكرة العميل وملف الـ CRM</h3>
            </div>
            <button
              onClick={() => setShowCrmPanel(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <MemoryManager
              contactIdOrPhone={activeConversation.contactPhone || activeConversation.contactId}
              tenantId={tenantId}
            />
          </div>
        </aside>
      )}
    </div>
  );
}
