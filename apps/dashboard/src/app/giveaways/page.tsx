"use client";
import { useEffect, useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TENANT_ID = "demo-tenant-1";

interface Giveaway {
  id: string;
  name: string;
  totalGifts: number;
  currentGift: number;
  description?: string;
  weekLabel?: string;
  isActive: boolean;
}

export default function GiveawayPage() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<Giveaway | null>(null);
  const [form, setForm] = useState({ name: "", totalGifts: 16, currentGift: 1, description: "", weekLabel: "", isActive: true });

  const fetchGiveaways = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/giveaways`, { headers: { "x-tenant-id": TENANT_ID } });
      const d = await r.json();
      setGiveaways(Array.isArray(d) ? d : []);
    } catch { setGiveaways([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGiveaways(); }, [fetchGiveaways]);

  const save = async () => {
    const url = editItem ? `${API_URL}/api/giveaways/${editItem.id}` : `${API_URL}/api/giveaways`;
    const method = editItem ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json", "x-tenant-id": TENANT_ID }, body: JSON.stringify(form) });
    setShowForm(false); setEditItem(null); setForm({ name: "", totalGifts: 16, currentGift: 1, description: "", weekLabel: "", isActive: true });
    fetchGiveaways();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("حذف هذه المسابقة؟")) return;
    await fetch(`${API_URL}/api/giveaways/${id}`, { method: "DELETE", headers: { "x-tenant-id": TENANT_ID } });
    fetchGiveaways();
  };

  const advance = async (item: Giveaway) => {
    const next = Math.min(item.currentGift + 1, item.totalGifts);
    await fetch(`${API_URL}/api/giveaways/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "x-tenant-id": TENANT_ID }, body: JSON.stringify({ ...item, currentGift: next }) });
    fetchGiveaways();
  };

  const openEdit = (item: Giveaway) => { setEditItem(item); setForm({ name: item.name, totalGifts: item.totalGifts, currentGift: item.currentGift, description: item.description || "", weekLabel: item.weekLabel || "", isActive: item.isActive }); setShowForm(true); };

  const pct = (item: Giveaway) => Math.round((item.currentGift / item.totalGifts) * 100);

  return (
    <div style={{ padding: "24px 32px", fontFamily: "Cairo,Tajawal,sans-serif", direction: "rtl", minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0 }}>🎁 إدارة الهدايا والمسابقات</h1>
          <p style={{ color: "#64748b", marginTop: 4, fontSize: 14 }}>تتبع مسابقاتك الأسبوعية وهداياك — الـ AI يعرف دائماً رقم الهدية الحالية</p>
        </div>
        <button onClick={() => { setEditItem(null); setForm({ name: "", totalGifts: 16, currentGift: 1, description: "", weekLabel: "", isActive: true }); setShowForm(true); }}
          style={{ padding: "10px 22px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>
          + مسابقة جديدة
        </button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: 480, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>{editItem ? "تعديل المسابقة" : "إنشاء مسابقة جديدة"}</h2>
            {(
              [
                { label: "اسم المسابقة *", key: "name", type: "text", placeholder: "مثال: مسابقة سبتمبر 2026" },
                { label: "وصف الهدايا", key: "description", type: "text", placeholder: "مثال: هدايا تعليمية للمعلمين" },
                { label: "تسمية الأسبوع", key: "weekLabel", type: "text", placeholder: "مثال: الأسبوع الأول" },
              ] as const
            ).map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{f.label}</label>
                <input value={String(form[f.key])} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>إجمالي الهدايا</label>
                <input type="number" min={1} value={form.totalGifts} onChange={e => setForm(p => ({ ...p, totalGifts: +e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>الهدية الحالية (رقم)</label>
                <input type="number" min={1} max={form.totalGifts} value={form.currentGift} onChange={e => setForm(p => ({ ...p, currentGift: +e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} /> مسابقة نشطة (الـ AI سيشير إليها)
              </label>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={save} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>💾 حفظ</button>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0", cursor: "pointer", background: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>⏳ تحميل...</div>
      ) : giveaways.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "#94a3b8", background: "#fff", borderRadius: 20, border: "2px dashed #e2e8f0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>لا توجد مسابقات بعد</div>
          <div style={{ fontSize: 14 }}>أنشئ مسابقتك الأولى بالضغط على زر "مسابقة جديدة"</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 20 }}>
          {giveaways.map(item => (
            <div key={item.id} style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: item.isActive ? "2px solid #6366f1" : "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{item.name}</div>
                  {item.weekLabel && <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, marginTop: 2 }}>📅 {item.weekLabel}</div>}
                  {item.description && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{item.description}</div>}
                </div>
                {item.isActive && <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid #bbf7d0" }}>● نشطة</span>}
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>التقدم</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>الهدية {item.currentGift} من {item.totalGifts}</span>
                </div>
                <div style={{ height: 10, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${pct(item)}%`, height: "100%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 999, transition: "width 0.3s" }} />
                </div>
                <div style={{ textAlign: "center", marginTop: 4, fontSize: 12, color: "#94a3b8" }}>{pct(item)}% مكتمل</div>
              </div>

              {/* Big Gift Number */}
              <div style={{ textAlign: "center", padding: "16px", background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", borderRadius: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: "#6366f1" }}>{item.currentGift}</div>
                <div style={{ fontSize: 13, color: "#7c3aed", fontWeight: 600 }}>الهدية الحالية 🎁</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>متبقي: {item.totalGifts - item.currentGift} هدية</div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {item.currentGift < item.totalGifts && (
                  <button onClick={() => advance(item)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", background: "#f0fdf4", color: "#16a34a", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                    ➡️ الهدية التالية
                  </button>
                )}
                <button onClick={() => openEdit(item)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #e2e8f0", cursor: "pointer", background: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>✏️ تعديل</button>
                <button onClick={() => deleteItem(item.id)} style={{ padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "#fef2f2", color: "#ef4444", fontSize: 13, fontFamily: "inherit" }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
