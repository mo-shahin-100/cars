import React, { useState, useEffect } from 'react';
import {
  Car,
  Search,
  Plus,
  Clock,
  UserCheck,
  Cpu,
  Droplet,
  Boxes,
  Receipt,
  FileText,
  X,
  History,
  Calendar,
  Gauge,
  Trash2
} from 'lucide-react';
import { api } from '../../services/api';
import { Vehicle, Customer } from '../../types';
import { useSync } from '../../context/SyncContext';
import { LicensePlateInput } from '../common/LicensePlateInput';
import { CarBrandModelSelector } from './CarBrandModelSelector';

interface VehiclesViewProps {
  initialSearch?: string;
  initialVehicleId?: string;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({ initialSearch, initialVehicleId }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState(initialSearch || '');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [timelineData, setTimelineData] = useState<any | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<string>('all');
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    plate_number: '',
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    fuel_type: 'بنزين',
    transmission_type: 'أوتوماتيك',
    current_odometer: 0,
    current_owner_id: '',
    notes: ''
  });

  const [transferData, setTransferData] = useState({
    new_owner_id: '',
    reason: '',
    transfer_odometer: 0
  });

  const [ownerMode, setOwnerMode] = useState<'existing' | 'new'>('existing');
  const [newOwner, setNewOwner] = useState({
    full_name: '',
    phone: '',
    address: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const { lastEvent } = useSync();

  const loadData = () => {
    Promise.all([
      api.getVehicles(search),
      api.getCustomers()
    ]).then(([vehRes, custRes]) => {
      setVehicles(vehRes.data);
      setCustomers(custRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [search]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
    if (initialVehicleId) {
      api.getVehicleById(initialVehicleId).then(res => {
        if (res.data) handleOpenTimeline(res.data);
      }).catch(err => console.error(err));
    }
  }, [initialSearch, initialVehicleId]);

  useEffect(() => {
    if (lastEvent?.entity === 'vehicles') {
      loadData();
    }
  }, [lastEvent]);

  const handleOpenTimeline = async (v: Vehicle) => {
    setSelectedVehicle(v);
    setTimelineLoading(true);
    try {
      const res = await api.getVehicleTimeline(v.id);
      setTimelineData(res.data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleDeleteVehicle = async (id: string, plate: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف السيارة ذات اللوحة "${plate}" وكافة سجلاتها التاريخية والزيارات المرتبطة نهائياً؟`)) {
      return;
    }
    try {
      await api.deleteVehicle(id);
      if (timelineData?.vehicle?.id === id) {
        setTimelineData(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate_number || !formData.make || !formData.model) {
      alert('اللوحة والماركة والموديل حقول إلزامية');
      return;
    }

    let payload: any = { ...formData };
    if (ownerMode === 'existing') {
      if (!formData.current_owner_id) {
        alert('يرجى اختيار هوية المالك من قائمة العملاء المسجلين');
        return;
      }
    } else {
      if (!newOwner.full_name.trim() || !newOwner.phone.trim()) {
        alert('اسم المالك الجديد ورقم هاتفه حقول إلزامية');
        return;
      }
      payload.current_owner_id = undefined;
      payload.new_customer = {
        full_name: newOwner.full_name.trim(),
        phone: newOwner.phone.trim(),
        address: newOwner.address.trim()
      };
    }

    setSubmitting(true);
    try {
      await api.createVehicle(payload);
      setShowAddModal(false);
      setFormData({
        plate_number: '', vin: '', make: '', model: '', year: new Date().getFullYear(),
        color: '', fuel_type: 'بنزين', transmission_type: 'أوتوماتيك', current_odometer: 0,
        current_owner_id: '', notes: ''
      });
      setNewOwner({ full_name: '', phone: '', address: '' });
      setOwnerMode('existing');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !transferData.new_owner_id) {
      alert('يرجى تحديد المالك الجديد');
      return;
    }

    setSubmitting(true);
    try {
      await api.transferOwnership(selectedVehicle.id, transferData);
      setShowTransferModal(false);
      loadData();
      alert('تم نقل الملكية بنجاح مع حفظ تاريخ المالك السابق');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث برقم اللوحة، الهيكل VIN، الماركة، أو المالك..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-sky-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل سيارة جديدة</span>
        </button>
      </div>

      {/* Vehicles Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">جاري جلب قائمة السيارات...</div>
        ) : vehicles.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Car className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-300">لم يتم العثور على أي سيارات</p>
            <p className="text-xs text-slate-500 mt-1">سجل سيارة جديدة لربطها بالعميل وبدء تاريخ الصيانة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-xs">
                <tr>
                  <th className="py-3.5 px-4">رقم اللوحة</th>
                  <th className="py-3.5 px-4">السيارة</th>
                  <th className="py-3.5 px-4">رقم الهيكل VIN</th>
                  <th className="py-3.5 px-4">المالك الحالي</th>
                  <th className="py-3.5 px-4">العداد الحالي</th>
                  <th className="py-3.5 px-4">الزيارات</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات وتاريخ السيارة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400 bg-slate-950/40">{v.plate_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-100">
                      {v.make} {v.model} ({v.year})
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">{v.vin || '-'}</td>
                    <td className="py-3 px-4 text-slate-300">{v.owner_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{v.current_odometer.toLocaleString()} كم</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-300 font-mono">
                        {v.visits_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenTimeline(v)}
                          className="flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border border-sky-500/20"
                          title="عرض سجل وتاريخ السيارة الكامل للأحداث"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>تاريخ السيارة</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedVehicle(v);
                            setShowTransferModal(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          title="نقل ملكية السيارة لعميل آخر"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteVehicle(v.id, v.plate_number)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors"
                          title="حذف السيارة وسجلاتها"
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

      {/* Register Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white">تسجيل سيارة جديدة</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    رقم اللوحة * <span className="text-[11px] text-slate-500 font-normal">(3 حروف + 3 أرقام)</span>
                  </label>
                  <LicensePlateInput
                    required
                    value={formData.plate_number}
                    onChange={(val) => setFormData({ ...formData, plate_number: val })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    رقم الشاسيه (VIN) <span className="text-[11px] text-slate-500 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="17 حرف ورقم"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono text-xs uppercase shadow-inner"
                  />
                  <div className="text-[11px] text-slate-500 px-1 mt-1.5">
                    رقم الهيكل التسلسلي للمركبة
                  </div>
                </div>
              </div>

              {/* اختيار ماركة وموديل السيارة بالقوائم المنسدلة الذكية مع خيار الإضافة اليدوية */}
              <CarBrandModelSelector
                selectedMake={formData.make}
                selectedModel={formData.model}
                onMakeChange={(make) => setFormData(prev => ({ ...prev, make }))}
                onModelChange={(model) => setFormData(prev => ({ ...prev, model }))}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">سنة الصنع *</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 2020 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">لون السيارة</label>
                  <input
                    type="text"
                    placeholder="أبيض، أسود، فضي..."
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">العداد الحالي (كم)</label>
                  <input
                    type="number"
                    placeholder="45000"
                    value={formData.current_odometer}
                    onChange={(e) => setFormData({ ...formData, current_odometer: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">نوع الوقود</label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="بنزين">بنزين</option>
                    <option value="ديزل">ديزل</option>
                    <option value="هايبرد">هايبرد</option>
                    <option value="كهرباء">كهرباء</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">ناقل الحركة</label>
                  <select
                    value={formData.transmission_type}
                    onChange={(e) => setFormData({ ...formData, transmission_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="أوتوماتيك">أوتوماتيك</option>
                    <option value="مانيوال">يدوي (مانيوال)</option>
                    <option value="CVT">CVT</option>
                    <option value="دبل كلاتش">دبل كلاتش (DCT)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-sky-400" />
                    <span>مالك السيارة *</span>
                  </label>
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
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
                    <button
                      type="button"
                      onClick={() => setOwnerMode('new')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                        ownerMode === 'new'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>تسجيل مالك جديد</span>
                    </button>
                  </div>
                </div>

                {ownerMode === 'existing' ? (
                  <div>
                    <select
                      required={ownerMode === 'existing'}
                      value={formData.current_owner_id}
                      onChange={(e) => setFormData({ ...formData, current_owner_id: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                    >
                      <option value="">اختر العميل المالك...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name} ({c.phone}) - {c.customer_code}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">اسم المالك بالكامل *</label>
                      <input
                        type="text"
                        required={ownerMode === 'new'}
                        placeholder="محمد الشريف..."
                        value={newOwner.full_name}
                        onChange={(e) => setNewOwner({ ...newOwner, full_name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">رقم هاتف المحمول *</label>
                      <input
                        type="tel"
                        required={ownerMode === 'new'}
                        placeholder="01012345678"
                        value={newOwner.phone}
                        onChange={(e) => setNewOwner({ ...newOwner, phone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">العنوان / ملاحظات (اختياري)</label>
                      <input
                        type="text"
                        placeholder="المدينة / المنطقة"
                        value={newOwner.address}
                        onChange={(e) => setNewOwner({ ...newOwner, address: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
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
                  {submitting ? 'جاري الحفظ...' : 'حفظ السيارة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white">نقل ملكية السيارة مع حفظ الأرشيف</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferOwnership} className="p-5 space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <p className="font-bold text-sky-400">{selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.plate_number})</p>
                <p className="text-slate-400 mt-1">المالك السابق: <span className="text-slate-200">{selectedVehicle.owner_name}</span></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المالك الجديد *</label>
                <select
                  required
                  value={transferData.new_owner_id}
                  onChange={(e) => setTransferData({ ...transferData, new_owner_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="">اختر العميل المشتري...</option>
                  {customers.filter(c => c.id !== selectedVehicle.current_owner_id).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">سبب نقل الملكية والملاحظات</label>
                <input
                  type="text"
                  placeholder="مبايعة / انتقال ملكية"
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? 'جاري التنفيذ...' : 'تأكيد نقل الملكية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Unified Vehicle Timeline Modal (Section 6) */}
      {selectedVehicle && timelineData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-600/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-white">
                      {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
                    </h3>
                    <span className="font-mono text-xs font-bold bg-sky-500/10 text-sky-400 px-2.5 py-0.5 rounded border border-sky-500/20">
                      {selectedVehicle.plate_number}
                    </span>
                    <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/20">
                      تاريخ وسجل السيارة
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    المالك الحالي: <span className="text-slate-200 font-semibold">{selectedVehicle.owner_name}</span> | العداد: <span className="font-mono text-slate-200 font-bold">{selectedVehicle.current_odometer.toLocaleString()} كم</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedVehicle(null);
                  setTimelineData(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Timeline Filter Badges */}
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/30 flex items-center gap-2 overflow-x-auto text-xs">
              <button
                onClick={() => setTimelineFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  timelineFilter === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                كل الأحداث ({timelineData.timeline?.length || 0})
              </button>
              <button
                onClick={() => setTimelineFilter('visit')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  timelineFilter === 'visit' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                زيارات الورشة
              </button>
              <button
                onClick={() => setTimelineFilter('diagnostic')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  timelineFilter === 'diagnostic' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                الفحص وأكواد DTC
              </button>
              <button
                onClick={() => setTimelineFilter('fluid')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  timelineFilter === 'fluid' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                الزيوت والصيانة
              </button>
              <button
                onClick={() => setTimelineFilter('invoice')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  timelineFilter === 'invoice' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                الفواتير والمدفوعات
              </button>
            </div>

            {/* Timeline Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {timelineLoading ? (
                <div className="p-12 text-center text-slate-400 text-sm">جاري جلب وتجميع تاريخ وسجل السيارة...</div>
              ) : timelineData.timeline && timelineData.timeline.length > 0 ? (
                <div className="relative border-r-2 border-slate-800 pr-6 mr-3 space-y-6">
                  {timelineData.timeline
                    .filter((ev: any) => timelineFilter === 'all' || ev.type === timelineFilter)
                    .map((event: any) => {
                      const typeConfig: Record<string, { color: string; icon: any; label: string }> = {
                        visit: { color: 'bg-indigo-500 text-indigo-400 border-indigo-500/30', icon: Calendar, label: 'زيارة ورشة' },
                        work_order: { color: 'bg-sky-500 text-sky-400 border-sky-500/30', icon: Clock, label: 'أمر إصلاح' },
                        diagnostic: { color: 'bg-purple-500 text-purple-400 border-purple-500/30', icon: Cpu, label: 'فحص كمبيوتر' },
                        fluid: { color: 'bg-amber-500 text-amber-400 border-amber-500/30', icon: Droplet, label: 'تغيير زيت' },
                        invoice: { color: 'bg-emerald-500 text-emerald-400 border-emerald-500/30', icon: Receipt, label: 'فاتورة' },
                        attachment: { color: 'bg-rose-500 text-rose-400 border-rose-500/30', icon: FileText, label: 'مرفق وصور' },
                        ownership: { color: 'bg-slate-500 text-slate-400 border-slate-500/30', icon: UserCheck, label: 'نقل ملكية' }
                      };
                      const conf = typeConfig[event.type] || { color: 'bg-sky-500 text-sky-400 border-sky-500/30', icon: Clock, label: event.type };
                      const Icon = conf.icon;

                      return (
                        <div key={event.id} className="relative group">
                          {/* Dot on the vertical line */}
                          <div className={`absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-slate-900 ${conf.color} flex items-center justify-center ring-4 ring-slate-900`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>

                          {/* Event Card */}
                          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl hover:border-slate-700 transition-colors shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${conf.color}`}>
                                  {conf.label}
                                </span>
                                <h4 className="font-bold text-sm text-slate-100">{event.title}</h4>
                              </div>
                              <span className="text-xs text-slate-500 font-mono">
                                {new Date(event.timestamp).toLocaleString('ar-SA')}
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{event.description}</p>

                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-500">
                              <span>المسؤول: {event.authorName || 'موظف النظام'}</span>
                              {event.odometer && (
                                <span className="font-mono flex items-center gap-1 text-slate-400">
                                  <Gauge className="w-3.5 h-3.5 text-sky-400" />
                                  عداد: {event.odometer.toLocaleString()} كم
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">لا توجد أحداث مسجلة في هذا التصنيف.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
