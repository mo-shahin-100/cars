import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  X,
  Phone,
  Calendar,
  User,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Activity,
  Wallet,
  ShieldCheck,
  Tag,
  ArrowDownRight,
  Layers,
  HelpCircle,
  Check,
  Hammer,
  Sparkles,
  Filter,
  DollarSign
} from 'lucide-react';
import { api } from '../../services/api';
import { DashboardStats, DashboardAlert, DashboardActivity } from '../../types';
import { useSync } from '../../context/SyncContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { WhatsAppReadyModal, WhatsAppData } from '../common/WhatsAppReadyModal';

interface DashboardViewProps {
  onNavigate: (tab: string, targetId?: string, searchParam?: string) => void;
  onQuickAction?: (action: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onQuickAction }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { lastEvent } = useSync();
  const isDark = theme === 'dark';

  // Core Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<string | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState('');

  // Modals States
  const [activeModal, setActiveModal] = useState<
    'new_visit' | 'new_customer' | 'new_vehicle' | 'new_work_order' | 'new_invoice' | 'new_payment' | 'new_expense' | 'shortcuts' | null
  >(null);
  const [selectedCarForDetails, setSelectedCarForDetails] = useState<any | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<WhatsAppData | null>(null);
  const [statusChangeVisit, setStatusChangeVisit] = useState<any | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Pre-load reference lists for speedy modal dropdowns
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [activeVisitsList, setActiveVisitsList] = useState<any[]>([]);
  const [unpaidInvoicesList, setUnpaidInvoicesList] = useState<any[]>([]);

  // Form State for Modals
  const [visitForm, setVisitForm] = useState({
    customer_name: '',
    customer_phone: '',
    plate_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    odometer_in: 0,
    customer_complaint: '',
    notes: ''
  });

  const [customerForm, setCustomerForm] = useState({
    full_name: '',
    phone: '',
    phone_secondary: '',
    address: '',
    notes: ''
  });

  const [vehicleForm, setVehicleForm] = useState({
    plate_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    current_owner_id: '',
    current_odometer: 0,
    notes: ''
  });

  const [workOrderForm, setWorkOrderForm] = useState({
    visit_id: '',
    description: '',
    category: 'repair',
    priority: 'normal',
    estimated_cost: ''
  });

  const [invoiceForm, setInvoiceForm] = useState({
    visit_id: '',
    customer_id: '',
    vehicle_id: '',
    grand_total: '',
    paid_amount: '',
    payment_method: 'cash',
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '',
    customer_id: '',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    category: 'أدوات وصيانة',
    amount: '',
    description: '',
    payment_method: 'cash',
    recipient: ''
  });

  const [submittingModal, setSubmittingModal] = useState(false);

