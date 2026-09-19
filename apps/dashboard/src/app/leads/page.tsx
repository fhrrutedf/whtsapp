"use client";

import { useEffect, useState, useCallback } from "react";

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

const INTEREST_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  HOT:          { label: "مهتم جداً 🔥",   color: "#ef4444", bg: "#fef2f2" },
  WARM:         { label: "مهتم ✨",          color: "#f59e0b", bg: "#fffbeb" },
  COLD:         { label: "بارد ❄️",          color: "#3b82f6", bg: "#eff6ff" },
  PAID:         { label: "دفع 💳",           color: "#10b981", bg: "#f0fdf4" },
  UNINTERESTED: { label: "غير مهتم ❌",      color: "#6b7280", bg: "#f9fafb" },
  UNKNOWN:      { label: "جديد 🆕",          color: "#8b5cf6", bg: "#f5f3ff" },
};

const COUNTRY_FLAGS: Record<string, string> = {
  SY:"🇸🇾",SA:"🇸🇦",AE:"🇦🇪",JO:"🇯🇴",LB:"🇱🇧",IQ:"🇮🇶",KW:"🇰🇼",QA:"🇶🇦",
  BH:"🇧🇭",OM:"🇴🇲",YE:"🇾🇪",EG:"🇪🇬",MA:"🇲🇦",TN:"🇹🇳",DZ:"🇩🇿",SD:"🇸🇩",
  LY:"🇱🇾",PS:"🇵🇸",US:"🇺🇸",GB:"🇬🇧",DE:"🇩🇪",FR:"🇫🇷",SE:"🇸🇪",NL:"🇳🇱",
  NO:"🇳🇴",DK:"🇩🇰",TR:"🇹🇷",RU:"🇷🇺",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-SY", { year:"numeric", month:"short", day:"numeric" });
}

