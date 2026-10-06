import React, { useState, useEffect } from 'react';
import { Droplet, Plus, Calendar, AlertTriangle, Gauge, Car, X, Clock, Check } from 'lucide-react';
import { api } from '../../services/api';
import { FluidRecord, Visit, Vehicle } from '../../types';
import { useSync } from '../../context/SyncContext';

export const FluidsView: React.FC = () => {
  const [records, setRecords] = useState<FluidRecord[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'upcoming'>('records');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    visit_id: '',
    fluid_type: 'زيت محرك',
    brand: 'Mobil 1',
    product_name: 'ESP Formula',
    viscosity: '5W-30',
    specifications: 'API SP / ILSAC GF-6A',
    quantity_liters: 4.5,
    filter_part_number: '',
    filter_replaced: true,
    cost: 130,
    price: 190,
    current_odometer: 0,
    interval_km: 10000,
    interval_months: 6
  });

  const [submitting, setSubmitting] = useState(false);
  const { lastEvent } = useSync();

  const loadData = () => {
    Promise.all([
      api.getFluids(),
      api.getUpcomingMaintenance(),
      api.getVisits()
    ]).then(([flRes, upRes, visRes]) => {
      setRecords(flRes.data);
      setUpcoming(upRes.data);
      setVisits(visRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (lastEvent?.entity === 'fluids') {
      loadData();
    }
  }, [lastEvent]);

  const handleVisitSelect = (vId: string) => {
    const v = visits.find(x => x.id === vId);
    if (v) {
      setFormData(prev => ({
        ...prev,
        visit_id: vId,
        current_odometer: v.odometer_in
      }));
    } else {
      setFormData(prev => ({ ...prev, visit_id: vId }));
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const vis = visits.find(v => v.id === formData.visit_id);
    if (!vis) {
      alert('يرجى اختيار زيارة السيارة');
      return;
    }

    setSubmitting(true);
    try {
      await api.createFluidRecord({
        ...formData,
        vehicle_id: vis.vehicle_id
      });
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'records'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            سجل تغيير الزيوت ({records.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'upcoming'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>مواعيد الصيانة القادمة ({upcoming.length})</span>
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل تغيير زيت / سوائل</span>
        </button>
      </div>

      {/* View Content */}
      {activeTab === 'records' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">جاري جلب السجلات...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Droplet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="font-semibold text-slate-300">لم يتم تسجيل أي عمليات تغيير زيت بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-xs">
                  <tr>
                    <th className="py-3.5 px-4">السيارة واللوحة</th>
                    <th className="py-3.5 px-4">نوع الزيت / السائل</th>
                    <th className="py-3.5 px-4">الماركة واللزوجة</th>
                    <th className="py-3.5 px-4">الكمية والفلتر</th>
                    <th className="py-3.5 px-4">العداد وقت التغيير</th>
                    <th className="py-3.5 px-4">الصيانة القادمة</th>
                    <th className="py-3.5 px-4">الفني المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {r.make} {r.model} ({r.plate_number})
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-400">{r.fluid_type}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {r.brand} <span className="font-mono text-xs font-bold text-slate-400">({r.viscosity || '-'})</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {r.quantity_liters} لتر {r.filter_replaced ? '(+ فلتر)' : ''}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{r.current_odometer.toLocaleString()} كم</td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs text-emerald-400 font-bold">
                          {r.next_due_km ? `${r.next_due_km.toLocaleString()} كم` : '-'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {r.next_due_date || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{r.technician_name || 'الفني'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Upcoming Maintenance Section */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcoming.length === 0 ? (
            <div className="col-span-full p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
              <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-300">جميع السيارات في حالة جيدة ولا توجد مواعيد صيانة مستحقة قريباً</p>
            </div>
          ) : (
            upcoming.map((v) => (
              <div key={v.id} className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {v.plate_number}
                  </span>
                  <span className="text-xs text-slate-400">{v.customer_name}</span>
                </div>

                <h4 className="font-bold text-sm text-slate-100">{v.make} {v.model} ({v.year})</h4>

                <div className="mt-3 p-3 bg-slate-950 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">العداد الحالي:</span>
                    <strong className="text-white font-mono">{v.current_odometer.toLocaleString()} كم</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الصيانة مستحقة عند:</span>
                    <strong className="text-amber-400 font-mono">{v.next_maintenance_km ? `${v.next_maintenance_km.toLocaleString()} كم` : '-'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">التاريخ المستحق:</span>
                    <strong className="text-amber-400">{v.next_maintenance_date || '-'}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 font-mono" dir="ltr">هاتف العميل: {v.phone}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white">تسجيل صيانة زيوت وسوائل</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الزيارة والسيارة *</label>
                <select
                  required
                  value={formData.visit_id}
                  onChange={(e) => handleVisitSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">اختر الزيارة...</option>
                  {visits.map((vis) => (
                    <option key={vis.id} value={vis.id}>
                      [{vis.visit_number}] {vis.make} {vis.model} ({vis.plate_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">نوع السائل / الخدمة *</label>
                  <select
                    value={formData.fluid_type}
                    onChange={(e) => setFormData({ ...formData, fluid_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="زيت محرك">زيت محرك (Engine Oil)</option>
                    <option value="زيت قير أوتوماتيك">زيت قير أوتوماتيك (ATF)</option>
                    <option value="زيت فرامل">زيت فرامل (Brake Fluid)</option>
                    <option value="سائل تبريد رديتر">سائل تبريد رديتر (Coolant)</option>
                    <option value="زيت دفرنس">زيت دفرنس (Differential Oil)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الشركة المصنعة للزيت *</label>
                  <input
                    type="text"
                    required
                    placeholder="Mobil 1, Castrol, Shell, Motul..."
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">اللزوجة (Viscosity)</label>
                  <input
                    type="text"
                    placeholder="5W-30, 0W-20..."
                    value={formData.viscosity}
                    onChange={(e) => setFormData({ ...formData, viscosity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الكمية باللتر *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.quantity_liters}
                    onChange={(e) => setFormData({ ...formData, quantity_liters: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">العداد الحالي (كم) *</label>
                  <input
                    type="number"
                    required
                    value={formData.current_odometer}
                    onChange={(e) => setFormData({ ...formData, current_odometer: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">فترة الصيانة القادمة (كم)</label>
                  <input
                    type="number"
                    value={formData.interval_km}
                    onChange={(e) => setFormData({ ...formData, interval_km: parseInt(e.target.value) || 10000 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">فترة الصيانة القادمة (أشهر)</label>
                  <input
                    type="number"
                    value={formData.interval_months}
                    onChange={(e) => setFormData({ ...formData, interval_months: parseInt(e.target.value) || 6 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="filter_rep"
                  checked={formData.filter_replaced}
                  onChange={(e) => setFormData({ ...formData, filter_replaced: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                />
                <label htmlFor="filter_rep" className="text-xs text-slate-200">تم تغيير فلتر الزيت (سيفون)</label>
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
                  className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ عملية التغيير'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
