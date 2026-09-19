'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ImageIcon, 
  Upload, 
  Trash2, 
  Plus, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  QrCode, 
  FileText, 
  Sparkles, 
  ShoppingBag, 
  Eye, 
  X, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';

interface ProductItem {
  id: string;
  name: string;
  price?: string;
  description?: string;
  imageUrl: string;
  createdAt?: string;
}

interface MediaCatalogData {
  brochureImageUrl: string;
  paymentQrImageUrl: string;
  catalogImageUrl: string;
  products: ProductItem[];
}

export function MediaCatalogSettings() {
  const { tenantId } = useChatStore();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const [catalog, setCatalog] = useState<MediaCatalogData>({
    brochureImageUrl: '',
    paymentQrImageUrl: '',
    catalogImageUrl: '',
    products: [],
  });

  const [loading, setLoading] = useState(true);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Product Modal State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdFile, setNewProdFile] = useState<File | null>(null);
  const [newProdPreview, setNewProdPreview] = useState<string | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Fullscreen Image Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // File Inputs
  const brochureInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/settings/media`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setCatalog(data);
      }
    } catch (err: any) {
      console.error('Error fetching media catalog:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [tenantId, apiUrl]);

  const handleUploadMainAsset = async (category: 'brochure' | 'payment_qr', file: File) => {
    setUploadingCategory(category);
    setActionSuccess(null);
    setActionError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      const res = await fetch(`${apiUrl}/api/settings/media/upload`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل رفع الصورة');

      if (category === 'brochure') {
        setCatalog((prev) => ({ ...prev, brochureImageUrl: data.mediaUrl }));
        setActionSuccess('تم تحديث بروشور الباقات بنجاح! سيستخدمه الذكاء الاصطناعي فوراً.');
      } else {
        setCatalog((prev) => ({ ...prev, paymentQrImageUrl: data.mediaUrl }));
        setActionSuccess('تم تحديث باركود الدفع الفوري بنجاح!');
      }
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdFile) {
      setActionError('يرجى كتابة اسم المنتج واختيار صورة له');
      return;
    }

    setIsAddingProduct(true);
    setActionSuccess(null);
    setActionError(null);

    const formData = new FormData();
    formData.append('file', newProdFile);
    formData.append('category', 'product');
    formData.append('name', newProdName.trim());
    formData.append('price', newProdPrice.trim());
    formData.append('description', newProdDesc.trim());

    try {
      const res = await fetch(`${apiUrl}/api/settings/media/upload`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة المنتج للكتالوج');

      setShowAddProduct(false);
      setNewProdName('');
      setNewProdPrice('');
      setNewProdDesc('');
      setNewProdFile(null);
      setNewProdPreview(null);
      setActionSuccess(`تمت إضافة منتج "${newProdName}" للكتالوج الذكي بنجاح!`);
      fetchCatalog();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج من الكتالوج؟')) return;
    try {
      const res = await fetch(`${apiUrl}/api/settings/media/products/${productId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) {
        setCatalog((prev) => ({
          ...prev,
          products: prev.products.filter((p) => p.id !== productId),
        }));
        setActionSuccess('تم حذف المنتج بنجاح');
      }
    } catch (err: any) {
      setActionError('تعذر حذف المنتج');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-right" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مكتبة الوسائط الذكية • Media & Catalog</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-emerald-400" />
            مكتبة الوسائط والكتالوج المرئي
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed font-normal">
            ارفع بروشورات الباقات، باركودات الدفع، وصور منتجاتك ليرسلها الذكاء الاصطناعي والموظفون للعملاء على واتساب فورياً أثناء المحادثة.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCatalog}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition flex items-center gap-2 text-xs font-bold shrink-0 self-start sm:self-center"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>تحديث المكتبة</span>
        </button>
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

      {/* 1. Core Visual Assets Grid (Brochure & Payment QR) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: Pricing & Packages Brochure */}
        <div className="p-6 rounded-3xl bg-[#0c1322] border border-white/10 backdrop-blur-xl shadow-xl space-y-4 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">بروشور الباقات والأسعار</h3>
                <span className="text-[11px] text-emerald-400 font-medium">يُرسل عند طلب: الباقات، الأسعار، العروض</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[10px] font-bold">
              نشط في الذكاء الاصطناعي
            </span>
          </div>

          {/* Image Thumbnail with Overlay */}
          <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
            {catalog.brochureImageUrl ? (
              <img
                src={catalog.brochureImageUrl}
                alt="بروشور الباقات"
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                onClick={() => setLightboxImage(catalog.brochureImageUrl)}
              />
            ) : (
              <div className="text-center text-slate-500 text-xs">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span>لم يتم رفع بروشور حتى الآن</span>
              </div>
            )}

            {/* Quick action buttons on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto">
              {catalog.brochureImageUrl && (
                <button
                  type="button"
                  onClick={() => setLightboxImage(catalog.brochureImageUrl)}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة مكبرة</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => brochureInputRef.current?.click()}
                disabled={uploadingCategory === 'brochure'}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/25"
              >
                {uploadingCategory === 'brochure' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>تغيير الصورة</span>
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={brochureInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadMainAsset('brochure', file);
              if (e.target) e.target.value = '';
            }}
          />

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.06]">
            <span>يدعم: PNG, JPG, WebP, SVG</span>
            <span className="font-mono text-emerald-400">media_dispatcher active</span>
          </div>
        </div>

        {/* CARD 2: Payment QR & Bank Info */}
        <div className="p-6 rounded-3xl bg-[#0c1322] border border-white/10 backdrop-blur-xl shadow-xl space-y-4 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">باركود الدفع الفوري (Payment QR)</h3>
                <span className="text-[11px] text-cyan-400 font-medium">يُرسل عند طلب: باركود، تحويل، طريقة الدفع</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 text-[10px] font-bold">
              نشط في إغلاق الصفقات
            </span>
          </div>

          {/* Image Thumbnail */}
          <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
            {catalog.paymentQrImageUrl ? (
              <img
                src={catalog.paymentQrImageUrl}
                alt="باركود الدفع الفوري"
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                onClick={() => setLightboxImage(catalog.paymentQrImageUrl)}
              />
            ) : (
              <div className="text-center text-slate-500 text-xs">
                <QrCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span>لم يتم رفع باركود حتى الآن</span>
              </div>
            )}

            {/* Quick action buttons on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto">
              {catalog.paymentQrImageUrl && (
                <button
                  type="button"
                  onClick={() => setLightboxImage(catalog.paymentQrImageUrl)}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة مكبرة</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => qrInputRef.current?.click()}
                disabled={uploadingCategory === 'payment_qr'}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/25"
              >
                {uploadingCategory === 'payment_qr' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>تغيير الرمز</span>
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={qrInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadMainAsset('payment_qr', file);
              if (e.target) e.target.value = '';
            }}
          />

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.06]">
            <span>STC Pay / الراجحي / Urpay / Apple Pay</span>
            <span className="font-mono text-cyan-400">sales_closer active</span>
          </div>
        </div>

      </div>

      {/* 2. Product Catalog Showcase Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0c1322] border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              كتالوج المنتجات والخدمات المعروضة
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              صور المنتجات التي يتعرف عليها الذكاء الاصطناعي ويُرسلها للعميل عند سؤاله عنها.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddProduct(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black flex items-center gap-2 transition shadow-lg shadow-emerald-500/20 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </button>
        </div>

        {/* Product Cards Grid */}
        {catalog.products.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 text-slate-400 space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs">لم تقم بإضافة أي منتجات إلى الكتالوج حتى الآن.</p>
            <button
              type="button"
              onClick={() => setShowAddProduct(true)}
              className="text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>أضف أول منتج بالصورة والسعر</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.products.map((prod) => (
              <div
                key={prod.id}
                className="rounded-2xl bg-[#070c17] border border-white/[0.08] overflow-hidden hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative w-full h-44 bg-black/40 overflow-hidden cursor-pointer" onClick={() => setLightboxImage(prod.imageUrl)}>
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-emerald-400 text-xs font-black tabular-nums">
                      {prod.price ? `${prod.price} ر.س` : 'السعر غير محدد'}
                    </div>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <h4 className="text-xs font-bold text-white truncate">{prod.name}</h4>
                    {prod.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-white/[0.04] mt-2 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setLightboxImage(prod.imageUrl)}
                    className="text-slate-400 hover:text-emerald-400 text-[11px] flex items-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>عرض</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="text-slate-400 hover:text-rose-400 text-[11px] flex items-center gap-1 transition p-1"
                    title="حذف المنتج من الكتالوج"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Add New Product */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-[#0c1424] border border-white/10 p-6 sm:p-7 shadow-2xl space-y-4 relative text-right">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                إضافة منتج جديد للكتالوج المرئي
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProduct(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3.5">
              {/* Image Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  صورة المنتج
                </label>
                <div
                  onClick={() => productFileInputRef.current?.click()}
                  className="w-full h-36 rounded-2xl border-2 border-dashed border-white/15 hover:border-emerald-500/50 bg-[#070b14] flex flex-col items-center justify-center gap-2 cursor-pointer transition overflow-hidden relative"
                >
                  {newProdPreview ? (
                    <img src={newProdPreview} alt="معاينة" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-500" />
                      <span className="text-xs text-slate-400">اضغط لرفع صورة المنتج (JPG, PNG, WebP)</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  ref={productFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewProdFile(file);
                      setNewProdPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  اسم المنتج أو الخدمة
                </label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="مثال: ساعة أورا الذكية الإصدار الخامس"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  السعر (بالريال السعودي)
                </label>
                <input
                  type="text"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  placeholder="مثال: 299"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  وصف ومميزات المنتج للذكاء الاصطناعي
                </label>
                <textarea
                  rows={2}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="مقاومة للماء، بطارية تدوم 7 أيام، ضمان سنتين..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-sans resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isAddingProduct || !newProdFile}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 disabled:opacity-40"
                >
                  {isAddingProduct ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ في الكتالوج</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fadeIn cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-50"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="معاينة كاملة"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10 cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}
