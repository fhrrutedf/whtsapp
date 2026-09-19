'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  FileText,
  BrainCircuit,
  Save
} from 'lucide-react';

interface MemoryManagerProps {
  contactIdOrPhone: string;
  tenantId: string;
  apiUrl?: string;
  onMemoryUpdated?: () => void;
}

export function MemoryManager({ 
  contactIdOrPhone, 
  tenantId, 
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  onMemoryUpdated 
}: MemoryManagerProps) {
  const [memoryFacts, setMemoryFacts] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [newFactInput, setNewFactInput] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [showWipeConfirm, setShowWipeConfirm] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Fetch Contact Memory
  const fetchMemory = async () => {
    if (!contactIdOrPhone) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/contacts/${contactIdOrPhone}/memory`, {
        headers: { 'x-tenant-id': tenantId },
      });
      const data = await res.json();
      setMemoryFacts(Array.isArray(data.memoryFacts) ? data.memoryFacts : []);
      setNotes(data.notes || '');
      setContactName(data.name || contactIdOrPhone);
    } catch (err) {
      console.error('Error fetching contact memory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemory();
  }, [contactIdOrPhone, tenantId]);

  // Save full memory to backend
  const saveMemory = async (updatedFacts: string[], updatedNotes?: string) => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/contacts/${contactIdOrPhone}/memory`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          memoryFacts: updatedFacts,
          notes: updatedNotes !== undefined ? updatedNotes : notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMemoryFacts(data.memoryFacts || []);
        if (updatedNotes !== undefined) setNotes(data.notes || '');
        setSaveSuccessMessage('تم حفظ التعديلات بنجاح!');
        setTimeout(() => setSaveSuccessMessage(null), 2500);
        if (onMemoryUpdated) onMemoryUpdated();
      }
    } catch (err) {
      console.error('Error updating memory:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Add Fact
  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactInput.trim()) return;
    const updated = [...memoryFacts, newFactInput.trim()];
    setNewFactInput('');
    saveMemory(updated);
  };

  // Delete Fact
  const handleDeleteFact = (index: number) => {
    const updated = memoryFacts.filter((_, i) => i !== index);
    saveMemory(updated);
  };

  // Start Edit Fact
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(memoryFacts[index]);
  };

  // Save Edit Fact
  const handleSaveEdit = (index: number) => {
    if (!editingText.trim()) {
      handleDeleteFact(index);
    } else {
      const updated = [...memoryFacts];
      updated[index] = editingText.trim();
      saveMemory(updated);
    }
    setEditingIndex(null);
  };

  // Wipe All Facts
  const handleWipeAll = () => {
    saveMemory([]);
    setShowWipeConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
        <span>جاري تحميل ذاكرة العميل...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100">ذاكرة العميل الذكية</h4>
            <p className="text-[10px] text-slate-400">حقائق دائمة يستحضرها الذكاء الاصطناعي</p>
          </div>
        </div>

        {memoryFacts.length > 0 && (
          <button
            onClick={() => setShowWipeConfirm(true)}
            className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition flex items-center gap-1"
            title="مسح كل الحقائق المخزنة"
          >
            <Trash2 className="w-3 h-3" />
            <span>مسح الكل</span>
          </button>
        )}
      </div>

      {/* Wipe Confirmation Banner */}
      {showWipeConfirm && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>هل أنت متأكد من مسح جميع بيانات الذاكرة؟</span>
          </div>
          <p className="text-[11px] text-rose-300/80">
            سيتم حذف كافة الحقائق التي تذكرها الذكاء الاصطناعي عن هذا العميل ولن يتمكن من استرجاعها.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleWipeAll}
              disabled={isSaving}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition"
            >
              نعم، امسح الذاكرة
            </button>
            <button
              onClick={() => setShowWipeConfirm(false)}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] transition"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {saveSuccessMessage && (
        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Add New Fact Input */}
      <form onSubmit={handleAddFact} className="flex items-center gap-1.5">
        <input
          type="text"
          value={newFactInput}
          onChange={(e) => setNewFactInput(e.target.value)}
          placeholder="إضافة حقيقة (مثال: طلب توصيل إلى حلب، رقم الطلب #102)..."
          className="flex-1 bg-[#060911] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
        />
        <button
          type="submit"
          disabled={!newFactInput.trim() || isSaving}
          className="p-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 disabled:opacity-40 transition"
          title="إضافة"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* Facts Bullet List */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
        {memoryFacts.length === 0 ? (
          <div className="text-[11px] text-slate-500 text-center py-4 bg-white/[0.02] rounded-xl border border-dashed border-white/[0.06]">
            لا توجد حقائق محفوظة بعد. يقوم الذكاء الاصطناعي باستنتاجها تلقائياً أثناء الدردشة أو يمكنك إضافتها هنا.
          </div>
        ) : (
          memoryFacts.map((fact, idx) => {
            const isEditing = editingIndex === idx;
            return (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-2 text-xs text-slate-200 group hover:border-white/10 transition"
              >
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="flex-1 bg-[#060911] border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(idx)}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                      title="حفظ"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="p-1 text-slate-400 hover:text-slate-300"
                      title="إلغاء"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2 flex-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <span className="leading-relaxed break-words">{fact}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button
                        onClick={() => handleStartEdit(idx)}
                        className="p-1 text-slate-400 hover:text-slate-200"
                        title="تعديل الحقيقة"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteFact(idx)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="حذف الحقيقة"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Internal Notes Section */}
      <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>ملاحظات المشرفين (Internal Notes)</span>
          </div>
          <button
            onClick={() => saveMemory(memoryFacts, notes)}
            disabled={isSaving}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
          >
            <Save className="w-3 h-3" />
            <span>حفظ الملاحظات</span>
          </button>
        </div>

        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أضف ملاحظات خاصة لا يراها العميل..."
          className="w-full bg-[#060911] border border-white/[0.08] rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
        />
      </div>
    </div>
  );
}
