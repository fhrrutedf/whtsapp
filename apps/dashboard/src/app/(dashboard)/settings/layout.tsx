'use client';

import React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../../../components/settings/SettingsNav';
import { MessageSquare, ArrowRight } from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#060911] text-slate-100 overflow-hidden font-sans select-none" dir="rtl">
      {/* 1. Master Navigation Sidebar */}
      <SettingsNav />

      {/* 2. Detail Stage */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-16 px-8 border-b border-white/[0.07] bg-[#090d16]/80 backdrop-blur-2xl flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold border border-white/[0.08] transition shadow-sm"
              title="العودة لشاشة المحادثات الحية"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للمحادثات الحية</span>
            </Link>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px]">Next.js Master-Detail Engine</span>
          </div>
        </header>

        {/* Scrollable Content View */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-5xl mx-auto animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
