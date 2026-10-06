import React, { useEffect, useState } from 'react';
import {
  Car,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  PlusCircle,
  FileText,
  Boxes,
  Droplet,
  Cpu,
  MessageCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { DashboardStats } from '../../types';
import { useSync } from '../../context/SyncContext';
import { useTheme } from '../../context/ThemeContext';
import { WhatsAppReadyModal, WhatsAppData } from '../common/WhatsAppReadyModal';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onQuickAction: (action: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onQuickAction }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatsAppModalData, setWhatsAppModalData] = useState<WhatsAppData | null>(null);
  const { lastEvent } = useSync();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const loadStats = () => {
    api.getDashboardStats()
      .then((res) => setStats(res.data))
      .catch((err) => console.error('Failed to load stats:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { if (lastEvent) loadStats(); }, [lastEvent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>جاري تحميل بيانات لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  const vStats = stats?.vehicles || {
    total_in_workshop: 0,
    diagnosing_count: 0,
    in_repair_count: 0,
    waiting_parts_count: 0,
    ready_count: 0,
    received_count: 0
  };

  const fStats = stats?.financials || {
    total_invoiced: 0,
    total_collected: 0,
    total_outstanding: 0,
    total_expenses: 0,
    net_collected_profit: 0
  };

  // ======= Theme-aware classes =======
  const labelCls   = isDark ? 'text-slate-400' : 'text-slate-500';
  const valueCls   = isDark ? 'text-white'     : 'text-slate-900';
  const headCls    = isDark ? 'text-white'     : 'text-slate-800';
  const btnLabelCls= isDark ? 'text-white'     : 'text-slate-700';
  const theadBg    = isDark ? 'bg-white/[0.03] text-slate-400 border-b border-white/[0.08]'
                             : 'bg-slate-50 text-slate-500 border-b border-slate-200';
  const tbodyDiv   = isDark ? 'divide-y divide-white/[0.06]' : 'divide-y divide-slate-100';
  const rowHover   = isDark ? 'hover:bg-white/[0.03]'       : 'hover:bg-slate-50';
  const cardHead   = isDark ? 'border-b border-white/[0.08]': 'border-b border-slate-100';

  const quickBtns = [
    { label: 'دخول سيارة',  color: 'sky',     Icon: PlusCircle,  action: () => onQuickAction('new_visit') },
    { label: 'السيارات',     color: 'indigo',  Icon: Car,         action: () => onNavigate('vehicles') },
    { label: 'فحص كمبيوتر', color: 'purple',  Icon: Cpu,         action: () => onNavigate('diagnostics') },
    { label: 'تغيير زيوت',  color: 'amber',   Icon: Droplet,     action: () => onNavigate('fluids') },
    { label: 'المخزون',      color: 'emerald', Icon: Boxes,       action: () => onNavigate('inventory') },
    { label: 'الفواتير',     color: 'rose',    Icon: Receipt,     action: () => onNavigate('invoices') },
  ];

  const colorMap: Record<string, string> = {
    sky:     'bg-sky-500/15 text-sky-500 border-sky-400/30',
    indigo:  'bg-indigo-500/15 text-indigo-500 border-indigo-400/30',
    purple:  'bg-purple-500/15 text-purple-500 border-purple-400/30',
    amber:   'bg-amber-500/15 text-amber-600 border-amber-400/30',
    emerald: 'bg-emerald-500/15 text-emerald-600 border-emerald-400/30',
    rose:    'bg-rose-500/15 text-rose-500 border-rose-400/30',
  };

  const handleOpenWhatsApp = async (visitId: string) => {
    try {
      const res = await api.getVisitWhatsAppReady(visitId);
      if (res?.data) {
        setWhatsAppModalData(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'فشل في استرجاع بيانات الواتساب');
    }
  };

  return (
    <div className="space-y-6">

      {/* Quick Action Buttons Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {quickBtns.map(({ label, color, Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="p-3.5 glass-card rounded-2xl flex flex-col items-center gap-2.5 text-center transition-all hover:scale-[1.02] active:scale-95 group"
          >
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm ${colorMap[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className={`text-xs font-bold ${btnLabelCls}`}>{label}</span>
          </button>
        ))}
      </div>

      {/* Workshop Car Counters */}
      <div>
        <h3 className={`text-sm font-black mb-3 flex items-center gap-2 tracking-wide ${headCls}`}>
          <Car className="w-4 h-4 text-sky-500" />
          حالة السيارات جوة الورشة
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'إجمالي السيارات',
              value: vStats.total_in_workshop,
              valCls: isDark ? 'text-white' : 'text-slate-900',
              sub: 'داخل الورشة الآن',
              subCls: 'text-sky-400',
              borderCls: 'border-sky-500/20'
            },
            {
              label: 'صيانة',
              value: Math.max(0, (vStats.in_repair_count || 0) + (vStats.diagnosing_count || 0) + (vStats.waiting_parts_count || 0) + (vStats.received_count || 0)),
              valCls: 'text-amber-400',
              sub: 'تحت الفحص والإصلاح',
              subCls: 'text-amber-400',
              borderCls: 'border-amber-500/20'
            },
            {
              label: 'جاهز للتسليم',
              value: vStats.ready_count,
              valCls: 'text-emerald-400',
              sub: 'جاهزة للعميل',
              subCls: 'text-emerald-400',
              borderCls: 'border-emerald-500/20'
            },
          ].map(({ label, value, valCls, sub, subCls, borderCls }) => (
            <div key={label} className={`glass-card p-5 rounded-2xl border ${borderCls} flex flex-col justify-between shadow-sm`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-bold ${labelCls}`}>{label}</p>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800/80' : 'bg-slate-100'} ${subCls}`}>
                  {sub}
                </span>
              </div>
              <p className={`text-3xl sm:text-4xl font-black mt-2 tracking-tight ${valCls}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Financial KPIs */}
      <div>
        <h3 className={`text-sm font-black mb-3 flex items-center gap-2 tracking-wide ${headCls}`}>
          <Receipt className="w-4 h-4 text-emerald-500" />
          المؤشرات المالية الرئيسية
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي المبيعات والفواتير',    value: fStats.total_invoiced,    valCls: isDark ? 'text-white' : 'text-slate-900',  sub: 'إجمالي الفواتير الصادرة',   subCls: labelCls },
            { label: 'المبالغ المحصلة (سندات القبض)', value: fStats.total_collected,   valCls: 'text-emerald-500',                        sub: 'السيولة النقدية والمصرفية', subCls: 'text-emerald-500' },
            { label: 'مستحقات غير محصلة (ديون عملاء)', value: fStats.total_outstanding, valCls: 'text-amber-500',                         sub: 'متبقي على فواتير الصيانة', subCls: 'text-amber-500' },
            { label: 'المصروفات العامة المسجلة',     value: fStats.total_expenses,    valCls: 'text-rose-500',                           sub: 'إيجار ورواتب وفواتير',     subCls: 'text-rose-500' },
          ].map(({ label, value, valCls, sub, subCls }) => (
            <div key={label} className="glass-card p-5 rounded-2xl">
              <p className={`text-xs font-bold ${labelCls}`}>{label}</p>
              <p className={`text-3xl font-black mt-2 tracking-tight ${valCls}`}>
                {value.toLocaleString()} <span className={`text-xs font-bold opacity-70 ${valCls}`}>ج.م</span>
              </p>
              <p className={`text-[11px] mt-2 font-medium ${subCls}`}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Visits Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className={`p-4 border-b flex items-center justify-between ${cardHead}`}>
          <h3 className={`font-black text-sm flex items-center gap-2 ${headCls}`}>
            <Clock className="w-4 h-4 text-sky-500" />
            أحدث السيارات الموجودة بالورشة
          </h3>
          <button
            onClick={() => onNavigate('visits')}
            className={`text-xs font-bold flex items-center gap-1 transition-colors ${isDark ? 'text-white hover:text-sky-300' : 'text-slate-600 hover:text-sky-600'}`}
          >
            <span>عرض كل الزيارات</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className={theadBg}>
              <tr>
                {['رقم الزيارة', 'السيارة', 'العميل', 'شكوى العميل', 'الحالة', 'وقت الدخول', 'إجراء'].map(h => (
                  <th key={h} className="py-3 px-4 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={tbodyDiv}>
              {stats?.recentVisits && stats.recentVisits.length > 0 ? (
                stats.recentVisits.map((v: any) => {
                  const statusBadges: Record<string, { label: string; color: string }> = {
                    received:      { label: 'استلام جديد',    color: isDark ? 'bg-white/10 text-white border border-white/20' : 'bg-slate-100 text-slate-700 border border-slate-300' },
                    diagnosing:    { label: 'فحص كمبيوتر',   color: 'bg-purple-500/15 text-purple-600 border border-purple-400/30' },
                    in_repair:     { label: 'قيد الإصلاح',   color: 'bg-amber-500/15 text-amber-600 border border-amber-400/30' },
                    waiting_parts: { label: 'انتظار قطع',    color: 'bg-rose-500/15 text-rose-600 border border-rose-400/30' },
                    ready:         { label: 'جاهزة للتسليم', color: 'bg-emerald-500/15 text-emerald-600 border border-emerald-400/30' },
                    delivered:     { label: 'تم التسليم',    color: 'bg-sky-500/15 text-sky-600 border border-sky-400/30' },
                  };
                  const badge = statusBadges[v.status] || { label: v.status, color: isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700' };

                  return (
                    <tr key={v.id} className={`${rowHover} transition-colors`}>
                      <td className={`py-3.5 px-4 font-mono font-black ${valueCls}`}>{v.visit_number}</td>
                      <td className={`py-3.5 px-4 font-bold ${valueCls}`}>{v.make} {v.model} ({v.plate_number})</td>
                      <td className={`py-3.5 px-4 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{v.customer_name}</td>
                      <td className={`py-3.5 px-4 max-w-xs truncate ${labelCls}`}>{v.customer_complaint}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 font-mono ${labelCls}`}>
                        {new Date(v.entry_datetime).toLocaleString('ar-SA')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {v.status === 'ready' ? (
                          <button
                            onClick={() => handleOpenWhatsApp(v.id)}
                            className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white rounded-lg text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow-sm mx-auto"
                            title="إرسال رسالة جاهزية السيارة عبر واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>واتساب 🟢</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onNavigate('visits')}
                            className="px-2 py-1 text-slate-400 hover:text-sky-400 text-xs font-semibold"
                          >
                            عرض
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className={`py-8 text-center font-medium ${labelCls}`}>
                    لا توجد سيارات نشطة بالورشة حالياً. استخدم زر "دخول سيارة" للبدء.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Ready Notification Modal */}
      <WhatsAppReadyModal
        data={whatsAppModalData}
        isOpen={!!whatsAppModalData}
        onClose={() => setWhatsAppModalData(null)}
      />
    </div>
  );
};
