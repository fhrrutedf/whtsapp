"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  Search, 
  RefreshCw, 
  Users, 
  Flame, 
  CreditCard, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  Phone, 
  Globe, 
  Calendar,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  MessageSquare
} from "lucide-react";

interface Lead {
  id: string;
  name?: string;
  whatsappPushName?: string;
  phoneNumber?: string;
  countryCode?: string;
  countryName?: string;
  interestLevel?: 'HOT' | 'WARM' | 'COLD' | 'PAID' | 'UNINTERESTED' | 'UNKNOWN';
  interestScore?: number;
  interestNotes?: string;
  memoryFacts?: string[];
  lastSeenAt?: string;
  firstContactAt?: string;
  paidAt?: string;
  isOptedOut?: boolean;
  courseDeliveredAt?: string;
}

const INTEREST_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  HOT:          { label: "مهتم جداً 🔥",   color: "text-rose-400", bg: "bg-rose-500/15", border: "border-rose-500/30" },
  WARM:         { label: "مهتم ✨",          color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" },
  COLD:         { label: "بارد ❄️",          color: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/30" },
  PAID:         { label: "دفع 💳",           color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  UNINTERESTED: { label: "غير مهتم ❌",      color: "text-slate-400", bg: "bg-white/[0.05]", border: "border-white/10" },
  UNKNOWN:      { label: "جديد 🆕",          color: "text-violet-400", bg: "bg-violet-500/15", border: "border-violet-500/30" },
};

const COUNTRY_FLAGS: Record<string, string> = {
  SY:"🇸🇾",SA:"🇸🇦",AE:"🇦🇪",JO:"🇯🇴",LB:"🇱🇧",IQ:"🇮🇶",KW:"🇰🇼",QA:"🇶🇦",
  BH:"🇧🇭",OM:"🇴🇲",YE:"🇾🇪",EG:"🇪🇬",MA:"🇲🇦",TN:"🇹🇳",DZ:"🇩🇿",SD:"🇸🇩",
  LY:"🇱🇾",PS:"🇵🇸",US:"🇺🇸",GB:"🇬🇧",DE:"🇩🇪",FR:"🇫🇷",SE:"🇸🇪",NL:"🇳🇱",
  NO:"🇳🇴",DK:"🇩🇰",TR:"🇹🇷",RU:"🇷🇺",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
}

function ScoreBadge({ score }: { score?: number }) {
  const s = score ?? 0;
  const barColor = s >= 70 ? "bg-rose-500" : s >= 40 ? "bg-amber-500" : "bg-slate-500";
  const textColor = s >= 70 ? "text-rose-400" : s >= 40 ? "text-amber-400" : "text-slate-400";

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-300`} style={{ width: `${s}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold ${textColor}`}>{s}</span>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [stats, setStats] = useState({ total: 0, hot: 0, paid: 0, warm: 0 });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed");
      const data: Lead[] = await res.json();
      setLeads(data);
      setStats({
        total: data.length,
        hot: data.filter((l) => l.interestLevel === "HOT").length,
        paid: data.filter((l) => l.interestLevel === "PAID").length,
        warm: data.filter((l) => l.interestLevel === "WARM").length,
      });
    } catch { 
      setLeads([]); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { 
    fetchLeads(); 
  }, [fetchLeads]);

  useEffect(() => {
    let result = leads;
    if (filterLevel !== "ALL") result = result.filter((l) => l.interestLevel === filterLevel);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.name?.toLowerCase().includes(q) ||
        l.whatsappPushName?.toLowerCase().includes(q) ||
        l.phoneNumber?.includes(q) ||
        l.countryName?.includes(q)
      );
    }
    setFiltered(result);
  }, [leads, search, filterLevel]);

  const displayName = (lead: Lead) =>
    lead.name && lead.name !== lead.phoneNumber 
      ? lead.name 
      : lead.whatsappPushName || lead.phoneNumber || "—";

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 font-sans select-none" dir="rtl">
      {/* Top Header Bar */}
      <header className="h-16 px-6 lg:px-10 border-b border-white/[0.07] bg-[#090d16]/90 backdrop-blur-2xl flex items-center justify-between sticky top-0 z-30 shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition flex items-center gap-1 text-xs font-bold"
            title="العودة لصندوق المحادثات"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة للدردشة</span>
          </Link>

          <div className="h-4 w-[1px] bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight">
                إدارة العملاء والمهتمين • CRM Leads
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                تصنيف ذكي لمستوى الاهتمام، رصد الدول، وتتبع المدفوعات آلياً
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchLeads}
          disabled={loading}
          className="p-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] transition flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          <span>تحديث</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 rounded-3xl bg-[#0c1322] border border-white/10 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400">إجمالي العملاء</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{stats.total}</div>
            <div className="text-[11px] text-slate-500 mt-1">مسجلون في قاعدة البيانات</div>
          </div>

          <div className="p-5 rounded-3xl bg-[#0c1322] border border-rose-500/30 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-rose-300">مهتمون جداً (Hot)</span>
              <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-rose-400 tracking-tight">{stats.hot}</div>
            <div className="text-[11px] text-rose-400/60 mt-1">فرص إغلاق مبيعات وشيكة 🔥</div>
          </div>

          <div className="p-5 rounded-3xl bg-[#0c1322] border border-emerald-500/30 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-300">دفعوا واشتركوا</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-400 tracking-tight">{stats.paid}</div>
            <div className="text-[11px] text-emerald-400/60 mt-1">تم تأكيد الدفع واستلام المحتوى 💳</div>
          </div>

          <div className="p-5 rounded-3xl bg-[#0c1322] border border-amber-500/30 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-300">مهتمون (Warm)</span>
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-400 tracking-tight">{stats.warm}</div>
            <div className="text-[11px] text-amber-400/60 mt-1">تفاعلوا بإيجابية مع العروض ✨</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="🔍 بحث بالاسم، رقم الهاتف، أو الدولة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0c1322] border border-white/10 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 shadow-inner"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar text-xs">
            {["ALL", "HOT", "WARM", "COLD", "PAID", "UNINTERESTED", "UNKNOWN"].map((level) => {
              const cfg = INTEREST_CONFIG[level];
              const isSelected = filterLevel === level;
              const count = level === "ALL" ? leads.length : leads.filter((l) => l.interestLevel === level).length;

              return (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={`px-3 py-1.5 rounded-xl border font-bold transition whitespace-nowrap text-xs ${
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                      : "bg-[#0c1322] text-slate-400 hover:text-white border-white/[0.08]"
                  }`}
                >
                  {level === "ALL" ? `الكل (${count})` : `${cfg?.label || level} (${count})`}
                </button>
              );
            })}
          </div>
        </div>

        {/* CRM Table */}
        <div className="bg-[#0c1322] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {loading ? (
            <div className="py-24 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400/60" />
              <span className="text-sm">جاري تحميل بيانات العملاء...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-2">
              <Users className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
              <div className="text-sm font-bold text-slate-300">لا يوجد عملاء مطابقين للبحث</div>
              <div className="text-xs text-slate-500">جرب البحث بكلمة أخرى أو تغيير تصفية مستوى الاهتمام</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#090d16]/90 border-b border-white/[0.08] text-slate-400 text-xs font-bold">
                    <th className="py-4 px-5 whitespace-nowrap">الاسم الحقيقي للعميل</th>
                    <th className="py-4 px-5 whitespace-nowrap">رقم الهاتف</th>
                    <th className="py-4 px-5 whitespace-nowrap">الدولة</th>
                    <th className="py-4 px-5 whitespace-nowrap">مستوى الاهتمام</th>
                    <th className="py-4 px-5 whitespace-nowrap">النقاط</th>
                    <th className="py-4 px-5 whitespace-nowrap">ملاحظات الذكاء الاصطناعي</th>
                    <th className="py-4 px-5 whitespace-nowrap">آخر تواصل</th>
                    <th className="py-4 px-5 whitespace-nowrap">حالة الدفع</th>
                    <th className="py-4 px-5 whitespace-nowrap">الكورس</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs">
                  {filtered.map((lead, i) => {
                    const cfg = INTEREST_CONFIG[lead.interestLevel || "UNKNOWN"] || INTEREST_CONFIG.UNKNOWN;
                    const flag = lead.countryCode ? (COUNTRY_FLAGS[lead.countryCode] || "🌍") : "🌍";

                    return (
                      <tr 
                        key={lead.id} 
                        className={`hover:bg-white/[0.03] transition-colors ${
                          i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
                        }`}
                      >
                        {/* Name */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="font-bold text-white text-sm">
                            {displayName(lead)}
                          </div>
                          {lead.whatsappPushName && lead.name && lead.name !== lead.phoneNumber && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              واتساب: {lead.whatsappPushName}
                            </div>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className="font-mono text-xs text-slate-300 direction-ltr inline-block tracking-wider">
                            {lead.phoneNumber || "—"}
                          </span>
                        </td>

                        {/* Country */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                            <span className="text-base">{flag}</span>
                            <span className="text-xs font-semibold text-slate-300">
                              {lead.countryName || "غير محدد"}
                            </span>
                          </div>
                        </td>

                        {/* Interest Level */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            <span>{cfg.label}</span>
                          </span>
                        </td>

                        {/* Score */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <ScoreBadge score={lead.interestScore} />
                        </td>

                        {/* AI Notes & Memory Facts */}
                        <td className="py-3.5 px-5 max-w-xs">
                          <div className="text-xs text-slate-300 truncate" title={lead.interestNotes || ""}>
                            {lead.interestNotes || "—"}
                          </div>
                          {lead.memoryFacts && lead.memoryFacts.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-violet-400 mt-1">
                              <BrainCircuit className="w-3 h-3" />
                              <span>{lead.memoryFacts.length} حقائق في الذاكرة</span>
                            </div>
                          )}
                        </td>

                        {/* Last Seen */}
                        <td className="py-3.5 px-5 whitespace-nowrap text-slate-400">
                          {formatDate(lead.lastSeenAt || lead.firstContactAt)}
                        </td>

                        {/* Paid */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          {lead.paidAt ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{formatDate(lead.paidAt)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono">—</span>
                          )}
                        </td>

                        {/* Course Delivery */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          {lead.isOptedOut ? (
                            <span className="text-rose-400 font-semibold text-[11px] inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>أوقف المتابعة</span>
                            </span>
                          ) : lead.courseDeliveredAt ? (
                            <span className="text-emerald-400 font-semibold text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تم التسليم</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">قيد المتابعة</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 py-4">
          يتم تحليل مستوى اهتمام العميل وتحديث نقاطه وذاكرته تلقائياً بواسطة الذكاء الاصطناعي أثناء محادثات واتساب
        </div>
      </main>
    </div>
  );
}
