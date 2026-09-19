'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { Search, UserPlus, Phone, MessageSquare, Clock, ArrowRight } from 'lucide-react';

export function ContactsView() {
  const { conversations, setActiveConversationId, setCurrentTab } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Extract unique contacts from conversations
  const contacts = conversations.map((c) => ({
    id: c.contactId || c.id,
    name: c.contactName,
    phone: c.contactPhone || c.externalThreadId,
    lastSeen: c.updatedAt,
    convId: c.id,
  }));

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleStartChat = (convId: string) => {
    setActiveConversationId(convId);
    setCurrentTab('chat');
  };

  const handleAddNewContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;
    const clean = newPhone.replace(/\D/g, '');
    const convId = `conv_${clean}`;
    setActiveConversationId(convId);
    setCurrentTab('chat');
    setIsAddModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="h-16 px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            جهات الاتصال (Contacts)
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
              {contacts.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400">إدارة جهات اتصال الواتساب وبدء محادثات فورية</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة رقم جديد</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="p-8 max-w-5xl w-full mx-auto space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو برقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pr-10 pl-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
          />
        </div>

        {/* Contacts Grid */}
        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/60">
            <Phone className="w-10 h-10 mx-auto mb-3 opacity-40 text-emerald-500" />
            <p className="text-sm font-medium text-slate-300">لا توجد جهات اتصال مطابقة</p>
            <p className="text-xs text-slate-500 mt-1">تظهر جهات الاتصال تلقائياً فور وصول أي رسالة واتساب جديدة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => {
              const initial = Array.from(contact.name.trim())[0] || 'U';
              return (
                <div
                  key={contact.id}
                  className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-base flex items-center justify-center shadow-sm">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-100 truncate">{contact.name}</h3>
                      <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        {contact.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(contact.lastSeen).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleStartChat(contact.convId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>محادثة</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              بدء محادثة مع رقم جديد
            </h2>
            <p className="text-xs text-slate-400">
              أدخل رقم الهاتف مع رمز الدولة لبدء محادثة واتساب فورية معه.
            </p>

            <form onSubmit={handleAddNewContact} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">اسم العميل (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: أحمد المحمد"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">رقم الهاتف (مع رمز الدولة)</label>
                <input
                  type="text"
                  placeholder="+963 995 433 707"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                >
                  بدء المحادثة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