function ScoreBadge({ score }: { score?: number }) {
  const s = score ?? 0;
  const color = s >= 70 ? "#ef4444" : s >= 40 ? "#f59e0b" : "#6b7280";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ width:60, height:6, background:"#e5e7eb", borderRadius:999, overflow:"hidden" }}>
        <div style={{ width:`${s}%`, height:"100%", background:color, borderRadius:999 }} />
      </div>
      <span style={{ fontSize:12, color, fontWeight:600 }}>{s}</span>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [stats, setStats] = useState({ total:0, hot:0, paid:0, warm:0 });

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
    } catch { setLeads([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

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
    lead.name && lead.name !== lead.phoneNumber ? lead.name
    : lead.whatsappPushName || lead.phoneNumber || "—";

  return (
    <div style={{ padding:"24px 32px", fontFamily:"Cairo,Tajawal,sans-serif", direction:"rtl", minHeight:"100vh", background:"#f8fafc" }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:"#0f172a", margin:0 }}>📊 إدارة العملاء المحتملين — CRM</h1>
        <p style={{ color:"#64748b", marginTop:4, fontSize:14 }}>تتبع كامل لكل عميل — مستوى الاهتمام، الدولة، وحالة الدفع</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        {[
          { label:"إجمالي العملاء", value:stats.total, icon:"👥", color:"#6366f1" },
          { label:"مهتمون جداً", value:stats.hot, icon:"🔥", color:"#ef4444" },
          { label:"دفعوا", value:stats.paid, icon:"💳", color:"#10b981" },
          { label:"مهتمون", value:stats.warm, icon:"✨", color:"#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 1px 3px rgba(0,0,0,0.08)", border:"1px solid #e2e8f0" }}>
            <div style={{ fontSize:28 }}>{s.icon}</div>
            <div style={{ fontSize:32, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:13, color:"#64748b" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <input placeholder="🔍 بحث بالاسم أو الرقم أو الدولة..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex:1, minWidth:240, padding:"10px 16px", borderRadius:10, border:"1px solid #e2e8f0", fontSize:14, outline:"none", background:"#fff", fontFamily:"inherit" }} />
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["ALL","HOT","WARM","COLD","PAID","UNINTERESTED","UNKNOWN"].map((level) => (
            <button key={level} onClick={() => setFilterLevel(level)} style={{
              padding:"8px 16px", borderRadius:20, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit",
              background: filterLevel===level ? (INTEREST_CONFIG[level]?.bg||"#f1f5f9") : "#fff",
              color: filterLevel===level ? (INTEREST_CONFIG[level]?.color||"#334155") : "#64748b",
              boxShadow: filterLevel===level ? "0 0 0 2px "+(INTEREST_CONFIG[level]?.color||"#6366f1") : "0 1px 2px rgba(0,0,0,0.06)",
            }}>
              {level==="ALL" ? `الكل (${leads.length})` : INTEREST_CONFIG[level]?.label||level}
            </button>
          ))}
        </div>
        <button onClick={fetchLeads} style={{ padding:"8px 18px", borderRadius:10, border:"none", cursor:"pointer", background:"#6366f1", color:"#fff", fontSize:13, fontWeight:600, fontFamily:"inherit" }}>↻ تحديث</button>
      </div>

      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 3px rgba(0,0,0,0.08)", border:"1px solid #e2e8f0", overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:60, textAlign:"center", color:"#94a3b8", fontSize:16 }}>⏳ جاري تحميل البيانات...</div>
        ) : filtered.length===0 ? (
          <div style={{ padding:60, textAlign:"center", color:"#94a3b8", fontSize:16 }}>لا يوجد عملاء مطابقين</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                  {["الاسم","رقم الهاتف","الدولة","مستوى الاهتمام","النقاط","ملاحظة الذكاء","تاريخ التواصل","الدفع","الحالة"].map((h) => (
                    <th key={h} style={{ padding:"14px 16px", textAlign:"right", fontSize:13, fontWeight:700, color:"#475569", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const cfg = INTEREST_CONFIG[lead.interestLevel||"UNKNOWN"];
                  const flag = lead.countryCode ? (COUNTRY_FLAGS[lead.countryCode]||"🌍") : "🌍";
                  return (
                    <tr key={lead.id} style={{ borderBottom:"1px solid #f1f5f9", background: i%2===0?"#fff":"#fafafa" }}
                      onMouseEnter={(e)=>(e.currentTarget.style.background="#f0f9ff")}
                      onMouseLeave={(e)=>(e.currentTarget.style.background=i%2===0?"#fff":"#fafafa")}>
                      <td style={{ padding:"14px 16px", whiteSpace:"nowrap" }}>
                        <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{displayName(lead)}</div>
                        {lead.whatsappPushName && lead.name && lead.name!==lead.phoneNumber && (
                          <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>واتساب: {lead.whatsappPushName}</div>
                        )}
                      </td>
                      <td style={{ padding:"14px 16px" }}>
                        <span style={{ fontFamily:"monospace", fontSize:13, color:"#334155", direction:"ltr", display:"inline-block" }}>{lead.phoneNumber||"—"}</span>
                      </td>
                      <td style={{ padding:"14px 16px", whiteSpace:"nowrap" }}>
                        <span style={{ fontSize:20 }}>{flag}</span>{" "}
                        <span style={{ fontSize:13, color:"#475569" }}>{lead.countryName||"—"}</span>
                      </td>
                      <td style={{ padding:"14px 16px" }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700, background:cfg?.bg||"#f1f5f9", color:cfg?.color||"#64748b" }}>
                          {cfg?.label||lead.interestLevel}
                        </span>
                      </td>
                      <td style={{ padding:"14px 16px" }}><ScoreBadge score={lead.interestScore} /></td>
                      <td style={{ padding:"14px 16px", maxWidth:200 }}>
                        <div style={{ fontSize:12, color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.interestNotes||"—"}</div>
                        {lead.memoryFacts && lead.memoryFacts.length > 0 && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>🧠 {lead.memoryFacts.length} ذكريات</div>}
                      </td>
                      <td style={{ padding:"14px 16px", whiteSpace:"nowrap" }}>
                        <div style={{ fontSize:13, color:"#475569" }}>{formatDate(lead.lastSeenAt||lead.firstContactAt)}</div>
                      </td>
                      <td style={{ padding:"14px 16px", whiteSpace:"nowrap" }}>
                        {lead.paidAt ? <span style={{ color:"#10b981", fontWeight:700, fontSize:13 }}>✅ {formatDate(lead.paidAt)}</span>
                          : <span style={{ color:"#cbd5e1", fontSize:13 }}>—</span>}
                      </td>
                      <td style={{ padding:"14px 16px" }}>
                        {lead.isOptedOut ? <span style={{ color:"#ef4444", fontSize:12, fontWeight:600 }}>⛔ أوقف</span>
                          : lead.courseDeliveredAt ? <span style={{ color:"#10b981", fontSize:12, fontWeight:600 }}>✅ استلم الكورس</span>
                          : <span style={{ color:"#94a3b8", fontSize:12 }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop:16, fontSize:12, color:"#94a3b8", textAlign:"center" }}>
        يتم تحديث مستوى الاهتمام تلقائياً بعد كل محادثة
      </div>
    </div>
  );
}
