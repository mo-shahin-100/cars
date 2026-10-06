import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Edit2,
  Printer,
  X,
  CreditCard,
  ChevronRight,
  Package,
  Layers,
  Calendar,
  Filter,
  Eye,
  Paperclip,
  Check,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  RefreshCw,
  Wallet,
  Users,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { Supplier, PurchaseInvoice, Part, SupplierPayment } from '../../types';
import { useSync } from '../../context/SyncContext';
import { useAuth } from '../../context/AuthContext';

const SUPPLIER_CATEGORIES = [
  { id: 'all', label: 'جميع التصنيفات' },
  { id: 'قطع غيار', label: 'قطع غيار عامة' },
  { id: 'زيوت ومواد تشحيم', label: 'زيوت ومواد تشحيم' },
  { id: 'كهرباء ولمبات', label: 'كهرباء ولمبات' },
  { id: 'فلاتر وبواجي', label: 'فلاتر وبواجي' },
  { id: 'إطارات وبطاريات', label: 'إطارات وبطاريات' },
  { id: 'متنوع', label: 'مورد متنوع' }
];

const PAYMENT_METHODS = [
  { id: 'all', label: 'جميع طرق الدفع' },
  { id: 'cash', label: 'نقدي (كاش)' },
  { id: 'transfer', label: 'تحويل بنكي' },
  { id: 'card', label: 'بطاقة مدى / ائتمان' },
  { id: 'credit', label: 'آجل (على الحساب)' }
];

