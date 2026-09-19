'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Sliders, 
  Bot, 
  BookOpen, 
  ImageIcon,
  MessageSquare, 
  Users, 
  ShieldCheck, 
  ChevronLeft,
  Sparkles,
  Gift
} from 'lucide-react';

interface SettingsNavItem {
  href: string;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  badge?: string;
}

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    href: '/settings/general',
    label: 'الملف العام والهوية',
    subLabel: 'General & Profile',
    icon: Sliders,
  },
  {
    href: '/settings/ai-agent',
    label: 'محرك الذكاء والمهارات',
    subLabel: 'AI Engine & Skills',
    icon: Bot,
    badge: 'Dual AI',
  },
  {
    href: '/settings/giveaways',
    label: 'الهدايا والمسابقات الأسبوعية',
    subLabel: 'Giveaways & Weekly Contests',
    icon: Gift,
    badge: 'هدايا AI',
  },
  {
    href: '/settings/knowledge',
    label: 'قاعدة المعرفة والزاحف',
    subLabel: 'Knowledge & Crawlers',
    icon: BookOpen,
  },
  {
    href: '/settings/media',
    label: 'مكتبة الوسائط والكتالوج',
    subLabel: 'Visual Assets & Catalog',
    icon: ImageIcon,
    badge: 'Media',
  },
  {
    href: '/settings/channels',
    label: 'واتساب والحماية ضد الحظر',
    subLabel: 'Channels & Anti-Ban',
    icon: MessageSquare,
    badge: 'Safe Guard',
  },
  {
    href: '/settings/team',
    label: 'فريق العمل وتوجيه المهام',
    subLabel: 'Team & Smart Routing',
    icon: Users,
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <aside className="w-72 border-l border-white/[0.07] bg-[#090d16]/95 backdrop-blur-2xl flex flex-col justify-between shrink-0 h-full p-4 select-none">
      {/* Sidebar Header */}
      <div className="space-y-6">
        <div className="px-2 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-950/40">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-tight">إعدادات المنظومة</h1>
              <p className="text-[11px] text-slate-400">Master-Detail Architecture</p>
            </div>
          </div>
        </div>

        {/* Navigation Link Items */}
        <nav className="space-y-1.5" aria-label="Settings Subsections">
          {SETTINGS_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/settings/general' && pathname === '/settings');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative w-full px-3.5 py-3 rounded-2xl flex items-center justify-between transition-all duration-200 border ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl transition-colors ${
                    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.03] text-slate-400 group-hover:text-slate-200'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-1.5">
                      <span>{item.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate font-normal mt-0.5">
                      {item.subLabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 tabular-nums">
                      {item.badge}
                    </span>
                  )}
                  <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isActive ? 'text-emerald-400 -translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                  }`} />
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Indicator */}
      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 font-medium">سحابي مشفر</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06] tabular-nums">
          v2.4 Pro
        </span>
      </div>
    </aside>
  );
}
