import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Car,
  User,
  Clock,
  ChevronRight,
  X,
  Gauge,
  Trash2,
  MessageCircle,
  FileText,
  UserPlus,
  Sparkles,
  Wrench,
  Hammer,
  Cpu,
  CheckCircle2,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { Visit, Vehicle, Customer } from '../../types';
import { useSync } from '../../context/SyncContext';
import { useDevice } from '../../context/DeviceContext';
import { useTheme } from '../../context/ThemeContext';
import { WhatsAppReadyModal, WhatsAppData } from '../common/WhatsAppReadyModal';
import { VehicleHandoverReportModal } from './VehicleHandoverReportModal';
import { LicensePlateInput } from '../common/LicensePlateInput';
import { CarBrandModelSelector } from '../vehicles/CarBrandModelSelector';

interface VisitsViewProps {
  initialSearch?: string;
  initialVisitId?: string;
}

export const VisitsView: React.FC<VisitsViewProps> = ({ initialSearch, initialVisitId }) => {
  const { isMobile } = useDevice();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [visits, setVisits] = useState<Visit[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState(initialSearch || '');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<WhatsAppData | null>(null);
  const [reportVisitId, setReportVisitId] = useState<string | null>(null);

  // Intake Mode states
  const [entryMode, setEntryMode] = useState<'existing' | 'new'>('existing');
  const [ownerMode, setOwnerMode] = useState<'new' | 'existing'>('new');

  const [formData, setFormData] = useState({
    vehicle_id: '',
    customer_id: '',
    odometer_in: '',
    fuel_level: 'نصف',
    customer_complaint: '',
    intake_condition: '',
    initial_inspection: '',
    notes: ''
  });

  const [newVehicle, setNewVehicle] = useState({
    plate_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    fuel_type: 'بنزين',
    transmission_type: 'أوتوماتيك'
  });

  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const { lastEvent } = useSync();

  const loadVisits = () => {
    Promise.all([
      api.getVisits(statusFilter),
      api.getVehicles(),
      api.getCustomers()
    ]).then(([visRes, vehRes, custRes]) => {
      setVisits(visRes.data);
      setVehicles(vehRes.data);
      setCustomers(custRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVisits();
  }, [statusFilter]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
    if (initialVisitId) {
      handleOpenDetail(initialVisitId);
    }
  }, [initialSearch, initialVisitId]);

  useEffect(() => {
    if (lastEvent?.entity === 'visits' || lastEvent?.entity === 'vehicles' || lastEvent?.entity === 'customers') {
      loadVisits();
    }
  }, [lastEvent]);

  // When vehicle selected, autofill owner and current odometer
  const handleVehicleChange = (vId: string) => {
    const v = vehicles.find(x => x.id === vId);
    if (v) {
      setFormData(prev => ({
        ...prev,
        vehicle_id: vId,
        customer_id: v.current_owner_id,
        odometer_in: v.current_odometer.toString()
      }));
    } else {
      setFormData(prev => ({ ...prev, vehicle_id: vId }));
    }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();

    let payload: any = {
      odometer_in: formData.odometer_in,
      fuel_level: formData.fuel_level,
      customer_complaint: formData.customer_complaint,
      intake_condition: formData.intake_condition,
      initial_inspection: formData.initial_inspection,
      notes: formData.notes
    };

    if (entryMode === 'existing') {
      if (!formData.vehicle_id) {
        alert('يرجى اختيار السيارة المسجلة');
        return;
      }
      payload.vehicle_id = formData.vehicle_id;
      payload.customer_id = formData.customer_id;
    } else {
      if (!newVehicle.plate_number.trim() || !newVehicle.make.trim() || !newVehicle.model.trim()) {
        alert('رقم اللوحة والماركة والموديل حقول إلزامية للسيارة الجديدة');
        return;
      }
      payload.plate_number = newVehicle.plate_number.trim();
      payload.make = newVehicle.make.trim();
      payload.model = newVehicle.model.trim();
      payload.year = newVehicle.year;
      payload.color = newVehicle.color.trim();
      payload.fuel_type = newVehicle.fuel_type;
      payload.transmission_type = newVehicle.transmission_type;

      if (ownerMode === 'existing') {
        if (!formData.customer_id) {
          alert('يرجى اختيار مالك السيارة من قائمة العملاء');
          return;
        }
        payload.customer_id = formData.customer_id;
      } else {
        if (!newCustomer.customer_name.trim() || !newCustomer.customer_phone.trim()) {
          alert('اسم مالك السيارة ورقم الهاتف حقول إلزامية');
          return;
        }
        payload.customer_name = newCustomer.customer_name.trim();
        payload.customer_phone = newCustomer.customer_phone.trim();
        payload.customer_address = newCustomer.customer_address.trim();
      }
    }

    if (!payload.odometer_in || !payload.customer_complaint) {
      alert('قراءة العداد وشكوى العميل حقول إلزامية');
      return;
    }

    setSubmitting(true);
    try {
      await api.createVisit(payload);
      setShowAddModal(false);
      setFormData({
        vehicle_id: '', customer_id: '', odometer_in: '', fuel_level: 'نصف',
        customer_complaint: '', intake_condition: '', initial_inspection: '', notes: ''
      });
      setNewVehicle({
        plate_number: '', make: '', model: '', year: new Date().getFullYear(),
        color: '', fuel_type: 'بنزين', transmission_type: 'أوتوماتيك'
      });
      setNewCustomer({ customer_name: '', customer_phone: '', customer_address: '' });
      setEntryMode('existing');
      setOwnerMode('new');
      loadVisits();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (visitId: string, newStatus: string) => {
    try {
      const res = await api.updateVisitStatus(visitId, newStatus);
      loadVisits();
      if (selectedVisit && selectedVisit.visit.id === visitId) {
        const detailRes = await api.getVisitById(visitId);
        setSelectedVisit(detailRes.data);
      }
      // If status is ready and whatsapp payload returned, trigger WhatsApp notification modal!
      if (newStatus === 'ready' && res?.whatsapp) {
        setWhatsAppModalData(res.whatsapp);
      }
    } catch (err: any) {
      alert(err.message);
    }
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

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await api.getVisitById(id);
      setSelectedVisit(res.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteVisit = async (id: string, number: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الزيارة رقم "${number}" وكافة الفحوصات والمهام المرتبطة؟`)) {
      return;
    }
    try {
      await api.deleteVisit(id);
      if (selectedVisit?.visit?.id === id) {
        setSelectedVisit(null);
      }
      loadVisits();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const statusBadges: Record<string, { label: string; color: string }> = {
    received: { label: 'استلام جديد', color: 'bg-slate-800 text-slate-300' },
    maintenance: { label: 'صيانة دورية', color: 'bg-sky-500/15 text-sky-400 border border-sky-500/30' },
    repairs: { label: 'تصليح وإصلاحات', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
    in_repair: { label: 'تصليح وإصلاحات', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
    engine_overhaul: { label: 'عمرة الماتور', color: 'bg-rose-500/15 text-rose-400 border border-rose-500/30' },
    diagnostics: { label: 'فحص كمبيوتر', color: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' },
    diagnosing: { label: 'فحص كمبيوتر', color: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' },
    waiting_parts: { label: 'انتظار قطع', color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
    ready: { label: 'جاهزة للاستلام', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
    delivered: { label: 'تم الاستلام', color: 'bg-teal-500/20 text-teal-300 border border-teal-500/30' },
    cancelled: { label: 'ملغية', color: 'bg-red-500/10 text-red-400 border border-red-500/20' }
  };

  const filteredVisits = visits.filter((v: any) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const customer = (v.customer_name || '').toLowerCase();
    const phone = (v.customer_phone || '').toLowerCase();
    const plate = (v.plate_number || v.vehicle_plate || '').toLowerCase();
    const car = `${v.make || v.vehicle_make || ''} ${v.model || v.vehicle_model || ''}`.toLowerCase();
    const complaint = (v.customer_complaint || '').toLowerCase();
    const inspection = (v.initial_inspection || '').toLowerCase();
    const visitNum = (v.visit_number || '').toLowerCase();
    return (
      customer.includes(term) ||
      phone.includes(term) ||
      plate.includes(term) ||
      car.includes(term) ||
      complaint.includes(term) ||
      inspection.includes(term) ||
      visitNum.includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالعميل أو اللوحة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-xl pr-9 pl-3 py-2.5 text-xs focus:outline-none focus:border-sky-500 ${
              isDark ? 'bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-slate-100 border border-slate-200 text-slate-900'
            }`}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isMobile ? 'دخول' : 'تسجيل زيارة'}</span>
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: '', label: 'الكل', icon: null },
          { id: 'received', label: 'استلام', icon: Car },
          { id: 'maintenance', label: 'صيانة', icon: Wrench },
          { id: 'repairs', label: 'تصليح', icon: Hammer },
          { id: 'engine_overhaul', label: 'عمرة', icon: Gauge },
          { id: 'diagnostics', label: 'فحص', icon: Cpu },
          { id: 'ready', label: 'جاهزة', icon: CheckCircle2 },
          { id: 'delivered', label: 'سلّم', icon: Check },
        ].map((f) => {
          const Icon = f.icon;
          const isActive = statusFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-sky-500 text-white shadow-sm'
                  : isDark ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Visits List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">جاري جلب الزيارات...</div>
      ) : filteredVisits.length === 0 ? (
        <div className={`p-10 rounded-2xl text-center ${ isDark ? 'bg-[#0a0f1d]/80 border border-white/[0.08]' : 'bg-white border border-slate-200' }`}>
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-slate-300 text-sm">
            {search ? `لا توجد نتائج ل: "${search}"` : 'لا توجد زيارات مسجلة'}
          </p>
        </div>
      ) : isMobile ? (
        /* === MOBILE CARD LIST === */
        <div className="space-y-2.5">
          {filteredVisits.map((v) => {
            const b = statusBadges[v.status] || { label: v.status, color: 'bg-slate-500/15 text-slate-300' };
            return (
              <div
                key={v.id}
                className={`rounded-2xl p-3.5 shadow-sm ${ isDark ? 'bg-[#0a0f1d]/80 border border-white/[0.08]' : 'bg-white border border-slate-200' }`}
              >
                {/* Top row: visit # + status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-black text-sky-400 text-xs bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-400/20">{v.visit_number}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.color}`}>{b.label}</span>
                </div>

                {/* Car info */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {v.make} {v.model} <span className="font-mono text-sky-400">({v.plate_number})</span>
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{v.customer_name} • <span className="font-mono">{(v.odometer_in || 0).toLocaleString()} كم</span></p>
                  </div>
                </div>

                {/* Complaint */}
                {v.customer_complaint && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-2.5">شكوى: {v.customer_complaint}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
                  <button
                    onClick={() => setReportVisitId(v.id)}
                    className="flex-1 flex items-center justify-center gap-1 bg-white/10 hover:bg-white hover:text-slate-950 text-white py-2 rounded-xl text-[11px] font-bold transition-all border border-white/10 active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>تقرير</span>
                  </button>
                  {v.status === 'ready' && (
                    <button
                      onClick={() => handleOpenWhatsApp(v.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white py-2 rounded-xl text-[11px] font-bold transition-all border border-emerald-500/20 active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenDetail(v.id)}
                    className="flex-1 flex items-center justify-center gap-1 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white py-2 rounded-xl text-[11px] font-bold transition-all border border-sky-500/20 active:scale-95"
                  >
                    <span>تفاصيل</span>
                  </button>
                  <button
                    onClick={() => handleDeleteVisit(v.id, v.visit_number)}
                    className="p-2 bg-slate-800/60 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-xl transition-colors border border-white/[0.06] active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* === DESKTOP TABLE === */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-xs">
                <tr>
                  <th className="py-3.5 px-4">رقم الزيارة</th>
                  <th className="py-3.5 px-4">السيارة واللوحة</th>
                  <th className="py-3.5 px-4">العميل</th>
                  <th className="py-3.5 px-4">عداد الدخول</th>
                  <th className="py-3.5 px-4">الشكوى</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVisits.map((v) => {
                  const b = statusBadges[v.status] || { label: v.status, color: 'bg-slate-800 text-slate-300' };
                  return (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">{v.visit_number}</td>
                      <td className="py-3 px-4 font-semibold text-slate-100">
                        {v.make} {v.model} ({v.plate_number})
                      </td>
                      <td className="py-3 px-4 text-slate-300">{v.customer_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{(v.odometer_in || 0).toLocaleString()} كم</td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{v.customer_complaint}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${b.color}`}>
                          {b.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setReportVisitId(v.id)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-950 rounded-lg text-xs font-black shadow-sm flex items-center gap-1 transition-all border border-white cursor-pointer active:scale-95"
                          >
                            <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>التقرير</span>
                          </button>
                          {v.status === 'ready' && (
                            <button
                              onClick={() => handleOpenWhatsApp(v.id)}
                              className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg text-xs font-bold border border-emerald-500/25 flex items-center gap-1 transition-all shadow-sm"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>واتساب</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenDetail(v.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-semibold"
                          >
                            عرض
                          </button>
                          <button
                            onClick={() => handleDeleteVisit(v.id, v.visit_number)}
                            className="p-1 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Visit Intake Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">تسجيل دخول سيارة (زيارة جديدة)</h3>
                  <p className="text-xs text-slate-400">استقبال مركبة وتوثيق طلبات الصيانة</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Tab Selector: Existing vs New Vehicle */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setEntryMode('existing')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    entryMode === 'existing'
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  <span>سيارة مسجلة مسبقاً</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('new')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    entryMode === 'new'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل سيارة و/أو مالك جديد</span>
                </button>
              </div>

              {/* Mode 1: Existing Vehicle Selection */}
              {entryMode === 'existing' ? (
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">اختيار السيارة من السجلات *</label>
                  <select
                    required={entryMode === 'existing'}
                    value={formData.vehicle_id}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">اختر السيارة المسجلة...</option>
                    {vehicles.map((veh) => (
                      <option key={veh.id} value={veh.id}>
                        {veh.make} {veh.model} ({veh.plate_number}) - المالك: {veh.owner_name}
                      </option>
                    ))}
                  </select>

                  {formData.vehicle_id && (
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400">المالك: </span>
                        <span className="font-bold text-sky-400">{customers.find(c => c.id === formData.customer_id)?.full_name || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">آخر قراءة عداد: </span>
                        <span className="font-mono font-bold text-emerald-400">{formData.odometer_in} كم</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Mode 2: New Vehicle and/or New Customer */
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Vehicle Details */}
                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                      <Car className="w-4 h-4 text-emerald-400" />
                      <span>بيانات السيارة الجديدة</span>
                    </h4>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          رقم اللوحة * <span className="text-slate-500">(3 حروف + 3 أرقام)</span>
                        </label>
                        <LicensePlateInput
                          required={entryMode === 'new'}
                          value={newVehicle.plate_number}
                          onChange={(val) => setNewVehicle({ ...newVehicle, plate_number: val })}
                        />
                      </div>
                    </div>

                    {/* اختيار ماركة وموديل السيارة بنظام القوائم الذكية وإمكانية الإضافة اليدوية */}
                    <CarBrandModelSelector
                      selectedMake={newVehicle.make}
                      selectedModel={newVehicle.model}
                      onMakeChange={(make) => setNewVehicle(prev => ({ ...prev, make }))}
                      onModelChange={(model) => setNewVehicle(prev => ({ ...prev, model }))}
                      required={entryMode === 'new'}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">سنة الصنع</label>
                        <input
                          type="number"
                          value={newVehicle.year}
                          onChange={(e) => setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) || 2020 })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">اللون</label>
                        <input
                          type="text"
                          placeholder="أبيض، أسود، فضي..."
                          value={newVehicle.color}
                          onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Owner Details */}
                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-emerald-400" />
                        <span>مالك السيارة</span>
                      </h4>
                      <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setOwnerMode('new')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                            ownerMode === 'new'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          مالك جديد
                        </button>
                        <button
                          type="button"
                          onClick={() => setOwnerMode('existing')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                            ownerMode === 'existing'
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          عميل مسجل مسبقاً
                        </button>
                      </div>
                    </div>

                    {ownerMode === 'existing' ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">اختيار العميل المالك *</label>
                        <select
                          required={entryMode === 'new' && ownerMode === 'existing'}
                          value={formData.customer_id}
                          onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                        >
                          <option value="">اختر العميل المسجل...</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.full_name} ({c.phone}) - {c.customer_code}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">اسم العميل بالكامل *</label>
                          <input
                            type="text"
                            required={entryMode === 'new' && ownerMode === 'new'}
                            placeholder="أحمد محمود السيد..."
                            value={newCustomer.customer_name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, customer_name: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">رقم هاتف المحمول *</label>
                          <input
                            type="tel"
                            required={entryMode === 'new' && ownerMode === 'new'}
                            placeholder="01012345678"
                            value={newCustomer.customer_phone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, customer_phone: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">العنوان / ملاحظات (اختياري)</label>
                          <input
                            type="text"
                            placeholder="المدينة / المنطقة"
                            value={newCustomer.customer_address}
                            onChange={(e) => setNewCustomer({ ...newCustomer, customer_address: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Common Visit Details */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  <span>بيانات الفحص والاستقبال</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">عداد الدخول (كم) *</label>
                    <input
                      type="number"
                      required
                      placeholder="قراءة العداد الحالية"
                      value={formData.odometer_in}
                      onChange={(e) => setFormData({ ...formData, odometer_in: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">مستوى الوقود</label>
                    <select
                      value={formData.fuel_level}
                      onChange={(e) => setFormData({ ...formData, fuel_level: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                    >
                      <option value="فارغ">فارغ</option>
                      <option value="ربع">ربع</option>
                      <option value="نصف">نصف</option>
                      <option value="ثلاثة أرباع">ثلاثة أرباع</option>
                      <option value="ممتلئ">ممتلئ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">شكوى العميل والأعطال المشتكى منها *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="وصف المشكلة: صوت، اهتزاز، تفتفة، تسريب، صيانة دورية، فحص..."
                    value={formData.customer_complaint}
                    onChange={(e) => setFormData({ ...formData, customer_complaint: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات الفحص الظاهري والاستلام</label>
                  <input
                    type="text"
                    placeholder="حالة البودي، خدوش أو صدمات سابقة إن وجدت..."
                    value={formData.intake_condition}
                    onChange={(e) => setFormData({ ...formData, intake_condition: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? 'جاري الحفظ...' : 'تسجيل الدخول والزيارة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visit Detail Drawer */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-r border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                  {selectedVisit.visit.visit_number}
                </span>
                <h3 className="font-bold text-base text-white mt-1">
                  {selectedVisit.visit.make} {selectedVisit.visit.model} ({selectedVisit.visit.plate_number})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteVisit(selectedVisit.visit.id, selectedVisit.visit.visit_number)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors border border-rose-500/20 text-xs flex items-center gap-1 font-bold"
                  title="حذف هذه الزيارة"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف</span>
                </button>
                <button onClick={() => setSelectedVisit(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Report Quick Action Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/70 via-sky-900/30 to-indigo-950/50 border border-sky-500/30 flex items-center justify-between gap-3 shadow-lg shadow-sky-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">تقرير الاستلام والصيانة الشامل</h4>
                    <p className="text-xs text-sky-300/80 mt-0.5">
                      كشف بجميع المصنعيات وأسعارها وقطع الغيار المستبدلة والطباعة الرسمية
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReportVisitId(selectedVisit.visit.id)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-white/10 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                >
                  <FileText className="w-4 h-4 stroke-[2.5]" />
                  <span>فتح التقرير والطباعة 🖨️</span>
                </button>
              </div>

              {/* Quick Status Control */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>تحديث حالة الزيارة ومسار الصيانة:</span>
                  </p>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    الحالية: <strong className="text-sky-400">{statusBadges[selectedVisit.visit.status]?.label || selectedVisit.visit.status}</strong>
                  </span>
                </div>

                {/* 1. أقسام الصيانة الأربعة */}
                <div>
                  <p className="text-[11px] text-slate-400 mb-1.5 font-bold">أنواع وأقسام الصيانة الأربعة:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedVisit.visit.id, 'maintenance')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                        selectedVisit.visit.status === 'maintenance'
                          ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-600/30 scale-[1.02]'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 text-sky-400" />
                      <span>صيانة دورية</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedVisit.visit.id, 'repairs')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                        ['repairs', 'in_repair'].includes(selectedVisit.visit.status)
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30 scale-[1.02]'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Hammer className="w-3.5 h-3.5 text-amber-400" />
                      <span>تصليح أعطال</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedVisit.visit.id, 'engine_overhaul')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                        selectedVisit.visit.status === 'engine_overhaul'
                          ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30 scale-[1.02]'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Gauge className="w-3.5 h-3.5 text-rose-400" />
                      <span>عمرة الماتور</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedVisit.visit.id, 'diagnostics')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                        ['diagnostics', 'diagnosing'].includes(selectedVisit.visit.status)
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30 scale-[1.02]'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      <span>فحص كمبيوتر</span>
                    </button>
                  </div>
                </div>

                {/* 2. مراحل التسليم والاستلام */}
                <div>
                  <p className="text-[11px] text-slate-400 mb-1.5 font-bold">مراحل التسليم والاستلام:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedVisit.visit.id, 'ready')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                        selectedVisit.visit.status === 'ready'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30 scale-[1.02]'
                          : 'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800 hover:text-emerald-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>جاهزة للاستلام</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedVisit.visit.id, 'delivered')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                        selectedVisit.visit.status === 'delivered'
                          ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/30 scale-[1.02]'
                          : 'bg-slate-900 border-slate-800 text-teal-400 hover:bg-slate-800 hover:text-teal-300'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تم الاستلام</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedVisit.visit.id, 'received')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                        selectedVisit.visit.status === 'received'
                          ? 'bg-slate-700 text-white border-slate-600'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>استلام جديد</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ready for Delivery WhatsApp Direct Banner */}
              {selectedVisit.visit.status === 'ready' && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-emerald-900/40 to-teal-950/50 border border-emerald-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg shadow-emerald-950/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>السيارة جاهزة للتسليم</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">WhatsApp</span>
                      </p>
                      <p className="text-xs text-emerald-300/80 mt-0.5">
                        أرسل رسالة إشعار فورية لصاحب السيارة ({selectedVisit.visit.customer_name})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenWhatsApp(selectedVisit.visit.id)}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 whitespace-nowrap active:scale-95 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>إرسال واتساب للعميل 🟢</span>
                  </button>
                </div>
              )}

              {/* Complaint */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-1">شكوى العميل:</h4>
                <p className="text-sm text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedVisit.visit.customer_complaint}
                </p>
              </div>

              {/* Work Orders */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-2">أوامر الإصلاح المرتبطة ({selectedVisit.workOrders?.length || 0}):</h4>
                {selectedVisit.workOrders && selectedVisit.workOrders.length > 0 ? (
                  <div className="space-y-2">
                    {selectedVisit.workOrders.map((wo: any) => (
                      <div key={wo.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-sky-400">{wo.order_number}</span>
                          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">{wo.status}</span>
                        </div>
                        <p className="text-xs text-slate-200 mt-1">{wo.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">لم يتم فتح أمر إصلاح لهذه الزيارة بعد.</p>
                )}
              </div>
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

      {/* Vehicle Handover & Maintenance Completion Report Modal */}
      <VehicleHandoverReportModal
        visitId={reportVisitId}
        isOpen={!!reportVisitId}
        onClose={() => setReportVisitId(null)}
        onDataUpdated={loadVisits}
      />
    </div>
  );
};
