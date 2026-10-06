import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Search,
  AlertTriangle,
  History,
  FileText,
  Upload,
  Camera,
  X,
  CheckCircle,
  HelpCircle,
  Car,
  Phone,
  Eye,
  User,
  Sparkles,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { DiagnosticReport, Visit, Vehicle } from '../../types';
import { useSync } from '../../context/SyncContext';
import { MaintenancePillsNav, MaintenanceCategory } from '../common/MaintenancePillsNav';

interface DiagnosticsViewProps {
  initialDtcCode?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  initialDtcCode,
  activeTab,
  onTabChange
}) => {
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // Cross-visit DTC search state
  const [dtcSearchCode, setDtcSearchCode] = useState(initialDtcCode || '');
  const [dtcHistoryResult, setDtcHistoryResult] = useState<any | null>(null);
  const [dtcSearching, setDtcSearching] = useState(false);

  // New report form state
  const [formData, setFormData] = useState({
    visit_id: '',
    scanner_manufacturer: 'Autel MaxiSys',
    scanner_model: 'MS908S Pro',
    system_tested: 'محرك ونظام الوقود (Engine & Fuel)',
    technician_notes: '',
    codes: [
      { dtc_code: 'P0301', description: 'Cylinder 1 Misfire Detected (تفتفة في السلندر رقم 1)', status_at_test: 'Current', is_confirmed_by_tech: true }
    ]
  });

  const [submitting, setSubmitting] = useState(false);
  const { lastEvent } = useSync();

  const loadData = () => {
    Promise.all([
      api.getDiagnostics(),
      api.getVisits()
    ]).then(([diagRes, visRes]) => {
      setReports(diagRes.data);
      setVisits(visRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (lastEvent?.entity === 'diagnostics') {
      loadData();
    }
  }, [lastEvent]);

  useEffect(() => {
    if (initialDtcCode) {
      setDtcSearchCode(initialDtcCode);
      api.getDtcHistory(initialDtcCode.trim())
        .then(res => setDtcHistoryResult(res.data))
        .catch(console.error);
    }
  }, [initialDtcCode]);

  const handleSearchDtcHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dtcSearchCode.trim()) return;

    setDtcSearching(true);
    try {
      const res = await api.getDtcHistory(dtcSearchCode.trim());
      setDtcHistoryResult(res.data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDtcSearching(false);
    }
  };

  const handleAddCodeRow = () => {
    setFormData(prev => ({
      ...prev,
      codes: [
        ...prev.codes,
        { dtc_code: '', description: '', status_at_test: 'Current', is_confirmed_by_tech: true }
      ]
    }));
  };

  const handleRemoveCodeRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      codes: prev.codes.filter((_, i) => i !== index)
    }));
  };

  const handleCodeChange = (index: number, field: string, value: any) => {
    const updated = [...formData.codes];
    (updated[index] as any)[field] = value;
    setFormData(prev => ({ ...prev, codes: updated }));
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const vis = visits.find(v => v.id === formData.visit_id);
    if (!vis) {
      alert('يرجى اختيار الزيارة والسيارة');
      return;
    }

    setSubmitting(true);
    try {
      await api.createDiagnostic({
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

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await api.getDiagnosticById(id);
      setSelectedReport(res.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (متناسق مع شريط التنقل لكافة أقسام الصيانة والفحوصات ومسمع مع القائمة الجانبية) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <span>الصيانة والفحوصات • فحص الكمبيوتر والأعطال (DTC)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            توثيق تقارير أجهزة كشف الأعطال وتتبع تاريخ ظهور أكواد DTC عبر زيارات السيارة المتتالية
          </p>
        </div>

        {/* DTC Quick Code Lookup */}
        <form onSubmit={handleSearchDtcHistory} className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="تتبع كود عطل (مثال: P0301)..."
            value={dtcSearchCode}
            onChange={(e) => setDtcSearchCode(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl pr-10 pl-24 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono uppercase"
          />
          <button
            type="submit"
            disabled={dtcSearching}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
          >
            {dtcSearching ? '...' : 'تتبع الكود'}
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick filter pills (مسمعة ومترابطة مع القائمة الجانبية) */}
          <MaintenancePillsNav
            activeCategory="diagnostics"
            onSelectCategory={(cat: MaintenanceCategory) => {
              if (onTabChange) {
                if (cat === 'all') onTabChange('work-orders');
                else if (cat === 'maintenance') onTabChange('maintenance');
                else if (cat === 'repair') onTabChange('repairs');
                else if (cat === 'overhaul') onTabChange('engine_overhaul');
                else if (cat === 'diagnostics') onTabChange('diagnostics');
              }
            }}
          />

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-purple-600/20 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل فحص جديد</span>
          </button>
        </div>
      </div>

      {/* DTC History Result Box */}
      {dtcHistoryResult && (
        <div className="bg-purple-950/30 border border-purple-800/50 p-4 rounded-2xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
                {dtcHistoryResult.dtc_code}
              </span>
              <h4 className="font-bold text-sm text-slate-100">سجل تطور كود العطل عبر الزيارات:</h4>
            </div>
            <button onClick={() => setDtcHistoryResult(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 text-xs">
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">مرات الظهور: </span>
              <strong className="text-white font-mono">{dtcHistoryResult.total_appearances}</strong>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">أول ظهور: </span>
              <strong className="text-slate-300">{dtcHistoryResult.first_detected ? new Date(dtcHistoryResult.first_detected).toLocaleDateString('ar-SA') : '-'}</strong>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">الحالة بعد آخر فحص: </span>
              <strong className={dtcHistoryResult.current_verified_state === 'resolved_verified' ? 'text-emerald-400' : 'text-amber-400'}>
                {dtcHistoryResult.current_verified_state === 'resolved_verified' ? 'تم الحل والتأكيد بفحص لاحق' : 'لا يزال نشطاً أو قيد الإصلاح'}
              </strong>
            </div>
          </div>

          <div className="space-y-2">
            {dtcHistoryResult.appearances.map((app: any) => (
              <div key={app.id} className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">
                    زيارة [{app.visit_number}] - سيارة: {app.make} {app.model} ({app.plate_number})
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    الجهاز: {app.scanner_manufacturer} | النظام: {app.system_tested} | الحالة: <span className="text-purple-400 font-bold">{app.status_at_test}</span>
                  </p>
                </div>
                <span className="text-slate-500 font-mono">
                  {new Date(app.test_datetime).toLocaleDateString('ar-SA')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Reports Header & Add Button */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-slate-300">تقارير الفحص المسجلة</h4>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل فحص كمبيوتر جديد</span>
        </button>
      </div>

      {/* Pending Diagnostics Visits (سيارات محولة لفحص الكمبيوتر) */}
      {visits.filter(v => ['diagnostics', 'diagnosing'].includes(v.status)).length > 0 && (
        <div className="bg-purple-950/20 border border-purple-800/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-purple-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>سيارات محولة لقسم فحص وتشخيص الكمبيوتر (DTC):</span>
            </h4>
            <span className="text-xs text-purple-400 font-bold bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              {visits.filter(v => ['diagnostics', 'diagnosing'].includes(v.status)).length} سيارة بانتظار الفحص
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-purple-950/60 text-purple-300 border-b border-purple-800/30">
                <tr>
                  <th className="py-2.5 px-3">رقم الزيارة</th>
                  <th className="py-2.5 px-3">السيارة واللوحة</th>
                  <th className="py-2.5 px-3">العميل</th>
                  <th className="py-2.5 px-3">شكوى العميل والعطل</th>
                  <th className="py-2.5 px-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-800/20">
                {visits
                  .filter(v => ['diagnostics', 'diagnosing'].includes(v.status))
                  .map(vis => (
                    <tr key={vis.id} className="hover:bg-purple-900/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                        #{vis.visit_number}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-100">
                        {vis.make} {vis.model} ({vis.plate_number})
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{vis.customer_name}</td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                        {vis.customer_complaint}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              visit_id: vis.id,
                              technician_notes: `فحص كمبيوتر بناء على شكوى العميل: ${vis.customer_complaint}`
                            }));
                            setShowAddModal(true);
                          }}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                        >
                          بدء تسجيل الفحص
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Table (جدول تقارير الفحص المعتمد) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">جاري تحميل تقارير الفحص...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Cpu className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-300">لا توجد تقارير فحص مسجلة حالياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-xs">
                <tr>
                  <th className="py-3.5 px-4">جهاز الفحص والموديل</th>
                  <th className="py-3.5 px-4">تاريخ الفحص</th>
                  <th className="py-3.5 px-4">السيارة واللوحة</th>
                  <th className="py-3.5 px-4">النظام المفحوص</th>
                  <th className="py-3.5 px-4">الفني المسؤول</th>
                  <th className="py-3.5 px-4">أكواد DTC</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reports.map((rep) => (
                  <tr
                    key={rep.id}
                    onClick={() => handleOpenDetail(rep.id)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {rep.scanner_manufacturer || 'جهاز فحص'}
                      </span>
                      {rep.scanner_model && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {rep.scanner_model}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {new Date(rep.test_datetime).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <Car className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{rep.make} {rep.model}</span>
                      </div>
                      <div className="mt-1">
                        <span className="font-mono text-xs bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-emerald-300 font-bold">
                          {rep.plate_number}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {rep.system_tested}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>{rep.technician_name || 'الفني المسؤول'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {rep.codes && rep.codes.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
                          {rep.codes.map((code: any, idx: number) => (
                            <span
                              key={code.id || idx}
                              title={code.description ? `${code.dtc_code}: ${code.description}` : code.dtc_code}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDtcSearchCode(code.dtc_code);
                                api.getDtcHistory(code.dtc_code)
                                  .then(res => setDtcHistoryResult(res.data))
                                  .catch(console.error);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 transition-all text-xs cursor-pointer group/dtc"
                            >
                              <span className="font-mono font-black text-rose-400">
                                {code.dtc_code}
                              </span>
                              {code.description && (
                                <span className="text-[11px] text-slate-300 max-w-[140px] truncate">
                                  {code.description}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-xs whitespace-nowrap">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>لا توجد أعطال مسجلة</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(rep.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/20 text-xs font-bold transition-all flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض التقرير</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Diagnostic Report Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <h3 className="font-bold text-base text-white">تسجيل تقرير فحص كمبيوتر وأكواد DTC</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الزيارة والسيارة المفحوصة *</label>
                <select
                  required
                  value={formData.visit_id}
                  onChange={(e) => setFormData({ ...formData, visit_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="">اختر زيارة السيارة...</option>
                  {visits.map((vis) => (
                    <option key={vis.id} value={vis.id}>
                      [{vis.visit_number}] {vis.make} {vis.model} ({vis.plate_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الشركة المصنعة للجهاز</label>
                  <input
                    type="text"
                    value={formData.scanner_manufacturer}
                    onChange={(e) => setFormData({ ...formData, scanner_manufacturer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">موديل الجهاز</label>
                  <input
                    type="text"
                    value={formData.scanner_model}
                    onChange={(e) => setFormData({ ...formData, scanner_model: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">النظام المفحوص *</label>
                <select
                  value={formData.system_tested}
                  onChange={(e) => setFormData({ ...formData, system_tested: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="محرك ونظام الوقود (Engine & Fuel)">محرك ونظام الوقود (Engine & Fuel)</option>
                  <option value="ناقل الحركة (Transmission TCM)">ناقل الحركة (Transmission TCM)</option>
                  <option value="الفرامل ونظام الثبات (ABS / ESP)">الفرامل ونظام الثبات (ABS / ESP)</option>
                  <option value="الوسائد الهوائية (Airbag / SRS)">الوسائد الهوائية (Airbag / SRS)</option>
                  <option value="كهرباء الجسم والراحة (BCM)">كهرباء الجسم والراحة (BCM)</option>
                  <option value="نظام التكييف والمناخ (AC / HVAC)">نظام التكييف والمناخ (AC / HVAC)</option>
                </select>
              </div>

              {/* Dynamic DTC Codes Rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300">أكواد الأعطال (DTC Fault Codes):</label>
                  <button
                    type="button"
                    onClick={handleAddCodeRow}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    + إضافة كود عطل
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.codes.map((codeRow, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="كود العطل (P0301)"
                          value={codeRow.dtc_code}
                          onChange={(e) => handleCodeChange(idx, 'dtc_code', e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono uppercase focus:outline-none focus:border-purple-500"
                        />
                        <select
                          value={codeRow.status_at_test}
                          onChange={(e) => handleCodeChange(idx, 'status_at_test', e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                        >
                          <option value="Current">عطل حالي (Current)</option>
                          <option value="Pending">عطل معلق (Pending)</option>
                          <option value="History">تاريخي سابق (History)</option>
                          <option value="Permanent">دائم (Permanent)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveCodeRow(idx)}
                          className="text-red-400 hover:text-red-300 text-xs font-semibold text-left sm:text-center"
                        >
                          حذف الكود
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="وصف العطل الفني..."
                        value={codeRow.description}
                        onChange={(e) => handleCodeChange(idx, 'description', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات الفني والتشخيص المبدئي</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات فحص الأسلاك، الحساسات، قراءات اللايف داتا..."
                  value={formData.technician_notes}
                  onChange={(e) => setFormData({ ...formData, technician_notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                />
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
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ تقرير الفحص'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-r border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                  {selectedReport.scanner_manufacturer} ({selectedReport.scanner_model || '-'})
                </span>
                <h3 className="font-bold text-base text-white mt-1">
                  {selectedReport.make} {selectedReport.model} ({selectedReport.plate_number})
                </h3>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">النظام المفحوص: <strong className="text-slate-200">{selectedReport.system_tested}</strong></p>
                <p className="text-xs text-slate-400 mt-1">تاريخ الفحص: <strong className="text-slate-200">{new Date(selectedReport.test_datetime).toLocaleString('ar-SA')}</strong></p>
                {selectedReport.technician_notes && (
                  <p className="text-xs text-slate-300 mt-2 p-2 bg-slate-900 rounded-lg">{selectedReport.technician_notes}</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">أكواد الأعطال المسجلة:</h4>
                <div className="space-y-2">
                  {selectedReport.codes && selectedReport.codes.length > 0 ? (
                    selectedReport.codes.map((c: any) => (
                      <div key={c.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-purple-400">{c.dtc_code}</span>
                          <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-300">{c.status_at_test}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{c.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">لا توجد أكواد أعطال مسجلة في هذا التقرير.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
