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
  MessageCircle,
  Package,
  Printer,
  X
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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'maintenance' | 'ready'>('all');
  const [selectedCarForDetails, setSelectedCarForDetails] = useState<any | null>(null);
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
    received_count: 0,
    maintenance_count: 0
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

  // All visits from stats
  const allVisits = stats?.recentVisits || [];

  // Accurate maintenance count dynamically calculated from all active workshop visits (not ready, delivered, or cancelled)
  const inMaintenanceCount = allVisits.length > 0
    ? allVisits.filter((v: any) => v.status !== 'ready' && v.status !== 'delivered' && v.status !== 'cancelled').length
    : (vStats.maintenance_count || Math.max(0, (vStats.total_in_workshop || 0) - (vStats.ready_count || 0)));

  // Full Arabic status badge translator
  const getArabicStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase().trim();
    if (s === 'engine_overhaul' || s === 'overhaul' || s.includes('عمرة') || s.includes('توضيب')) {
      return { label: 'عمرة وتوضيب محرك', color: 'bg-rose-500/15 text-rose-400 border border-rose-500/40' };
    }
    if (s === 'maintenance' || s.includes('دورية') || s.includes('maint')) {
      return { label: 'صيانة دورية وسريعة', color: 'bg-amber-500/15 text-amber-400 border border-amber-400/40' };
    }
    if (s === 'repairs' || s === 'in_repair' || s === 'repair' || s.includes('إصلاح') || s.includes('تصليح')) {
      return { label: 'إصلاحات عامة وميكانيكا', color: 'bg-amber-500/15 text-amber-400 border border-amber-400/40' };
    }
    if (s === 'diagnostics' || s === 'diagnosing' || s.includes('فحص') || s.includes('كمبيوتر')) {
      return { label: 'فحص كمبيوتر وأعطال', color: 'bg-purple-500/15 text-purple-400 border border-purple-400/40' };
    }
    if (s === 'waiting_parts' || s.includes('قطع')) {
      return { label: 'انتظار قطع غيار', color: 'bg-orange-500/15 text-orange-400 border border-orange-400/40' };
    }
    if (s === 'received' || s.includes('استلام')) {
      return { label: 'استلام وفحص أولي', color: 'bg-slate-500/15 text-slate-300 border border-slate-500/40' };
    }
    if (s === 'ready' || s.includes('جاهز')) {
      return { label: 'جاهزة للتسليم ✓', color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-400/40' };
    }
    if (s === 'delivered' || s.includes('تسليم')) {
      return { label: 'تم التسليم للعميل', color: 'bg-teal-500/15 text-teal-300 border border-teal-500/40' };
    }
    if (s === 'cancelled' || s.includes('ملغ')) {
      return { label: 'ملغية', color: 'bg-red-500/15 text-red-400 border border-red-500/40' };
    }
    return { label: status || 'تحت العمل بالورشة', color: 'bg-slate-800 text-slate-300 border border-slate-700' };
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

      {/* Workshop Car Counters - Interactive 3 Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-black flex items-center gap-2 tracking-wide ${headCls}`}>
            <Car className="w-4 h-4 text-sky-500" />
            <span>حالة السيارات جوة الورشة</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            (اضغط على أي كارت لعرض وتصفية السيارات فوراً في الجدول بالأسفل 👇)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              id: 'all' as const,
              label: 'إجمالي السيارات',
              value: vStats.total_in_workshop,
              valCls: isDark ? 'text-white' : 'text-slate-900',
              sub: selectedStatusFilter === 'all' ? 'معروضة بالجدول أدناه ✓' : 'اضغط لعرض كل السيارات 👈',
              subCls: 'text-sky-400',
              activeCls: 'ring-2 ring-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10 border-sky-400/60',
              borderCls: 'border-sky-500/20 hover:border-sky-400/50'
            },
            {
              id: 'maintenance' as const,
              label: 'صيانة (عمرة / فحص / ميكانيكا)',
              value: inMaintenanceCount,
              valCls: 'text-amber-400',
              sub: selectedStatusFilter === 'maintenance' ? 'معروضة بالجدول أدناه ✓' : 'اضغط لعرض سيارات الصيانة والعمرة 👈',
              subCls: 'text-amber-400',
              activeCls: 'ring-2 ring-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/10 border-amber-400/60',
              borderCls: 'border-amber-500/20 hover:border-amber-400/50'
            },
            {
              id: 'ready' as const,
              label: 'جاهز للتسليم (وفواتير الصيانة)',
              value: vStats.ready_count,
              valCls: 'text-emerald-400',
              sub: selectedStatusFilter === 'ready' ? 'معروضة بالجدول أدناه ✓' : 'اضغط لعرض السيارات الجاهزة والفواتير 👈',
              subCls: 'text-emerald-400',
              activeCls: 'ring-2 ring-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 border-emerald-400/60',
              borderCls: 'border-emerald-500/20 hover:border-emerald-400/50'
            },
          ].map(({ id, label, value, valCls, sub, subCls, activeCls, borderCls }) => {
            const isSelected = selectedStatusFilter === id;
            return (
              <div
                key={id}
                onClick={() => setSelectedStatusFilter(id)}
                className={`glass-card p-5 rounded-2xl border flex flex-col justify-between shadow-sm cursor-pointer transition-all duration-200 transform hover:-translate-y-1 ${
                  isSelected ? activeCls : borderCls
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-bold ${isSelected ? 'text-white font-black' : labelCls}`}>
                    {label}
                  </p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800/80' : 'bg-slate-100'} ${subCls}`}>
                    {sub}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-3">
                  <p className={`text-3xl sm:text-4xl font-black tracking-tight ${valCls}`}>{value}</p>
                  {isSelected && (
                    <span className="text-[11px] font-bold text-white bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                      محدد الآن
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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

      {/* Active Cars Table matching selected status */}
      {(() => {
        const allVisits = stats?.recentVisits || [];
        const filteredVisits = allVisits.filter((v: any) => {
          if (selectedStatusFilter === 'ready') {
            return v.status === 'ready';
          }
          if (selectedStatusFilter === 'maintenance') {
            return (
              v.status !== 'ready' &&
              v.status !== 'delivered' &&
              v.status !== 'cancelled'
            );
          }
          return v.status !== 'delivered' && v.status !== 'cancelled';
        });

        const tableTitle =
          selectedStatusFilter === 'ready'
            ? `السيارات الجاهزة للتسليم للعميل وحساب التكلفة (${filteredVisits.length} سيارة)`
            : selectedStatusFilter === 'maintenance'
            ? `سيارات الصيانة والعمرة والفحص الفني (${filteredVisits.length} سيارة)`
            : `جميع السيارات الموجودة جوة الورشة حالياً (${filteredVisits.length} سيارة)`;

        return (
          <div className="glass-card rounded-2xl overflow-hidden shadow-sm border border-slate-800/80">
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${cardHead}`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <h3 className={`font-black text-sm ${headCls}`}>
                  {tableTitle}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {filteredVisits.length} سيارات
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedStatusFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedStatusFilter('all')}
                    className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all cursor-pointer"
                  >
                    عرض كل السيارات (إلغاء الفلتر)
                  </button>
                )}
                <button
                  onClick={() => onNavigate('visits')}
                  className={`text-xs font-bold flex items-center gap-1 transition-colors ${isDark ? 'text-white hover:text-sky-300' : 'text-slate-600 hover:text-sky-600'}`}
                >
                  <span>فتح شاشة الزيارات الكاملة</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className={theadBg}>
                  <tr>
                    <th className="py-3 px-4 font-bold">رقم الزيارة</th>
                    <th className="py-3 px-4 font-bold">السيارة واللوحة</th>
                    <th className="py-3 px-4 font-bold">العميل</th>
                    <th className="py-3 px-4 font-bold">شكوى وبند العمل</th>
                    <th className="py-3 px-4 font-bold">الحالة</th>
                    <th className="py-3 px-4 font-bold">سعر الصيانة / التكلفة</th>
                    <th className="py-3 px-4 font-bold text-center">ماذا تم بالسيارة؟</th>
                    <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className={tbodyDiv}>
                  {filteredVisits.length > 0 ? (
                    filteredVisits.map((v: any) => {
                      const badge = getArabicStatusBadge(v.status);

                      return (
                        <tr key={v.id} className={`${rowHover} transition-colors`}>
                          {/* 1. Visit Number */}
                          <td className={`py-3.5 px-4 font-mono font-black ${valueCls}`}>
                            {v.visit_number}
                          </td>

                          {/* 2. Car & Plate */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className={`font-bold ${valueCls}`}>{v.make} {v.model} {v.year ? `(${v.year})` : ''}</span>
                              <span className="text-[11px] font-mono text-sky-400 font-bold bg-slate-900/80 px-1.5 py-0.5 rounded w-fit border border-slate-800 mt-0.5">
                                {v.plate_number}
                              </span>
                            </div>
                          </td>

                          {/* 3. Customer */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{v.customer_name}</span>
                              {v.customer_phone && (
                                <span className="text-[10px] text-slate-500 font-mono" dir="ltr">{v.customer_phone}</span>
                              )}
                            </div>
                          </td>

                          {/* 4. Complaint / Work description */}
                          <td className={`py-3.5 px-4 max-w-xs ${labelCls}`}>
                            <p className="truncate font-semibold text-slate-200">{v.customer_complaint}</p>
                            {v.work_order_desc && v.work_order_desc !== v.customer_complaint && (
                              <p className="text-[11px] text-amber-400/90 truncate">{v.work_order_desc}</p>
                            )}
                          </td>

                          {/* 5. Status Badge */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>

                          {/* 6. Maintenance Total Price */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col font-mono font-bold">
                              <span className="text-emerald-400 text-sm">
                                {Number(v.total_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                              </span>
                              {v.invoice_number ? (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  فاتورة: {v.invoice_number}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400/80 font-normal">
                                  تكلفة الصيانة المقدرة
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 7. Details Icon: What was fixed & what was replaced */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedCarForDetails(v)}
                              className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/90 text-purple-300 hover:text-white border border-purple-800/60 flex items-center gap-1.5 transition-all text-xs font-bold shadow-sm mx-auto cursor-pointer"
                              title="عرض كشف ما تم تغييره وإصلاحه في السيارة"
                            >
                              <Wrench className="w-3.5 h-3.5 text-purple-400" />
                              <span>ماذا تم بالسيارة؟ 🔍</span>
                            </button>
                          </td>

                          {/* 8. Actions (Invoice & WhatsApp) */}
                          <td className="py-3.5 px-4 text-center">
                            {v.status === 'ready' ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onNavigate('invoices')}
                                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                                  title="إصدار أو استعراض الفاتورة وطباعتها"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>إصدار الفاتورة 📄</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenWhatsApp(v.id)}
                                  className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg text-xs font-bold border border-emerald-500/40 flex items-center gap-1 transition-all cursor-pointer"
                                  title="إرسال رسالة جاهزية السيارة عبر واتساب"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>واتساب 🟢</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onNavigate('visits')}
                                className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                              >
                                متابعة الزيارة
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className={`py-10 text-center font-medium ${labelCls}`}>
                        {selectedStatusFilter === 'ready'
                          ? 'لا توجد سيارات جاهزة للتسليم حالياً في هذا القسم.'
                          : selectedStatusFilter === 'maintenance'
                          ? 'لا توجد سيارات قيد الصيانة أو الفحص حالياً.'
                          : 'لا توجد سيارات مسجلة بالورشة حالياً. استخدم زر "دخول سيارة" للبدء.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Modal: كشف ما تم إنجازه في السيارة (إيه اللي اتغير وايه اللي اتصلح) */}
      {selectedCarForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-right">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCarForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2 justify-end">
                  <span>كشف صيانة ما تم في السيارة</span>
                  <Wrench className="w-5 h-5 text-sky-400" />
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  رقم الزيارة: <span className="font-mono text-sky-400 font-bold">{selectedCarForDetails.visit_number}</span>
                </p>
              </div>
            </div>

            {/* Vehicle & Customer Info Banner */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">السيارة:</span>
                <p className="font-bold text-white text-sm mt-0.5">
                  {selectedCarForDetails.make} {selectedCarForDetails.model} ({selectedCarForDetails.year || ''})
                </p>
                <span className="font-mono text-sky-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700 mt-1 inline-block">
                  {selectedCarForDetails.plate_number}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">العميل:</span>
                <p className="font-bold text-white text-sm mt-0.5">{selectedCarForDetails.customer_name}</p>
                <p className="text-slate-400 font-mono mt-0.5">{selectedCarForDetails.customer_phone || 'لا يوجد هاتف'}</p>
              </div>
            </div>

            {/* Section 1: إيه اللي اتصلح (الأعمال والمهام المنجزة) */}
            <div className="mt-5">
              <h4 className="text-xs font-black text-amber-400 flex items-center gap-2 mb-2.5">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>🛠️ إيه اللي اتصلح (المهام التشغيلية وأعمال الفحص والصيانة):</span>
              </h4>
              {selectedCarForDetails.tasks && selectedCarForDetails.tasks.length > 0 ? (
                <div className="space-y-2">
                  {selectedCarForDetails.tasks.map((t: any, idx: number) => (
                    <div
                      key={t.id || idx}
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-950/70 border border-emerald-700/60 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                        <div>
                          <p className="font-bold text-white">{t.title}</p>
                          {t.mechanic_name && (
                            <p className="text-[11px] text-slate-400">الفني المسؤول: {t.mechanic_name}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-amber-300">
                        {Number(t.price || 0).toFixed(2)} ج.م
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40 text-xs text-slate-400">
                  <p className="font-semibold text-slate-300">شكوى وبند العمل المسجل:</p>
                  <p className="mt-1">{selectedCarForDetails.work_order_desc || selectedCarForDetails.customer_complaint}</p>
                </div>
              )}
            </div>

            {/* Section 2: إيه اللي اتغير (قطع الغيار والزيوت المستهلكة) */}
            <div className="mt-5">
              <h4 className="text-xs font-black text-sky-400 flex items-center gap-2 mb-2.5">
                <Package className="w-4 h-4 text-sky-400" />
                <span>🔄 إيه اللي اتغير (قطع الغيار والزيوت والمستهلكات):</span>
              </h4>
              {selectedCarForDetails.usedParts && selectedCarForDetails.usedParts.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">القطعة / الصنف</th>
                        <th className="py-2.5 px-3 text-center">الكمية</th>
                        <th className="py-2.5 px-3">سعر الوحدة</th>
                        <th className="py-2.5 px-3">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {selectedCarForDetails.usedParts.map((p: any, idx: number) => (
                        <tr key={p.id || idx}>
                          <td className="py-2 px-3 font-semibold text-white">
                            {p.part_name}
                            {p.brand && <span className="text-[10px] text-slate-400 mr-1.5">({p.brand})</span>}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-sky-400">{p.quantity}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{Number(p.unit_price || 0).toFixed(2)} ج.م</td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-400">{Number(p.total_price || 0).toFixed(2)} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40 text-xs text-slate-400">
                  لم يتم تسجيل قطع غيار منصرفة حتى الآن لهذه السيارة.
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-950 border border-emerald-800/40 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">السعر الإجمالي للصيانة والتكلفة:</p>
                {selectedCarForDetails.invoice_number && (
                  <p className="text-[11px] text-emerald-400 mt-0.5">
                    رقم الفاتورة: {selectedCarForDetails.invoice_number}
                  </p>
                )}
              </div>
              <p className="text-2xl font-black font-mono text-emerald-400">
                {Number(selectedCarForDetails.total_cost || 0).toLocaleString()} <span className="text-xs">ج.م</span>
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة التقرير</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCarForDetails(null);
                  onNavigate('invoices');
                }}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>الانتقال للفاتورة وطباعتها 📄</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCarForDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Ready Notification Modal */}
      <WhatsAppReadyModal
        data={whatsAppModalData}
        isOpen={!!whatsAppModalData}
        onClose={() => setWhatsAppModalData(null)}
      />
    </div>
  );
};
