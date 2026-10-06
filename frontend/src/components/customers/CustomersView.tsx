import React, { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, MapPin, Car, Receipt, Calendar, X, Eye, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { Customer } from '../../types';
import { useSync } from '../../context/SyncContext';
import { LicensePlateInput } from '../common/LicensePlateInput';
import { CarBrandModelSelector } from '../vehicles/CarBrandModelSelector';

interface CustomersViewProps {
  initialSearch?: string;
  initialCustomerId?: string;
}

const initialVehicleState = {
  plate_number: '',
  vin: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  fuel_type: 'بنزين',
  transmission_type: 'أوتوماتيك',
  current_odometer: 0,
};

export const CustomersView: React.FC<CustomersViewProps> = ({ initialSearch, initialCustomerId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState(initialSearch || '');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    phone_secondary: '',
    email: '',
    address: '',
    notes: ''
  });

  // Vehicle states for creating customer with vehicle
  const [includeVehicle, setIncludeVehicle] = useState(true);
  const [vehicleData, setVehicleData] = useState(initialVehicleState);

  // Vehicle states for adding additional vehicle to existing customer
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [customerVehicleData, setCustomerVehicleData] = useState(initialVehicleState);
  const [addingVehicleSubmitting, setAddingVehicleSubmitting] = useState(false);

  // Hover preview state for vehicle count badge
  const [hoveredVehicleBadge, setHoveredVehicleBadge] = useState<{
    customer: Customer;
    rect: DOMRect;
  } | null>(null);

  const handleVehicleBadgeMouseEnter = (c: Customer, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredVehicleBadge({ customer: c, rect });

    if (!c.vehicles) {
      api.getCustomerById(c.id).then((res) => {
        if (res.data?.vehicles) {
          c.vehicles = res.data.vehicles;
          setHoveredVehicleBadge(prev => prev && prev.customer.id === c.id ? { customer: { ...c, vehicles: res.data.vehicles }, rect } : prev);
        }
      }).catch(() => {});
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const { lastEvent } = useSync();

  const loadCustomers = () => {
    api.getCustomers(search)
      .then((res) => setCustomers(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
    if (initialCustomerId) {
      handleOpenDetail(initialCustomerId);
    }
  }, [initialSearch, initialCustomerId]);

  useEffect(() => {
    if (lastEvent?.entity === 'customers' || lastEvent?.entity === 'vehicles') {
      loadCustomers();
      if (selectedCustomer) {
        handleOpenDetail(selectedCustomer.id);
      }
    }
  }, [lastEvent]);

  const handleOpenDetail = (id: string) => {
    api.getCustomerById(id)
      .then((res) => setSelectedCustomer(res.data))
      .catch((err) => alert(err.message));
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف العميل "${name}" وكافة سياراته وسجلاته المرتبطة نهائياً؟`)) {
      return;
    }
    try {
      await api.deleteCustomer(id);
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
      }
      loadCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      alert('الاسم ورقم الهاتف حقول إلزامية');
      return;
    }

    if (includeVehicle) {
      if (!vehicleData.plate_number.trim()) {
        alert('يرجى إدخال رقم لوحة السيارة للعميل');
        return;
      }
      if (!vehicleData.make.trim()) {
        alert('يرجى اختيار ماركة السيارة');
        return;
      }
      if (!vehicleData.model.trim()) {
        alert('يرجى اختيار أو إدخال موديل السيارة');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        vehicle: includeVehicle && vehicleData.plate_number.trim() ? vehicleData : undefined
      };
      await api.createCustomer(payload);
      setShowAddModal(false);
      setFormData({ full_name: '', phone: '', phone_secondary: '', email: '', address: '', notes: '' });
      setVehicleData({ ...initialVehicleState, year: new Date().getFullYear() });
      loadCustomers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVehicleToCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (!customerVehicleData.plate_number.trim()) {
      alert('يرجى إدخال رقم لوحة السيارة');
      return;
    }
    if (!customerVehicleData.make.trim() || !customerVehicleData.model.trim()) {
      alert('يرجى اختيار ماركة وموديل السيارة');
      return;
    }

    setAddingVehicleSubmitting(true);
    try {
      await api.createVehicle({
        ...customerVehicleData,
        current_owner_id: selectedCustomer.id
      });
      setShowAddVehicleModal(false);
      setCustomerVehicleData({ ...initialVehicleState, year: new Date().getFullYear() });
      handleOpenDetail(selectedCustomer.id);
      loadCustomers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingVehicleSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف أو كود العميل..."
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
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* Customers Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">جاري جلب قائمة العملاء...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <User className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-300">لم يتم العثور على أي عملاء</p>
            <p className="text-xs text-slate-500 mt-1">أضف عميلاً جديداً للبدء</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-xs">
                <tr>
                  <th className="py-3.5 px-4">كود العميل</th>
                  <th className="py-3.5 px-4">الاسم الكامل</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">عدد السيارات</th>
                  <th className="py-3.5 px-4">الزيارات</th>
                  <th className="py-3.5 px-4">الرصيد المستحق</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">{c.customer_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-100">{c.full_name}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono" dir="ltr">{c.phone}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(c.id)}
                        onMouseEnter={(e) => handleVehicleBadgeMouseEnter(c, e)}
                        onMouseLeave={() => setHoveredVehicleBadge(null)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer select-none ${
                          (c.vehicles_count || 0) > 0
                            ? 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-sky-500 hover:bg-sky-500/10 hover:text-sky-300 shadow-sm'
                            : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'
                        }`}
                        title="مرر المؤشر لمعاينة السيارات، أو انقر لفتح الملف"
                      >
                        <Car className={`w-3.5 h-3.5 ${(c.vehicles_count || 0) > 0 ? 'text-sky-400' : 'text-slate-600'}`} />
                        <span>{c.vehicles_count || 0}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{c.visit_count}</td>
                    <td className="py-3 px-4">
                      {c.total_balance_due > 0 ? (
                        <span className="text-amber-400 font-bold font-mono">
                          {c.total_balance_due.toLocaleString()} ج.م
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-xs font-semibold">مسدد بالكامل</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(c.id)}
                          className="p-1.5 bg-slate-800 hover:bg-sky-600/20 hover:text-sky-400 text-slate-300 rounded-lg transition-colors"
                          title="عرض الملف الشامل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(c.id, c.full_name)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors"
                          title="حذف العميل وسجلاته"
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">إضافة عميل جديد</h3>
                  <p className="text-[11px] text-slate-400">تسجيل بيانات العميل مع إمكانية إضافة سيارته مباشرة</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Customer Primary Info */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-3.5">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2 border-b border-slate-800/60 pb-2">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>البيانات الشخصية للعميل</span>
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عبد الرحمن بن خالد المطيري"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف الأساسي *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+9665xxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">هاتف إضافي (اختياري)</label>
                    <input
                      type="tel"
                      placeholder="رقم آخر"
                      value={formData.phone_secondary}
                      onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">العنوان أو الحي</label>
                  <input
                    type="text"
                    placeholder="الرياض - حي الملز (أو أي تفاصيل للعنوان)..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Customer Vehicle Section - Matching Image 2 */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-sky-900/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-sky-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">بيانات سيارة العميل</h4>
                      <p className="text-[11px] text-slate-400">إضافة سيارة مرتبطة بهذا العميل مباشرة</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={includeVehicle}
                      onChange={(e) => setIncludeVehicle(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-300">تسجيل سيارة للعميل الآن</span>
                  </label>
                </div>

                {includeVehicle && (
                  <div className="space-y-4 animate-in fade-in duration-150 pt-1">
                    {/* Plate Number & VIN */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          رقم اللوحة * <span className="text-[11px] text-slate-500 font-normal">(3 حروف + 3 أرقام)</span>
                        </label>
                        <LicensePlateInput
                          required={includeVehicle}
                          value={vehicleData.plate_number}
                          onChange={(val) => setVehicleData({ ...vehicleData, plate_number: val })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          رقم الشاسيه (VIN) <span className="text-[11px] text-slate-500 font-normal">(اختياري)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="17 حرف ورقم"
                          value={vehicleData.vin}
                          onChange={(e) => setVehicleData({ ...vehicleData, vin: e.target.value })}
                          className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono text-xs uppercase shadow-inner"
                        />
                        <div className="text-[11px] text-slate-500 px-1 mt-1.5">
                          رقم الهيكل التسلسلي للمركبة
                        </div>
                      </div>
                    </div>

                    {/* Brand and Model Selector with custom add */}
                    <CarBrandModelSelector
                      selectedMake={vehicleData.make}
                      selectedModel={vehicleData.model}
                      onMakeChange={(make) => setVehicleData(prev => ({ ...prev, make }))}
                      onModelChange={(model) => setVehicleData(prev => ({ ...prev, model }))}
                      required={includeVehicle}
                    />

                    {/* Year, Color, Odometer */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">سنة الصنع *</label>
                        <input
                          type="number"
                          required={includeVehicle}
                          value={vehicleData.year}
                          onChange={(e) => setVehicleData({ ...vehicleData, year: parseInt(e.target.value) || 2024 })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">لون السيارة</label>
                        <input
                          type="text"
                          placeholder="أبيض، أسود، فضي..."
                          value={vehicleData.color}
                          onChange={(e) => setVehicleData({ ...vehicleData, color: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">العداد الحالي (كم)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={vehicleData.current_odometer}
                          onChange={(e) => setVehicleData({ ...vehicleData, current_odometer: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Fuel Type & Transmission */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">نوع الوقود</label>
                        <select
                          value={vehicleData.fuel_type}
                          onChange={(e) => setVehicleData({ ...vehicleData, fuel_type: e.target.value })}
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
                          value={vehicleData.transmission_type}
                          onChange={(e) => setVehicleData({ ...vehicleData, transmission_type: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                        >
                          <option value="أوتوماتيك">أوتوماتيك</option>
                          <option value="مانيوال">يدوي (مانيوال)</option>
                          <option value="CVT">CVT</option>
                          <option value="دبل كلاتش">دبل كلاتش (DCT)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 sticky bottom-0 bg-slate-900 pb-1">
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
                  className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? 'جاري الحفظ...' : includeVehicle ? 'حفظ العميل والسيارة' : 'حفظ العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-r border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                    {selectedCustomer.customer_code}
                  </span>
                  <h3 className="font-bold text-base text-white">{selectedCustomer.full_name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono" dir="ltr">{selectedCustomer.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.full_name)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors border border-rose-500/20 text-xs flex items-center gap-1 font-bold"
                  title="حذف هذا العميل"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف</span>
                </button>
                <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Customer Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400">إجمالي الرصيد المستحق</p>
                  <p className={`text-lg font-bold mt-1 font-mono ${selectedCustomer.total_balance_due > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {selectedCustomer.total_balance_due?.toLocaleString()} ج.م
                  </p>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400">عدد الزيارات المسجلة</p>
                  <p className="text-lg font-bold text-white mt-1">{selectedCustomer.visit_count || 0}</p>
                </div>
              </div>

              {/* Owned Vehicles Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-sky-400" />
                    السيارات المسجلة باسم العميل ({selectedCustomer.vehicles?.length || 0})
                  </h4>
                  <button
                    onClick={() => {
                      setCustomerVehicleData({ ...initialVehicleState, year: new Date().getFullYear() });
                      setShowAddVehicleModal(true);
                    }}
                    className="flex items-center gap-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border border-sky-500/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة سيارة جديدة</span>
                  </button>
                </div>

                {selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCustomer.vehicles.map((v: any) => (
                      <div key={v.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{v.make} {v.model} ({v.year})</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">لوحة: {v.plate_number} | عداد: {v.current_odometer.toLocaleString()} كم</p>
                        </div>
                        <span className="text-[11px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded font-mono">
                          {v.fuel_type}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400 mb-2">لا توجد سيارات مسجلة باسم هذا العميل حالياً.</p>
                    <button
                      onClick={() => {
                        setCustomerVehicleData({ ...initialVehicleState, year: new Date().getFullYear() });
                        setShowAddVehicleModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة سيارة لهذا العميل</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Invoices History */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  سجل الفواتير
                </h4>
                {selectedCustomer.invoices && selectedCustomer.invoices.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCustomer.invoices.map((inv: any) => (
                      <div key={inv.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-sky-400 font-mono">{inv.invoice_number}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{new Date(inv.issue_date).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-white font-mono">{inv.grand_total.toLocaleString()} ج.م</p>
                          <p className={`text-[10px] font-bold ${inv.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {inv.status === 'paid' ? 'مسددة' : `متبقي: ${inv.balance_due} ج.م`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">لا توجد فواتير سابقة لهذا العميل.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Additional Vehicle Directly for Selected Customer Modal */}
      {showAddVehicleModal && selectedCustomer && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">إضافة سيارة للعميل: {selectedCustomer.full_name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">كود العميل: {selectedCustomer.customer_code}</p>
                </div>
              </div>
              <button onClick={() => setShowAddVehicleModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVehicleToCustomer} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Plate Number & VIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    رقم اللوحة * <span className="text-[11px] text-slate-500 font-normal">(3 حروف + 3 أرقام)</span>
                  </label>
                  <LicensePlateInput
                    required
                    value={customerVehicleData.plate_number}
                    onChange={(val) => setCustomerVehicleData({ ...customerVehicleData, plate_number: val })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    رقم الشاسيه (VIN) <span className="text-[11px] text-slate-500 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="17 حرف ورقم"
                    value={customerVehicleData.vin}
                    onChange={(e) => setCustomerVehicleData({ ...customerVehicleData, vin: e.target.value })}
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono text-xs uppercase shadow-inner"
                  />
                  <div className="text-[11px] text-slate-500 px-1 mt-1.5">
                    رقم الهيكل التسلسلي للمركبة
                  </div>
                </div>
              </div>

              {/* Brand and Model Selector */}
              <CarBrandModelSelector
                selectedMake={customerVehicleData.make}
                selectedModel={customerVehicleData.model}
                onMakeChange={(make) => setCustomerVehicleData(prev => ({ ...prev, make }))}
                onModelChange={(model) => setCustomerVehicleData(prev => ({ ...prev, model }))}
                required
              />

              {/* Year, Color, Odometer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">سنة الصنع *</label>
                  <input
                    type="number"
                    required
                    value={customerVehicleData.year}
                    onChange={(e) => setCustomerVehicleData({ ...customerVehicleData, year: parseInt(e.target.value) || 2024 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">لون السيارة</label>
                  <input
                    type="text"
                    placeholder="أبيض، أسود، فضي..."
                    value={customerVehicleData.color}
                    onChange={(e) => setCustomerVehicleData({ ...customerVehicleData, color: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">العداد الحالي (كم)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={customerVehicleData.current_odometer}
                    onChange={(e) => setCustomerVehicleData({ ...customerVehicleData, current_odometer: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              {/* Fuel Type & Transmission */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">نوع الوقود</label>
                  <select
                    value={customerVehicleData.fuel_type}
                    onChange={(e) => setCustomerVehicleData({ ...customerVehicleData, fuel_type: e.target.value })}
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
                    value={customerVehicleData.transmission_type}
                    onChange={(e) => setCustomerVehicleData({ ...customerVehicleData, transmission_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="أوتوماتيك">أوتوماتيك</option>
                    <option value="مانيوال">يدوي (مانيوال)</option>
                    <option value="CVT">CVT</option>
                    <option value="دبل كلاتش">دبل كلاتش (DCT)</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 sticky bottom-0 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addingVehicleSubmitting}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 disabled:opacity-50"
                >
                  {addingVehicleSubmitting ? 'جاري الحفظ...' : 'تسجيل وحفظ السيارة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Vehicle Preview on Hover */}
      {hoveredVehicleBadge && (
        <div
          className="fixed z-[100] pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            top: Math.max(16, Math.min(window.innerHeight - 380, hoveredVehicleBadge.rect.top - 20)),
            left: hoveredVehicleBadge.rect.left > 350
              ? hoveredVehicleBadge.rect.left - 340
              : hoveredVehicleBadge.rect.right + 12,
            width: '330px'
          }}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border border-sky-500/40 rounded-2xl shadow-2xl p-3.5 space-y-2.5 text-right text-slate-100 ring-1 ring-sky-500/20 shadow-black/90">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded font-bold">
                {hoveredVehicleBadge.customer.customer_code}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <Car className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">
                  {hoveredVehicleBadge.customer.full_name}
                </span>
              </div>
            </div>

            {/* List of Vehicles */}
            {hoveredVehicleBadge.customer.vehicles && hoveredVehicleBadge.customer.vehicles.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                {hoveredVehicleBadge.customer.vehicles.map((v: any, idx: number) => (
                  <div key={v.id || idx} className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5 shadow-inner">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {v.make} {v.model} {v.year ? `(${v.year})` : ''}
                      </span>
                      <span className="text-[11px] font-bold text-sky-300 font-mono bg-sky-950/80 border border-sky-800/60 px-2 py-0.5 rounded shrink-0 shadow-sm">
                        {v.plate_number}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400 pt-1.5 border-t border-slate-900/90">
                      <div>
                        العداد: <span className="text-slate-200 font-mono font-semibold">{v.current_odometer?.toLocaleString() || 0} كم</span>
                      </div>
                      <div>
                        الوقود: <span className="text-slate-200">{v.fuel_type || 'بنزين'}</span>
                      </div>
                      {v.transmission_type && (
                        <div>
                          الناقل: <span className="text-slate-200">{v.transmission_type}</span>
                        </div>
                      )}
                      {v.color && (
                        <div>
                          اللون: <span className="text-slate-200">{v.color}</span>
                        </div>
                      )}
                      {v.vin && (
                        <div className="col-span-2 text-[10px] font-mono text-slate-500 truncate" dir="ltr">
                          VIN: {v.vin}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/60">
                لا توجد سيارات مسجلة لهذا العميل حالياً
              </div>
            )}

            <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
              <span className="text-sky-400 font-semibold">إجمالي: {hoveredVehicleBadge.customer.vehicles?.length || hoveredVehicleBadge.customer.vehicles_count || 0} سيارة</span>
              <span>انقر لفتح الملف الشامل 👈</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

