import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Search, Printer, DollarSign, Calendar, CheckCircle2, AlertCircle, X, CreditCard, Trash2, FileText, Wrench, Gauge, Clock, MessageCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Invoice, Visit } from '../../types';
import { useSync } from '../../context/SyncContext';
import { VehicleHandoverReportModal } from '../visits/VehicleHandoverReportModal';
import { WhatsAppReadyModal, WhatsAppData } from '../common/WhatsAppReadyModal';

interface InvoicesViewProps {
  initialInvoiceId?: string;
  initialSearch?: string;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ initialInvoiceId, initialSearch }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [reportVisitId, setReportVisitId] = useState<string | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<WhatsAppData | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Create Invoice Form
  const [formData, setFormData] = useState({
    visit_id: '',
    labor_total: 250,
    parts_total: 0,
    fluids_total: 0,
    discount_amount: 0,
    tax_percent: 15,
    next_maintenance_km: '',
    next_maintenance_notes: '',
    notes: ''
  });

  // Payment Form
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'card',
    reference_number: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const { lastEvent } = useSync();

  const loadData = () => {
    Promise.all([
      api.getInvoices(statusFilter),
      api.getVisits()
    ]).then(([invRes, visRes]) => {
      setInvoices(invRes.data);
      setVisits(visRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (lastEvent?.entity === 'invoices' || lastEvent?.entity === 'payments') {
      loadData();
      if (selectedInvoice) {
        api.getInvoiceById(selectedInvoice.id).then(r => setSelectedInvoice(r.data));
      }
    }
  }, [lastEvent]);

  useEffect(() => {
    if (initialInvoiceId) {
      handleOpenDetail(initialInvoiceId);
    }
  }, [initialInvoiceId]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await api.getInvoiceById(id);
      setSelectedInvoice(res.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendWhatsAppMaintenance = async (vehicleId: string) => {
    try {
      const res = await api.getVehicleWhatsAppMaintenance(vehicleId);
      if (res?.data) {
        setWhatsAppModalData(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'فشل في تجهيز رسالة تذكير الصيانة عبر واتساب');
    }
  };

  const handleOpenPaymentDirect = async (inv: Invoice) => {
    try {
      const res = await api.getInvoiceById(inv.id);
      setSelectedInvoice(res.data);
      setPaymentData({
        amount: inv.balance_due,
        payment_method: 'cash',
        reference_number: '',
        notes: 'سداد باقي الفاتورة'
      });
      setShowPaymentModal(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteInvoice = async (id: string, number: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الفاتورة رقم "${number}" وسندات القبض المرتبطة بها؟`)) {
      return;
    }
    try {
      await api.deleteInvoice(id);
      if (selectedInvoice?.id === id) {
        setSelectedInvoice(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVisitSelect = async (visId: string) => {
    setFormData(prev => ({ ...prev, visit_id: visId }));
    if (!visId) return;
    try {
      const res = await api.getVisitById(visId);
      if (res?.data) {
        let labor = 0;
        let parts = 0;
        if (res.data.workOrders) {
          for (const wo of res.data.workOrders) {
            if (wo.tasks) {
              labor += wo.tasks.reduce((sum: number, t: any) => sum + (Number(t.price) || 0), 0);
            }
            if (wo.usedParts) {
              parts += wo.usedParts.reduce((sum: number, p: any) => sum + (Number(p.total_price) || 0), 0);
            }
          }
        }
        const fluids = (res.data.fluids || []).reduce((sum: number, f: any) => sum + (Number(f.price) || 0), 0);
        const currentOdo = Number(res.data.odometer_in || res.data.current_odometer || 0);
        const suggestedNextKm = res.data.next_maintenance_km || (currentOdo > 0 ? currentOdo + 10000 : '');
        setFormData(prev => ({
          ...prev,
          labor_total: labor > 0 ? labor : prev.labor_total,
          parts_total: parts > 0 ? parts : 0,
          fluids_total: fluids > 0 ? fluids : 0,
          next_maintenance_km: prev.next_maintenance_km || (suggestedNextKm ? String(suggestedNextKm) : ''),
          next_maintenance_notes: prev.next_maintenance_notes || res.data.next_maintenance_notes || 'صيانة دورية وتغيير زيوت وفلاتر'
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const vis = visits.find(v => v.id === formData.visit_id);
    if (!vis) {
      alert('يرجى اختيار زيارة صالحة');
      return;
    }

    setSubmitting(true);
    try {
      await api.createInvoice({
        ...formData,
        customer_id: vis.customer_id,
        vehicle_id: vis.vehicle_id,
        odometer_in: vis.odometer_in,
        next_maintenance_km: formData.next_maintenance_km ? parseInt(formData.next_maintenance_km, 10) : undefined,
        next_maintenance_notes: formData.next_maintenance_notes?.trim() || undefined
      });
      setShowAddModal(false);
      setFormData({
        visit_id: '',
        labor_total: 250,
        parts_total: 0,
        fluids_total: 0,
        discount_amount: 0,
        tax_percent: 15,
        next_maintenance_km: '',
        next_maintenance_notes: '',
        notes: ''
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setSubmitting(true);
    try {
      await api.registerPayment({
        invoice_id: selectedInvoice.id,
        ...paymentData
      });
      setShowPaymentModal(false);
      const res = await api.getInvoiceById(selectedInvoice.id);
      setSelectedInvoice(res.data);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (inv.invoice_number || '').toLowerCase().includes(q) ||
      (inv.customer_name || '').toLowerCase().includes(q) ||
      (inv.plate_number || '').toLowerCase().includes(q) ||
      `${inv.make || ''} ${inv.model || ''}`.toLowerCase().includes(q)
    );
  });

  const unbilledVisits = visits.filter(vis => 
    !vis.invoice_id && 
    !invoices.some(inv => inv.visit_id === vis.id && inv.status !== 'cancelled')
  );

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      {/* Top Bar & Quick Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === ''
                ? 'bg-white text-slate-950 font-black shadow-md shadow-white/10'
                : 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white'
            }`}
          >
            <span>الكل</span>
            <span className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
              statusFilter === '' ? 'bg-slate-900 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('has_balance')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'has_balance'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-white/[0.04] border border-white/[0.08] text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <span>فواتير بها متبقي (تحصيل)</span>
            <span className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-bold ${
              statusFilter === 'has_balance' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {invoices.filter(i => Number(i.balance_due) > 0).length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'paid'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'bg-white/[0.04] border border-white/[0.08] text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <span>مسددة بالكامل ✓</span>
            <span className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-bold ${
              statusFilter === 'paid' ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {invoices.filter(i => i.status === 'paid' || Number(i.balance_due) <= 0).length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الفاتورة، العميل، اللوحة..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-8 pl-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-950 px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-white/15 active:scale-95 transition-all border border-white cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>إصدار فاتورة جديدة</span>
          </button>
        </div>
      </div>

      {/* Quick Collection Summary Banner when filtering by has_balance */}
      {statusFilter === 'has_balance' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/30 shrink-0">
              💰
            </div>
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span>فواتير بانتظار التحصيل والسداد السريع</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  {invoices.filter(i => Number(i.balance_due) > 0).length} فاتورة
                </span>
              </h4>
              <p className="text-slate-400 text-xs mt-0.5">
                يمكنك الضغط على زر <strong className="text-emerald-400">"سداد"</strong> الأخضر أمام أي فاتورة لتسجيل دفعة كاش أو شبكة فوراً وتوليد سند القبض
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 shrink-0">
            <div className="text-left sm:text-right">
              <span className="text-slate-400 text-[11px] block">إجمالي المتبقي للتحصيل:</span>
              <span className="text-amber-400 font-black text-lg">
                {invoices.reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0).toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">جاري جلب الفواتير...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-300">
              {searchQuery ? `لا توجد فواتير مطابقة للبحث "${searchQuery}"` : 'لا توجد فواتير مسجلة'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-xs">
                <tr>
                  <th className="py-3.5 px-4">رقم الفاتورة</th>
                  <th className="py-3.5 px-4">العميل</th>
                  <th className="py-3.5 px-4">السيارة واللوحة</th>
                  <th className="py-3.5 px-4">الإجمالي شامل الضريبة</th>
                  <th className="py-3.5 px-4">المبلغ المسدد</th>
                  <th className="py-3.5 px-4">المتبقي</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">عرض / سداد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">{inv.invoice_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{inv.customer_name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {inv.make} {inv.model} ({inv.plate_number})
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-100 text-sm">{inv.grand_total.toLocaleString()} ج.م</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{inv.paid_amount.toLocaleString()} ج.م</td>
                    <td className="py-3 px-4 font-mono">
                      {inv.balance_due > 0 ? (
                        <span className="text-amber-400 font-black bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">{inv.balance_due.toLocaleString()} ج.م</span>
                      ) : (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">0.00 (خالص ✓)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : inv.status === 'partially_paid'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {inv.status === 'paid' ? 'مسددة بالكامل' : inv.status === 'partially_paid' ? 'دفعة جزئية' : 'غير مسددة'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {inv.balance_due > 0 && (
                          <button
                            onClick={() => handleOpenPaymentDirect(inv)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                            title="سداد باقي المبلغ وإصدار سند قبض"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>سداد</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDetail(inv.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-semibold"
                        >
                          تفاصيل
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                          className="p-1 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors"
                          title="حذف الفاتورة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white">إصدار فاتورة صيانة جديدة</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الزيارة والسيارة *</label>
                <select
                  required
                  value={formData.visit_id}
                  onChange={(e) => handleVisitSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="">اختر الزيارة...</option>
                  {unbilledVisits.length > 0 ? (
                    unbilledVisits.map((vis) => (
                      <option key={vis.id} value={vis.id}>
                        [{vis.visit_number}] {vis.make} {vis.model} ({vis.plate_number}) - العميل: {vis.customer_name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>-- جميع السيارات الحالية تم إصدار فواتير لها بالفعل --</option>
                  )}
                </select>
                {unbilledVisits.length === 0 ? (
                  <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                    <span>💡 جميع سيارات الورشة الحالية صادر لها فواتير بالفعل. يمكنك استعراض الفواتير وسداد دفعات عليها مباشرة.</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-sky-400 mt-1">
                    💡 يتم احتساب أجور الصيانة وقطع الغيار المصروفة تلقائياً بمجرد اختيار الزيارة
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">أجور اليد والعمالة (ج.م)</label>
                  <input
                    type="number"
                    value={formData.labor_total}
                    onChange={(e) => setFormData({ ...formData, labor_total: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">قطع الغيار (ج.م)</label>
                  <input
                    type="number"
                    value={formData.parts_total}
                    onChange={(e) => setFormData({ ...formData, parts_total: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الزيوت والخدمات (ج.م)</label>
                  <input
                    type="number"
                    value={formData.fluids_total}
                    onChange={(e) => setFormData({ ...formData, fluids_total: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الخصم الممنوح (ج.م)</label>
                  <input
                    type="number"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">نسبة ضريبة القيمة المضافة (%)</label>
                  <input
                    type="number"
                    value={formData.tax_percent}
                    onChange={(e) => setFormData({ ...formData, tax_percent: parseFloat(e.target.value) || 15 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              {/* Next Periodic Maintenance Scheduling */}
              <div className="bg-sky-950/30 border border-sky-800/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>توصيات وجدولة الصيانة للزيارة القادمة (تطبع بالفاتورة)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">العداد المستهدف للصيانة القادمة (كم)</label>
                    <input
                      type="number"
                      placeholder="مثلاً: 60000"
                      value={formData.next_maintenance_km}
                      onChange={(e) => setFormData({ ...formData, next_maintenance_km: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 focus:outline-none focus:border-sky-500 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">توصيات وأعمال الزيارة القادمة</label>
                    <input
                      type="text"
                      placeholder="مثال: تغيير عفشة، فحص تيل الفرامل، سيور..."
                      value={formData.next_maintenance_notes}
                      onChange={(e) => setFormData({ ...formData, next_maintenance_notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 disabled:opacity-50"
                >
                  {submitting ? 'جاري الإصدار...' : 'إصدار الفاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Drawer & Printable Bill */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-r border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between no-print">
              <div>
                <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                  {selectedInvoice.invoice_number}
                </span>
                <h3 className="font-bold text-base text-white mt-1">
                  فاتورة صيانة سيارة ({selectedInvoice.plate_number})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedInvoice.visit_id && (
                  <button
                    onClick={() => setReportVisitId(selectedInvoice.visit_id)}
                    className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm transition-all"
                    title="تقرير الاستلام وإنجاز صيانة المركبة"
                  >
                    <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>تقرير الصيانة الشامل</span>
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  <Printer className="w-4 h-4 text-sky-400" />
                  <span>طباعة</span>
                </button>
                <button
                  onClick={() => handleDeleteInvoice(selectedInvoice.id, selectedInvoice.invoice_number)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors border border-rose-500/20 text-xs flex items-center gap-1 font-bold"
                  title="حذف الفاتورة"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف</span>
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 print:p-0 print:m-0">
              {/* Printable Invoice Header */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base font-black text-white">{selectedInvoice.workshop_name}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">س.ت: {selectedInvoice.commercial_reg} | الرقم الضريبي: {selectedInvoice.tax_number}</p>
                    <p className="text-xs text-slate-400">{selectedInvoice.workshop_address}</p>
                  </div>
                  <div className="text-left font-mono">
                    <p className="text-xs text-sky-400 font-bold">{selectedInvoice.invoice_number}</p>
                    <p className="text-[11px] text-slate-400">{new Date(selectedInvoice.issue_date).toLocaleDateString('ar-SA')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400">العميل: <strong className="text-slate-100">{selectedInvoice.customer_name}</strong></p>
                    <p className="text-slate-400 font-mono mt-0.5" dir="ltr">{selectedInvoice.customer_phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">السيارة: <strong className="text-slate-100">{selectedInvoice.make} {selectedInvoice.model}</strong></p>
                    <p className="text-slate-400 font-mono mt-0.5">اللوحة: {selectedInvoice.plate_number}</p>
                  </div>
                </div>

                {/* Maintenance & Periodic Schedule Card */}
                <div className="mt-3 pt-3 border-t border-slate-800 bg-sky-950/20 border border-sky-800/30 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-sky-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>بيانات الصيانة الدورية والعداد:</span>
                    </span>
                    <span className="font-mono text-white text-xs font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      عداد الدخول: {selectedInvoice.odometer_in ? `${Number(selectedInvoice.odometer_in).toLocaleString()} كم` : 'غير مسجل'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-sky-500/20">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">الصيانة الدورية القادمة:</span>
                      <strong className="text-amber-400 font-mono text-sm font-black">
                        {selectedInvoice.next_maintenance_km ? `${Number(selectedInvoice.next_maintenance_km).toLocaleString()} كم` : 'لم تحدد بعد'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">توصيات وأعمال الزيارة القادمة:</span>
                      <p className="text-slate-200 text-xs font-semibold">
                        {selectedInvoice.next_maintenance_notes || 'صيانة دورية عادية'}
                      </p>
                    </div>
                  </div>
                  {selectedInvoice.vehicle_id && (
                    <div className="pt-2 border-t border-sky-500/20 flex justify-end no-print">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppMaintenance(selectedInvoice.vehicle_id)}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm transition-all cursor-pointer"
                        title="إرسال تذكير بموعد وتوصيات الصيانة القادمة للعميل عبر واتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>إرسال تذكير بالصيانة عبر واتساب</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>أجور العمالة والفحص:</span>
                  <span className="font-mono">{selectedInvoice.labor_total} ج.م</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>قطع الغيار والمستهلكات:</span>
                  <span className="font-mono">{selectedInvoice.parts_total} ج.م</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>الزيوت وسوائل الصيانة:</span>
                  <span className="font-mono">{selectedInvoice.fluids_total} ج.م</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>خصم ممنوح:</span>
                    <span className="font-mono">-{selectedInvoice.discount_amount} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2">
                  <span>ضريبة القيمة المضافة ({selectedInvoice.tax_percent}%):</span>
                  <span className="font-mono">{selectedInvoice.tax_amount} ج.م</span>
                </div>
                <div className="flex justify-between text-sm font-black text-white border-t border-slate-800 pt-2">
                  <span>الإجمالي المستحق:</span>
                  <span className="font-mono text-sky-400 font-bold">{Number(selectedInvoice.grand_total || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>المبلغ المدفوع:</span>
                  <span className="font-mono font-bold">{Number(selectedInvoice.paid_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-t border-slate-800 pt-1">
                  <span className={Number(selectedInvoice.balance_due) > 0 ? 'text-rose-300' : 'text-slate-400'}>الرصيد المتبقي:</span>
                  <span className={`font-mono font-bold ${Number(selectedInvoice.balance_due) > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {Number(selectedInvoice.balance_due || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م
                  </span>
                </div>
              </div>

              {/* Payments & Receipts History */}
              <div>
                <div className="flex items-center justify-between mb-2 no-print">
                  <h4 className="font-bold text-xs text-slate-300">سندات القبض المسجلة:</h4>
                  {selectedInvoice.balance_due > 0 && (
                    <button
                      onClick={() => {
                        setPaymentData({ amount: selectedInvoice.balance_due, payment_method: 'card', reference_number: '', notes: '' });
                        setShowPaymentModal(true);
                      }}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تسجيل دفعة نقدية / شبكة</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                    selectedInvoice.payments.map((p: any) => (
                      <div key={p.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                        <div>
                          <span className="font-mono text-sky-400 font-bold">{p.receipt_number}</span>
                          <span className="text-slate-400 mr-2">طريقة الدفع: {p.payment_method === 'card' ? 'شبكة (مدى/بطاقة)' : 'نقدي'}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">{new Date(p.payment_date).toLocaleString('ar-SA')}</p>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 text-sm">{p.amount} ج.م</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      لم يتم تسجيل أي دفعات لهذه الفاتورة بعد.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white">تسجيل سند قبض / دفعة للفاتورة</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <p className="font-bold text-sky-400">{selectedInvoice.invoice_number}</p>
                <p className="text-slate-400 mt-1">المتبقي على الفاتورة: <strong className="text-rose-400 font-mono font-bold">{Number(selectedInvoice.balance_due || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المبلغ المراد سداده (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedInvoice.balance_due}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">وسيلة الدفع *</label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="card">شبكة / بطاقة مدى / فيزا</option>
                  <option value="cash">نقداً (كاش)</option>
                  <option value="transfer">تحويل بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الحوالة أو إيصال نقطة البيع</label>
                <input
                  type="text"
                  placeholder="رقم مرجعي للعملية إن وجد"
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? 'جاري السداد...' : 'إصدار سند القبض'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Vehicle Handover & Maintenance Completion Report Modal */}
      <VehicleHandoverReportModal
        visitId={reportVisitId}
        isOpen={!!reportVisitId}
        onClose={() => setReportVisitId(null)}
        onDataUpdated={loadData}
      />

      {/* WhatsApp Maintenance Reminder Modal */}
      <WhatsAppReadyModal
        data={whatsAppModalData}
        isOpen={!!whatsAppModalData}
        onClose={() => setWhatsAppModalData(null)}
      />
    </div>
  );
};
