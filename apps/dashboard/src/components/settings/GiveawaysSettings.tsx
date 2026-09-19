'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Gift, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  ChevronRight, 
  Calendar, 
  X, 
  Award,
  CheckCircle2,
  TrendingUp,
  Tag
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';

interface Giveaway {
  id: string;
  name: string;
  totalGifts: number;
  currentGift: number;
  description?: string;
  weekLabel?: string;
  isActive: boolean;
}

export function GiveawaysSettings() {
  const { tenantId } = useChatStore();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const resolvedTenantId = tenantId || 'demo-tenant-1';

  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Giveaway | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    totalGifts: 16,
    currentGift: 1,
    description: '',
    weekLabel: '',
    isActive: true,
  });

  const fetchGiveaways = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/giveaways`, {
        headers: { 'x-tenant-id': resolvedTenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setGiveaways(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error('Error fetching giveaways:', err.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, resolvedTenantId]);

  useEffect(() => {
    fetchGiveaways();
  }, [fetchGiveaways]);

  const openCreateModal = () => {
    setEditItem(null);
    setForm({
      name: '',
      totalGifts: 16,
      currentGift: 1,
      description: '',
      weekLabel: 'الأسبوع الحالي',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (item: Giveaway) => {
    setEditItem(item);
    setForm({
      name: item.name,
      totalGifts: item.totalGifts,
      currentGift: item.currentGift,
      description: item.description || '',
      weekLabel: item.weekLabel || '',
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setActionError('يرجى كتابة اسم المسابقة');
      return;
    }

    setIsSubmitting(true);
    setActionSuccess(null);
    setActionError(null);

    const url = editItem ? `${apiUrl}/api/giveaways/${editItem.id}` : `${apiUrl}/api/giveaways`;
    const method = editItem ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': resolvedTenantId,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setActionSuccess(editItem ? 'تم تحديث بيانات المسابقة بنجاح' : 'تم إنشاء المسابقة وإضافتها للنظام');
        setShowModal(false);
        fetchGiveaways();
      } else {
        throw new Error('فشل حفظ المسابقة');
      }
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المسابقة؟')) return;
    try {
      const res = await fetch(`${apiUrl}/api/giveaways/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': resolvedTenantId },
      });
      if (res.ok) {
        setActionSuccess('تم حذف المسابقة بنجاح');
        fetchGiveaways();
      }
    } catch (err: any) {
      setActionError(err.message || 'فشل حذف المسابقة');
    }
  };

  const handleAdvanceGift = async (item: Giveaway) => {
    const nextGift = Math.min(item.currentGift + 1, item.totalGifts);
    try {
      const res = await fetch(`${apiUrl}/api/giveaways/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': resolvedTenantId,
        },
        body: JSON.stringify({ ...item, currentGift: nextGift }),
      });
      if (res.ok) {
        setActionSuccess(`تم الانتقال للهدية رقم (${nextGift}) بنجاح! سيذكرها الذكاء الاصطناعي تلقائياً للعملاء.`);
        fetchGiveaways();
      }
    } catch (err: any) {
      setActionError(err.message || 'فشل تحديث الهدية');
    }
  };

  const pct = (item: Giveaway) => {
    if (!item.totalGifts || item.totalGifts === 0) return 0;
    return Math.min(100, Math.round((item.currentGift / item.totalGifts) * 100));
  };

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نظام الهدايا والمسابقات • Giveaway Automation</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Gift className="w-6 h-6 text-emerald-400" />
            إدارة الهدايا والمسابقات الأسبوعية
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed font-normal">
            حدد مسابقاتك الأسبوعية وعدد الهدايا (مثل 16 هدية). يتعرف الذكاء الاصطناعي تلقائياً على المسابقة النشطة ورقم الهدية الحالية ليذكرها للعملاء والفائزين أثناء المحادثات.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchGiveaways}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition flex items-center gap-2 text-xs font-bold"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مسابقة جديدة</span>
          </button>
        </div>
      </div>

      {/* Action Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3 text-emerald-300 text-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-3 text-rose-300 text-xs animate-shake">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Giveaways Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400/60" />
          <span className="text-sm">جاري تحميل المسابقات والهدايا...</span>
        </div>
      ) : giveaways.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0c1322] border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Gift className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">لا توجد مسابقات حالياً</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            أنشئ أول مسابقة أسبوعية لك وحدد عدد الهدايا ليقوم الذكاء الاصطناعي بربطها بمحادثات المبيعات وإشعار العملاء.
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 inline-flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مسابقة الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {giveaways.map((item) => {
            const progress = pct(item);
            const remaining = Math.max(0, item.totalGifts - item.currentGift);

            return (
              <div
                key={item.id}
                className={`p-6 rounded-3xl bg-[#0c1322] border transition-all duration-300 relative overflow-hidden group shadow-xl ${
                  item.isActive
                    ? 'border-emerald-500/40 hover:border-emerald-500/60 shadow-emerald-950/20'
                    : 'border-white/10 opacity-75'
                }`}
              >
                {/* Status Bar */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white tracking-tight">{item.name}</h3>
                      {item.isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>نشطة في الـ AI</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-slate-400 text-[10px] font-bold">
                          غير نشطة
                        </span>
                      )}
                    </div>
                    {item.weekLabel && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.weekLabel}</span>
                      </div>
                    )}
                    {item.description && (
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition"
                      title="تعديل المسابقة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                      title="حذف المسابقة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Big Gift Hero Display */}
                <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] mb-5 text-center relative overflow-hidden">
                  <div className="absolute top-2 left-2 text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded-lg bg-white/[0.04]">
                    إجمالي: {item.totalGifts}
                  </div>
                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-tight">
                    {item.currentGift}
                  </div>
                  <div className="text-xs font-bold text-slate-300 mt-1 flex items-center justify-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-emerald-400" />
                    <span>رقم الهدية الحالية</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    متبقي <span className="text-emerald-400 font-bold">{remaining}</span> هدية لهذا الأسبوع
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">نسبة توزيع الهدايا</span>
                    <span className="text-emerald-400 font-bold font-mono">{progress}%</span>
                  </div>
                  <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden border border-white/[0.08]">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Action Advance Button */}
                <div className="pt-1">
                  {item.currentGift < item.totalGifts ? (
                    <button
                      type="button"
                      onClick={() => handleAdvanceGift(item)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-2 group-hover:scale-[1.01]"
                    >
                      <span>الانتقال للهدية التالية ({item.currentGift + 1})</span>
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                  ) : (
                    <div className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>اكتملت جميع هدايا هذه المسابقة (16/16) 🎉</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0c1322] border border-white/15 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Gift className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {editItem ? 'تعديل بيانات المسابقة' : 'إنشاء مسابقة جديدة'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اسم المسابقة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مسابقة سبتمبر 2026 — هدايا المعلمين"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  تسمية الأسبوع أو الفترة
                </label>
                <input
                  type="text"
                  placeholder="مثال: الأسبوع الأول (16 هدية)"
                  value={form.weekLabel}
                  onChange={(e) => setForm({ ...form, weekLabel: e.target.value })}
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  وصف الهدايا (يستفيد منه الذكاء الاصطناعي أثناء الشرح)
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: وصول مجاني لحقيبة المواد التعليمية وكوبون خصم 50%"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    إجمالي عدد الهدايا
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.totalGifts}
                    onChange={(e) => setForm({ ...form, totalGifts: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    رقم الهدية الحالية
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={form.totalGifts}
                    value={form.currentGift}
                    onChange={(e) => setForm({ ...form, currentGift: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-transparent border-white/20"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">مسابقة نشطة</span>
                    <span className="text-[10px] text-slate-400">
                      عند التفعيل، سيقوم الذكاء الاصطناعي بذكر هذه المسابقة ورقم الهدية للعملاء.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : editItem ? 'حفظ التعديلات' : 'إنشاء المسابقة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
