import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, MessageCircle, Phone, Car, User, FileText, Send } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface WhatsAppData {
  phone: string;
  cleanPhone: string;
  customerName: string;
  vehicleName: string;
  plateNumber: string;
  visitNumber: string;
  balanceDue?: number;
  message: string;
  whatsappUrl: string;
}

interface WhatsAppReadyModalProps {
  data: WhatsAppData | null;
  onClose: () => void;
  isOpen: boolean;
}

export const WhatsAppReadyModal: React.FC<WhatsAppReadyModalProps> = ({
  data,
  onClose,
  isOpen
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [editablePhone, setEditablePhone] = useState('');
  const [editableMessage, setEditableMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (data) {
      setEditablePhone(data.phone || '');
      setEditableMessage(data.message || '');
      setCopied(false);
    }
  }, [data]);

  if (!isOpen || !data) return null;

  // Normalize phone for WhatsApp URL
  const getCleanPhone = (p: string) => {
    let cleaned = p.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
    if (cleaned.startsWith('01') && cleaned.length === 11) {
      cleaned = '20' + cleaned.substring(1);
    } else if ((cleaned.startsWith('10') || cleaned.startsWith('11') || cleaned.startsWith('12') || cleaned.startsWith('15')) && cleaned.length === 10) {
      cleaned = '20' + cleaned;
    } else if (cleaned.startsWith('05') && cleaned.length === 10) {
      cleaned = '966' + cleaned.substring(1);
    } else if (cleaned.startsWith('5') && cleaned.length === 9) {
      cleaned = '966' + cleaned;
    }
    return cleaned;
  };

  const handleSendWhatsApp = () => {
    const clean = getCleanPhone(editablePhone);
    const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(editableMessage)}`;
    window.open(url, '_blank');
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(editableMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('فشل نسخ الرسالة تلقائياً، يمكنك تحديدها ونسخها يدوياً.');
    }
  };

  const modalBg = isDark ? 'bg-[#0b1329] border-white/10' : 'bg-white border-slate-200';
  const cardBg = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200';
  const inputBg = isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${modalBg}`}>
        
        {/* Header with WhatsApp Brand Colors */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <MessageCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  WhatsApp إشعار فوري
                </span>
                <span className="text-[11px] font-bold bg-emerald-700/60 px-2 py-0.5 rounded-full">
                  جاهزة للتسليم
                </span>
              </div>
              <h3 className="font-black text-base sm:text-lg mt-0.5">إرسال رسالة جاهزية السيارة للعميل</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          
          {/* Vehicle & Customer Summary */}
          <div className={`p-3.5 rounded-2xl border ${cardBg} grid grid-cols-2 gap-3`}>
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 mb-0.5 text-[11px]">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>العميل:</span>
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-100">{data.customerName}</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-slate-400 mb-0.5 text-[11px]">
                <Car className="w-3.5 h-3.5 text-amber-400" />
                <span>السيارة واللوحة:</span>
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-100">{data.vehicleName} ({data.plateNumber})</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-slate-400 mb-0.5 text-[11px]">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>رقم الزيارة:</span>
              </div>
              <p className="font-mono font-bold text-sky-500">{data.visitNumber}</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-slate-400 mb-0.5 text-[11px]">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>رقم الواتساب:</span>
              </div>
              <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
                {editablePhone || 'لا يوجد رقم مسجل'}
              </p>
            </div>
          </div>

          {/* Edit Phone Number Field if needed */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              رقم هاتف العميل (لإرسال الواتساب):
            </label>
            <div className="relative">
              <input
                type="text"
                value={editablePhone}
                onChange={(e) => setEditablePhone(e.target.value)}
                placeholder="مثال: 01012345678"
                className={`w-full font-mono text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-emerald-500 ${inputBg}`}
                dir="ltr"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">
                📱
              </span>
            </div>
          </div>

          {/* Message Editor / Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-400">
                نص رسالة الواتساب (جاهزة وقابلة للتعديل):
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex items-center gap-1 text-[11px] font-bold text-sky-500 hover:text-sky-600 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ النص'}</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={editableMessage}
              onChange={(e) => setEditableMessage(e.target.value)}
              className={`w-full text-xs sm:text-sm p-3.5 rounded-2xl border leading-relaxed font-sans focus:outline-none focus:border-emerald-500 transition-colors resize-none ${inputBg}`}
            />
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className={`p-4 border-t ${cardBg} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                copied
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-white/10'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ' : 'نسخ الرسالة'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!editablePhone.trim()}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>إرسال عبر واتساب الآن 🟢</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
