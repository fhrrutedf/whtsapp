'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useChatStore } from '../store/useChatStore';
import { ConversationList } from '../components/ConversationList';
import { ChatWindow } from '../components/ChatWindow';
import { ContactsView } from '../components/ContactsView';
import { AnalyticsView } from '../components/AnalyticsView';
import { SettingsView } from '../components/SettingsView';
import { WhatsAppConnectModal } from '../components/WhatsAppConnectModal';
import { 
  MessageSquare, 
  Settings, 
  Users, 
  BarChart3, 
  WifiOff, 
  Radio,
  QrCode,
  Sparkles,
  Shield,
  Command,
  CheckCircle2,
  LogOut,
  LogIn,
  UserPlus,
  ChevronUp,
  TrendingUp,
  Gift
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function DashboardPage() {
  const { 
    initSocket, 
    isSocketConnected, 
    tenantId, 
    setWhatsAppModalOpen, 
    isWhatsAppConnected,
    currentTab,
    setCurrentTab,
    conversations
  } = useChatStore();

  const { user, tenant, logout, checkAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
    initSocket(tenantId);
  }, [initSocket, tenantId, checkAuth]);

  const totalUnread = mounted 
    ? conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
    : 0;

  const navItems = [
    {
      id: 'chat',
      label: 'المحادثات',
      subLabel: 'Live Chats',
      icon: MessageSquare,
      badge: totalUnread > 0 ? totalUnread : null,
      badgeColor: 'bg-emerald-500 text-emerald-950 font-black',
    },
    {
      id: 'contacts',
      label: 'جهات الاتصال',
      subLabel: 'CRM & Memory',
      icon: Users,
    },
    {
      id: 'analytics',
      label: 'التقارير',
      subLabel: 'Metrics',
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: 'إعدادات AI',
      subLabel: 'Intelligence & Base',
      icon: Settings,
    },
    {
      id: 'leads',
      label: 'CRM العملاء',
      subLabel: 'Lead Intelligence',
      icon: TrendingUp,
    },
    {
      id: 'giveaways',
      label: 'الهدايا والمسابقات',
      subLabel: 'Giveaway Manager',
      icon: Gift,
    },
  ];

  return (
    <div className="flex h-screen w-full bg-[#060911] text-slate-100 overflow-hidden select-none font-sans">
      {/* COLUMN 1: World-Class Brand Navigation Rail */}
      <aside className="w-20 border-l border-white/[0.07] bg-[#090d16]/90 backdrop-blur-2xl flex flex-col items-center py-5 justify-between z-30 shrink-0 shadow-2xl relative">
        {/* Top Section: Brand Logo & Navigation */}
        <div className="flex flex-col items-center gap-7 w-full">
          {/* Brand Emblem */}
          <div className="relative group cursor-pointer" onClick={() => setCurrentTab('chat')}>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1.5px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="font-black text-2xl text-emerald-400 select-none">
                  Ω
                </span>
              </div>
            </div>
            {/* Online Pulse Dot */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#090d16]"></span>
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-2.5 w-full px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              
              if (item.id === 'settings') {
                return (
                  <Link
                    key={item.id}
                    href="/settings/general"
                    className="group relative w-full h-12 rounded-2xl flex items-center justify-center transition-all duration-200 text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent"
                    title={`${item.label} (${item.subLabel})`}
                  >
                    <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />

                    {/* Tooltip on hover */}
                    <div className="absolute left-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900/95 text-slate-100 text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-white/10 shadow-2xl backdrop-blur-md">
                      <span>{item.label}</span>
                      <span className="block text-[10px] text-slate-400 font-normal">{item.subLabel}</span>
                    </div>
                  </Link>
                );
              }

              if (item.id === 'leads') {
                return (
                  <Link
                    key={item.id}
                    href="/leads"
                    className="group relative w-full h-12 rounded-2xl flex items-center justify-center transition-all duration-200 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-transparent"
                    title={`${item.label} (${item.subLabel})`}
                  >
                    <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                    <div className="absolute left-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900/95 text-slate-100 text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-white/10 shadow-2xl backdrop-blur-md">
                      <span>{item.label}</span>
                      <span className="block text-[10px] text-slate-400 font-normal">{item.subLabel}</span>
                    </div>
                  </Link>
                );
              }

              if (item.id === 'giveaways') {
                return (
                  <Link
                    key={item.id}
                    href="/giveaways"
                    className="group relative w-full h-12 rounded-2xl flex items-center justify-center transition-all duration-200 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-transparent"
                    title={`${item.label} (${item.subLabel})`}
                  >
                    <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                    <div className="absolute left-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900/95 text-slate-100 text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-white/10 shadow-2xl backdrop-blur-md">
                      <span>{item.label}</span>
                      <span className="block text-[10px] text-slate-400 font-normal">{item.subLabel}</span>
                    </div>
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id as any)}
                  className={`group relative w-full h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-b from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/60'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
                  }`}
                  title={`${item.label} (${item.subLabel})`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-emerald-400' : ''}`} />

                  {/* Unread Badge */}
                  {item.badge && (
                    <span className="absolute -top-1 -left-1 px-1.5 py-0.2 min-w-[18px] h-[18px] text-[10px] font-black rounded-full bg-emerald-500 text-emerald-950 flex items-center justify-center ring-2 ring-[#090d16] animate-pulse">
                      {item.badge}
                    </span>
                  )}

                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-l-full shadow-sm shadow-emerald-400" />
                  )}

                  {/* Tooltip on hover */}
                  <div className="absolute left-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900/95 text-slate-100 text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-white/10 shadow-2xl backdrop-blur-md">
                    <span>{item.label}</span>
                    <span className="block text-[10px] text-slate-400 font-normal">{item.subLabel}</span>
                  </div>
                </button>
              );
            })}

            <div className="w-8 h-[1px] bg-white/[0.08] mx-auto my-1" />

            {/* WhatsApp Connect Modal Trigger */}
            <button
              onClick={() => setWhatsAppModalOpen(true)}
              className={`group relative w-full h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                mounted && isWhatsAppConnected
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20'
              }`}
              title="ربط ومراقبة واتساب (WhatsApp Web)"
            >
              <QrCode className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span
                className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ring-2 ring-[#090d16] ${
                  mounted && isWhatsAppConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                }`}
              />
              {/* Tooltip */}
              <div className="absolute left-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900/95 text-slate-100 text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-white/10 shadow-2xl backdrop-blur-md">
                <span>{mounted && isWhatsAppConnected ? 'واتساب متصل ويعمل' : 'مسح رمز واتساب'}</span>
                <span className="block text-[10px] text-slate-400 font-normal">WhatsApp Direct Engine</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Bottom Section: Connection Health & Profile */}
        <div className="flex flex-col items-center gap-4 w-full px-3">
          {/* Real-time Socket Indicator */}
          <div
            className={`w-full py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
              isSocketConnected
                ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-950/40 border-rose-500/20 text-rose-400'
            }`}
            title={isSocketConnected ? 'WebSocket متصل بالخادم فورياً' : 'جاري إعادة الاتصال...'}
          >
            {isSocketConnected ? (
              <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-400" />
            )}
            <span className="text-[9px] font-bold uppercase tracking-wider">
              {isSocketConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* User Profile Avatar with Popover */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center font-bold text-xs text-slate-200 hover:border-emerald-500/50 transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              title={user?.name || 'المشرف العام (Super Admin)'}
            >
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#090d16]" />
            </button>

            {/* Profile Menu Popover */}
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfileMenu(false)} 
                />
                <div 
                  className="absolute bottom-12 right-0 w-64 p-3 rounded-2xl bg-[#0d1424] border border-white/10 shadow-2xl backdrop-blur-xl z-50 animate-fadeIn text-right"
                  dir="rtl"
                >
                  <div className="px-3 py-2 border-b border-white/[0.08] mb-2">
                    <div className="text-xs font-bold text-white truncate">
                      {user?.name || 'مشرف الحساب (تجريبي)'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {user?.email || 'admin@omni.sa'}
                    </div>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                      <span>{tenant?.name || 'المقر الرئيسي'}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href="/settings/general"
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>إعدادات مساحة العمل</span>
                    </Link>

                    <Link
                      href="/register"
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.05] hover:text-cyan-400 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>إنشاء مساحة عمل جديدة</span>
                    </Link>

                    <Link
                      href="/login"
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.05] hover:text-emerald-400 transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تسجيل الدخول بحساب آخر</span>
                    </Link>

                    {user && (
                      <button
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors border-t border-white/[0.06] mt-1 pt-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>تسجيل الخروج</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* DYNAMIC VIEW ROUTER */}
      <main className="flex-1 flex overflow-hidden relative">
        {currentTab === 'chat' && (
          <div className="flex-1 flex overflow-hidden w-full h-full">
            <ConversationList />
            <ChatWindow />
          </div>
        )}

        {currentTab === 'contacts' && (
          <div className="flex-1 overflow-hidden w-full h-full animate-fadeIn">
            <ContactsView />
          </div>
        )}

        {currentTab === 'analytics' && (
          <div className="flex-1 overflow-hidden w-full h-full animate-fadeIn">
            <AnalyticsView />
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="flex-1 overflow-hidden w-full h-full animate-fadeIn">
            <SettingsView />
          </div>
        )}
      </main>

      {/* WhatsApp QR Connection Modal */}
      <WhatsAppConnectModal />
    </div>
  );
}
