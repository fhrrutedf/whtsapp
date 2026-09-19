'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../store/useChatStore';
import {
  BookOpen,
  Globe,
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  Check,
  AlertCircle,
  Sparkles,
  UploadCloud,
  FileCode,
} from 'lucide-react';

interface KnowledgeItem {
  id: string;
  tenantId: string;
  title: string;
  type: 'text' | 'url' | 'file';
  content: string;
  source?: string;
  charCount: number;
  createdAt: string;
}

export function KnowledgeSettings() {
  const { tenantId } = useChatStore();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'text'>('url');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Input states
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');

  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileTitle, setFileTitle] = useState('');

  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadKnowledge = async () => {
    setKnowledgeLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/knowledge`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setKnowledgeItems(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error('Failed loading knowledge:', err.message);
    } finally {
      setKnowledgeLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, [tenantId, apiUrl]);

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setActionError('يرجى إدخال رابط الموقع المراد جلب بياناته');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/api/knowledge/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          url: urlInput.trim(),
          title: urlTitle.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل جلب محتوى الرابط');

      setUrlInput('');
      setUrlTitle('');
      setActionSuccess('تم جلب محتوى الموقع وفهرسته في قاعدة المعرفة بنجاح!');
      setTimeout(() => setActionSuccess(null), 3500);
      loadKnowledge();
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء فحص الرابط');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!fileTitle) {
      setFileTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setFileContent(result);
      }
    };
    reader.readAsText(file);
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileContent.trim()) {
      setActionError('يرجى اختيار ملف صالح يحتوي على نصوص ومعلومات');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/api/knowledge/file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          title: fileTitle.trim() || fileName,
          fileName,
          content: fileContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت إضافة الملف');

      setFileName('');
      setFileTitle('');
      setFileContent('');
      setActionSuccess('تم رفع وفهرسة المستند في قاعدة المعرفة بنجاح!');
      setTimeout(() => setActionSuccess(null), 3500);
      loadKnowledge();
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customContent.trim()) {
      setActionError('يرجى إدخال كل من العنوان والمحتوى التفصيلي');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/api/knowledge/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          title: customTitle.trim(),
          content: customContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت إضافة النص');

      setCustomTitle('');
      setCustomContent('');
      setActionSuccess('تم حفظ النص بنجاح في قاعدة المعرفة!');
      setTimeout(() => setActionSuccess(null), 3500);
      loadKnowledge();
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء حفظ النص');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصدر من قاعدة المعرفة نهائياً؟')) return;
    try {
      const res = await fetch(`${apiUrl}/api/knowledge/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) {
        setKnowledgeItems((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err: any) {
      console.error('Failed deleting item:', err.message);
    }
  };

  const totalChars = knowledgeItems.reduce((acc, curr) => acc + (curr.charCount || 0), 0);

  const filteredItems = knowledgeItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.source && item.source.toLowerCase().includes(q)) ||
      item.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            قاعدة المعرفة ومصادر التدريب (RAG Knowledge Base)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            زوّد الذكاء الاصطناعي بمعلومات كتالوج المنتجات، الأسعار، السياسات والروابط للرد بدقة 100%.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">المصادر النشطة:</span>
            <span className="font-bold text-slate-200 tabular-nums">{knowledgeItems.length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2">
            <span className="text-slate-400">إجمالي الحروف:</span>
            <span className="font-bold text-emerald-300 tabular-nums">{totalChars.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Import / Ingestion Studio Card */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              إضافة مصدر معرفة جديد
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              اختر الطريقة المناسبة لتغذية النظام بالمعلومات (موقع إلكتروني، ملفات، أو نصوص حرة).
            </p>
          </div>

          {/* Ingestion Tabs */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'url'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>زاحف الويب (URL)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'file'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>رفع ملفات (CSV/MD/TXT)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'text'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>نص يدوي مباشر</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Web Crawler (URL) */}
        {activeTab === 'url' && (
          <form onSubmit={handleAddUrl} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  رابط الموقع أو صفحة الويب (URL):
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-500 absolute top-3 left-3.5" />
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/products-or-faq"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان أو تصنيف اختياري:
                </label>
                <input
                  type="text"
                  placeholder="مثال: الأسعار والباقات 2026"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>يقوم النظام باستخراج النصوص النظيفة، العناوين، والبيانات وتضمينها آلياً.</span>
              </div>
              <button
                type="submit"
                disabled={actionLoading || !urlInput.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md shadow-blue-950"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الزحف واستخراج المحتوى...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>سحب وفهرسة المحتوى</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Upload Files */}
        {activeTab === 'file' && (
          <form onSubmit={handleAddFile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اختر الملف (TXT, MD, CSV, JSON):
                </label>
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.csv,.json"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-300 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-emerald-500/30 file:text-xs file:font-bold file:bg-emerald-500/15 file:text-emerald-300 hover:file:bg-emerald-500/25 cursor-pointer bg-slate-950 border border-slate-800 rounded-xl p-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان المستند:
                </label>
                <input
                  type="text"
                  placeholder="اسم الملف أو الموضوع المعرفي"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {fileContent && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono max-h-28 overflow-y-auto">
                <span className="text-emerald-400 font-sans block mb-1">
                  معاينة محتوى الملف ({fileContent.length.toLocaleString()} حرف):
                </span>
                {fileContent.slice(0, 300)}...
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={actionLoading || !fileContent.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md shadow-emerald-950"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري فهرسة المستند...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>تأكيد الإضافة لقاعدة المعرفة</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Direct Text */}
        {activeTab === 'text' && (
          <form onSubmit={handleAddText} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                عنوان المستند / الموضوع:
              </label>
              <input
                type="text"
                placeholder="مثال: سياسة الشحن والإرجاع، مواعيد الدوام الرسمي..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                المحتوى المعرفي التفصيلي:
              </label>
              <textarea
                rows={5}
                placeholder="اكتب المعلومات، الأسئلة الشائعة، التعليمات والأسعار هنا بصيغة واضحة ومفصلة..."
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 leading-relaxed focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={actionLoading || !customTitle.trim() || !customContent.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md shadow-cyan-950"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة إلى قاعدة المعرفة</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Active Knowledge Repository Table / Cards */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              المصادر المفهرسة في قاعدة المعرفة
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              تصفح، ابحث، عاين أو احذف المصادر التي يستند إليها نموذج الذكاء الاصطناعي أثناء الإجابة.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute top-2.5 right-3" />
              <input
                type="text"
                placeholder="بحث في المصادر..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={loadKnowledge}
              disabled={knowledgeLoading}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${knowledgeLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* List of items */}
        {knowledgeLoading && knowledgeItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
            <p>جاري تحميل مصادر المعرفة...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <p>
              {searchQuery.trim()
                ? 'لم يتم العثور على مصادر تطابق كلمة البحث.'
                : 'قاعدة المعرفة فارغة حالياً. قم بإضافة رابط أو ملف للبدء.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredItems.map((item) => {
              const isExpanded = expandedItemId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition overflow-hidden"
                >
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          item.type === 'url'
                            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/25'
                            : item.type === 'file'
                            ? 'bg-amber-600/15 text-amber-400 border border-amber-500/25'
                            : 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/25'
                        }`}
                      >
                        {item.type === 'url' ? (
                          <Globe className="w-4 h-4" />
                        ) : item.type === 'file' ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <FileCode className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-200 truncate">
                            {item.title}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono tabular-nums">
                            {item.charCount ? `${item.charCount.toLocaleString()} حرف` : ''}
                          </span>
                        </div>
                        {item.source && (
                          <p
                            className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1 font-mono"
                            dir="ltr"
                          >
                            {item.source}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1 transition"
                      >
                        <span>{isExpanded ? 'إخفاء' : 'معاينة'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 border border-rose-800/40 transition"
                        title="حذف من قاعدة المعرفة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content Preview */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-900 bg-slate-950/90 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-sans whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {item.content}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