export const PurchasesView: React.FC = () => {
  const { user } = useAuth();
  const { lastEvent } = useSync();

  // Permissions
  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';
  const canManage = isOwnerOrManager || user?.permissions?.includes('inventory.manage') || user?.permissions?.includes('purchases');
  const canDelete = isOwnerOrManager;

  // Tabs & Views
  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers'>('invoices');
  const [loading, setLoading] = useState(true);

  // Data
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryParts, setInventoryParts] = useState<Part[]>([]);
  const [invoicesSummary, setInvoicesSummary] = useState<any>(null);

  // Invoices Filters
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'paid' | 'partially_paid' | 'unpaid' | 'overdue'>('all');
  const [invoiceSupplierFilter, setInvoiceSupplierFilter] = useState('all');
  const [invoicePaymentMethodFilter, setInvoicePaymentMethodFilter] = useState('all');

  // Suppliers Filters
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');

  // Modals
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showSupplierDetailModal, setShowSupplierDetailModal] = useState(false);
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Selected records
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierDetailTab, setSupplierDetailTab] = useState<'invoices' | 'payments' | 'ledger' | 'info'>('invoices');
  const [supplierDetailsData, setSupplierDetailsData] = useState<any>(null);
  const [loadingSupplierDetails, setLoadingSupplierDetails] = useState(false);

  // Supplier Form Data (Create/Edit)
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({
    id: '',
    name: '',
    contact_person: '',
    phone: '',
    phone_secondary: '',
    email: '',
    tax_number: '',
    address: '',
    category: 'قطع غيار',
    payment_terms: 'cash',
    notes: ''
  });
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);

  // Payment Form Data
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('transfer');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentTarget, setPaymentTarget] = useState<{
    type: 'invoice' | 'supplier';
    invoice?: PurchaseInvoice;
    supplier?: Supplier;
  } | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Edit Invoice Form
  const [editInvoiceData, setEditInvoiceData] = useState({
    id: '',
    invoice_number: '',
    due_date: '',
    payment_method: 'cash',
    notes: ''
  });
  const [editInvoiceSubmitting, setEditInvoiceSubmitting] = useState(false);

  // Create Invoice Form Data
  const [invoiceFormData, setInvoiceFormData] = useState({
    supplier_id: '',
    supplier_name: '',
    supplier_phone: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    payment_method: 'cash',
    paid_amount: 0,
    tax_percent: 15,
    discount_amount: 0,
    notes: '',
    items: [
      {
        part_id: '',
        item_name: '',
        part_number: '',
        sku: '',
        quantity: 1,
        unit_cost: 0,
        discount: 0,
        update_inventory: true,
        category: 'قطع غيار',
        is_new_part: false,
        sale_price: 0,
        min_stock_alert: 2,
        storage_location: 'المستودع الرئيسي'
      }
    ]
  });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, supRes, partsRes] = await Promise.all([
        api.getPurchaseInvoices(),
        api.getSuppliers(),
        api.getParts()
      ]);

      if (invRes.success) {
        setInvoices(invRes.data || []);
        setInvoicesSummary(invRes.summary || null);
      }
      if (supRes.success) {
        setSuppliers(supRes.data || []);
      }
      if (partsRes.success) {
        setInventoryParts(partsRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load purchases data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (lastEvent?.entity === 'purchases' || lastEvent?.entity === 'suppliers' || lastEvent?.entity === 'inventory') {
      loadData();
      if (selectedSupplier) {
        loadSupplierDetails(selectedSupplier.id);
      }
    }
  }, [lastEvent]);

  // Load Full Supplier Details
  const loadSupplierDetails = async (supplierId: string) => {
    setLoadingSupplierDetails(true);
    try {
      const res = await api.getSupplierById(supplierId);
      if (res.success && res.data) {
        setSupplierDetailsData(res.data);
      }
    } catch (err) {
      console.error('Failed to load supplier details:', err);
    } finally {
      setLoadingSupplierDetails(false);
    }
  };

  const handleOpenSupplierDetails = (supplier: Supplier, initialTab: 'invoices' | 'payments' | 'ledger' | 'info' = 'invoices') => {
    setSelectedSupplier(supplier);
    setSupplierDetailTab(initialTab);
    setShowSupplierDetailModal(true);
    loadSupplierDetails(supplier.id);
  };

  // ==========================================
  // Summary Metrics Calculation
  // ==========================================
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().slice(0, 10);

  const summary = useMemo(() => {
    const thisMonthPurchases = invoicesSummary?.this_month_purchases ?? invoices
      .filter((inv) => (inv.invoice_date || '').startsWith(currentMonthKey))
      .reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);

    const prevMonthPurchases = Number(invoicesSummary?.prev_month_purchases || 0);

    let monthDiffPct: number | null = null;
    if (prevMonthPurchases > 0) {
      monthDiffPct = Math.round(((thisMonthPurchases - prevMonthPurchases) / prevMonthPurchases) * 100);
    }

    const totalPaid = invoicesSummary?.total_paid ?? invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
    const totalBalanceDue = invoicesSummary?.total_balance_due ?? invoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
    const totalSuppliersCount = invoicesSummary?.total_suppliers ?? suppliers.length;
    const totalInvoicesCount = invoicesSummary?.total_invoices ?? invoices.length;

    const overdueCount = invoicesSummary?.overdue_invoices_count ?? invoices.filter((inv) =>
      Number(inv.balance_due) > 0 && inv.due_date && inv.due_date < todayStr
    ).length;

    const unpaidCount = invoicesSummary?.unpaid_invoices_count ?? invoices.filter((inv) => Number(inv.balance_due) > 0).length;

    return {
      thisMonthPurchases,
      prevMonthPurchases,
      monthDiffPct,
      totalPaid,
      totalBalanceDue,
      totalSuppliersCount,
      totalInvoicesCount,
      overdueCount,
      unpaidCount
    };
  }, [invoices, suppliers, invoicesSummary, currentMonthKey, todayStr]);

  // ==========================================
  // Filtered Invoices
  // ==========================================
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search
      if (invoiceSearch.trim()) {
        const q = invoiceSearch.toLowerCase().trim();
        const num = (inv.invoice_number || '').toLowerCase();
        const sup = (inv.supplier_name || '').toLowerCase();
        const phone = (inv.supplier_phone || '').toLowerCase();
        const notes = (inv.notes || '').toLowerCase();
        if (!num.includes(q) && !sup.includes(q) && !phone.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      // Status
      if (invoiceStatusFilter !== 'all') {
        const isOverdue = Number(inv.balance_due) > 0 && inv.due_date && inv.due_date < todayStr;
        if (invoiceStatusFilter === 'overdue') {
          if (!isOverdue) return false;
        } else if (invoiceStatusFilter === 'paid') {
          if (inv.payment_status !== 'paid' && Number(inv.balance_due) > 0) return false;
        } else if (invoiceStatusFilter === 'partially_paid') {
          if (inv.payment_status !== 'partially_paid') return false;
        } else if (invoiceStatusFilter === 'unpaid') {
          if (inv.payment_status !== 'unpaid' && Number(inv.balance_due) <= 0) return false;
        }
      }

      // Supplier
      if (invoiceSupplierFilter !== 'all') {
        if (inv.supplier_id !== invoiceSupplierFilter && inv.supplier_name !== invoiceSupplierFilter) {
          return false;
        }
      }

      // Payment Method
      if (invoicePaymentMethodFilter !== 'all') {
        if (inv.payment_method !== invoicePaymentMethodFilter) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter, invoiceSupplierFilter, invoicePaymentMethodFilter, todayStr]);

  // ==========================================
  // Filtered Suppliers
  // ==========================================
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      // Search
      if (supplierSearch.trim()) {
        const q = supplierSearch.toLowerCase().trim();
        const name = (sup.name || '').toLowerCase();
        const contact = (sup.contact_person || '').toLowerCase();
        const phone = (sup.phone || '').toLowerCase();
        const phoneSec = (sup.phone_secondary || '').toLowerCase();
        const email = (sup.email || '').toLowerCase();
        if (!name.includes(q) && !contact.includes(q) && !phone.includes(q) && !phoneSec.includes(q) && !email.includes(q)) {
          return false;
        }
      }

      // Status
      if (supplierStatusFilter !== 'all') {
        const balance = Number(sup.balance_due || 0);
        const isOverdue = (sup.overdue_count || 0) > 0;
        if (supplierStatusFilter === 'overdue') {
          if (!isOverdue) return false;
        } else if (supplierStatusFilter === 'paid') {
          if (balance > 0) return false;
        } else if (supplierStatusFilter === 'unpaid') {
          if (balance <= 0 || isOverdue) return false;
        }
      }

      // Category
      if (supplierCategoryFilter !== 'all') {
        if (sup.category !== supplierCategoryFilter) {
          return false;
        }
      }

      return true;
    });
  }, [suppliers, supplierSearch, supplierStatusFilter, supplierCategoryFilter]);

  // ==========================================
  // Supplier Actions: Create / Edit / Delete
  // ==========================================
  const handleOpenAddSupplier = () => {
    setIsEditingSupplier(false);
    setSupplierFormData({
      id: '',
      name: '',
      contact_person: '',
      phone: '',
      phone_secondary: '',
      email: '',
      tax_number: '',
      address: '',
      category: 'قطع غيار',
      payment_terms: 'cash',
      notes: ''
    });
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (supplier: Supplier) => {
    setIsEditingSupplier(true);
    setSupplierFormData({
      id: supplier.id,
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      phone_secondary: supplier.phone_secondary || '',
      email: supplier.email || '',
      tax_number: supplier.tax_number || '',
      address: supplier.address || '',
      category: supplier.category || 'قطع غيار',
      payment_terms: supplier.payment_terms || 'cash',
      notes: supplier.notes || ''
    });
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name.trim()) {
      alert('اسم المورد أو الشركة حقل إلزامي');
      return;
    }

    setSupplierSubmitting(true);
    try {
      if (isEditingSupplier) {
        await api.updateSupplier(supplierFormData.id, supplierFormData);
      } else {
        await api.createSupplier(supplierFormData);
      }
      setShowSupplierModal(false);
      loadData();
      if (selectedSupplier && selectedSupplier.id === supplierFormData.id) {
        loadSupplierDetails(supplierFormData.id);
      }
    } catch (err: any) {
      alert(err.message || 'فشل حفظ بيانات المورد');
    } finally {
      setSupplierSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string, supplierName: string) => {
    if (!canDelete) {
      alert('ليس لديك صلاحية حذف الموردين (تتطلب دور المدير أو المالك)');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف المورد "${supplierName}" من النظام؟`)) {
      return;
    }
    try {
      await api.deleteSupplier(supplierId);
      if (selectedSupplier?.id === supplierId) {
        setShowSupplierDetailModal(false);
        setSelectedSupplier(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'فشل حذف المورد');
    }
  };

  // ==========================================
  // Invoice Actions: Create / Edit / Delete
  // ==========================================
  const handleOpenCreateInvoice = () => {
    setInvoiceFormData({
      supplier_id: '',
      supplier_name: '',
      supplier_phone: '',
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: '',
      payment_method: 'cash',
      paid_amount: 0,
      tax_percent: 15,
      discount_amount: 0,
      notes: '',
      items: [
        {
          part_id: '',
          item_name: '',
          part_number: '',
          sku: '',
          quantity: 1,
          unit_cost: 0,
          discount: 0,
          update_inventory: true,
          category: 'قطع غيار',
          is_new_part: false,
          sale_price: 0,
          min_stock_alert: 2,
          storage_location: 'المستودع الرئيسي'
        }
      ]
    });
    setShowCreateInvoiceModal(true);
  };

  // Dynamic calculations for create invoice modal
  const invoiceCalculations = useMemo(() => {
    const subtotal = invoiceFormData.items.reduce((sum, item) => {
      const q = Number(item.quantity || 0);
      const c = Number(item.unit_cost || 0);
      const d = Number(item.discount || 0);
      return sum + Math.max(0, (q * c) - d);
    }, 0);

    const overallDiscount = Number(invoiceFormData.discount_amount || 0);
    const afterDiscount = Math.max(0, subtotal - overallDiscount);
    const taxAmount = (afterDiscount * Number(invoiceFormData.tax_percent || 0)) / 100;
    const grandTotal = afterDiscount + taxAmount;
    const paid = Number(invoiceFormData.paid_amount || 0);
    const remaining = Math.max(0, grandTotal - paid);

    return {
      subtotal,
      overallDiscount,
      afterDiscount,
      taxAmount,
      grandTotal,
      paid,
      remaining
    };
  }, [invoiceFormData]);

  const handleAddItemToInvoice = () => {
    setInvoiceFormData({
      ...invoiceFormData,
      items: [
        ...invoiceFormData.items,
        {
          part_id: '',
          item_name: '',
          part_number: '',
          sku: '',
          quantity: 1,
          unit_cost: 0,
          discount: 0,
          update_inventory: true,
          category: 'قطع غيار',
          is_new_part: false,
          sale_price: 0,
          min_stock_alert: 2,
          storage_location: 'المستودع الرئيسي'
        }
      ]
    });
  };

  const handleRemoveItemFromInvoice = (index: number) => {
    if (invoiceFormData.items.length <= 1) return;
    const items = [...invoiceFormData.items];
    items.splice(index, 1);
    setInvoiceFormData({ ...invoiceFormData, items });
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceFormData.supplier_name.trim()) {
      alert('يرجى اختيار أو كتابة اسم المورد');
      return;
    }
    if (invoiceFormData.items.some((it) => !it.item_name.trim() || Number(it.unit_cost) < 0 || Number(it.quantity) <= 0)) {
      alert('يرجى التأكد من إدخال اسم الصنف والكمية والتكلفة لجميع البنود');
      return;
    }

    setInvoiceSubmitting(true);
    try {
      await api.createPurchaseInvoice(invoiceFormData);
      setShowCreateInvoiceModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'فشل حفظ فاتورة المشتريات');
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleOpenEditInvoice = (invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice);
    setEditInvoiceData({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      due_date: invoice.due_date || '',
      payment_method: invoice.payment_method || 'cash',
      notes: invoice.notes || ''
    });
    setShowEditInvoiceModal(true);
  };

  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditInvoiceSubmitting(true);
    try {
      await api.updatePurchaseInvoice(editInvoiceData.id, editInvoiceData);
      setShowEditInvoiceModal(false);
      loadData();
      if (selectedInvoice && selectedInvoice.id === editInvoiceData.id) {
        const refreshed = await api.getPurchaseInvoiceById(editInvoiceData.id);
        if (refreshed.success && refreshed.data) {
          setSelectedInvoice(refreshed.data);
        }
      }
    } catch (err: any) {
      alert(err.message || 'فشل تحديث بيانات الفاتورة');
    } finally {
      setEditInvoiceSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!canDelete) {
      alert('ليس لديك صلاحية حذف فواتير المشتريات (تتطلب دور المدير أو المالك)');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف فاتورة المشتريات رقم "${invoiceNumber}"؟ سيتم استرجاع أرصدة المخزون وحذف الحركات المسجلة.`)) {
      return;
    }
    try {
      await api.deletePurchaseInvoice(invoiceId);
      if (selectedInvoice?.id === invoiceId) {
        setShowInvoiceDetailsModal(false);
        setSelectedInvoice(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'فشل حذف فاتورة المشتريات');
    }
  };

  // ==========================================
  // Payment Actions
  // ==========================================
  const handleOpenPayment = (target: { type: 'invoice'; invoice: PurchaseInvoice } | { type: 'supplier'; supplier: Supplier }) => {
    setPaymentTarget(target);
    const balance = target.type === 'invoice' ? Number(target.invoice.balance_due || 0) : Number(target.supplier.balance_due || 0);
    setPaymentAmount(balance);
    setPaymentMethod('transfer');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentRefNumber('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget || paymentAmount <= 0) {
      alert('يرجى إدخال مبلغ سداد صحيح أكبر من صفر');
      return;
    }

    setPaymentSubmitting(true);
    try {
      if (paymentTarget.type === 'invoice' && paymentTarget.invoice) {
        await api.recordSupplierPayment(paymentTarget.invoice.id, {
          amount: paymentAmount,
          payment_method: paymentMethod,
          notes: paymentNotes
        });
      } else if (paymentTarget.type === 'supplier' && paymentTarget.supplier) {
        await api.paySupplierBalance(paymentTarget.supplier.id, {
          amount: paymentAmount,
          payment_method: paymentMethod,
          notes: paymentNotes
        });
      }
      setShowPaymentModal(false);
      setPaymentTarget(null);
      loadData();
      if (selectedSupplier) {
        loadSupplierDetails(selectedSupplier.id);
      }
    } catch (err: any) {
      alert(err.message || 'فشل تسجيل الدفعة للمورد');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // ==========================================
  // View & Print Invoices
  // ==========================================
  const handleOpenInvoiceDetails = async (invoice: PurchaseInvoice) => {
    try {
      const res = await api.getPurchaseInvoiceById(invoice.id);
      if (res.success && res.data) {
        setSelectedInvoice(res.data);
      } else {
        setSelectedInvoice(invoice);
      }
    } catch {
      setSelectedInvoice(invoice);
    }
    setShowInvoiceDetailsModal(true);
  };

  const handleOpenPrintInvoice = async (invoice: PurchaseInvoice) => {
    try {
      const res = await api.getPurchaseInvoiceById(invoice.id);
      if (res.success && res.data) {
        setSelectedInvoice(res.data);
      } else {
        setSelectedInvoice(invoice);
      }
    } catch {
      setSelectedInvoice(invoice);
    }
    setShowPrintModal(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">

      {/* ============================================================== */}
      {/* 1. TOP SUMMARY DASHBOARD (6 Interactive Professional Cards)     */}
      {/* ============================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-black text-white tracking-wide">
              مؤشرات المشتريات والموردين
            </h2>
          </div>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="تحديث البيانات لحظياً"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. إجمالي المشتريات هذا الشهر */}
          <div className="glass-card p-4 rounded-2xl border border-sky-500/20 hover:border-sky-400/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">مشتريات الشهر</span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                {summary.thisMonthPurchases.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span className="text-[10px] font-normal text-sky-400 mr-1">ج.م</span>
              </p>
              <div className="flex items-center gap-1 mt-1">
                {summary.monthDiffPct !== null ? (
                  <span className={`text-[10px] font-bold ${summary.monthDiffPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.monthDiffPct >= 0 ? `+${summary.monthDiffPct}%` : `${summary.monthDiffPct}%`} عن السابق
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">الشهر الحالي</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. إجمالي المبالغ المدفوعة */}
          <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-400/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">المبالغ المدفوعة</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
                {summary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span className="text-[10px] font-normal mr-1">ج.م</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium truncate">مسدد نقداً وبنكياً</p>
            </div>
          </div>

          {/* 3. إجمالي المستحق للموردين */}
          <div className="glass-card p-4 rounded-2xl border border-amber-500/20 hover:border-amber-400/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">مستحق للموردين</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight">
                {summary.totalBalanceDue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span className="text-[10px] font-normal mr-1">ج.م</span>
              </p>
              <p className="text-[10px] text-amber-400/80 mt-1 font-medium truncate">أرصدة آجلة متبقية</p>
            </div>
          </div>

          {/* 4. عدد الموردين */}
          <div className="glass-card p-4 rounded-2xl border border-indigo-500/20 hover:border-indigo-400/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">دليل الموردين</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                {summary.totalSuppliersCount}
                <span className="text-[10px] font-normal text-slate-400 mr-1">مورد</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium truncate">شركات وجهات معتمدة</p>
            </div>
          </div>

          {/* 5. عدد فواتير المشتريات */}
          <div className="glass-card p-4 rounded-2xl border border-purple-500/20 hover:border-purple-400/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">فواتير الشراء</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                {summary.totalInvoicesCount}
                <span className="text-[10px] font-normal text-slate-400 mr-1">فاتورة</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium truncate">مسجلة بالكامل</p>
            </div>
          </div>

          {/* 6. الفواتير المستحقة والمتأخرة */}
          <div className="glass-card p-4 rounded-2xl border border-rose-500/20 hover:border-rose-400/40 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">فواتير متأخرة</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-tight">
                {summary.overdueCount}
                <span className="text-[10px] font-normal text-slate-400 mr-1">/ {summary.unpaidCount} غير مسددة</span>
              </p>
              <p className="text-[10px] text-rose-400/80 mt-1 font-medium truncate">تحتاج للمتابعة والسداد</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. NAVIGATION BAR & MAIN ACTIONS                               */}
      {/* ============================================================== */}
      <div className="glass-card p-2 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-slate-800">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>فواتير المشتريات</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${activeTab === 'invoices' ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>دليل وحسابات الموردين</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${activeTab === 'suppliers' ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {suppliers.length}
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button
                onClick={handleOpenAddSupplier}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>إضافة مورد جديد</span>
              </button>

              <button
                onClick={handleOpenCreateInvoice}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فاتورة شراء</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. TAB CONTENT: SUPPLIERS (دليل الموردين)                        */}
      {/* ============================================================== */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="glass-card p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-slate-800">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="بحث باسم المورد، اسم الشركة، رقم الهاتف..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'paid', label: 'مسدد بالكامل', color: 'emerald' },
                { id: 'unpaid', label: 'عليه مستحقات', color: 'amber' },
                { id: 'overdue', label: 'متأخر بالسداد', color: 'rose' }
              ].map((f) => {
                const isSel = supplierStatusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSupplierStatusFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSel
                        ? 'bg-slate-800 text-white border border-sky-500/60 shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}

              {/* Category Dropdown */}
              <select
                value={supplierCategoryFilter}
                onChange={(e) => setSupplierCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {SUPPLIER_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800/80">
                  <tr>
                    <th className="py-3 px-4 font-bold">اسم المورد</th>
                    <th className="py-3 px-4 font-bold">الشركة / المسؤول</th>
                    <th className="py-3 px-4 font-bold">رقم الهاتف</th>
                    <th className="py-3 px-4 font-bold">البريد الإلكتروني</th>
                    <th className="py-3 px-4 font-bold text-center">الفواتير</th>
                    <th className="py-3 px-4 font-bold">إجمالي المشتريات</th>
                    <th className="py-3 px-4 font-bold">المدفوع</th>
                    <th className="py-3 px-4 font-bold">الرصيد المتبقي</th>
                    <th className="py-3 px-4 font-bold">آخر تعامل</th>
                    <th className="py-3 px-4 font-bold text-center">حالة الحساب</th>
                    <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((s) => {
                      const balance = Number(s.balance_due || 0);
                      const isOverdue = (s.overdue_count || 0) > 0;
                      let badge = {
                        label: 'مسدد بالكامل ✓',
                        cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      };
                      if (isOverdue) {
                        badge = {
                          label: 'متأخر بالسداد ⚠️',
                          cls: 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        };
                      } else if (balance > 0) {
                        badge = {
                          label: 'عليه مستحقات ⏳',
                          cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        };
                      }

                      return (
                        <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Name */}
                          <td className="py-3 px-4 font-bold text-white">
                            <button
                              onClick={() => handleOpenSupplierDetails(s, 'invoices')}
                              className="text-right hover:text-sky-400 transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>{s.name}</span>
                            </button>
                          </td>

                          {/* Contact Person */}
                          <td className="py-3 px-4 text-slate-300">
                            {s.contact_person || '—'}
                          </td>

                          {/* Phone */}
                          <td className="py-3 px-4 font-mono text-slate-300" dir="ltr">
                            {s.phone || '—'}
                          </td>

                          {/* Email */}
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]" dir="ltr">
                            {s.email || '—'}
                          </td>

                          {/* Invoices Count */}
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono font-bold text-slate-200">
                              {s.invoice_count || 0}
                            </span>
                          </td>

                          {/* Total Purchases */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-200">
                            {Number(s.total_purchases || 0).toLocaleString()} ج.م
                          </td>

                          {/* Total Paid */}
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {Number(s.total_paid || 0).toLocaleString()} ج.م
                          </td>

                          {/* Balance Due */}
                          <td className="py-3 px-4 font-mono font-black">
                            <span className={balance > 0 ? (isOverdue ? 'text-rose-400' : 'text-amber-400') : 'text-emerald-400'}>
                              {balance.toLocaleString()} ج.م
                            </span>
                          </td>

                          {/* Last Transaction */}
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {s.last_invoice_date || s.last_payment_date || '—'}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Open Details / Ledger */}
                              <button
                                onClick={() => handleOpenSupplierDetails(s, 'ledger')}
                                className="p-1.5 bg-slate-800 hover:bg-sky-600/20 hover:text-sky-400 text-slate-300 rounded-lg transition-colors cursor-pointer"
                                title="عرض كشف الحساب والملف الشامل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Pay Balance */}
                              {canManage && balance > 0 && (
                                <button
                                  onClick={() => handleOpenPayment({ type: 'supplier', supplier: s })}
                                  className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-lg transition-colors border border-amber-500/20 cursor-pointer"
                                  title="تسجيل دفعة سداد للمورد"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Edit */}
                              {canManage && (
                                <button
                                  onClick={() => handleOpenEditSupplier(s)}
                                  className="p-1.5 bg-slate-800 hover:bg-amber-600/20 hover:text-amber-400 text-slate-300 rounded-lg transition-colors cursor-pointer"
                                  title="تعديل بيانات المورد"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete */}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteSupplier(s.id, s.name)}
                                  className="p-1.5 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors cursor-pointer"
                                  title="حذف المورد"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500">
                        <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-sm">لا يوجد موردين مطابقين لمعايير البحث</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. TAB CONTENT: PURCHASE INVOICES (فواتير المشتريات)            */}
      {/* ============================================================== */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="glass-card p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-slate-800">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="بحث برقم الفاتورة، اسم المورد، هاتف المورد..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Filter Dropdowns & Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Supplier Filter */}
              <select
                value={invoiceSupplierFilter}
                onChange={(e) => setInvoiceSupplierFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">كل الموردين</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="all">جميع الحالات</option>
                <option value="paid">مدفوعة بالكامل</option>
                <option value="partially_paid">مدفوعة جزئياً</option>
                <option value="unpaid">غير مدفوعة</option>
                <option value="overdue">متأخرة السداد</option>
              </select>

              {/* Payment Method Filter */}
              <select
                value={invoicePaymentMethodFilter}
                onChange={(e) => setInvoicePaymentMethodFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800/80">
                  <tr>
                    <th className="py-3 px-4 font-bold">رقم الفاتورة</th>
                    <th className="py-3 px-4 font-bold">المورد</th>
                    <th className="py-3 px-4 font-bold">التاريخ</th>
                    <th className="py-3 px-4 font-bold text-center">الأصناف</th>
                    <th className="py-3 px-4 font-bold">إجمالي الفاتورة</th>
                    <th className="py-3 px-4 font-bold">المدفوع</th>
                    <th className="py-3 px-4 font-bold">المتبقي</th>
                    <th className="py-3 px-4 font-bold">طريقة الدفع</th>
                    <th className="py-3 px-4 font-bold text-center">الحالة</th>
                    <th className="py-3 px-4 font-bold">المستخدم</th>
                    <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv) => {
                      const balance = Number(inv.balance_due || 0);
                      const isOverdue = balance > 0 && inv.due_date && inv.due_date < todayStr;
                      let badge = {
                        label: 'مدفوعة بالكامل ✓',
                        cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      };
                      if (isOverdue) {
                        badge = {
                          label: 'متأخرة ⚠️',
                          cls: 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        };
                      } else if (inv.payment_status === 'partially_paid' || (Number(inv.paid_amount) > 0 && balance > 0)) {
                        badge = {
                          label: 'مدفوعة جزئياً',
                          cls: 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        };
                      } else if (balance > 0) {
                        badge = {
                          label: 'غير مدفوعة',
                          cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        };
                      }

                      const methodMap: Record<string, string> = {
                        cash: 'نقدي',
                        transfer: 'تحويل بنكي',
                        card: 'بطاقة',
                        credit: 'آجل'
                      };

                      return (
                        <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Invoice Number */}
                          <td className="py-3 px-4 font-mono font-bold text-sky-400">
                            <button
                              onClick={() => handleOpenInvoiceDetails(inv)}
                              className="hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{inv.invoice_number}</span>
                            </button>
                          </td>

                          {/* Supplier Name */}
                          <td className="py-3 px-4 font-semibold text-white">
                            <span>{inv.supplier_name}</span>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            {inv.invoice_date || '—'}
                          </td>

                          {/* Items Count */}
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono font-bold text-slate-300">
                              {inv.items_count || 1}
                            </span>
                          </td>

                          {/* Grand Total */}
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {Number(inv.grand_total || 0).toLocaleString()} ج.م
                          </td>

                          {/* Paid Amount */}
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {Number(inv.paid_amount || 0).toLocaleString()} ج.م
                          </td>

                          {/* Balance Due */}
                          <td className="py-3 px-4 font-mono font-black">
                            <span className={balance > 0 ? (isOverdue ? 'text-rose-400' : 'text-amber-400') : 'text-emerald-400'}>
                              {balance.toLocaleString()} ج.م
                            </span>
                          </td>

                          {/* Payment Method */}
                          <td className="py-3 px-4 text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                              {methodMap[inv.payment_method] || inv.payment_method}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>

                          {/* User */}
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {inv.creator_name || '—'}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View Details */}
                              <button
                                onClick={() => handleOpenInvoiceDetails(inv)}
                                className="p-1.5 bg-slate-800 hover:bg-sky-600/20 hover:text-sky-400 text-slate-300 rounded-lg transition-colors cursor-pointer"
                                title="عرض تفاصيل الفاتورة"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Record Payment */}
                              {canManage && balance > 0 && (
                                <button
                                  onClick={() => handleOpenPayment({ type: 'invoice', invoice: inv })}
                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg transition-colors border border-emerald-500/20 cursor-pointer"
                                  title="تسجيل دفعة سداد لهذه الفاتورة"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Print */}
                              <button
                                onClick={() => handleOpenPrintInvoice(inv)}
                                className="p-1.5 bg-slate-800 hover:bg-purple-600/20 hover:text-purple-400 text-slate-300 rounded-lg transition-colors cursor-pointer"
                                title="طباعة الفاتورة"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit */}
                              {canManage && (
                                <button
                                  onClick={() => handleOpenEditInvoice(inv)}
                                  className="p-1.5 bg-slate-800 hover:bg-amber-600/20 hover:text-amber-400 text-slate-300 rounded-lg transition-colors cursor-pointer"
                                  title="تعديل الفاتورة"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete */}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                                  className="p-1.5 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors cursor-pointer"
                                  title="حذف الفاتورة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-sm">لا توجد فواتير مشتريات مطابقة لمعايير البحث</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL: SUPPLIER DETAILS & FINANCIAL LEDGER                  */}
      {/* ============================================================== */}
      {showSupplierDetailModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">{selectedSupplier.name}</h3>
                    {selectedSupplier.category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {selectedSupplier.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    {selectedSupplier.contact_person && <span>المسؤول: {selectedSupplier.contact_person}</span>}
                    {selectedSupplier.phone && <span font-mono dir="ltr">📞 {selectedSupplier.phone}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManage && Number(selectedSupplier.balance_due || 0) > 0 && (
                  <button
                    onClick={() => handleOpenPayment({ type: 'supplier', supplier: selectedSupplier })}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>سداد دفعة</span>
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={() => handleOpenEditSupplier(selectedSupplier)}
                    className="p-1.5 bg-slate-800 hover:bg-amber-600/20 hover:text-amber-400 text-slate-300 rounded-lg transition-colors cursor-pointer"
                    title="تعديل بيانات المورد"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowSupplierDetailModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800/80">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block font-medium">إجمالي المشتريات</span>
                <span className="text-base font-black text-white font-mono mt-0.5 block">
                  {Number(selectedSupplier.total_purchases || supplierDetailsData?.total_purchases || 0).toLocaleString()} ج.م
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block font-medium">إجمالي المدفوع</span>
                <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                  {Number(selectedSupplier.total_paid || supplierDetailsData?.total_paid || 0).toLocaleString()} ج.م
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block font-medium">الرصيد المتبقي المستحق</span>
                <span className={`text-base font-black font-mono mt-0.5 block ${Number(selectedSupplier.balance_due || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {Number(selectedSupplier.balance_due || supplierDetailsData?.balance_due || 0).toLocaleString()} ج.م
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 block font-medium">عدد الفواتير</span>
                <span className="text-base font-black text-sky-400 font-mono mt-0.5 block">
                  {selectedSupplier.invoice_count || supplierDetailsData?.invoices?.length || 0} فاتورة
                </span>
              </div>
            </div>

            {/* 4 Tabs Navigation */}
            <div className="flex items-center gap-2 px-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
              {[
                { id: 'invoices', label: 'فواتير المشتريات', icon: FileText },
                { id: 'payments', label: 'سجل المدفوعات', icon: CreditCard },
                { id: 'ledger', label: 'كشف حركة الحساب', icon: TrendingUp },
                { id: 'info', label: 'بيانات المورد', icon: Building2 }
              ].map((t) => {
                const isSel = supplierDetailTab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSupplierDetailTab(t.id as any)}
                    className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSel
                        ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {loadingSupplierDetails ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">جاري تحميل بيانات المورد والحساب...</p>
                </div>
              ) : (
                <>
                  {/* Tab 1: Invoices */}
                  {supplierDetailTab === 'invoices' && (
                    <div className="space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3 font-bold">رقم الفاتورة</th>
                              <th className="py-2.5 px-3 font-bold">التاريخ</th>
                              <th className="py-2.5 px-3 font-bold">إجمالي الفاتورة</th>
                              <th className="py-2.5 px-3 font-bold">المدفوع</th>
                              <th className="py-2.5 px-3 font-bold">المتبقي</th>
                              <th className="py-2.5 px-3 font-bold">طريقة الدفع</th>
                              <th className="py-2.5 px-3 font-bold text-center">الحالة</th>
                              <th className="py-2.5 px-3 font-bold text-center">عرض</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {(supplierDetailsData?.invoices || []).length > 0 ? (
                              supplierDetailsData.invoices.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-slate-800/40">
                                  <td className="py-2.5 px-3 font-mono font-bold text-sky-400">{inv.invoice_number}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-300">{inv.invoice_date || '—'}</td>
                                  <td className="py-2.5 px-3 font-mono text-white font-bold">{Number(inv.grand_total || 0).toLocaleString()} ج.م</td>
                                  <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">{Number(inv.paid_amount || 0).toLocaleString()} ج.م</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{Number(inv.balance_due || 0).toLocaleString()} ج.م</td>
                                  <td className="py-2.5 px-3 text-slate-300">{inv.payment_method}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                      {inv.payment_status === 'paid' ? 'مدفوعة' : inv.payment_status === 'partially_paid' ? 'جزئية' : 'غير مدفوعة'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      onClick={() => handleOpenInvoiceDetails(inv)}
                                      className="p-1 bg-slate-800 hover:bg-sky-600/20 hover:text-sky-400 rounded text-slate-300"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-500">
                                  لا توجد فواتير شراء مسجلة لهذا المورد
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Payments */}
                  {supplierDetailTab === 'payments' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                          <span>سندات ومدفوعات المورد المسجلة ({supplierDetailsData?.payments?.length || 0})</span>
                        </h4>
                        {canManage && (
                          <button
                            onClick={() => handleOpenPayment({ type: 'supplier', supplier: selectedSupplier })}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>تسجيل دفعة جديدة</span>
                          </button>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3 font-bold">رقم السند</th>
                              <th className="py-2.5 px-3 font-bold">التاريخ</th>
                              <th className="py-2.5 px-3 font-bold">الفاتورة المرتبطة</th>
                              <th className="py-2.5 px-3 font-bold">المبلغ المدفوع</th>
                              <th className="py-2.5 px-3 font-bold">طريقة الدفع</th>
                              <th className="py-2.5 px-3 font-bold">رقم المرجع / الحوالة</th>
                              <th className="py-2.5 px-3 font-bold">المسجل</th>
                              <th className="py-2.5 px-3 font-bold">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {(supplierDetailsData?.payments || []).length > 0 ? (
                              supplierDetailsData.payments.map((p: any) => (
                                <tr key={p.id} className="hover:bg-slate-800/40">
                                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{p.payment_number}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-300">{p.payment_date || '—'}</td>
                                  <td className="py-2.5 px-3 font-mono text-sky-400">{p.invoice_number || 'سداد رصيد'}</td>
                                  <td className="py-2.5 px-3 font-mono font-black text-emerald-400">
                                    {Number(p.amount || 0).toLocaleString()} ج.م
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300">{p.payment_method}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-400">{p.reference_number || '—'}</td>
                                  <td className="py-2.5 px-3 text-slate-300">{p.creator_name || '—'}</td>
                                  <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{p.notes || '—'}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-500">
                                  لا توجد مدفوعات مسجلة لهذا المورد بعد
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Financial Ledger (كشف حركة الحساب) */}
                  {supplierDetailTab === 'ledger' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                        <span>
                          كشف الحساب المالي للمورد: يوضح فواتير المشتريات (دائن) وسندات السداد (مدين) والرصيد التراكمي المتبقي.
                        </span>
                        <span className="font-bold text-white font-mono">
                          الرصيد الحالي: {Number(supplierDetailsData?.current_balance ?? selectedSupplier.balance_due ?? 0).toLocaleString()} ج.م
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3 font-bold">التاريخ</th>
                              <th className="py-2.5 px-3 font-bold">نوع العملية</th>
                              <th className="py-2.5 px-3 font-bold">رقم العملية</th>
                              <th className="py-2.5 px-3 font-bold">الوصف والبيان</th>
                              <th className="py-2.5 px-3 font-bold text-emerald-400">مدين (سداد)</th>
                              <th className="py-2.5 px-3 font-bold text-sky-400">دائن (فاتورة)</th>
                              <th className="py-2.5 px-3 font-bold text-amber-400">الرصيد التراكمي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {(supplierDetailsData?.ledger || []).length > 0 ? (
                              supplierDetailsData.ledger.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-800/40">
                                  <td className="py-2.5 px-3 text-slate-300">{item.date}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      item.type === 'payment'
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                    }`}>
                                      {item.type_label}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-white font-bold">{item.number}</td>
                                  <td className="py-2.5 px-3 font-sans text-slate-300 max-w-xs truncate">{item.description}</td>
                                  <td className="py-2.5 px-3 text-emerald-400 font-bold">
                                    {item.debit > 0 ? `${item.debit.toLocaleString()} ج.م` : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-sky-400 font-bold">
                                    {item.credit > 0 ? `${item.credit.toLocaleString()} ج.م` : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 font-black text-amber-400">
                                    {Number(item.balance || 0).toLocaleString()} ج.م
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                                  لا توجد حركات مسجلة بحساب هذا المورد
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Info */}
                  {supplierDetailTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <Building2 className="w-4 h-4 text-sky-400" />
                          <span>البيانات الأساسية وتفاصيل الاتصال</span>
                        </h4>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-400">اسم المورد / الشركة:</span>
                            <span className="font-bold text-white">{selectedSupplier.name}</span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-400">المسؤول / جهة الاتصال:</span>
                            <span className="text-slate-200">{selectedSupplier.contact_person || '—'}</span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-400">رقم الهاتف الأساسي:</span>
                            <span className="font-mono text-white" dir="ltr">{selectedSupplier.phone || '—'}</span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-400">رقم هاتف إضافي:</span>
                            <span className="font-mono text-white" dir="ltr">{selectedSupplier.phone_secondary || '—'}</span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-400">البريد الإلكتروني:</span>
                            <span className="font-mono text-slate-300" dir="ltr">{selectedSupplier.email || '—'}</span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-400">الرقم الضريبي / السجل:</span>
                            <span className="font-mono text-slate-200">{selectedSupplier.tax_number || '—'}</span>
                          </div>

                          <div className="flex justify-between py-1">
                            <span className="text-slate-400">العنوان والموقع:</span>
                            <span className="text-slate-200">{selectedSupplier.address || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <CreditCard className="w-4 h-4 text-emerald-400" />
                          <span>الشروط التجارية والملاحظات</span>
                        </h4>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-400">التصنيف الرئيسي:</span>
                            <span className="font-bold text-sky-400">{selectedSupplier.category}</span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-400">شروط السداد المتفق عليها:</span>
                            <span className="text-slate-200">
                              {selectedSupplier.payment_terms === 'cash'
                                ? 'سداد نقدي فوري'
                                : selectedSupplier.payment_terms === 'credit_15'
                                ? 'آجل 15 يوماً'
                                : selectedSupplier.payment_terms === 'credit_30'
                                ? 'آجل 30 يوماً'
                                : 'آجل 60 يوماً'}
                            </span>
                          </div>

                          <div className="pt-2">
                            <span className="text-slate-400 block mb-1">ملاحظات خاصة بالمورد:</span>
                            <p className="bg-slate-900 p-2.5 rounded-lg text-slate-300 text-xs border border-slate-800/80 min-h-[60px]">
                              {selectedSupplier.notes || 'لا توجد ملاحظات مسجلة.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MODAL: ADD / EDIT SUPPLIER                                  */}
      {/* ============================================================== */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {isEditingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
                  </h3>
                  <p className="text-[11px] text-slate-400">دليل الموردين وشركات قطع الغيار</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3.5 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المورد أو الشركة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة النيل لقطع الغيار"
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المسؤول / جهة الاتصال</label>
                <input
                  type="text"
                  placeholder="مثال: أ. محمود عبد الله"
                  value={supplierFormData.contact_person}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف الأساسي *</label>
                  <input
                    type="tel"
                    required
                    placeholder="01xxxxxxxxx"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">رقم هاتف إضافي</label>
                  <input
                    type="tel"
                    placeholder="رقم آخر / واتساب"
                    value={supplierFormData.phone_secondary}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone_secondary: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="supplier@company.com"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الرقم الضريبي / السجل</label>
                  <input
                    type="text"
                    placeholder="الرقم الضريبي للشركة"
                    value={supplierFormData.tax_number}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, tax_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">تصنيف المورد</label>
                  <select
                    value={supplierFormData.category}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="قطع غيار">قطع غيار عامة</option>
                    <option value="زيوت ومواد تشحيم">زيوت ومواد تشحيم</option>
                    <option value="كهرباء ولمبات">كهرباء ولمبات</option>
                    <option value="فلاتر وبواجي">فلاتر وبواجي</option>
                    <option value="إطارات وبطاريات">إطارات وبطاريات</option>
                    <option value="متنوع">مورد متنوع</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">شروط السداد</label>
                  <select
                    value={supplierFormData.payment_terms}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, payment_terms: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="cash">نقدي فوري</option>
                    <option value="credit_15">آجل 15 يوماً</option>
                    <option value="credit_30">آجل 30 يوماً</option>
                    <option value="credit_60">آجل 60 يوماً</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">العنوان أو المقر</label>
                <input
                  type="text"
                  placeholder="المدينة، الحي، الشارع..."
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات حول المورد أو مواعيد التسليم..."
                  value={supplierFormData.notes}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={supplierSubmitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {supplierSubmitting ? 'جاري الحفظ...' : isEditingSupplier ? 'حفظ التعديلات' : 'حفظ المورد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. MODAL: CREATE PURCHASE INVOICE                              */}
      {/* ============================================================== */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">إضافة فاتورة مشتريات وتوريد مخزون</h3>
                  <p className="text-[11px] text-slate-400">تسجيل مشتريات قطع غيار وتحديث المخزن تلقائياً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateInvoiceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Supplier & Header Info */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Select or type supplier */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">المورد *</label>
                    <input
                      type="text"
                      list="suppliers-list"
                      required
                      placeholder="اختر أو اكتب اسم المورد"
                      value={invoiceFormData.supplier_name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = suppliers.find((s) => s.name === val);
                        setInvoiceFormData({
                          ...invoiceFormData,
                          supplier_name: val,
                          supplier_id: match ? match.id : '',
                          supplier_phone: match?.phone || invoiceFormData.supplier_phone
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                    <datalist id="suppliers-list">
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Invoice Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الفاتورة *</label>
                    <input
                      type="text"
                      required
                      value={invoiceFormData.invoice_number}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_number: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">طريقة الدفع</label>
                    <select
                      value={invoiceFormData.payment_method}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, payment_method: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="cash">نقدي (كاش)</option>
                      <option value="transfer">تحويل بنكي</option>
                      <option value="card">بطاقة مدى / ائتمان</option>
                      <option value="credit">آجل (على الحساب)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Invoice Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ الفاتورة</label>
                    <input
                      type="date"
                      required
                      value={invoiceFormData.invoice_date}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ الاستحقاق (اختياري)</label>
                    <input
                      type="date"
                      value={invoiceFormData.due_date}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Paid Amount Now */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">المبلغ المدفوع الآن</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={invoiceFormData.paid_amount}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, paid_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-sky-400" />
                    <span>جدول الأصناف وقطع الغيار المشتراة</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemToInvoice}
                    className="px-3 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة بند</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {invoiceFormData.items.map((item, idx) => {
                    const rowTotal = Math.max(0, (Number(item.quantity || 0) * Number(item.unit_cost || 0)) - Number(item.discount || 0));
                    return (
                      <div key={idx} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          {/* Item Name */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-slate-400 mb-0.5">الصنف *</label>
                            <input
                              type="text"
                              list={`inventory-parts-${idx}`}
                              required
                              placeholder="اسم القطعة أو الصنف"
                              value={item.item_name}
                              onChange={(e) => {
                                const val = e.target.value;
                                const match = inventoryParts.find((p) => p.name === val || p.part_number === val);
                                const newItems = [...invoiceFormData.items];
                                newItems[idx] = {
                                  ...newItems[idx],
                                  item_name: val,
                                  part_id: match ? match.id : '',
                                  part_number: match?.part_number || newItems[idx].part_number,
                                  unit_cost: match ? Number(match.cost_price || 0) : newItems[idx].unit_cost
                                };
                                setInvoiceFormData({ ...invoiceFormData, items: newItems });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                            />
                            <datalist id={`inventory-parts-${idx}`}>
                              {inventoryParts.map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.part_number ? `(${p.part_number})` : ''} - سعر: {p.cost_price} ج.م
                                </option>
                              ))}
                            </datalist>
                          </div>

                          {/* Part Number / SKU */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 mb-0.5">رقم القطعة / SKU</label>
                            <input
                              type="text"
                              placeholder="Part #"
                              value={item.part_number}
                              onChange={(e) => {
                                const newItems = [...invoiceFormData.items];
                                newItems[idx].part_number = e.target.value;
                                setInvoiceFormData({ ...invoiceFormData, items: newItems });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          {/* Quantity */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 mb-0.5">الكمية *</label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...invoiceFormData.items];
                                newItems[idx].quantity = parseInt(e.target.value) || 1;
                                setInvoiceFormData({ ...invoiceFormData, items: newItems });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          {/* Unit Cost */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 mb-0.5">سعر الوحدة *</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              required
                              value={item.unit_cost}
                              onChange={(e) => {
                                const newItems = [...invoiceFormData.items];
                                newItems[idx].unit_cost = parseFloat(e.target.value) || 0;
                                setInvoiceFormData({ ...invoiceFormData, items: newItems });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          {/* Row Total & Delete */}
                          <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0">
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              {rowTotal.toLocaleString()} ج.م
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromInvoice(idx)}
                              disabled={invoiceFormData.items.length <= 1}
                              className="p-1 rounded text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 cursor-pointer"
                              title="حذف البند"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Inventory Auto-Update Toggle */}
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.update_inventory !== false}
                              onChange={(e) => {
                                const newItems = [...invoiceFormData.items];
                                newItems[idx].update_inventory = e.target.checked;
                                setInvoiceFormData({ ...invoiceFormData, items: newItems });
                              }}
                              className="w-3.5 h-3.5 rounded text-sky-600 bg-slate-950 border-slate-700"
                            />
                            <span>تحديث وزيادة كمية هذا الصنف بالمخزن فوراً (+{item.quantity})</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invoice Calculations & Footer */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">المجموع الفرعي:</span>
                  <span className="text-white font-bold text-sm">{invoiceCalculations.subtotal.toLocaleString()} ج.م</span>
                </div>

                <div>
                  <label className="text-slate-400 text-[11px] block font-sans">خصم إضافي:</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={invoiceFormData.discount_amount}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, discount_amount: parseFloat(e.target.value) || 0 })}
                    className="w-24 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-amber-400 font-mono mt-0.5"
                  />
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">ضريبة القيمة المضافة:</span>
                  <span className="text-slate-300 font-bold text-sm">
                    {invoiceCalculations.taxAmount.toLocaleString()} ج.م
                    <span className="text-[10px] text-slate-500 mr-1 font-sans">({invoiceFormData.tax_percent}%)</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">الإجمالي النهائي:</span>
                  <span className="text-white font-black text-sm">{invoiceCalculations.grandTotal.toLocaleString()} ج.م</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">المبلغ المدفوع:</span>
                  <span className="text-emerald-400 font-bold text-sm">{invoiceCalculations.paid.toLocaleString()} ج.م</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">المتبقي (آجل):</span>
                  <span className="text-amber-400 font-black text-sm">{invoiceCalculations.remaining.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات الفاتورة</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات حول الفاتورة أو شروط الاستلام والتوريد..."
                  value={invoiceFormData.notes}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 sticky bottom-0 bg-slate-900 pb-1">
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={invoiceSubmitting}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {invoiceSubmitting ? 'جاري الحفظ والتوريد...' : 'حفظ الفاتورة وتوريد المخزون ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. MODAL: RECORD PAYMENT FOR INVOICE OR SUPPLIER               */}
      {/* ============================================================== */}
      {showPaymentModal && paymentTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">تسجيل دفعة سداد للمورد</h3>
                  <p className="text-[11px] text-slate-400">
                    {paymentTarget.type === 'invoice'
                      ? `سداد عن فاتورة [${paymentTarget.invoice?.invoice_number}]`
                      : `سداد لحساب المورد [${paymentTarget.supplier?.name}]`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-3.5">
              {/* Target Balance Info */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">الرصيد المستحق حالياً:</span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {paymentTarget.type === 'invoice'
                    ? `${Number(paymentTarget.invoice?.balance_due || 0).toLocaleString()} ج.م`
                    : `${Number(paymentTarget.supplier?.balance_due || 0).toLocaleString()} ج.م`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">مبلغ السداد (ج.م) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">طريقة السداد *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="transfer">تحويل بنكي</option>
                    <option value="cash">نقدي (كاش)</option>
                    <option value="card">بطاقة مدى / ائتمان</option>
                    <option value="check">شيك مصرفي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ السداد *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رقم المرجع / الحوالة</label>
                <input
                  type="text"
                  placeholder="رقم التحويل أو العملية البنكية"
                  value={paymentRefNumber}
                  onChange={(e) => setPaymentRefNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات السند</label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات حول السداد..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {paymentSubmitting ? 'جاري التسجيل...' : 'تأكيد تسجيل السداد ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. MODAL: EDIT PURCHASE INVOICE                                */}
      {/* ============================================================== */}
      {showEditInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">تعديل بيانات فاتورة الشراء</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{editInvoiceData.invoice_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditInvoiceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الفاتورة *</label>
                <input
                  type="text"
                  required
                  value={editInvoiceData.invoice_number}
                  onChange={(e) => setEditInvoiceData({ ...editInvoiceData, invoice_number: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">طريقة الدفع</label>
                <select
                  value={editInvoiceData.payment_method}
                  onChange={(e) => setEditInvoiceData({ ...editInvoiceData, payment_method: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="cash">نقدي (كاش)</option>
                  <option value="transfer">تحويل بنكي</option>
                  <option value="card">بطاقة مدى / ائتمان</option>
                  <option value="credit">آجل (على الحساب)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  value={editInvoiceData.due_date}
                  onChange={(e) => setEditInvoiceData({ ...editInvoiceData, due_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات الفاتورة</label>
                <textarea
                  rows={3}
                  value={editInvoiceData.notes}
                  onChange={(e) => setEditInvoiceData({ ...editInvoiceData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editInvoiceSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {editInvoiceSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. MODAL: INVOICE DETAILS & ITEMS VIEW                        */}
      {/* ============================================================== */}
      {showInvoiceDetailsModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">تفاصيل فاتورة المشتريات</h3>
                  <p className="text-[11px] text-slate-400 font-mono">رقم: {selectedInvoice.invoice_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenPrintInvoice(selectedInvoice)}
                  className="p-1.5 bg-slate-800 hover:bg-purple-600/20 hover:text-purple-400 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="طباعة"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceDetailsModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Overview Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block mb-0.5 font-sans">المورد:</span>
                  <span className="font-bold text-white block text-sm">{selectedInvoice.supplier_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-sans">التاريخ:</span>
                  <span className="font-mono text-slate-300 block">{selectedInvoice.invoice_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-sans">طريقة الدفع:</span>
                  <span className="text-slate-200 block">{selectedInvoice.payment_method}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-sans">المستخدم المسجل:</span>
                  <span className="text-slate-300 block">{selectedInvoice.creator_name || '—'}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">الصنف</th>
                      <th className="py-2.5 px-3 font-bold">رقم القطعة</th>
                      <th className="py-2.5 px-3 font-bold text-center">الكمية</th>
                      <th className="py-2.5 px-3 font-bold">سعر الوحدة</th>
                      <th className="py-2.5 px-3 font-bold text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(selectedInvoice.items || []).length > 0 ? (
                      selectedInvoice.items?.map((it, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-white">{it.item_name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{it.part_number || '—'}</td>
                          <td className="py-2.5 px-3 font-mono text-center">{it.quantity}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{Number(it.unit_cost || 0).toLocaleString()} ج.م</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 text-left">
                            {Number(it.total_cost || (it.quantity * it.unit_cost)).toLocaleString()} ج.م
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          بند مشتريات عام
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>المجموع الفرعي:</span>
                  <span>{Number(selectedInvoice.subtotal || 0).toLocaleString()} ج.م</span>
                </div>
                {Number(selectedInvoice.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>الخصم الممنوح:</span>
                    <span>-{Number(selectedInvoice.discount_amount).toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>ضريبة القيمة المضافة ({selectedInvoice.tax_percent}%):</span>
                  <span>{Number(selectedInvoice.tax_amount || 0).toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between text-white font-black text-sm pt-1 border-t border-slate-800">
                  <span>الإجمالي النهائي للفاتورة:</span>
                  <span>{Number(selectedInvoice.grand_total || 0).toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>المبلغ المسدد:</span>
                  <span>{Number(selectedInvoice.paid_amount || 0).toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between text-amber-400 font-black">
                  <span>الرصيد المتبقي المستحق:</span>
                  <span>{Number(selectedInvoice.balance_due || 0).toLocaleString()} ج.م</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">ملاحظات:</span>
                  <p className="text-slate-300">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 11. MODAL: PRINT INVOICE TEMPLATE                              */}
      {/* ============================================================== */}
      {showPrintModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Toolbar */}
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-700">معاينة طباعة فاتورة التوريد</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة فورية</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Paper Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-900 bg-white" dir="rtl">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">مركز صيانة وخدمات السيارات المتكاملة</h2>
                  <p className="text-xs text-slate-500 mt-0.5">قسم التوريدات والمشتريات وإدارة المخازن</p>
                </div>
                <div className="text-left font-mono">
                  <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
                    فاتورة شراء / توريد
                  </span>
                  <p className="text-sm font-black text-slate-900 mt-1">#{selectedInvoice.invoice_number}</p>
                  <p className="text-[11px] text-slate-500">التاريخ: {selectedInvoice.invoice_date}</p>
                </div>
              </div>

              {/* Supplier Info Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">المورد / جهة التوريد:</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">{selectedInvoice.supplier_name}</span>
                  {selectedInvoice.supplier_phone && (
                    <span className="text-slate-600 font-mono block mt-0.5" dir="ltr">📞 {selectedInvoice.supplier_phone}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block">طريقة السداد:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{selectedInvoice.payment_method}</span>
                  {selectedInvoice.due_date && (
                    <span className="text-amber-700 block mt-0.5">تاريخ الاستحقاق: {selectedInvoice.due_date}</span>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 font-bold border-l border-slate-200">م</th>
                    <th className="py-2 px-3 font-bold border-l border-slate-200">الصنف / الوصف</th>
                    <th className="py-2 px-3 font-bold border-l border-slate-200">رقم القطعة</th>
                    <th className="py-2 px-3 font-bold text-center border-l border-slate-200">الكمية</th>
                    <th className="py-2 px-3 font-bold border-l border-slate-200">سعر الوحدة</th>
                    <th className="py-2 px-3 font-bold text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(selectedInvoice.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-mono border-l border-slate-200">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold border-l border-slate-200">{it.item_name}</td>
                      <td className="py-2 px-3 font-mono text-slate-600 border-l border-slate-200">{it.part_number || '—'}</td>
                      <td className="py-2 px-3 font-mono text-center border-l border-slate-200">{it.quantity}</td>
                      <td className="py-2 px-3 font-mono border-l border-slate-200">{Number(it.unit_cost || 0).toLocaleString()} ج.م</td>
                      <td className="py-2 px-3 font-mono font-bold text-left">
                        {Number(it.total_cost || (it.quantity * it.unit_cost)).toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs font-mono border border-slate-200 p-3 rounded-lg bg-slate-50">
                  <div className="flex justify-between text-slate-600">
                    <span>المجموع الفرعي:</span>
                    <span>{Number(selectedInvoice.subtotal || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>الضريبة ({selectedInvoice.tax_percent}%):</span>
                    <span>{Number(selectedInvoice.tax_amount || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black text-sm pt-1 border-t border-slate-300">
                    <span>الإجمالي:</span>
                    <span>{Number(selectedInvoice.grand_total || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>المدفوع:</span>
                    <span>{Number(selectedInvoice.paid_amount || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-amber-800 font-bold">
                    <span>المتبقي:</span>
                    <span>{Number(selectedInvoice.balance_due || 0).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-200 text-xs">
                <div className="text-center space-y-6">
                  <p className="font-bold text-slate-700">توقيع المستلم / مسؤول المخزن</p>
                  <p className="text-slate-400 font-mono">........................................</p>
                </div>
                <div className="text-center space-y-6">
                  <p className="font-bold text-slate-700">توقيع المورد أو المندوب</p>
                  <p className="text-slate-400 font-mono">........................................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PurchasesView;
