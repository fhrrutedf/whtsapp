'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { 
  Search, 
  MessageSquare, 
  QrCode, 
  SlidersHorizontal, 
  AlertCircle, 
  Bot, 
  CheckCheck, 
  Clock, 
  X,
  Sparkles
} from 'lucide-react';

export function ConversationList() {
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversationId,
    isWhatsAppConnected,
    setWhatsAppModalOpen 
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'escalated' | 'ai'>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const conversationList = mounted ? conversations : [];

  const filteredConversations = conversationList.filter((c) => {
    // Search query match
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      c.contactName.toLowerCase().includes(query) ||
      (c.lastMessageSnippet && c.lastMessageSnippet.toLowerCase().includes(query)) ||
      (c.contactPhone && c.contactPhone.includes(query));

    if (!matchesSearch) return false;

    // Filter categories
    if (filterType === 'unread') return (c.unreadCount || 0) > 0;
    if (filterType === 'escalated') {
      const snippet = (c.lastMessageSnippet || '').toLowerCase();
      return (
        snippet.includes('موظف') ||
        snippet.includes('بشري') ||
        snippet.includes('شكوى') ||
        snippet.includes('مدير') ||
        snippet.includes('تحويل')
      );
    }
    return true;
  });

  const totalUnread = conversationList.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const totalEscalated = conversationList.filter((c) => {
    const s = (c.lastMessageSnippet || '').toLowerCase();
    return s.includes('موظف') || s.includes('بشري') || s.includes('شكوى') || s.includes('مدير');
  }).length;

  return (
    <aside className="w-80 md:w-96 border-l border-white/[0.07] flex flex-col bg-[#0b101c]/80 backdrop-blur-2xl h-full select-none z-20 shrink-0">
      {/* Header: Title & WhatsApp Button */}
      <div className="p-4 border-b border-white/[0.07] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-100 tracking-tight">صندوق المحادثات</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.08]">
              {mounted ? conversationList.length : 0}
            </span>
          </div>

          <button
            onClick={() => setWhatsAppModalOpen(true)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all duration-200 border font-medium ${
              mounted && isWhatsAppConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-900/40'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{mounted && isWhatsAppConnected ? 'واتساب متصل' : 'ربط واتساب'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، الرقم، أو محتوى الرسالة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070b14] border border-white/[0.08] rounded-xl pr-9 pl-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg border transition font-medium whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-white/10 text-white border-white/20'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.04]'
            }`}
          >
            الكل
          </button>

          <button
            onClick={() => setFilterType('unread')}
            className={`px-2.5 py-1 rounded-lg border transition font-medium flex items-center gap-1.5 whitespace-nowrap ${
              filterType === 'unread'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.04]'
            }`}
          >
            <span>غير مقروءة</span>
            {totalUnread > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500 text-emerald-950 font-black tabular-nums">
                {totalUnread}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterType('escalated')}
            className={`px-2.5 py-1 rounded-lg border transition font-medium flex items-center gap-1.5 whitespace-nowrap ${
              filterType === 'escalated'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.04]'
            }`}
          >
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>طلب موظف</span>
            {totalEscalated > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-amber-950 font-black tabular-nums">
                {totalEscalated}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conversation List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 opacity-30 text-emerald-400" />
            </div>
            <span className="text-slate-400 font-medium">لا توجد محادثات مطابقة</span>
            <span className="text-[11px] text-slate-600 max-w-[200px]">
              {searchQuery ? 'جرّب البحث باسم أو برقم هاتف آخر' : 'المحادثات الواردة من واتساب ستظهر هنا فورياً'}
            </span>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = activeConversationId === conv.id;
            const initial = Array.from(conv.contactName.trim())[0] || 'U';
            const snippet = (conv.lastMessageSnippet || '').toLowerCase();
            const isEscalated =
              snippet.includes('موظف') ||
              snippet.includes('بشري') ||
              snippet.includes('شكوى') ||
              snippet.includes('مدير');

            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 relative flex flex-col gap-2 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-500/40 shadow-lg shadow-emerald-950/40'
                    : 'hover:bg-white/[0.04] border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Customer Avatar */}
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center font-bold text-xs text-emerald-400 shadow-inner">
                        {initial}
                      </div>
                      <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0b101c]" />
                    </div>

                    {/* Name & Phone */}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
                        <span className="truncate">{conv.contactName}</span>
                        {isEscalated && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>مهم</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tracking-wider truncate">
                        {conv.contactPhone || conv.externalThreadId}
                      </div>
                    </div>
                  </div>

                  {/* Badges & Meta Tag */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      WhatsApp
                    </span>

                    {conv.unreadCount > 0 && (
                      <span className="h-4 min-w-[16px] px-1 rounded-full bg-emerald-500 text-emerald-950 font-black text-[10px] flex items-center justify-center shadow-md shadow-emerald-500/50 tabular-nums">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Snippet & Last Time */}
                <div className="flex items-center justify-between text-slate-400 text-xs pr-1">
                  <p className="truncate flex-1 font-sans text-[11px] text-slate-300/80">
                    {conv.lastMessageSnippet || '[رسالة وسائط جديدة]'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
