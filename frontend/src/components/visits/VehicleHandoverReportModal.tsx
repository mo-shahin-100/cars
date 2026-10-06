import React, { useState, useEffect } from 'react';
import {
  Printer,
  MessageCircle,
  X,
  Wrench,
  Boxes,
  Car,
  User,
  Calendar,
  Gauge,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  FileText,
  DollarSign,
  AlertCircle,
  Tag
} from 'lucide-react';
import { api } from '../../services/api';
import { Visit, WorkOrder, Task, UsedPart, Part, WorkshopProfile } from '../../types';

interface VehicleHandoverReportModalProps {
  visitId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
}

export const VehicleHandoverReportModal: React.FC<VehicleHandoverReportModalProps> = ({
  visitId,
  isOpen,
  onClose,
  onDataUpdated
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    visit: any;
    workshop: WorkshopProfile;
    workOrders: WorkOrder[];
    diagnostics: any[];
    fluids: any[];
    attachments: any[];
    invoice?: any;
  } | null>(null);

  // Parts list from inventory for adding parts
  const [inventoryParts, setInventoryParts] = useState<Part[]>([]);

  // Modals for adding items directly from the report
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);

  // Add Task form
  const [taskForm, setTaskForm] = useState({
    title: '',
    price: 150,
    notes: ''
  });

  // Add Part form
  const [partForm, setPartForm] = useState({
    part_id: '',
    quantity: 1
  });

  const [savingItem, setSavingItem] = useState(false);

  const fetchReportData = async () => {
    if (!visitId) return;
    setLoading(true);
    try {
      const [res, partsRes] = await Promise.all([
        api.getVisitById(visitId),
        api.getParts()
      ]);
      setData(res.data);
      setInventoryParts(partsRes.data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'فشل في استرجاع بيانات تقرير الصيانة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && visitId) {
      fetchReportData();
    }
  }, [isOpen, visitId]);

  if (!isOpen || !visitId) return null;

  const handlePrint = () => {
    window.print();
  };

  // Quick add task
  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setSavingItem(true);
    try {
      await api.quickAddVisitItem({
        visit_id: visitId,
        type: 'task',
        title: taskForm.title.trim(),
        price: parseFloat(taskForm.price.toString()) || 0,
        notes: taskForm.notes
      });
      setShowAddTask(false);
      setTaskForm({ title: '', price: 150, notes: '' });
      await fetchReportData();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'فشل في إضافة عملية الصيانة');
    } finally {
      setSavingItem(false);
    }
  };

  // Quick add part
  const handleQuickAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partForm.part_id) {
      alert('يرجى اختيار الصنف من المخزون');
      return;
    }
    setSavingItem(true);
    try {
      await api.quickAddVisitItem({
        visit_id: visitId,
        type: 'part',
        part_id: partForm.part_id,
        quantity: parseInt(partForm.quantity.toString(), 10) || 1
      });
      setShowAddPart(false);
      setPartForm({ part_id: '', quantity: 1 });
      await fetchReportData();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'فشل في صرف قطعة الغيار');
    } finally {
      setSavingItem(false);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف بند الصيانة هذا؟')) return;
    try {
      await api.deleteTask(taskId);
      await fetchReportData();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'فشل في حذف بند الصيانة');
    }
  };

  // Delete part
  const handleDeletePart = async (usedPartId: string) => {
    if (!window.confirm('هل أنت متأكد من إرجاع هذه القطعة للمخزون وحذفها من التقرير؟')) return;
    try {
      await api.removeUsedPart(usedPartId);
      await fetchReportData();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'فشل في حذف القطعة');
    }
  };

  // Calculate totals
  const allTasks: Task[] = [];
  const allUsedParts: UsedPart[] = [];

  if (data?.workOrders) {
    for (const wo of data.workOrders) {
      if (wo.tasks) allTasks.push(...wo.tasks);
      if (wo.usedParts) allUsedParts.push(...wo.usedParts);
    }
  }

  const laborTotal = allTasks.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  const partsTotal = allUsedParts.reduce((sum, p) => sum + (Number(p.total_price) || 0), 0);
  const fluidsTotal = (data?.fluids || []).reduce((sum, f) => sum + (Number(f.price) || 0), 0);
  const subTotal = laborTotal + partsTotal + fluidsTotal;
  const taxRate = data?.workshop?.tax_rate ?? 15.0;
  const taxAmount = (subTotal * taxRate) / 100;
  const grandTotal = subTotal + taxAmount;

  // Selected part info in modal
  const selectedPartObj = inventoryParts.find(p => p.id === partForm.part_id);

  // Send WhatsApp summary
  const handleSendWhatsApp = () => {
    if (!data?.visit) return;
    const v = data.visit;
    const ws = data.workshop;
    const wsName = ws?.name || 'مركز صيانة السيارات';
    const custName = v.customer_name || 'العميل الكريم';
    const vehName = `${v.make || ''} ${v.model || ''} ${v.year || ''}`.trim();
    const plate = v.plate_number || '';

    let text = `السلام عليكم ورحمة الله وبركاته 🌹\n`;
    text += `أهلاً بك أستاذ *${custName}*\n\n`;
    text += `📋 *تقرير استلام وإنجاز صيانة مركبتكم لدى:* ${wsName}\n`;
    text += `🚗 *السيارة:* ${vehName} (لوحة: ${plate})\n`;
    text += `🔢 *رقم الزيارة:* ${v.visit_number}\n`;
    text += `🛣️ *عداد الدخول:* ${v.odometer_in ? v.odometer_in.toLocaleString() : '-'} كم\n`;
    if (v.odometer_out) {
      text += `🏁 *عداد الخروج:* ${v.odometer_out.toLocaleString()} كم\n`;
    }
    text += `\n━━━━━━━━━━━━━━━\n`;

    if (allTasks.length > 0) {
      text += `🔧 *أعمال الصيانة المنفذة:*\n`;
      allTasks.forEach((t, i) => {
        text += ` ${i + 1}. ${t.title} — ${Number(t.price || 0).toLocaleString()} ج.م\n`;
      });
      text += `🔹 إجمالي المصنعيات: *${laborTotal.toLocaleString()} ج.م*\n\n`;
    }

    if (allUsedParts.length > 0) {
      text += `📦 *قطع الغيار والأصناف المستبدلة:*\n`;
      allUsedParts.forEach((p, i) => {
        text += ` ${i + 1}. [${p.part_number}] ${p.part_name} (${p.quantity} قطعة × ${p.unit_price} ج.م) = ${p.total_price.toLocaleString()} ج.م\n`;
      });
      text += `🔹 إجمالي قطع الغيار: *${partsTotal.toLocaleString()} ج.م*\n\n`;
    }

    if (data.fluids && data.fluids.length > 0) {
      text += `🛢️ *الزيوت وسوائل الصيانة:*\n`;
      data.fluids.forEach((f: any, i: number) => {
        text += ` ${i + 1}. ${f.fluid_type} (${f.brand || ''}) — ${Number(f.price || 0).toLocaleString()} ج.م\n`;
      });
      text += `🔹 إجمالي السوائل: *${fluidsTotal.toLocaleString()} ج.م*\n\n`;
    }

    text += `━━━━━━━━━━━━━━━\n`;
    text += `💰 *المجموع قبل الضريبة:* ${subTotal.toLocaleString()} ج.م\n`;
    if (taxRate > 0) {
      text += `🏷️ *ضريبة القيمة المضافة (${taxRate}%):* ${taxAmount.toLocaleString()} ج.م\n`;
    }
    text += `💳 *الإجمالي النهائي المستحق:* *${grandTotal.toLocaleString()} ج.م*\n\n`;
    text += `📍 *العنوان:* ${ws?.address || ''}\n`;
    text += `📞 *هاتف الورشة:* ${ws?.phone || ''}\n`;
    text += `نتشرف بخدمتكم دائماً ونسعد برضاكم! 🤝`;

    let cleanPhone = (v.customer_phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '20' + cleanPhone.substring(1);
    } else if ((cleanPhone.startsWith('10') || cleanPhone.startsWith('11') || cleanPhone.startsWith('12') || cleanPhone.startsWith('15')) && cleanPhone.length === 10) {
      cleanPhone = '20' + cleanPhone;
    } else if (cleanPhone.startsWith('05') && cleanPhone.length === 10) {
      cleanPhone = '966' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
      cleanPhone = '966' + cleanPhone;
    }

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const visit = data?.visit;
  const workshop = data?.workshop;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto print:max-w-none print:max-h-none print:w-full print:border-none print:bg-white print:text-black">
        
        {/* Modal Action Header (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between no-print bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">تقرير استلام وإنجاز صيانة المركبة</h3>
                <span className="font-mono text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-md font-bold">
                  {visit?.visit_number}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                كشف كامل بالصيانة والمصنعيات والأصناف المستبدلة من المخزون مع الأسعار
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs shadow-lg shadow-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>طباعة التقرير (A4)</span>
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">إرسال للعميل بالواتساب</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 print:p-0 print:m-0 print:overflow-visible text-right">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold">جاري تجهيز تقرير الصيانة الشامل...</p>
            </div>
          ) : data ? (
            <div className="space-y-6 print:space-y-4">
              
              {/* Official Workshop & Document Header */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 print:bg-white print:border-black/20 print:p-4 print:text-black">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-800/80 print:border-black/20 pb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white print:text-black">
                      {workshop?.name || 'مركز صيانة وبرمجة السيارات'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 print:text-gray-600 font-mono mt-1">
                      {workshop?.commercial_reg && <span>س.ت: <strong>{workshop.commercial_reg}</strong></span>}
                      {workshop?.tax_number && <span>الرقم الضريبي (VAT): <strong>{workshop.tax_number}</strong></span>}
                      {workshop?.phone && <span>الهاتف: <strong dir="ltr">{workshop.phone}</strong></span>}
                    </div>
                    {workshop?.address && (
                      <p className="text-xs text-slate-400 print:text-gray-600 mt-1">{workshop.address}</p>
                    )}
                  </div>

                  <div className="text-left font-mono shrink-0 sm:text-left self-end sm:self-auto">
                    <span className="inline-block bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-lg text-xs font-bold print:bg-gray-100 print:text-black">
                      تقرير استلام وصيانة مركبة
                    </span>
                    <p className="text-xs text-slate-300 print:text-black font-bold mt-1.5">
                      رقم الزيارة: {visit?.visit_number}
                    </p>
                    <p className="text-[11px] text-slate-400 print:text-gray-600">
                      التاريخ: {new Date(visit?.entry_datetime || Date.now()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Vehicle & Customer Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 print:text-gray-600">العميل / المالك:</span>
                    <p className="font-bold text-white print:text-black text-sm">{visit?.customer_name}</p>
                    <p className="font-mono text-slate-400 print:text-gray-600" dir="ltr">{visit?.customer_phone}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 print:text-gray-600">السيارة والموديل:</span>
                    <p className="font-bold text-white print:text-black text-sm">
                      {visit?.make} {visit?.model} {visit?.year || ''}
                    </p>
                    <p className="text-slate-400 print:text-gray-600 font-mono">
                      اللون: {visit?.color || 'غير محدد'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 print:text-gray-600">رقم اللوحة والشاسيه:</span>
                    <p className="font-bold font-mono text-sky-400 print:text-black text-sm">
                      {visit?.plate_number}
                    </p>
                    <p className="text-slate-400 print:text-gray-600 font-mono text-[10px] truncate" title={visit?.vin}>
                      VIN: {visit?.vin || 'غير مسجل'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 print:text-gray-600">عداد الكيلومتر والوقود:</span>
                    <p className="font-bold text-emerald-400 print:text-black font-mono">
                      دخول: {visit?.odometer_in?.toLocaleString() || 0} كم
                    </p>
                    <p className="text-slate-400 print:text-gray-600">
                      خروج: {visit?.odometer_out ? `${visit.odometer_out.toLocaleString()} كم` : 'قيد الصيانة'} | الوقود: {visit?.fuel_level || 'نصف'}
                    </p>
                  </div>
                </div>

                {/* Complaint and Intake Inspection */}
                {(visit?.customer_complaint || visit?.intake_condition) && (
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 print:border-black/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {visit.customer_complaint && (
                      <div className="bg-slate-900/60 print:bg-gray-50 p-2.5 rounded-xl border border-slate-800 print:border-gray-200">
                        <span className="font-bold text-slate-300 print:text-gray-700">شكوى العميل عند الاستلام: </span>
                        <span className="text-slate-200 print:text-black">{visit.customer_complaint}</span>
                      </div>
                    )}
                    {visit.intake_condition && (
                      <div className="bg-slate-900/60 print:bg-gray-50 p-2.5 rounded-xl border border-slate-800 print:border-gray-200">
                        <span className="font-bold text-slate-300 print:text-gray-700">ملاحظات الفحص الظاهري: </span>
                        <span className="text-slate-200 print:text-black">{visit.intake_condition}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Maintenance Operations & Labor Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-white print:text-black">
                      أعمال وخدمات الصيانة المنجزة (المصنعيات وأجور اليد)
                    </h4>
                    <span className="text-xs bg-slate-800 print:bg-gray-100 text-slate-300 print:text-black px-2 py-0.5 rounded-full font-mono">
                      {allTasks.length} بند
                    </span>
                  </div>

                  <button
                    onClick={() => setShowAddTask(true)}
                    className="no-print flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md shadow-sky-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>كتابة صيانة وسعرها</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 overflow-hidden print:border-black/30">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-400 print:bg-gray-100 print:text-black border-b border-slate-800 print:border-black/20 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">بيان عمل الصيانة / الخدمة</th>
                        <th className="py-2.5 px-3">الفني المسؤول</th>
                        <th className="py-2.5 px-3">الحالة</th>
                        <th className="py-2.5 px-3 text-left">سعر المصنعية (ج.م)</th>
                        <th className="py-2.5 px-3 text-center no-print w-12">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 print:divide-black/20">
                      {allTasks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500 print:text-gray-500">
                            لم يتم تسجيل أي مصنعيات أو خدمات صيانة بعد. اضغط "كتابة صيانة وسعرها" لإضافة عمل صيانة.
                          </td>
                        </tr>
                      ) : (
                        allTasks.map((t, index) => (
                          <tr key={t.id} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                            <td className="py-2.5 px-3 font-mono text-slate-500">{index + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-100 print:text-black">
                              <div>{t.title}</div>
                              {t.description && (
                                <p className="text-[11px] text-slate-400 print:text-gray-600 mt-0.5">{t.description}</p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 print:text-black">
                              {t.lead_mechanic_name || 'فني الصيانة'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                t.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:text-green-800'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 print:text-amber-800'
                              }`}>
                                {t.status === 'completed' ? 'تم الإنجاز ✅' : 'قيد العمل ⏳'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-left font-mono font-bold text-sky-400 print:text-black">
                              {(Number(t.price) || 0).toLocaleString()} ج.م
                            </td>
                            <td className="py-2.5 px-3 text-center no-print">
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-950/80 font-bold border-t border-slate-800 print:bg-gray-50 print:border-black/20">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-slate-300 print:text-black">
                          إجمالي أجور الصيانة والمصنعيات:
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-sky-400 print:text-black text-sm">
                          {laborTotal.toLocaleString()} ج.م
                        </td>
                        <td className="no-print"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Spare Parts Consumed Section (Coded items from inventory) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-white print:text-black">
                      قطع الغيار والأصناف المستبدلة (المسجلة والمتكودة في البرنامج)
                    </h4>
                    <span className="text-xs bg-slate-800 print:bg-gray-100 text-slate-300 print:text-black px-2 py-0.5 rounded-full font-mono">
                      {allUsedParts.length} صنف
                    </span>
                  </div>

                  <button
                    onClick={() => setShowAddPart(true)}
                    className="no-print flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>صرف صنف متكود من المخزون</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 overflow-hidden print:border-black/30">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-400 print:bg-gray-100 print:text-black border-b border-slate-800 print:border-black/20 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">كود الصنف (SKU / Part No)</th>
                        <th className="py-2.5 px-3">اسم الصنف أو القطعة</th>
                        <th className="py-2.5 px-3">الماركة / الفئة</th>
                        <th className="py-2.5 px-3 text-center">الكمية</th>
                        <th className="py-2.5 px-3 text-left">سعر البيع المسجل</th>
                        <th className="py-2.5 px-3 text-left">الإجمالي (ج.م)</th>
                        <th className="py-2.5 px-3 text-center no-print w-12">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 print:divide-black/20">
                      {allUsedParts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-500 print:text-gray-500">
                            لم يتم استبدال أي قطع غيار لهذه السيارة حتى الآن.
                          </td>
                        </tr>
                      ) : (
                        allUsedParts.map((p, index) => (
                          <tr key={p.id} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                            <td className="py-2.5 px-3 font-mono text-slate-500">{index + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-sky-400 print:text-black">
                              {p.part_number}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-100 print:text-black">
                              {p.part_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 print:text-gray-700">
                              {p.brand || p.category || 'أصلي OEM'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200 print:text-black">
                              {p.quantity} قطعة
                            </td>
                            <td className="py-2.5 px-3 text-left font-mono text-slate-300 print:text-black">
                              {(Number(p.unit_price) || 0).toLocaleString()} ج.م
                            </td>
                            <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-400 print:text-black">
                              {(Number(p.total_price) || 0).toLocaleString()} ج.م
                            </td>
                            <td className="py-2.5 px-3 text-center no-print">
                              <button
                                onClick={() => handleDeletePart(p.id)}
                                className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                                title="إرجاع للمخزون وحذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-950/80 font-bold border-t border-slate-800 print:bg-gray-50 print:border-black/20">
                      <tr>
                        <td colSpan={6} className="py-2.5 px-3 text-slate-300 print:text-black">
                          إجمالي قطع الغيار والمستهلكات:
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-emerald-400 print:text-black text-sm">
                          {partsTotal.toLocaleString()} ج.م
                        </td>
                        <td className="no-print"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Fluids changed (if any) */}
              {data.fluids && data.fluids.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-amber-400 print:text-black flex items-center gap-1.5">
                    <span>🛢️ الزيوت وسوائل الصيانة الدورية المستبدلة:</span>
                  </h4>
                  <div className="rounded-xl border border-slate-800 overflow-hidden print:border-black/30">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-400 print:bg-gray-100 print:text-black border-b border-slate-800 print:border-black/20">
                        <tr>
                          <th className="py-2 px-3">نوع السائل</th>
                          <th className="py-2 px-3">الماركة واللزوجة</th>
                          <th className="py-2 px-3">الكمية</th>
                          <th className="py-2 px-3 text-left">التكلفة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 print:divide-black/20">
                        {data.fluids.map((f: any) => (
                          <tr key={f.id}>
                            <td className="py-2 px-3 font-semibold text-slate-200 print:text-black">{f.fluid_type}</td>
                            <td className="py-2 px-3 text-slate-400 print:text-gray-700">{f.brand} {f.viscosity || ''}</td>
                            <td className="py-2 px-3 font-mono">{f.quantity_liters} لتر</td>
                            <td className="py-2 px-3 text-left font-mono text-amber-400 print:text-black font-bold">
                              {(Number(f.price) || 0).toLocaleString()} ج.م
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Final Cost & Billing Calculation Summary */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 print:bg-white print:border-black/30 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-300 print:text-gray-700">
                  <span>إجمالي خدمات وأعمال الصيانة (المصنعيات):</span>
                  <span className="font-mono font-bold text-white print:text-black">{laborTotal.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-gray-700">
                  <span>إجمالي قطع الغيار والأصناف المتكودة:</span>
                  <span className="font-mono font-bold text-white print:text-black">{partsTotal.toLocaleString()} ج.م</span>
                </div>
                {fluidsTotal > 0 && (
                  <div className="flex justify-between items-center text-slate-300 print:text-gray-700">
                    <span>إجمالي الزيوت وسوائل الصيانة:</span>
                    <span className="font-mono font-bold text-white print:text-black">{fluidsTotal.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="border-t border-slate-800 print:border-black/20 pt-2 flex justify-between items-center text-slate-400 print:text-gray-600">
                  <span>المجموع قبل الضريبة:</span>
                  <span className="font-mono">{subTotal.toLocaleString()} ج.م</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between items-center text-slate-400 print:text-gray-600">
                    <span>ضريبة القيمة المضافة ({taxRate}%):</span>
                    <span className="font-mono">{taxAmount.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="border-t-2 border-slate-700 print:border-black/40 pt-2.5 flex justify-between items-center text-base sm:text-lg font-black text-white print:text-black">
                  <span>المبلغ الإجمالي النهائي المستحق:</span>
                  <span className="font-mono text-sky-400 print:text-black text-xl">
                    {grandTotal.toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {/* Legal Disclaimer & Official Signatures */}
              <div className="pt-4 border-t border-slate-800 print:border-black/30 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-8">
                  <p className="font-bold text-slate-300 print:text-black">مهندس / فني الصيانة</p>
                  <div className="border-b border-dashed border-slate-700 print:border-black/40 w-3/4 mx-auto"></div>
                  <p className="text-[10px] text-slate-500 print:text-gray-500">التوقيع / الاعتماد</p>
                </div>

                <div className="space-y-8">
                  <p className="font-bold text-slate-300 print:text-black">إدارة الورشة والختم</p>
                  <div className="border-b border-dashed border-slate-700 print:border-black/40 w-3/4 mx-auto"></div>
                  <p className="text-[10px] text-slate-500 print:text-gray-500">الختم المعتمد</p>
                </div>

                <div className="space-y-8">
                  <p className="font-bold text-slate-300 print:text-black">توقيع العميل المستلم</p>
                  <div className="border-b border-dashed border-slate-700 print:border-black/40 w-3/4 mx-auto"></div>
                  <p className="text-[10px] text-slate-500 print:text-gray-500">استلمت السيارة بحالة ممتازة</p>
                </div>
              </div>

            </div>
          ) : null}
        </div>

      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 text-right">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-400" />
                <span>تسجيل خدمة صيانة ومصنعية مع السعر</span>
              </h3>
              <button onClick={() => setShowAddTask(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddTask} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  بيان الصيانة أو الخدمة المنفذة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فحص وتغيير أقمشة الفرامل الأمامية مع الخرط"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  سعر الصيانة / أجر اليد والمصنعية (ج.م) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="10"
                  placeholder="سعر المصنعية"
                  value={taskForm.price}
                  onChange={(e) => setTaskForm({ ...taskForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ملاحظات فنية إضافية (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="تفاصيل أو توجيهات للعميل..."
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 disabled:opacity-50"
                >
                  {savingItem ? 'جاري الحفظ...' : 'حفظ وإضافة للتقرير'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddPart && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 text-right">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-400" />
                <span>صرف صنف متكود ومسجل بسعره من المخزون</span>
              </h3>
              <button onClick={() => setShowAddPart(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddPart} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  اختر الصنف المتكود من المخزون *
                </label>
                <select
                  required
                  value={partForm.part_id}
                  onChange={(e) => setPartForm({ ...partForm, part_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- اضغط لاختيار الصنف بالكود والاسم --</option>
                  {inventoryParts.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                      [{p.part_number}] {p.name} — سعر البيع: {p.sale_price} ج.م (متاح: {p.stock_quantity} قطعة)
                    </option>
                  ))}
                </select>
              </div>

              {selectedPartObj && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>كود الصنف المسجل:</span>
                    <strong className="text-sky-400">{selectedPartObj.part_number}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>سعر البيع المسجل بالبرنامج:</span>
                    <strong className="text-emerald-400">{selectedPartObj.sale_price} ج.م / قطعة</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>الرصيد المتاح بالمستودع:</span>
                    <span className="text-slate-200">{selectedPartObj.stock_quantity} قطعة</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الكمية المصروفة *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedPartObj ? selectedPartObj.stock_quantity : 99}
                  value={partForm.quantity}
                  onChange={(e) => setPartForm({ ...partForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {selectedPartObj && (
                <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-slate-800">
                  <span className="text-slate-300">إجمالي قيمة هذا الصنف:</span>
                  <span className="text-sm font-mono text-emerald-400">
                    {(selectedPartObj.sale_price * (partForm.quantity || 1)).toLocaleString()} ج.م
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPart(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingItem || !selectedPartObj}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {savingItem ? 'جاري الصرف...' : 'تأكيد الصرف وإدراجه بالتقرير'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