  // Load Dashboard Data
  const loadDashboardData = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    api.getDashboardStats()
      .then((res) => {
        if (res?.data) {
          setStats(res.data);
          setActiveVisitsList(res.data.currentVehicles || res.data.recentVisits || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard stats:', err);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (lastEvent) loadDashboardData();
  }, [lastEvent, loadDashboardData]);

  // Lazy-load reference lists when a modal opens
  const openModalWithData = (modal: typeof activeModal) => {
    setActiveModal(modal);
    if (modal === 'new_vehicle' || modal === 'new_invoice' || modal === 'new_payment') {
      api.getCustomers().then(res => setCustomersList(res.data || [])).catch(() => {});
    }
    if (modal === 'new_payment') {
      api.getInvoices('due').then(res => {
        const due = (res.data || []).filter((inv: any) => Number(inv.balance_due) > 0 && inv.status !== 'cancelled');
        setUnpaidInvoicesList(due);
      }).catch(() => {
        api.getInvoices().then(r => {
          setUnpaidInvoicesList((r.data || []).filter((inv: any) => Number(inv.balance_due) > 0 && inv.status !== 'cancelled'));
        });
      });
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'n') {
          e.preventDefault();
          openModalWithData('new_visit');
        } else if (key === 'c') {
          e.preventDefault();
          openModalWithData('new_customer');
        } else if (key === 'v') {
          e.preventDefault();
          openModalWithData('new_vehicle');
        } else if (key === 'w') {
          e.preventDefault();
          openModalWithData('new_work_order');
        } else if (key === 'i') {
          e.preventDefault();
          openModalWithData('new_invoice');
        } else if (key === 'p') {
          e.preventDefault();
          openModalWithData('new_payment');
        } else if (key === 'e') {
          e.preventDefault();
          openModalWithData('new_expense');
        }
      } else if (e.key === 'Escape') {
        if (activeModal) setActiveModal(null);
        if (selectedCarForDetails) setSelectedCarForDetails(null);
        if (statusChangeVisit) setStatusChangeVisit(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, selectedCarForDetails, statusChangeVisit]);

  // WhatsApp Readiness Handler
  const handleOpenWhatsApp = async (visitId: string) => {
    try {
      const res = await api.getVisitWhatsAppReady(visitId);
      if (res?.data) {
        setWhatsAppModalData(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'فشل في استرجاع بيانات الواتساب', 'error');
    }
  };

  // Quick Status Update for a Visit
  const handleUpdateStatus = async (newStatus: string) => {
    if (!statusChangeVisit) return;
    try {
      await api.updateVisitStatus(statusChangeVisit.id, newStatus);
      showToast(`تم تغيير حالة السيارة إلى ${getArabicStatusBadge(newStatus).label}`);
      setStatusChangeVisit(null);
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'فشل في تغيير الحالة', 'error');
    }
  };

  // Modal Submissions Handlers
  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitForm.customer_name || !visitForm.customer_phone || !visitForm.plate_number) {
      showToast('يرجى ملء اسم العميل، الهاتف، ورقم اللوحة', 'error');
      return;
    }
    setSubmittingModal(true);
    try {
      await api.createVisit({
        ...visitForm,
        odometer_in: Number(visitForm.odometer_in) || 0
      });
      showToast('تم تسجيل دخول الزيارة بنجاح');
      setActiveModal(null);
      setVisitForm({
        customer_name: '',
        customer_phone: '',
        plate_number: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        odometer_in: 0,
        customer_complaint: '',
        notes: ''
      });
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'فشل في تسجيل الزيارة', 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.full_name || !customerForm.phone) {
      showToast('يرجى ملء اسم العميل ورقم الهاتف', 'error');
      return;
    }
    setSubmittingModal(true);
    try {
      await api.createCustomer(customerForm);
      showToast('تمت إضافة العميل بنجاح');
      setActiveModal(null);
      setCustomerForm({ full_name: '', phone: '', phone_secondary: '', address: '', notes: '' });
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'فشل في إضافة العميل', 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleSubmitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.plate_number || !vehicleForm.make || !vehicleForm.model || !vehicleForm.current_owner_id) {
      showToast('يرجى ملء بيانات السيارة وتحديد المالك', 'error');
      return;
    }
    setSubmittingModal(true);
    try {
      await api.createVehicle({
        ...vehicleForm,
        year: Number(vehicleForm.year) || new Date().getFullYear(),
        current_odometer: Number(vehicleForm.current_odometer) || 0
      });
      showToast('تم تسجيل السيارة بنجاح');
      setActiveModal(null);
      setVehicleForm({
        plate_number: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        current_owner_id: '',
        current_odometer: 0,
        notes: ''
      });
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'فشل في تسجيل السيارة', 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleSubmitWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrderForm.visit_id || !workOrderForm.description) {
      showToast('يرجى اختيار الزيارة وكتابة وصف الصيانة', 'error');
      return;
    }
    const targetVisit = activeVisitsList.find(v => v.id === workOrderForm.visit_id);
    if (!targetVisit) {
      showToast('الزيارة المحددة غير موجودة', 'error');
      return;
    }
    setSubmittingModal(true);
    try {
      await api.createWorkOrder({
        visit_id: workOrderForm.visit_id,
        vehicle_id: targetVisit.vehicle_id,
        description: workOrderForm.description,
        category: workOrderForm.category,
        priority: workOrderForm.priority,
        estimated_cost: Number(workOrderForm.estimated_cost) || 0
      });
      showToast('تم فتح أمر الصيانة بنجاح');
      setActiveModal(null);
      setWorkOrderForm({ visit_id: '', description: '', category: 'repair', priority: 'normal', estimated_cost: '' });
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'فشل في فتح أمر الصيانة', 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.visit_id || !invoiceForm.grand_total) {
      showToast('يرجى اختيار السيارة وإدخال إجمالي الفاتورة', 'error');
      return;
    }
    const targetVisit = activeVisitsList.find(v => v.id === invoiceForm.visit_id);
    if (!targetVisit) {
      showToast('الزيارة المحددة غير موجودة', 'error');
      return;
    }
    setSubmittingModal(true);
    try {
      await api.createInvoice({
        visit_id: targetVisit.id,
        customer_id: targetVisit.customer_id,
        vehicle_id: targetVisit.vehicle_id,
        work_order_id: targetVisit.work_order_id || null,
        grand_total: Number(invoiceForm.grand_total) || 0,
        paid_amount: Number(invoiceForm.paid_amount) || 0,
        payment_method: invoiceForm.payment_method,
        notes: invoiceForm.notes
      });
      showToast('تم إصدار الفاتورة بنجاح');
      setActiveModal(null);
      setInvoiceForm({ visit_id: '', customer_id: '', vehicle_id: '', grand_total: '', paid_amount: '', payment_method: 'cash', notes: '' });
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'فشل في إصدار الفاتورة', 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.invoice_id || !paymentForm.amount) {
      showToast('يرجى اختيار الفاتورة وتحديد مبلغ الدفعة', 'error');
      return;
    }
    const targetInvoice = unpaidInvoicesList.find(inv => inv.id === paymentForm.invoice_id);
    setSubmittingModal(true);
    try {
      await api.registerPayment({
        invoice_id: paymentForm.invoice_id,
        customer_id: targetInvoice?.customer_id || paymentForm.customer_id,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes
      });
      showToast('تم تسجيل الدفعة النقدية بنجاح');
      setActiveModal(null);
      setPaymentForm({ invoice_id: '', customer_id: '', amount: '', payment_method: 'cash', reference_number: '', notes: '' });
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'فشل في تسجيل الدفعة', 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.description) {
      showToast('يرجى إدخال المبلغ ووصف المصروف', 'error');
      return;
    }
    setSubmittingModal(true);
    try {
      await api.createExpense({
        ...expenseForm,
        amount: Number(expenseForm.amount)
      });
      showToast('تم تسجيل المصروف بنجاح');
      setActiveModal(null);
      setExpenseForm({ category: 'أدوات وصيانة', amount: '', description: '', payment_method: 'cash', recipient: '' });
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'فشل في تسجيل المصروف', 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  // Arabic Status Translation & Visual Badge
  const getArabicStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase().trim();
    if (s === 'ready' || s.includes('جاهز')) {
      return { label: 'جاهزة للتسليم', icon: '✓', color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40', dot: 'bg-emerald-400' };
    }
    if (s === 'waiting_parts' || s.includes('قطع')) {
      return { label: 'انتظار قطع غيار', icon: '⏳', color: 'bg-orange-500/15 text-orange-400 border border-orange-400/40', dot: 'bg-orange-400' };
    }
    if (s === 'engine_overhaul' || s.includes('عمرة')) {
      return { label: 'عمرة وتوضيب محرك', icon: '⚙', color: 'bg-rose-500/15 text-rose-400 border border-rose-500/40', dot: 'bg-rose-400' };
    }
    if (s === 'maintenance' || s === 'in_repair' || s === 'repairs' || s.includes('صيانة') || s.includes('إصلاح')) {
      return { label: 'تحت الصيانة والإصلاح', icon: '🛠️', color: 'bg-amber-500/15 text-amber-400 border border-amber-400/40', dot: 'bg-amber-400' };
    }
    if (s === 'diagnosing' || s === 'diagnostics' || s.includes('فحص')) {
      return { label: 'فحص كمبيوتر وأعطال', icon: '🔍', color: 'bg-purple-500/15 text-purple-400 border border-purple-400/40', dot: 'bg-purple-400' };
    }
    if (s === 'inspection' || s.includes('مبدئي')) {
      return { label: 'فحص مبدئي', icon: '📋', color: 'bg-indigo-500/15 text-indigo-400 border border-indigo-400/40', dot: 'bg-indigo-400' };
    }
    if (s === 'testing' || s.includes('اختبار')) {
      return { label: 'اختبار وجودة', icon: '🧪', color: 'bg-teal-500/15 text-teal-400 border border-teal-400/40', dot: 'bg-teal-400' };
    }
    if (s === 'received' || s.includes('استلام')) {
      return { label: 'استقبال جديد', icon: '🚗', color: 'bg-sky-500/15 text-sky-400 border border-sky-400/40', dot: 'bg-sky-400' };
    }
    return { label: status || 'بالورشة', icon: '•', color: 'bg-slate-800 text-slate-300 border border-slate-700', dot: 'bg-slate-400' };
  };

  // Helper for Duration Text
  const formatDurationSince = (datetimeStr: string) => {
    if (!datetimeStr) return 'حديثاً';
    const entry = new Date(datetimeStr).getTime();
    const now = Date.now();
    const diffHours = Math.max(0, Math.floor((now - entry) / (1000 * 60 * 60)));
    if (diffHours < 1) return 'منذ أقل من ساعة';
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    return `منذ ${diffDays} يوم ${diffDays > 2 ? '⚠️ متأخرة' : ''}`;
  };

  // Extract Summary Data
  const summary = stats?.summary || {
    today_vehicles: stats?.vehicles?.today_vehicles_count || 0,
    total_in_workshop: stats?.vehicles?.total_in_workshop || 0,
    today_collections: 0,
    today_invoiced: 0,
    attention_count: stats?.alerts?.length || 0
  };

  const pipeline = stats?.pipeline || {
    received: stats?.vehicles?.received_count || 0,
    inspection: 0,
    diagnostics: stats?.vehicles?.diagnosing_count || 0,
    repair: stats?.vehicles?.in_repair_count || 0,
    waiting_parts: stats?.vehicles?.waiting_parts_count || 0,
    testing: 0,
    ready: stats?.vehicles?.ready_count || 0
  };

  const alerts = stats?.alerts || [];
  const financial = stats?.financialSnapshot || {
    today_invoiced: 0,
    today_collected: 0,
    today_expenses: 0,
    today_net: 0,
    total_outstanding: stats?.financials?.total_outstanding || 0,
    total_invoiced_all: stats?.financials?.total_invoiced || 0,
    total_collected_all: stats?.financials?.total_collected || 0,
    total_expenses_all: stats?.financials?.total_expenses || 0
  };
  const recentActivities: DashboardActivity[] = stats?.recentActivity || [];
  const currentVehicles = stats?.currentVehicles || stats?.recentVisits || [];

  // Filtered Vehicles for Table
  const filteredVehicles = useMemo(() => {
    return currentVehicles.filter((v: any) => {
      // Pipeline stage filter
      if (selectedPipelineStage) {
        if (selectedPipelineStage === 'received') {
          if (v.status !== 'received') return false;
        } else if (selectedPipelineStage === 'inspection') {
          if (v.status !== 'inspection' && !(v.initial_inspection && v.status === 'received')) return false;
        } else if (selectedPipelineStage === 'diagnostics') {
          if (v.status !== 'diagnosing' && v.status !== 'diagnostics') return false;
        } else if (selectedPipelineStage === 'repair') {
          if (v.status !== 'in_repair' && v.status !== 'maintenance' && v.status !== 'repairs' && v.status !== 'engine_overhaul') return false;
        } else if (selectedPipelineStage === 'waiting_parts') {
          if (v.status !== 'waiting_parts') return false;
        } else if (selectedPipelineStage === 'testing') {
          if (v.status !== 'testing') return false;
        } else if (selectedPipelineStage === 'ready') {
          if (v.status !== 'ready') return false;
        }
      }

      // Search query filter
      if (tableSearchQuery.trim()) {
        const q = tableSearchQuery.toLowerCase().trim();
        const matchesPlate = (v.plate_number || '').toLowerCase().includes(q);
        const matchesCustomer = (v.customer_name || '').toLowerCase().includes(q);
        const matchesPhone = (v.customer_phone || '').includes(q);
        const matchesCar = `${v.make || ''} ${v.model || ''}`.toLowerCase().includes(q);
        const matchesVisit = (v.visit_number || '').toLowerCase().includes(q);
        if (!matchesPlate && !matchesCustomer && !matchesPhone && !matchesCar && !matchesVisit) {
          return false;
        }
      }

      return true;
    });
  }, [currentVehicles, selectedPipelineStage, tableSearchQuery]);

  // Visual Theme Classes
  const cardBg = isDark ? 'glass-card border border-white/[0.08]' : 'bg-white border border-slate-200 shadow-sm';
  const textHead = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-950/70 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';

  // Role Permissions Check
  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';
  const isAccountant = user?.role === 'accountant' || isOwnerOrManager;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 transition-all text-xs font-bold border backdrop-blur-md animate-bounce ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-emerald-950/40'
            : 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-rose-950/40'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Welcome & Control Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-lg sm:text-xl font-black tracking-tight ${textHead}`}>
              لوحة التحكم السريعة
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-400/30">
              مركز العمليات
            </span>
          </div>
          <p className={`text-xs ${textMuted} mt-0.5`}>
            مرحباً بك، <strong className={textHead}>{user?.full_name || 'مهندس الورشة'}</strong> • متابعة حية لجميع العمليات والسيارات بالورشة
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveModal('shortcuts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              isDark
                ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="عرض اختصارات لوحة المفاتيح"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">اختصارات سريعة</span>
            <span className="font-mono text-[10px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded border border-slate-700">Alt</span>
          </button>

          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border ${
              isDark
                ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="تحديث البيانات فورياً"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. TOP SUMMARY - 4 MAIN ACTIONABLE CARDS ONLY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: سيارات اليوم */}
        <div
          onClick={() => onNavigate('visits')}
          className={`${cardBg} p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-sky-500/50 group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textMuted}`}>سيارات اليوم</span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400 flex items-center justify-center transition-transform group-hover:scale-110">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black tracking-tight ${textHead}`}>
                {summary.today_vehicles}
              </span>
              <span className={`text-xs font-bold ${textMuted}`}>سيارة</span>
            </div>
            <span className="text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-400/20">
              استقبال اليوم
            </span>
          </div>
          <p className={`text-[11px] ${textMuted} mt-2 flex items-center gap-1`}>
            <span>اضغط لاستعراض سجل الزيارات اليومية</span>
            <ArrowUpRight className="w-3 h-3 text-sky-400" />
          </p>
        </div>

        {/* Card 2: السيارات داخل الورشة */}
        <div
          onClick={() => {
            setSelectedPipelineStage(null);
            const el = document.getElementById('current-vehicles-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`${cardBg} p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textMuted}`}>السيارات داخل الورشة</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-400 flex items-center justify-center transition-transform group-hover:scale-110">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight text-amber-400">
                {summary.total_in_workshop}
              </span>
              <span className={`text-xs font-bold ${textMuted}`}>سيارة</span>
            </div>
            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              تحت العمل والفحص
            </span>
          </div>
          <p className={`text-[11px] ${textMuted} mt-2 flex items-center gap-1`}>
            <span>معروضة في جدول المتابعة بالأسفل 👇</span>
          </p>
        </div>

        {/* Card 3: تحصيل اليوم */}
        <div
          onClick={() => onNavigate('invoices')}
          className={`${cardBg} p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/50 group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textMuted}`}>تحصيل اليوم (سندات القبض)</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-400">
                {Number(summary.today_collections || 0).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-emerald-500">ج.م</span>
            </div>
            {summary.today_invoiced > 0 && (
              <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full">
                فواتير: {Number(summary.today_invoiced).toLocaleString()}
              </span>
            )}
          </div>
          <p className={`text-[11px] ${textMuted} mt-2 flex items-center gap-1`}>
            <span>اضغط لفتح شاشة الفواتير وسندات القبض</span>
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
          </p>
        </div>

        {/* Card 4: تحتاج انتباهك الآن */}
        <div
          onClick={() => {
            const el = document.getElementById('needs-attention-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`${cardBg} p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-rose-500/50 group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${textMuted}`}>تحتاج انتباهك الآن</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 border ${
              summary.attention_count > 0
                ? 'bg-rose-500/15 border-rose-400/30 text-rose-400 animate-pulse'
                : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400'
            }`}>
              {summary.attention_count > 0 ? <AlertTriangle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black tracking-tight ${summary.attention_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {summary.attention_count}
              </span>
              <span className={`text-xs font-bold ${textMuted}`}>تنبيه عاجل</span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              summary.attention_count > 0
                ? 'bg-rose-500/10 text-rose-400 border-rose-400/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20'
            }`}>
              {summary.attention_count > 0 ? 'تتطلب التدخل' : 'كل شيء ممتاز'}
            </span>
          </div>
          <p className={`text-[11px] ${textMuted} mt-2 flex items-center gap-1`}>
            <span>سيارات جاهزة، متأخرة، أو بانتظار قطع</span>
          </p>
        </div>
      </div>

      {/* 3. QUICK ACTIONS - ACTION FIRST, LOW CLICKS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-sm font-black flex items-center gap-2 ${textHead}`}>
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>إجراءات سريعة</span>
          </h2>
          <span className="text-[11px] text-slate-400">
            تنفيذ أي عملية مباشرة بنقرة واحدة
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {[
            {
              id: 'new_visit' as const,
              label: 'تسجيل زيارة',
              sub: 'دخول سيارة',
              shortcut: 'Alt+N',
              icon: PlusCircle,
              color: 'border-sky-500/30 hover:border-sky-400 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400'
            },
            {
              id: 'new_customer' as const,
              label: 'إضافة عميل',
              sub: 'بيانات العميل',
              shortcut: 'Alt+C',
              icon: User,
              color: 'border-indigo-500/30 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400'
            },
            {
              id: 'new_vehicle' as const,
              label: 'إضافة سيارة',
              sub: 'لوحة وشاسيه',
              shortcut: 'Alt+V',
              icon: Car,
              color: 'border-purple-500/30 hover:border-purple-400 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400'
            },
            {
              id: 'new_work_order' as const,
              label: 'فتح أمر صيانة',
              sub: 'صيانة وفحص',
              shortcut: 'Alt+W',
              icon: Hammer,
              color: 'border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
            },
            {
              id: 'new_invoice' as const,
              label: 'إصدار فاتورة',
              sub: 'حساب التكلفة',
              shortcut: 'Alt+I',
              icon: Receipt,
              color: 'border-emerald-500/30 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
            },
            {
              id: 'new_payment' as const,
              label: 'تسجيل دفعة',
              sub: 'سند قبض',
              shortcut: 'Alt+P',
              icon: DollarSign,
              color: 'border-teal-500/30 hover:border-teal-400 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400'
            },
            {
              id: 'new_expense' as const,
              label: 'إضافة مصروف',
              sub: 'مصروفات عامة',
              shortcut: 'Alt+E',
              icon: Wallet,
              color: 'border-rose-500/30 hover:border-rose-400 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
            }
          ].map(({ id, label, sub, shortcut, icon: Icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => openModalWithData(id)}
              className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all duration-200 hover:scale-[1.02] active:scale-95 group shadow-sm ${color}`}
            >
              <div className="w-full flex items-center justify-between mb-1">
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-mono opacity-60 bg-black/30 px-1 py-0.2 rounded">
                  {shortcut}
                </span>
              </div>
              <div className="w-full text-right mt-1">
                <span className="text-xs font-black block text-white truncate">{label}</span>
                <span className="text-[10px] opacity-75 block truncate">{sub}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. NEEDS ATTENTION - ACTIONABLE ALERTS */}
      <div id="needs-attention-section">
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-sm font-black flex items-center gap-2 ${textHead}`}>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>يحتاج انتباهك الآن</span>
            {alerts.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                {alerts.length} تنبيهات
              </span>
            )}
          </h2>
          <span className="text-[11px] text-slate-400">
            أمور عاجلة تتطلب اتخاذ إجراء مباشر
          </span>
        </div>

        {alerts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert: DashboardAlert) => {
              const isDanger = alert.severity === 'danger';
              const isWarning = alert.severity === 'warning';
              const isSuccess = alert.severity === 'success';

              const borderCls = isDanger
                ? 'border-rose-500/40 bg-rose-500/10 hover:border-rose-400'
                : isWarning
                ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-400'
                : isSuccess
                ? 'border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-400'
                : 'border-sky-500/40 bg-sky-500/10 hover:border-sky-400';

              const badgeCls = isDanger
                ? 'bg-rose-500 text-white'
                : isWarning
                ? 'bg-amber-500 text-slate-950 font-black'
                : isSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-sky-500 text-white';

              return (
                <div
                  key={alert.id}
                  onClick={() => {
                    if (alert.targetTab) {
                      onNavigate(alert.targetTab);
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm flex flex-col justify-between ${borderCls}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        {isDanger && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                        {isWarning && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                        {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>{alert.title}</span>
                      </h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${badgeCls}`}>
                        {alert.count}
                      </span>
                    </div>
                    <p className={`text-[11px] ${textMuted} mt-1.5 line-clamp-2`}>
                      {alert.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-xs font-bold text-sky-400">
                    <span>{alert.actionLabel}</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`${cardBg} p-5 rounded-2xl text-center border-dashed`}>
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center mb-2">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-xs font-black text-emerald-400">كل شيء ممتاز وبخير ✓</p>
            <p className={`text-[11px] ${textMuted} mt-0.5`}>
              لا توجد سيارات متأخرة أو فواتير معلقة تتطلب تدخلك الفوري الآن.
            </p>
          </div>
        )}
      </div>

      {/* 5. WORKSHOP LIVE STATUS - PIPELINE STAGES */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-sm font-black flex items-center gap-2 ${textHead}`}>
            <Layers className="w-4 h-4 text-sky-400" />
            <span>حالة الورشة الآن (مراحل خط سير السيارات)</span>
          </h2>
          {selectedPipelineStage && (
            <button
              type="button"
              onClick={() => setSelectedPipelineStage(null)}
              className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>إلغاء التصفية (عرض الكل)</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {[
            { id: 'received', label: 'استقبال', count: pipeline.received, icon: Car, color: 'sky' },
            { id: 'inspection', label: 'فحص مبدئي', count: pipeline.inspection, icon: FileText, color: 'indigo' },
            { id: 'diagnostics', label: 'تشخيص كمبيوتر', count: pipeline.diagnostics, icon: Cpu, color: 'purple' },
            { id: 'repair', label: 'صيانة وإصلاح', count: pipeline.repair, icon: Wrench, color: 'amber' },
            { id: 'waiting_parts', label: 'انتظار قطع', count: pipeline.waiting_parts, icon: Package, color: 'orange' },
            { id: 'testing', label: 'اختبار وجودة', count: pipeline.testing, icon: Activity, color: 'teal' },
            { id: 'ready', label: 'جاهزة للتسليم', count: pipeline.ready, icon: CheckCircle2, color: 'emerald' },
          ].map(({ id, label, count, icon: Icon, color }) => {
            const isSelected = selectedPipelineStage === id;

            return (
              <div
                key={id}
                onClick={() => setSelectedPipelineStage(isSelected ? null : id)}
                className={`p-3 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                  isSelected
                    ? 'ring-2 ring-sky-400 bg-sky-500/15 border-sky-400 shadow-lg shadow-sky-500/10'
                    : isDark
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-full ${
                    count > 0
                      ? 'bg-sky-500 text-white'
                      : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </div>
                <div className="mt-2.5">
                  <p className="text-xs font-bold text-white truncate">{label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {count > 0 ? `${count} سيارات` : 'لا توجد'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. CURRENT VEHICLES TABLE - PROGRESSIVE DISCLOSURE */}
      <div id="current-vehicles-section" className={`${cardBg} rounded-2xl overflow-hidden shadow-sm`}>
        {/* Table Header & Search */}
        <div className="p-4 border-b border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-sky-400" />
            <h3 className={`font-black text-sm ${textHead}`}>
              السيارات الموجودة حاليًا في الورشة
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              {filteredVehicles.length} سيارة
            </span>
            {selectedPipelineStage && (
              <span className="text-[11px] font-bold text-sky-400 bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 rounded-md">
                مفلترة حسب: {selectedPipelineStage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                placeholder="بحث بلوحة أو عميل أو سيارة..."
                className={`w-full py-1.5 pr-8 pl-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 ${inputBg}`}
              />
              {tableSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTableSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('visits')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/[0.08]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <span>سجل الزيارات الكامل</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className={isDark ? 'bg-white/[0.03] text-slate-400 border-b border-white/[0.08]' : 'bg-slate-50 text-slate-600 border-b border-slate-200'}>
              <tr>
                <th className="py-3 px-4 font-bold">رقم الزيارة</th>
                <th className="py-3 px-4 font-bold">السيارة واللوحة</th>
                <th className="py-3 px-4 font-bold">العميل</th>
                <th className="py-3 px-4 font-bold">الخدمة والشكوى</th>
                <th className="py-3 px-4 font-bold">الحالة</th>
                <th className="py-3 px-4 font-bold">الفني</th>
                <th className="py-3 px-4 font-bold">المدة</th>
                <th className="py-3 px-4 font-bold">التكلفة</th>
                <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-white/[0.06]' : 'divide-y divide-slate-100'}>
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((v: any) => {
                  const badge = getArabicStatusBadge(v.status);

                  return (
                    <tr key={v.id} className={`${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'} transition-colors`}>
                      {/* 1. Visit # */}
                      <td className="py-3 px-4 font-mono font-black text-slate-300">
                        {v.visit_number}
                      </td>

                      {/* 2. Car & Plate */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className={`font-bold ${textHead}`}>
                            {v.make} {v.model} {v.year ? `(${v.year})` : ''}
                          </span>
                          <span className="text-[11px] font-mono text-sky-400 font-bold bg-slate-900/80 px-1.5 py-0.5 rounded w-fit border border-slate-800 mt-0.5">
                            {v.plate_number}
                          </span>
                        </div>
                      </td>

                      {/* 3. Customer */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200">{v.customer_name}</span>
                          {v.customer_phone && (
                            <a
                              href={`tel:${v.customer_phone}`}
                              className="text-[11px] text-slate-400 hover:text-sky-400 font-mono mt-0.5 flex items-center gap-1 w-fit"
                              dir="ltr"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>{v.customer_phone}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 4. Complaint / Service */}
                      <td className={`py-3 px-4 max-w-xs ${textMuted}`}>
                        <p className="truncate font-semibold text-slate-200">{v.customer_complaint || 'صيانة عامة'}</p>
                        {v.work_order_desc && v.work_order_desc !== v.customer_complaint && (
                          <p className="text-[11px] text-amber-400/90 truncate">{v.work_order_desc}</p>
                        )}
                      </td>

                      {/* 5. Status Badge with Quick Status Changer */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setStatusChangeVisit(v)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer ${badge.color}`}
                          title="اضغط لتغيير حالة السيارة سريعاً"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          <span>{badge.label}</span>
                        </button>
                      </td>

                      {/* 6. Technician */}
                      <td className="py-3 px-4 text-slate-300">
                        {v.mechanic_name ? (
                          <span className="font-medium text-slate-300">{v.mechanic_name}</span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">لم يُعيّن بعد</span>
                        )}
                      </td>

                      {/* 7. Duration */}
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {formatDurationSince(v.entry_datetime)}
                      </td>

                      {/* 8. Cost */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col font-mono font-bold">
                          <span className="text-emerald-400 text-sm">
                            {Number(v.total_cost || 0).toLocaleString()} ج.م
                          </span>
                          {v.invoice_number ? (
                            <span className="text-[10px] text-slate-400 font-normal">
                              فاتورة: {v.invoice_number}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400/80 font-normal">
                              تكلفة مقدرة
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 9. Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Details Icon: What was fixed & replaced */}
                          <button
                            type="button"
                            onClick={() => setSelectedCarForDetails(v)}
                            className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-800/60 transition-all cursor-pointer"
                            title="عرض كشف ما تم تغييره وإصلاحه في السيارة"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>

                          {/* Invoice Button */}
                          {v.invoice_number ? (
                            <button
                              type="button"
                              onClick={() => onNavigate('invoices', v.invoice_id, v.invoice_number)}
                              className="p-1.5 rounded-lg bg-teal-950/60 hover:bg-teal-900 text-teal-300 hover:text-white border border-teal-800/60 transition-all cursor-pointer"
                              title="استعراض الفاتورة وطباعتها"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setInvoiceForm(prev => ({
                                  ...prev,
                                  visit_id: v.id,
                                  customer_id: v.customer_id,
                                  vehicle_id: v.vehicle_id,
                                  grand_total: String(v.total_cost || '')
                                }));
                                setActiveModal('new_invoice');
                              }}
                              className="p-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-800/60 transition-all cursor-pointer"
                              title="إصدار فاتورة للسيارة"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* WhatsApp Ready Notification */}
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(v.id)}
                            className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-800/60 transition-all cursor-pointer"
                            title="إرسال إشعار جاهزية السيارة عبر واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Car className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                    <p className="font-bold text-sm text-slate-300">
                      {selectedPipelineStage
                        ? `لا توجد سيارات حالياً في مرحلة (${selectedPipelineStage})`
                        : 'لا توجد سيارات داخل الورشة حالياً'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      يمكنك تسجيل دخول سيارة جديدة بنقرة واحدة عبر زر "تسجيل زيارة"
                    </p>
                    <button
                      type="button"
                      onClick={() => openModalWithData('new_visit')}
                      className="mt-3 px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>تسجيل زيارة جديدة (Alt+N)</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7 & 8: FINANCIAL SNAPSHOT & RECENT ACTIVITY (GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7. FINANCIAL SNAPSHOT (5 Cols on large) */}
        {isAccountant && (
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={`text-sm font-black flex items-center gap-2 ${textHead}`}>
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>الملخص المالي السريع (اليوم)</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>التقارير المالية</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className={`${cardBg} p-5 rounded-2xl space-y-4`}>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Today Invoiced */}
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className={textMuted}>إيرادات وفواتير اليوم</span>
                  <p className="text-lg font-black font-mono text-white mt-1">
                    {Number(financial.today_invoiced).toLocaleString()} <span className="text-[10px] text-slate-400">ج.م</span>
                  </p>
                </div>

                {/* Today Collected */}
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                  <span className="text-emerald-400 font-medium">المحصل اليوم (Cash)</span>
                  <p className="text-lg font-black font-mono text-emerald-400 mt-1">
                    {Number(financial.today_collected).toLocaleString()} <span className="text-[10px] text-emerald-500">ج.م</span>
                  </p>
                </div>

                {/* Today Expenses */}
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-800/40">
                  <span className="text-rose-400 font-medium">مصروفات اليوم</span>
                  <p className="text-lg font-black font-mono text-rose-400 mt-1">
                    {Number(financial.today_expenses).toLocaleString()} <span className="text-[10px] text-rose-500">ج.م</span>
                  </p>
                </div>

                {/* Today Net */}
                <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-800/40">
                  <span className="text-sky-400 font-medium">صافي اليوم المحصل</span>
                  <p className={`text-lg font-black font-mono mt-1 ${financial.today_net >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                    {Number(financial.today_net).toLocaleString()} <span className="text-[10px] text-sky-500">ج.م</span>
                  </p>
                </div>
              </div>

              {/* Outstanding Receivables Banner */}
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-center justify-between text-xs">
                <div>
                  <span className="text-amber-400 font-bold block">إجمالي ديون ومستحقات على العملاء:</span>
                  <span className="text-[10px] text-slate-400">متبقي على فواتير الصيانة غير المسددة</span>
                </div>
                <span className="text-base font-black font-mono text-amber-300">
                  {Number(financial.total_outstanding).toLocaleString()} ج.م
                </span>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>عرض كشف الحساب والتقارير المالية الكاملة</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 8. RECENT ACTIVITY (7 Cols on large or full width) */}
        <div className={isAccountant ? 'lg:col-span-7 space-y-3' : 'col-span-12 space-y-3'}>
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-black flex items-center gap-2 ${textHead}`}>
              <Activity className="w-4 h-4 text-purple-400" />
              <span>آخر العمليات المسجلة بالورشة</span>
            </h2>
            <span className="text-[11px] text-slate-400">سجل النشاط المباشر</span>
          </div>

          <div className={`${cardBg} p-4 rounded-2xl divide-y divide-white/[0.06]`}>
            {recentActivities.length > 0 ? (
              recentActivities.map((act) => (
                <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-200 truncate">{act.description}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        بواسطة: <span className="text-slate-400 font-medium">{act.user_name}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 whitespace-nowrap">
                    {formatDurationSince(act.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                لا توجد عمليات مسجلة حديثاً في سجل النشاط.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: تسجيل زيارة جديدة (Alt + N) */}
      {/* ======================================================== */}
      {activeModal === 'new_visit' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded border border-slate-700">Alt+N</span>
                <h3 className="text-base font-black text-white">تسجيل زيارة ودخول سيارة</h3>
                <Car className="w-5 h-5 text-sky-400" />
              </div>
            </div>

            <form onSubmit={handleSubmitVisit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    value={visitForm.customer_name}
                    onChange={(e) => setVisitForm({ ...visitForm, customer_name: e.target.value })}
                    placeholder="مثال: أحمد محمد"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    value={visitForm.customer_phone}
                    onChange={(e) => setVisitForm({ ...visitForm, customer_phone: e.target.value })}
                    placeholder="مثال: 01012345678"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono ${inputBg}`}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">رقم اللوحة *</label>
                  <input
                    type="text"
                    required
                    value={visitForm.plate_number}
                    onChange={(e) => setVisitForm({ ...visitForm, plate_number: e.target.value })}
                    placeholder="س ص ع 1234"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">الماركة</label>
                  <input
                    type="text"
                    value={visitForm.make}
                    onChange={(e) => setVisitForm({ ...visitForm, make: e.target.value })}
                    placeholder="تويوتا / كيا..."
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">الموديل</label>
                  <input
                    type="text"
                    value={visitForm.model}
                    onChange={(e) => setVisitForm({ ...visitForm, model: e.target.value })}
                    placeholder="كورولا / سبورتاج"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">قراءة العداد (كم)</label>
                  <input
                    type="number"
                    value={visitForm.odometer_in || ''}
                    onChange={(e) => setVisitForm({ ...visitForm, odometer_in: Number(e.target.value) })}
                    placeholder="120000"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">سنة الصنع</label>
                  <input
                    type="number"
                    value={visitForm.year}
                    onChange={(e) => setVisitForm({ ...visitForm, year: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">شكوى العميل / المطلوب *</label>
                <textarea
                  required
                  rows={2}
                  value={visitForm.customer_complaint}
                  onChange={(e) => setVisitForm({ ...visitForm, customer_complaint: e.target.value })}
                  placeholder="وصف المشكلة، صيانة دورية، صوت بالمحرك، فحص كمبيوتر..."
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 ${inputBg}`}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-sky-600/30 cursor-pointer disabled:opacity-50"
                >
                  {submittingModal ? 'جاري الحفظ...' : 'تسجيل الزيارة ودخول السيارة ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: إضافة عميل (Alt + C) */}
      {/* ======================================================== */}
      {activeModal === 'new_customer' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded border border-slate-700">Alt+C</span>
                <h3 className="text-base font-black text-white">إضافة عميل جديد</h3>
                <User className="w-5 h-5 text-indigo-400" />
              </div>
            </div>

            <form onSubmit={handleSubmitCustomer} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={customerForm.full_name}
                  onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })}
                  placeholder="اسم العميل"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    placeholder="010XXXXXXXX"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${inputBg}`}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">هاتف إضافي</label>
                  <input
                    type="text"
                    value={customerForm.phone_secondary}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone_secondary: e.target.value })}
                    placeholder="هاتف بديل"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${inputBg}`}
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">العنوان</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="المدينة / المنطقة"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">ملاحظات</label>
                <textarea
                  rows={2}
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  placeholder="ملاحظات العميل أو تفضيلاته..."
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inputBg}`}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {submittingModal ? 'جاري الحفظ...' : 'حفظ العميل ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: إضافة سيارة (Alt + V) */}
      {/* ======================================================== */}
      {activeModal === 'new_vehicle' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-slate-800 text-purple-400 px-1.5 py-0.5 rounded border border-slate-700">Alt+V</span>
                <h3 className="text-base font-black text-white">تسجيل سيارة جديدة</h3>
                <Car className="w-5 h-5 text-purple-400" />
              </div>
            </div>

            <form onSubmit={handleSubmitVehicle} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">مالك السيارة *</label>
                <select
                  required
                  value={vehicleForm.current_owner_id}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, current_owner_id: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 ${inputBg}`}
                >
                  <option value="">-- اختر مالك السيارة --</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">رقم اللوحة *</label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.plate_number}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
                    placeholder="س ص ع 1234"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">الماركة *</label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                    placeholder="هيونداي / نيسان..."
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">الموديل *</label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    placeholder="النترا / صني"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">سنة الصنع</label>
                  <input
                    type="number"
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, year: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">اللون</label>
                  <input
                    type="text"
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                    placeholder="أبيض / أسود"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 ${inputBg}`}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
                >
                  {submittingModal ? 'جاري الحفظ...' : 'تسجيل السيارة ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: فتح أمر صيانة (Alt + W) */}
      {/* ======================================================== */}
      {activeModal === 'new_work_order' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded border border-slate-700">Alt+W</span>
                <h3 className="text-base font-black text-white">فتح أمر صيانة</h3>
                <Hammer className="w-5 h-5 text-amber-400" />
              </div>
            </div>

            <form onSubmit={handleSubmitWorkOrder} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">السيارة والزيارة *</label>
                <select
                  required
                  value={workOrderForm.visit_id}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, visit_id: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${inputBg}`}
                >
                  <option value="">-- اختر السيارة من زيارات الورشة --</option>
                  {activeVisitsList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} - {v.make} {v.model} ({v.customer_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">بند العمل</label>
                  <select
                    value={workOrderForm.category}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, category: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${inputBg}`}
                  >
                    <option value="repair">إصلاح وتصليح أعطال</option>
                    <option value="maintenance">صيانة دورية وسريعة</option>
                    <option value="overhaul">عمرة وتوضيب محرك</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">الأولوية</label>
                  <select
                    value={workOrderForm.priority}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, priority: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${inputBg}`}
                  >
                    <option value="normal">عادية</option>
                    <option value="high">عاجلة / هامة</option>
                    <option value="urgent">طارئة جداً</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">وصف العمل المطلوب *</label>
                <textarea
                  required
                  rows={2}
                  value={workOrderForm.description}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, description: e.target.value })}
                  placeholder="مثال: فحص وتغيير طلمبة مياه، سيور، وضبط زوايا..."
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">التكلفة التقديرية (ج.م)</label>
                <input
                  type="number"
                  value={workOrderForm.estimated_cost}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, estimated_cost: e.target.value })}
                  placeholder="0.00"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono ${inputBg}`}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-600/30 cursor-pointer disabled:opacity-50"
                >
                  {submittingModal ? 'جاري الفتح...' : 'فتح أمر الصيانة ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: إصدار فاتورة (Alt + I) */}
      {/* ======================================================== */}
      {activeModal === 'new_invoice' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded border border-slate-700">Alt+I</span>
                <h3 className="text-base font-black text-white">إصدار فاتورة صيانة</h3>
                <Receipt className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <form onSubmit={handleSubmitInvoice} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">السيارة والزيارة *</label>
                <select
                  required
                  value={invoiceForm.visit_id}
                  onChange={(e) => {
                    const vid = e.target.value;
                    const v = activeVisitsList.find(x => x.id === vid);
                    setInvoiceForm({
                      ...invoiceForm,
                      visit_id: vid,
                      grand_total: v ? String(v.total_cost || '') : invoiceForm.grand_total,
                      paid_amount: v ? String(v.total_cost || '') : invoiceForm.paid_amount
                    });
                  }}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${inputBg}`}
                >
                  <option value="">-- اختر السيارة المراد فوترتها --</option>
                  {activeVisitsList
                    .filter(v => !v.invoice_number && !v.invoice_id)
                    .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} - {v.customer_name} (المقدر: {Number(v.total_cost || 0).toLocaleString()} ج.م)
                    </option>
                  ))}
                </select>
                {activeVisitsList.filter(v => !v.invoice_number && !v.invoice_id).length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                    <span>💡 جميع السيارات الحالية بالورشة صادر لها فواتير بالفعل. لتسجيل دفعة أو تحصيل مبالغ، اضغط "تسجيل دفعة" (Alt+P).</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">إجمالي الفاتورة (ج.م) *</label>
                  <input
                    type="number"
                    required
                    value={invoiceForm.grand_total}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, grand_total: e.target.value })}
                    placeholder="0.00"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-emerald-400 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">المدفوع الآن (ج.م)</label>
                  <input
                    type="number"
                    value={invoiceForm.paid_amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paid_amount: e.target.value })}
                    placeholder="0.00"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">طريقة الدفع</label>
                <select
                  value={invoiceForm.payment_method}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, payment_method: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${inputBg}`}
                >
                  <option value="cash">نقدي (كاش)</option>
                  <option value="card">مدى / بطاقة بنكية</option>
                  <option value="transfer">تحويل بنكي / إنستاباي</option>
                  <option value="other">آجل / غير مسدد</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">ملاحظات الفاتورة</label>
                <textarea
                  rows={2}
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  placeholder="ملاحظات الضمان، شروط السداد..."
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${inputBg}`}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  {submittingModal ? 'جاري الإصدار...' : 'إصدار الفاتورة فوراً ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: تسجيل دفعة / سند قبض (Alt + P) */}
      {/* ======================================================== */}
      {activeModal === 'new_payment' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded border border-slate-700">Alt+P</span>
                <h3 className="text-base font-black text-white">تسجيل دفعة / سند قبض</h3>
                <DollarSign className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">الفاتورة المستحقة *</label>
                <select
                  required
                  value={paymentForm.invoice_id}
                  onChange={(e) => {
                    const invId = e.target.value;
                    const inv = unpaidInvoicesList.find(x => x.id === invId);
                    setPaymentForm({
                      ...paymentForm,
                      invoice_id: invId,
                      amount: inv ? String(inv.balance_due || '') : paymentForm.amount
                    });
                  }}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-teal-500 ${inputBg}`}
                >
                  <option value="">-- اختر الفاتورة المطلوب سدادها --</option>
                  {unpaidInvoicesList.length > 0 ? (
                    unpaidInvoicesList.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        #{inv.invoice_number} - {inv.customer_name} {inv.plate_number ? `(${inv.plate_number})` : ''} - المتبقي: {Number(inv.balance_due || 0).toLocaleString()} ج.م
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>-- لا توجد فواتير معلقة حالياً (جميع الفواتير مسددة بالكامل) --</option>
                  )}
                </select>

                {paymentForm.invoice_id && (() => {
                  const selectedInv = unpaidInvoicesList.find(x => x.id === paymentForm.invoice_id);
                  if (!selectedInv) return null;
                  return (
                    <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-slate-200 mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">العميل والسيارة:</span>
                        <span className="font-bold text-white">{selectedInv.customer_name} {selectedInv.plate_number ? `(${selectedInv.plate_number})` : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">إجمالي الفاتورة:</span>
                        <span className="font-mono">{Number(selectedInv.grand_total || 0).toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">المسدد سابقاً:</span>
                        <span className="font-mono text-emerald-400 font-bold">{Number(selectedInv.paid_amount || 0).toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between font-bold text-amber-400 pt-1.5 border-t border-teal-500/20">
                        <span>المتبقي المطلوب سداده:</span>
                        <span className="font-mono text-sm">{Number(selectedInv.balance_due || 0).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">المبلغ المدفوع (ج.م) *</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono font-bold text-teal-300 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">طريقة الدفع</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-teal-500 ${inputBg}`}
                  >
                    <option value="cash">نقدي (كاش)</option>
                    <option value="card">مدى / بطاقة</option>
                    <option value="transfer">تحويل بنكي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">رقم الإيصال / المرجع</label>
                <input
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  placeholder="رقم مرجع التحويل أو إيصال الكاش"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono ${inputBg}`}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-teal-600/30 cursor-pointer disabled:opacity-50"
                >
                  {submittingModal ? 'جاري التسجيل...' : 'تسجيل التحصيل ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 7: إضافة مصروف (Alt + E) */}
      {/* ======================================================== */}
      {activeModal === 'new_expense' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-slate-800 text-rose-400 px-1.5 py-0.5 rounded border border-slate-700">Alt+E</span>
                <h3 className="text-base font-black text-white">إضافة مصروف عام</h3>
                <Wallet className="w-5 h-5 text-rose-400" />
              </div>
            </div>

            <form onSubmit={handleSubmitExpense} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">بند المصروف</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-rose-500 ${inputBg}`}
                  >
                    <option value="أدوات وصيانة">أدوات ومعدات صيانة</option>
                    <option value="إيجار">إيجار الورشة</option>
                    <option value="رواتب">رواتب وأجور</option>
                    <option value="فواتير كهرباء ومياه">كهرباء ومياه وخدمات</option>
                    <option value="شحن وضيافة">شحن ونقليات وضيافة</option>
                    <option value="أخرى">مصروفات أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="0.00"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono font-bold text-rose-300 ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">البيان / الوصف *</label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="مثال: شراء عدة مفاتيح وفلتر هواء للكمبروسر..."
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-rose-500 ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">طريقة الدفع</label>
                  <select
                    value={expenseForm.payment_method}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-rose-500 ${inputBg}`}
                  >
                    <option value="cash">نقدي (كاش الخزينة)</option>
                    <option value="card">بطاقة بنكية</option>
                    <option value="transfer">تحويل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">المستلم</label>
                  <input
                    type="text"
                    value={expenseForm.recipient}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recipient: e.target.value })}
                    placeholder="اسم المحل / المستلم"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-rose-500 ${inputBg}`}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                >
                  {submittingModal ? 'جاري التسجيل...' : 'تسجيل المصروف ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 8: تفاصيل ما تم بالسيارة (ماذا تم بالسيارة؟) */}
      {/* ======================================================== */}
      {selectedCarForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCarForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2 justify-end">
                  <span>كشف صيانة ما تم في السيارة</span>
                  <Wrench className="w-5 h-5 text-sky-400" />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  رقم الزيارة: <span className="font-mono text-sky-400 font-bold">{selectedCarForDetails.visit_number}</span>
                </p>
              </div>
            </div>

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

            {/* Tasks Section: What was repaired */}
            <div className="mt-5">
              <h4 className="text-xs font-black text-amber-400 flex items-center gap-2 mb-2.5">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>🛠️ الأعمال والمهام المنجزة (إيه اللي اتصلح):</span>
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

            {/* Used Parts: What was replaced */}
            <div className="mt-5">
              <h4 className="text-xs font-black text-sky-400 flex items-center gap-2 mb-2.5">
                <Package className="w-4 h-4 text-sky-400" />
                <span>🔄 قطع الغيار والمستهلكات (إيه اللي اتغير):</span>
              </h4>
              {selectedCarForDetails.usedParts && selectedCarForDetails.usedParts.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">القطعة / الصنف</th>
                        <th className="py-2 px-3 text-center">الكمية</th>
                        <th className="py-2 px-3">سعر الوحدة</th>
                        <th className="py-2 px-3">الإجمالي</th>
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

            {/* Total Summary */}
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
                <span>الانتقال للفاتورة</span>
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

      {/* ======================================================== */}
      {/* MODAL 9: Quick Status Changer Modal */}
      {/* ======================================================== */}
      {statusChangeVisit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setStatusChangeVisit(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-black text-white">تحديث حالة السيارة</h3>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <p className="font-bold text-white">{statusChangeVisit.make} {statusChangeVisit.model}</p>
              <p className="text-sky-400 font-mono mt-0.5">{statusChangeVisit.plate_number}</p>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { status: 'received', label: 'استقبال وفحص أولي', icon: '🚗' },
                { status: 'diagnosing', label: 'فحص كمبيوتر وأعطال', icon: '🔍' },
                { status: 'in_repair', label: 'تحت الصيانة والإصلاح', icon: '🛠️' },
                { status: 'waiting_parts', label: 'انتظار قطع غيار', icon: '⏳' },
                { status: 'testing', label: 'اختبار جودة وتجربة', icon: '🧪' },
                { status: 'ready', label: 'جاهزة للتسليم للعميل ✓', icon: '✓' },
                { status: 'delivered', label: 'تم التسليم للعميل بالكامل', icon: '🏁' },
              ].map(st => (
                <button
                  key={st.status}
                  type="button"
                  onClick={() => handleUpdateStatus(st.status)}
                  className={`w-full p-2.5 rounded-xl border text-right text-xs font-bold flex items-center justify-between transition-all ${
                    statusChangeVisit.status === st.status
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                      : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{st.icon}</span>
                    <span>{st.label}</span>
                  </div>
                  {statusChangeVisit.status === st.status && (
                    <span className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded-full font-bold">الحالية</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 10: Keyboard Shortcuts Cheat Sheet */}
      {/* ======================================================== */}
      {activeModal === 'shortcuts' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">اختصارات لوحة المفاتيح</h3>
                <HelpCircle className="w-5 h-5 text-sky-400" />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              {[
                { key: 'Ctrl + K', desc: 'فتح البحث العام الشامل' },
                { key: 'Alt + N', desc: 'تسجيل زيارة جديدة ودخول سيارة' },
                { key: 'Alt + C', desc: 'إضافة عميل جديد' },
                { key: 'Alt + V', desc: 'تسجيل سيارة جديدة' },
                { key: 'Alt + W', desc: 'فتح أمر صيانة جديد' },
                { key: 'Alt + I', desc: 'إصدار فاتورة صيانة' },
                { key: 'Alt + P', desc: 'تسجيل دفعة نقدية / سند قبض' },
                { key: 'Alt + E', desc: 'إضافة مصروف عام' },
                { key: 'Esc', desc: 'إغلاق أي نافذة منبثقة أو بحث' },
              ].map(({ key, desc }) => (
                <div
                  key={key}
                  className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between"
                >
                  <span className="font-bold text-slate-200">{desc}</span>
                  <span className="font-mono text-sky-400 font-bold bg-slate-950 px-2 py-1 rounded border border-slate-700">
                    {key}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                فهمت، حسناً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      <WhatsAppReadyModal
        data={whatsAppModalData}
        isOpen={!!whatsAppModalData}
        onClose={() => setWhatsAppModalData(null)}
      />
    </div>
  );
};
