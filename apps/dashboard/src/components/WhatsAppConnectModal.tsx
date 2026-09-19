'use client';

import React, { useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { 
  QrCode, 
  Phone, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  AlertCircle,
  Smartphone,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export function WhatsAppConnectModal() {
  const {
    isWhatsAppModalOpen,
    setWhatsAppModalOpen,
    qrCodeDataUrl,
    isWhatsAppConnected,
    connectedPhone,
    isConnectingWhatsApp,
    connectionError,
    connectWhatsApp,
    disconnectWhatsApp,
    fetchWhatsAppStatus,
  } = useChatStore();

  useEffect(() => {
    if (isWhatsAppModalOpen) {
      fetchWhatsAppStatus();
    }
  }, [isWhatsAppModalOpen, fetchWhatsAppStatus]);

  if (!isWhatsAppModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060911]/80 backdrop-blur-xl animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-[#0b101c] border border-white/10 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Smartphone className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                ربط حساب WhatsApp
                {isWhatsAppConnected && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    متصل ونشط
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                اتصال مباشر وفوري عبر Baileys بدون الحاجة لـ Meta Cloud API
              </p>
            </div>
          </div>
          <button
            onClick={() => setWhatsAppModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Error Alert */}
          {connectionError && (
            <div className="w-full mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{connectionError}</span>
            </div>
          )}

          {/* STATE 1: Already Connected */}
          {isWhatsAppConnected ? (
            <div className="w-full flex flex-col items-center text-center py-4">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-emerald-950 ring-4 ring-[#0b101c]">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-100 mb-1">
                WhatsApp متصل وجاهز للعمل!
              </h3>
              <p className="text-xs text-slate-400 mb-4 max-w-sm leading-relaxed">
                يتم استقبال وإرسال جميع الرسائل والردود الذكية لحظياً عبر محرك المنصة.
              </p>

              {connectedPhone && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-emerald-300 text-sm font-mono mb-6">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span dir="ltr">+{connectedPhone}</span>
                </div>
              )}

              <div className="flex items-center gap-3 w-full max-w-xs">
                <button
                  onClick={disconnectWhatsApp}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
                >
                  قطع الاتصال
                </button>
                <button
                  onClick={() => setWhatsAppModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold transition"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          ) : qrCodeDataUrl ? (
            /* STATE 2: QR Code Ready for Scanning */
            <div className="w-full flex flex-col items-center text-center">
              <div className="relative p-4 bg-white rounded-3xl shadow-2xl shadow-black/50 border border-slate-200 mb-5">
                <img
                  src={qrCodeDataUrl}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>

              {/* Instructions */}
              <div className="w-full text-right bg-white/[0.03] rounded-2xl p-4 border border-white/[0.07] mb-5 text-xs text-slate-300 space-y-2.5">
                <p className="font-bold text-emerald-400 text-xs flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>خطوات المسح السريع:</span>
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-lg bg-white/[0.08] text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>افتح تطبيق <strong>WhatsApp</strong> على هاتفك المحمول.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-lg bg-white/[0.08] text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span>انتقل إلى <strong>الإعدادات</strong> &gt; <strong>الأجهزة المرتبطة (Linked Devices)</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-lg bg-white/[0.08] text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <span>اضغط <strong>ربط جهاز (Link a Device)</strong> ووجّه الكاميرا نحو الرمز أعلاه.</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={connectWhatsApp}
                  disabled={isConnectingWhatsApp}
                  className="flex items-center gap-2 py-2.5 px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isConnectingWhatsApp ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>تحديث رمز الـ QR</span>
                </button>
              </div>
            </div>
          ) : (
            /* STATE 3: Not Connected & Initial State */
            <div className="w-full flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-950/40">
                <QrCode className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">
                توليد رمز الاستجابة السريعة (QR Code)
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                اضغط على الزر أدناه لبدء جلسة جديدة والحصول على رمز QR لمسحه بهاتفك من تطبيق واتساب لربط الرقم بالمنصة.
              </p>

              <button
                onClick={connectWhatsApp}
                disabled={isConnectingWhatsApp}
                className="flex items-center justify-center gap-2 w-full max-w-xs py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 transition disabled:opacity-50"
              >
                {isConnectingWhatsApp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ توليد الرمز...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>توليد رمز QR والاتصال الآن</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.07] bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>تشفير تام ومعزول طرف-إلى-طرف</span>
          </span>
          <span className="text-slate-500">OmniDesk Engine v2.0</span>
        </div>
      </div>
    </div>
  );
}
