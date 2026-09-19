'use client';

import React from 'react';
import { X, FileText, Check } from 'lucide-react';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateName: string, text: string) => void;
  contactName: string;
}

const PRE_APPROVED_TEMPLATES = [
  {
    name: 'support_ticket_update_ar',
    category: 'UTILITY',
    language: 'ar',
    title: 'متابعة تذكرة الدعم الفني',
    preview: 'مرحباً {{1}}، نود إعلامك بأنه تم تحديث حالة طلبك رقم #{{2}}. هل لا زلت بحاجة للمساعدة؟',
    render: (name: string) => `مرحباً ${name}، نود إعلامك بأنه تم تحديث حالة طلبك رقم #1092. هل لا زلت بحاجة للمساعدة؟`,
  },
  {
    name: 'order_status_followup',
    category: 'UTILITY',
    language: 'ar',
    title: 'تحديث الشحن والتوصيل',
    preview: 'أهلاً بك {{1}}، طلبك قيد التوصيل الآن مع المندوب. يرجى تأكيد استلامك.',
    render: (name: string) => `أهلاً بك ${name}، طلبك قيد التوصيل الآن مع المندوب. يرجى تأكيد استلامك.`,
  },
  {
    name: 'appointment_reminder',
    category: 'UTILITY',
    language: 'en',
    title: 'Appointment Follow-up',
    preview: 'Hi {{1}}, this is a follow-up regarding your upcoming appointment. Please let us know if you need to reschedule.',
    render: (name: string) => `Hi ${name}, this is a follow-up regarding your upcoming appointment. Please let us know if you need to reschedule.`,
  },
];

export function TemplateModal({ isOpen, onClose, onSelectTemplate, contactName }: TemplateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">قوالب واتساب المعتمدة (Meta Templates)</h3>
            <p className="text-xs text-slate-400">اختر قالباً معتمداً لإعادة فتح نافذة الـ 24 ساعة للعميل بأمان</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
          {PRE_APPROVED_TEMPLATES.map((tpl) => {
            const formattedBody = tpl.render(contactName.split(' ')[0] || 'العميل');
            return (
              <div
                key={tpl.name}
                onClick={() => {
                  onSelectTemplate(tpl.name, formattedBody);
                  onClose();
                }}
                className="group p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 bg-slate-950/50 hover:bg-slate-800/40 cursor-pointer transition flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-400 group-hover:underline">
                    {tpl.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                      {tpl.language}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans" dir="auto">
                  {formattedBody}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
