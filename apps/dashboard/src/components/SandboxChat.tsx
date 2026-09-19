'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  RefreshCw, 
  Bot, 
  User, 
  BookOpen, 
  Zap, 
  Clock, 
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

import { useChatStore } from '../store/useChatStore';

interface SandboxMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  latencyMs?: number;
  timestamp: string;
}

interface SandboxChatProps {
  tenantId?: string;
  systemPromptOverride?: string;
  apiUrl?: string;
}

export function SandboxChat({ 
  tenantId: propTenantId, 
  systemPromptOverride, 
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000' 
}: SandboxChatProps) {
  const storeTenantId = useChatStore((s) => s.tenantId);
  const tenantId = propTenantId || storeTenantId;
  const [messages, setMessages] = useState<SandboxMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'مرحباً بك في مختبر الذكاء الاصطناعي (Sandbox Playground)! 🤖\n\nيمكنك هنا اختبار ردود المساعد الذكي بناءً على قاعدة المعرفة (Knowledge Base) والإعدادات المحددة لديك قبل تفعيلها على واتساب.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeCount, setKnowledgeCount] = useState<number | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Fetch count of knowledge base items
  useEffect(() => {
    fetch(`${apiUrl}/api/knowledge`, { headers: { 'x-tenant-id': tenantId } })
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items)) setKnowledgeCount(items.length);
      })
      .catch(() => {});
  }, [apiUrl, tenantId]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setError(null);
    const userMsg: SandboxMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/ai/sandbox/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          message: text,
          history: newHistory
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, content: m.content })),
          systemPromptOverride,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'تعذر الحصول على رد من الذكاء الاصطناعي');
      }

      setLastLatency(data.latencyMs || null);
      if (typeof data.knowledgeCount === 'number') setKnowledgeCount(data.knowledgeCount);

      const aiMsg: SandboxMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        latencyMs: data.latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال بمختبر الذكاء الاصطناعي');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'تمت إعادة ضبط جلسة الاختبار. اكتب استفسارك لتجربة ردود الذكاء الاصطناعي بناءً على قاعدة المعرفة الحالية.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setError(null);
    setLastLatency(null);
  };

  const samplePrompts = [
    'ما هي المنتجات أو الخدمات المتاحة لديكم؟',
    'ما هي أوقات العمل وكيف أتواصل معكم؟',
    'أريد التحدث مع موظف بشري بخصوص مشكلة',
  ];

  return (
    <div className="flex flex-col h-[600px] w-full rounded-3xl bg-[#090d16] border border-white/10 shadow-2xl overflow-hidden">
      {/* Sandbox Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.07] bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/40">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              مختبر قاعدة المعرفة (Knowledge Base Sandbox)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Playground Mode
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              اختبار الردود مباشرة بمعزل تام عن محادثات واتساب الحية
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-2">
          {knowledgeCount !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-300">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>{knowledgeCount} مصادر معرفة</span>
            </div>
          )}

          {lastLatency !== null && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-300 font-mono">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{lastLatency}ms</span>
            </div>
          )}

          <button
            onClick={handleClear}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
            title="مسح المحادثة وإعادة البدء"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#060911]/60">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-start' : 'items-end'} transition-all`}
            >
              <div className="flex items-center gap-2 mb-1 px-1 text-[10px] text-slate-500 font-medium">
                {isUser ? (
                  <>
                    <User className="w-3 h-3 text-emerald-400" />
                    <span>أنت (المسؤول)</span>
                  </>
                ) : (
                  <>
                    <span>الذكاء الاصطناعي (قاعدة المعرفة)</span>
                    <Bot className="w-3 h-3 text-purple-400" />
                  </>
                )}
                <span>• {msg.timestamp}</span>
                {msg.latencyMs && (
                  <span className="text-amber-400 font-mono">({msg.latencyMs}ms)</span>
                )}
              </div>

              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-md whitespace-pre-wrap ${
                  isUser
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tl-none shadow-emerald-950/20'
                    : 'bg-[#111726] border border-white/[0.08] text-slate-100 rounded-tr-none shadow-black/40'
                }`}
                dir="auto"
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex flex-col items-end">
            <div className="p-3 rounded-2xl bg-[#111726] border border-white/[0.08] flex items-center gap-2 text-xs text-purple-300 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>جاري استرجاع البيانات وصياغة الرد...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pill Row */}
      <div className="px-4 py-2 border-t border-white/[0.05] bg-white/[0.01] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-semibold text-slate-500 shrink-0">أسئلة مقترحة:</span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            disabled={isLoading}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-300 hover:text-white transition shrink-0 disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3.5 border-t border-white/[0.07] bg-[#090d16] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالاً لاختبار معرفة الـ AI (مثلاً: ما هي أسعاركم؟)..."
          className="flex-1 bg-[#060911] border border-white/[0.09] rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40 shadow-lg shadow-cyan-950/40"
        >
          {isLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>اختبار</span>
        </button>
      </form>
    </div>
  );
}
