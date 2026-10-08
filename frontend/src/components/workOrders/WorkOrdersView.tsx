import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Wrench,
  CheckCircle2,
  Clock,
  Boxes,
  UserCheck,
  AlertCircle,
  X,
  Play,
  Check,
  Trash2,
  FileText,
  DollarSign,
  Gauge,
  Hammer,
  Search,
  Car,
  User as UserIcon,
  Phone,
  Eye,
  Calendar,
  Sparkles,
  Cpu
} from 'lucide-react';
import { api } from '../../services/api';
import { WorkOrder, Visit, User, Part } from '../../types';
import { useSync } from '../../context/SyncContext';
import { useDevice } from '../../context/DeviceContext';
import { useTheme } from '../../context/ThemeContext';
import { VehicleHandoverReportModal } from '../visits/VehicleHandoverReportModal';
import { MaintenancePillsNav, MaintenanceCategory } from '../common/MaintenancePillsNav';

export interface WorkOrdersViewProps {
  categoryFilter?: 'all' | 'maintenance' | 'repair' | 'overhaul' | 'diagnostics';
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  viewTitle?: string;
  viewSubtitle?: string;
  initialSearch?: string;
  initialOrderId?: string;
}

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({
  categoryFilter = 'all',
  activeTab,
  onTabChange,
  viewTitle,
  viewSubtitle,
  initialSearch,
  initialOrderId
}) => {
  const { isMobile } = useDevice();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeCategory, setActiveCategory] = useState<'all' | 'maintenance' | 'repair' | 'overhaul' | 'diagnostics'>(categoryFilter);
  const [search, setSearch] = useState(initialSearch || '');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [reportVisitId, setReportVisitId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);

  // Forms
  const [formData, setFormData] = useState({
    visit_id: '',
    vehicle_id: '',
    description: '',
    priority: 'normal',
    estimated_cost: 0,
    estimated_hours: 1
  });

  const [consumeData, setConsumeData] = useState({
    part_id: '',
    quantity: 1,
    task_id: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const { lastEvent } = useSync();

  const loadData = () => {
    Promise.all([
      api.getWorkOrders(),
      api.getVisits('in_repair'),
      api.getUsers('mechanic'),
      api.getParts()
    ]).then(([woRes, visRes, mechRes, partRes]) => {
      setOrders(woRes.data);
      setVisits(visRes.data);
      setMechanics(mechRes.data);
      setParts(partRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setActiveCategory(categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
    if (initialOrderId) {
      api.getWorkOrderById(initialOrderId).then(res => {
        if (res.data) setSelectedOrder(res.data);
      }).catch(err => console.error(err));
    }
  }, [initialSearch, initialOrderId]);

  useEffect(() => {
    if (lastEvent?.entity === 'work_orders' || lastEvent?.entity === 'tasks') {
      loadData();
      if (selectedOrder) {
        api.getWorkOrderById(selectedOrder.id).then(res => setSelectedOrder(res.data));
      }
    }
  }, [lastEvent]);

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await api.getWorkOrderById(id);
      setSelectedOrder(res.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteWorkOrder = async (id: string, number: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف أمر الإصلاح رقم "${number}"؟`)) {
      return;
    }
    try {
      await api.deleteWorkOrder(id);
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = visits.find(x => x.id === formData.visit_id);
    if (!v) {
      alert('يرجى اختيار زيارة صالحة');
      return;
    }

    setSubmitting(true);
    try {
      await api.createWorkOrder({
        ...formData,
        vehicle_id: v.vehicle_id
      });
      setShowAddModal(false);
      setFormData({ visit_id: '', vehicle_id: '', description: '', priority: 'normal', estimated_cost: 0, estimated_hours: 1 });
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Atomic safe part consumption with client-generated idempotency key
   */
  const handleConsumePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !consumeData.part_id || !consumeData.quantity) return;

    setSubmitting(true);
    // Generate unique idempotency key to prevent double deduction
    const idempotencyKey = `idemp_cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      await api.consumePart({
        work_order_id: selectedOrder.id,
        part_id: consumeData.part_id,
        quantity: consumeData.quantity,
        task_id: consumeData.task_id || undefined,
        idempotency_key: idempotencyKey,
        notes: consumeData.notes || undefined
      });
      setShowConsumeModal(false);
      setConsumeData({ part_id: '', quantity: 1, task_id: '', notes: '' });
      const res = await api.getWorkOrderById(selectedOrder.id);
      setSelectedOrder(res.data);
      // Reload inventory parts stock
      api.getParts().then(r => setParts(r.data));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUsedPart = async (usedPartId: string) => {
    if (!window.confirm('هل أنت متأكد من إرجاع هذه القطعة إلى المخزون وحذفها؟')) return;
    try {
      await api.removeUsedPart(usedPartId);
      if (selectedOrder) {
        const res = await api.getWorkOrderById(selectedOrder.id);
        setSelectedOrder(res.data);
      }
      api.getParts().then(r => setParts(r.data));
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredOrders = orders.filter((wo: any) => {
    // 1. Text search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      const desc = (wo.description || '').toLowerCase();
      const inspect = (wo.inspection_result || '').toLowerCase();
      const orderNum = (wo.order_number || '').toLowerCase();
      const plate = (wo.plate_number || '').toLowerCase();
      const car = `${wo.make || ''} ${wo.model || ''}`.toLowerCase();
      const cust = (wo.customer_name || '').toLowerCase();
      const phone = (wo.customer_phone || '').toLowerCase();
      const matches =
        desc.includes(term) ||
        inspect.includes(term) ||
        orderNum.includes(term) ||
        plate.includes(term) ||
        car.includes(term) ||
        cust.includes(term) ||
        phone.includes(term);
      if (!matches) return false;
    }

    // 2. Category filter
    if (activeCategory === 'all') return true;
    const text = `${wo.description || ''} ${wo.make || ''} ${wo.model || ''} ${wo.category || ''} ${wo.visit_status || ''}`.toLowerCase();
    const cat = (wo.category || '').toLowerCase();
    const vst = (wo.visit_status || '').toLowerCase();

    if (activeCategory === 'maintenance') {
      return (
        cat === 'maintenance' ||
        vst === 'maintenance' ||
        text.includes('صيانة') ||
        text.includes('دورية') ||
        text.includes('زيت') ||
        text.includes('فلتر') ||
        text.includes('سير') ||
        text.includes('تيل') ||
        text.includes('تربيط') ||
        (!text.includes('عمرة') && !text.includes('ماتور') && !text.includes('توضيب') && !text.includes('تصليح'))
      );
    }
    if (activeCategory === 'repair') {
      return (
        cat === 'repair' ||
        cat === 'repairs' ||
        vst === 'repairs' ||
        vst === 'in_repair' ||
        text.includes('تصليح') ||
        text.includes('إصلاح') ||
        text.includes('عفشة') ||
        text.includes('كهرباء') ||
        text.includes('تكييف') ||
        text.includes('مساعدين') ||
        text.includes('دينامو') ||
        text.includes('طلمبة') ||
        text.includes('ردياتير')
      );
    }
    if (activeCategory === 'overhaul') {
      return (
        cat === 'overhaul' ||
        cat === 'engine_overhaul' ||
        vst === 'engine_overhaul' ||
        text.includes('عمرة') ||
        text.includes('ماتور') ||
        text.includes('محرك') ||
        text.includes('توضيب') ||
        text.includes('خراطة') ||
        text.includes('وش سلندر') ||
        text.includes('بستم') ||
        text.includes('سبايك')
      );
    }
    if (activeCategory === 'diagnostics') {
      return (
        cat === 'diagnostics' ||
        cat === 'diagnostic' ||
        vst === 'diagnostics' ||
        vst === 'diagnosing' ||
        text.includes('فحص') ||
        text.includes('كمبيوتر') ||
        text.includes('تشخيص') ||
        text.includes('dtc') ||
        text.includes('أعطال') ||
        text.includes('حساس') ||
        text.includes('كود')
      );
    }
    return true;
  });

  const displayOrders = filteredOrders;

  const handleCategorySelect = (cat: MaintenanceCategory) => {
    setActiveCategory(cat);
    if (onTabChange) {
      if (cat === 'all') onTabChange('work-orders');
      else if (cat === 'maintenance') onTabChange('maintenance');
      else if (cat === 'repair') onTabChange('repairs');
      else if (cat === 'overhaul') onTabChange('engine_overhaul');
      else if (cat === 'diagnostics') onTabChange('diagnostics');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mobile: compact title + category pills */}
        {isMobile ? (
          <>
            <div className="flex items-center gap-2 w-full">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full rounded-xl pr-9 pl-3 py-2.5 text-xs focus:outline-none focus:border-sky-500 ${
                    isDark ? 'bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-slate-100 border border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>جديد</span>
              </button>
            </div>
            <div className="w-full overflow-x-auto scrollbar-none">
              <MaintenancePillsNav
                activeCategory={activeCategory}
                onSelectCategory={handleCategorySelect}
                allCount={orders.length}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="font-bold text-base text-white">
                {viewTitle || (
                  activeCategory === 'maintenance' ? 'الصيانة الدورية والسريعة' :
                  activeCategory === 'repair' ? 'أوامر التصليح والإصلاحات' :
                  activeCategory === 'overhaul' ? 'عمرة الماتور والمحركات' :
                  activeCategory === 'diagnostics' ? 'فحص وتشخيص الكمبيوتر والأعطال (DTC)' :
                  'أوامر العمل والمهام الفنية'
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {viewSubtitle || 'متابعة مراحل التنفيذ، تكلفة المصنعيات، وصرف قطع الغيار'}
              </p>
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث بالسيارة، اللوحة، العميل، أو العطل..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <MaintenancePillsNav
                activeCategory={activeCategory}
                onSelectCategory={handleCategorySelect}
                allCount={orders.length}
              />
              <button
                onClick={() => {
                  if (activeCategory === 'maintenance') {
                    setFormData(prev => ({ ...prev, description: 'صيانة دورية: تغيير زيوت وفلاتر وفحص عام' }));
                  } else if (activeCategory === 'repair') {
                    setFormData(prev => ({ ...prev, description: 'إصلاح عطل: ' }));
                  } else if (activeCategory === 'overhaul') {
                    setFormData(prev => ({ ...prev, description: 'عمرة وتوضيب محرك: ' }));
                  } else if (activeCategory === 'diagnostics') {
                    setFormData(prev => ({ ...prev, description: 'فحص كمبيوتر وتشخيص أعطال DTC: ' }));
                  }
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 active:scale-95 transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {activeCategory === 'overhaul' ? 'أمر عمرة محرك جديد' :
                   activeCategory === 'maintenance' ? 'أمر صيانة جديد' :
                   activeCategory === 'repair' ? 'أمر تصليح جديد' :
                   activeCategory === 'diagnostics' ? 'أمر فحص كمبيوتر جديد' :
                   'إنشاء أمر عمل جديد'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Work Orders List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">جاري تحميل جدول أوامر الصيانة...</div>
      ) : displayOrders.length === 0 ? (
        <div className={`p-10 rounded-2xl text-center ${ isDark ? 'bg-[#0a0f1d]/80 border border-white/[0.08]' : 'bg-white border border-slate-200' }`}>
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-slate-300 text-sm">
            {search ? `لا توجد نتائج ل: "${search}"` : 'لا توجد أوامر عمل مسجلة'}
          </p>
        </div>
      ) : isMobile ? (
        /* === MOBILE CARD LIST === */
        <div className="space-y-2.5">
          {displayOrders.map((wo) => {
            const priorityInfo: Record<string, { label: string; cls: string }> = {
              low: { label: 'منخفضة', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
              normal: { label: 'عادي', cls: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
              high: { label: 'عالية', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
              urgent: { label: '⚠ عاجل', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30 font-black' }
            };
            const prio = priorityInfo[wo.priority] || priorityInfo.normal;
            const statusInfo: Record<string, { label: string; cls: string }> = {
              new: { label: 'جديد', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
              diagnosing: { label: 'تشخيص', cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
              in_progress: { label: 'جاري', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
              waiting_parts: { label: 'انتظار قطع', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
              completed: { label: 'مكتمل', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
              ready: { label: 'جاهز', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
              delivered: { label: 'سلّم', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' }
            };
            const st = statusInfo[wo.status] || { label: wo.status, cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };
            const isMaintenance = wo.category === 'maintenance' || wo.visit_status === 'maintenance' || (wo.description && wo.description.includes('صيانة'));
            const isOverhaul = wo.category === 'overhaul' || wo.visit_status === 'engine_overhaul' || (wo.description && (wo.description.includes('عمرة') || wo.description.includes('ماتور')));
            const catCls = isOverhaul ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : isMaintenance ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            const catLabel = isOverhaul ? 'عمرة' : isMaintenance ? 'صيانة' : 'تصليح';
            return (
              <div
                key={wo.id}
                onClick={() => handleOpenDetail(wo.id)}
                className={`rounded-2xl p-3.5 cursor-pointer active:scale-[0.98] transition-transform shadow-sm ${ isDark ? 'bg-[#0a0f1d]/80 border border-white/[0.08]' : 'bg-white border border-slate-200' }`}
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sky-400 text-xs bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-400/20">{wo.order_number}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${catCls}`}>{catLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${prio.cls}`}>{prio.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                  </div>
                </div>

                {/* Car + customer */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{wo.make} {wo.model} <span className="font-mono text-sky-400">({wo.plate_number})</span></p>
                    <p className="text-[11px] text-slate-400 truncate">{wo.customer_name || 'عميل نقدي'}</p>
                  </div>
                  <div className="font-mono font-bold text-emerald-400 text-sm shrink-0">{Number(wo.actual_cost || wo.estimated_cost || 0).toLocaleString()} <span className="text-[10px] text-slate-500">ج.م</span></div>
                </div>

                {/* Description snippet */}
                <p className="text-[11px] text-slate-400 line-clamp-1">{wo.description}</p>
              </div>
            );
          })}
        </div>
      ) : (
        /* === DESKTOP TABLE === */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-xs">
                <tr>
                  <th className="py-3.5 px-4">رقم الأمر / الزيارة</th>
                  <th className="py-3.5 px-4">السيارة واللوحة</th>
                  <th className="py-3.5 px-4">العميل</th>
                  <th className="py-3.5 px-4">نوع الصيانة والتوصيف</th>
                  <th className="py-3.5 px-4">الأولوية</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">التكلفة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayOrders.map((wo) => {
                  const priorityInfo: Record<string, { label: string; cls: string }> = {
                    low: { label: 'منخفضة', cls: 'text-slate-400 bg-slate-800 border-slate-700' },
                    normal: { label: 'عادي', cls: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
                    high: { label: 'أولوية عالية', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
                    urgent: { label: 'عاجل جداً', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30 font-black' }
                  };
                  const prio = priorityInfo[wo.priority] || priorityInfo.normal;

                  const statusInfo: Record<string, { label: string; cls: string }> = {
                    new: { label: 'أمر جديد', cls: 'bg-slate-800 text-slate-300' },
                    diagnosing: { label: 'فحص وتشخيص', cls: 'bg-purple-500/15 text-purple-300 border border-purple-500/30' },
                    in_progress: { label: 'جاري العمل', cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/30' },
                    waiting_parts: { label: 'انتظار قطع', cls: 'bg-rose-500/15 text-rose-300 border border-rose-500/30' },
                    completed: { label: 'مكتمل', cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' },
                    ready: { label: 'جاهز للتسليم', cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
                    delivered: { label: 'تم التسليم', cls: 'bg-sky-500/15 text-sky-300 border border-sky-500/30' }
                  };
                  const st = statusInfo[wo.status] || { label: wo.status, cls: 'bg-slate-800 text-slate-300' };

                  // Category badge detection
                  const isMaintenance = wo.category === 'maintenance' || wo.visit_status === 'maintenance' || (wo.description && wo.description.includes('صيانة'));
                  const isOverhaul = wo.category === 'overhaul' || wo.visit_status === 'engine_overhaul' || (wo.description && (wo.description.includes('عمرة') || wo.description.includes('ماتور')));
                  const catLabel = isOverhaul ? 'عمرة ماتور' : isMaintenance ? 'صيانة دورية' : 'تصليح أعطال';
                  const catCls = isOverhaul ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : isMaintenance ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

                  return (
                    <tr
                      key={wo.id}
                      onClick={() => handleOpenDetail(wo.id)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Order & Visit # */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-sky-400 flex items-center gap-1.5">
                          <span>{wo.order_number}</span>
                        </div>
                        {wo.visit_number && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            زيارة: #{wo.visit_number}
                          </div>
                        )}
                      </td>

                      {/* Vehicle & Plate */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{wo.make} {wo.model} {wo.year ? `(${wo.year})` : ''}</span>
                        </div>
                        <div className="mt-1">
                          <span className="font-mono text-xs bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-emerald-300 font-bold">
                            {wo.plate_number}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {wo.customer_name || 'عميل نقدي'}
                        </div>
                        {wo.customer_phone && (
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{wo.customer_phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Maintenance Type & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catCls}`}>
                            {catLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2" title={wo.description}>
                          {wo.description}
                        </p>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${prio.cls}`}>
                          {prio.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-200">
                          {Number(wo.actual_cost || wo.estimated_cost || 0).toLocaleString()} ج.م
                        </div>
                        {wo.actual_cost > 0 && wo.estimated_cost > 0 && wo.actual_cost !== wo.estimated_cost && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            تقديري: {Number(wo.estimated_cost).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenDetail(wo.id)}
                            className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/20 text-xs font-bold transition-all flex items-center gap-1"
                            title="عرض تفاصيل أمر العمل وقطع الغيار"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض التفاصيل</span>
                          </button>
                          <button
                            onClick={() => handleDeleteWorkOrder(wo.id, wo.order_number)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 transition-colors"
                            title="حذف أمر العمل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/40">
              <h3 className="font-bold text-base text-white">فتح أمر إصلاح جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الزيارة والسيارة *</label>
                <select
                  required
                  value={formData.visit_id}
                  onChange={(e) => setFormData({ ...formData, visit_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="">اختر زيارة السيارة...</option>
                  {visits.map((vis) => (
                    <option key={vis.id} value={vis.id}>
                      [{vis.visit_number}] {vis.make} {vis.model} ({vis.plate_number}) - شكوى: {vis.customer_complaint}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">وصف العمل المطلوب والفحص *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="بيان أعمال الصيانة المعتمدة، الفحص، والإصلاحات..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الأولوية</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="low">منخفضة</option>
                    <option value="normal">عادية</option>
                    <option value="high">عالية</option>
                    <option value="urgent">عاجلة جداً</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">التكلفة التقديرية (ج.م)</label>
                  <input
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الساعات المتوقعة</label>
                  <input
                    type="number"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-800 shrink-0 bg-slate-950/60">
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
                  {submitting ? 'جاري الفتح...' : 'فتح أمر العمل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work Order Detail Drawer (Tasks & Spare Parts Consumption) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-r border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                  {selectedOrder.order_number}
                </span>
                <h3 className="font-bold text-base text-white mt-1">
                  {selectedOrder.make} {selectedOrder.model} ({selectedOrder.plate_number})
                </h3>
                <p className="text-xs text-slate-400">العميل: {selectedOrder.customer_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReportVisitId(selectedOrder.visit_id)}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs shadow-md shadow-white/10 active:scale-95 transition-all cursor-pointer"
                  title="فتح تقرير الصيانة الشامل للسيارة والطباعة"
                >
                  <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>تقرير الصيانة الشامل 🖨️</span>
                </button>
                <button
                  onClick={() => handleDeleteWorkOrder(selectedOrder.id, selectedOrder.order_number)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors border border-rose-500/20 text-xs flex items-center gap-1 font-bold"
                  title="حذف أمر العمل"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف</span>
                </button>
                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Description */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 font-medium">بيان أمر الإصلاح:</p>
                <p className="text-sm text-slate-200 mt-1">{selectedOrder.description}</p>
              </div>

              {/* Spare Parts Consumed (Atomic Safe Deduction) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-400" />
                    قطع الغيار المصروفة من المخزون ({selectedOrder.usedParts?.length || 0})
                  </h4>
                  <button
                    onClick={() => setShowConsumeModal(true)}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>صرف قطعة غيار</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedOrder.usedParts && selectedOrder.usedParts.length > 0 ? (
                    selectedOrder.usedParts.map((up: any) => (
                      <div key={up.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{up.part_name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">رقم القطعة: {up.part_number} | الكمية: {up.quantity} قطعة</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-left font-mono">
                            <p className="text-sm font-bold text-emerald-400">{(Number(up.total_price) || 0).toLocaleString()} ج.م</p>
                            <p className="text-[10px] text-slate-500">{(Number(up.unit_price) || 0).toLocaleString()} ج.م / قطعة</p>
                          </div>
                          <button
                            onClick={() => handleRemoveUsedPart(up.id)}
                            className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                            title="إرجاع القطعة إلى المخزون وحذفها"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                      لم يتم صرف أي قطع غيار من المخزون لهذا الأمر حتى الآن.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consume Part Modal (Section 12 - Atomic Safe Deduction) */}
      {showConsumeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white">صرف قطعة غيار من المخزون</h3>
              <button onClick={() => setShowConsumeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConsumePart} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اختر الصنف المتكود من المخزون *</label>
                <select
                  required
                  value={consumeData.part_id}
                  onChange={(e) => setConsumeData({ ...consumeData, part_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="">اختر القطعة بالكود والاسم...</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                      [{p.part_number}] {p.name} — سعر البيع: {p.sale_price} ج.م (متاح: {p.stock_quantity} قطعة)
                    </option>
                  ))}
                </select>
              </div>

              {parts.find(p => p.id === consumeData.part_id) && (() => {
                const sp = parts.find(p => p.id === consumeData.part_id)!;
                return (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>كود الصنف:</span>
                      <strong className="text-sky-400">{sp.part_number}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>سعر البيع المسجل:</span>
                      <strong className="text-emerald-400">{sp.sale_price} ج.م / قطعة</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>الرصيد المتاح:</span>
                      <span className="text-slate-200">{sp.stock_quantity} قطعة</span>
                    </div>
                    <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
                      <span>الإجمالي المطلوب:</span>
                      <span className="text-emerald-400">{(sp.sale_price * (consumeData.quantity || 1)).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الكمية المصروفة *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={consumeData.quantity}
                  onChange={(e) => setConsumeData({ ...consumeData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConsumeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? 'جاري الخصم...' : 'تأكيد الخصم الآمن'}
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
    </div>
  );
};
