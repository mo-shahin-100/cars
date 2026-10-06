import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
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
  Sparkles,
  Droplet,
  Lightbulb,
  Filter,
  Check,
  Camera,
  Upload,
  Eye,
  Paperclip,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../../services/api';
import { Supplier, PurchaseInvoice, Part } from '../../types';
import { useSync } from '../../context/SyncContext';

const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر'
};

export const formatMonthName = (yearMonth: string) => {
  if (!yearMonth || yearMonth.length < 7) return yearMonth || '';
  const [year, month] = yearMonth.slice(0, 7).split('-');
  const name = ARABIC_MONTHS[month] || month;
  return `${name} ${year}`;
};

const SUPPLIER_CATEGORIES = [
  { id: 'all', label: 'جميع التصنيفات' },
  { id: 'قطع غيار', label: 'قطع غيار عامة' },
  { id: 'زيوت ومواد تشحيم', label: 'زيوت ومواد تشحيم' },
  { id: 'كهرباء ولمبات', label: 'كهرباء ولمبات' },
  { id: 'فلاتر وبواجي', label: 'فلاتر وبواجي' },
  { id: 'إطارات وبطاريات', label: 'إطارات وبطاريات' },
  { id: 'متنوع', label: 'مورد متنوع' }
];

export const PurchasesView: React.FC = () => {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers'>('invoices');

  // Data States
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryParts, setInventoryParts] = useState<Part[]>([]);
  const [invoicesSummary, setInvoicesSummary] = useState<any>(null);
  const [suppliersSummary, setSuppliersSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState<boolean>(false);

  // Modals
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [showSupplierLedgerModal, setShowSupplierLedgerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Selected Records
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierDetails, setSupplierDetails] = useState<any>(null);
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('transfer');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentTargetType, setPaymentTargetType] = useState<'invoice' | 'supplier'>('invoice');

  // File Upload State
  const [uploadingImage, setUploadingImage] = useState(false);

  // New Supplier Form
  const [supplierFormData, setSupplierFormData] = useState({
    id: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    tax_number: '',
    address: '',
    category: 'قطع غيار',
    payment_terms: 'cash',
    notes: ''
  });

  // New Invoice Form (without supplier tax number, with invoice_image_url)
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
    notes: '',
    invoice_image_url: '',
    items: [
      {
        part_id: '',
        item_name: '',
        part_number: '',
        quantity: 1,
        unit_cost: 0,
        category: 'قطع غيار',
        is_new_part: false,
        create_in_inventory: false,
        storage_location: 'المستودع الرئيسي',
        sale_price: 0
      }
    ]
  });

  const { lastEvent } = useSync();

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
        setInvoices(invRes.data);
        setInvoicesSummary(invRes.summary);
      }
      if (supRes.success) {
        setSuppliers(supRes.data);
        setSuppliersSummary(supRes.summary);
      }
      if (partsRes.success) {
        setInventoryParts(partsRes.data);
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

  // Listen for sync events
  useEffect(() => {
    if (lastEvent?.entity === 'purchases' || lastEvent?.entity === 'suppliers' || lastEvent?.entity === 'inventory') {
      loadData();
    }
  }, [lastEvent]);

  // Handle Supplier Selection in Invoice Form
  const handleSelectSupplierForInvoice = (supplierId: string) => {
    const s = suppliers.find(sup => sup.id === supplierId);
    if (s) {
      setInvoiceFormData(prev => ({
        ...prev,
        supplier_id: s.id,
        supplier_name: s.name,
        supplier_phone: s.phone || ''
      }));
    } else {
      setInvoiceFormData(prev => ({
        ...prev,
        supplier_id: '',
        supplier_name: '',
        supplier_phone: ''
      }));
    }
  };

  // Upload Invoice Photo
  const handleInvoiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'purchase_invoice');
      formData.append('caption', `فاتورة مورد: ${invoiceFormData.supplier_name || 'توريد'}`);

      const res = await api.uploadAttachment(formData);
      if (res.success && res.data?.file_path) {
        setInvoiceFormData(prev => ({
          ...prev,
          invoice_image_url: res.data.file_path
        }));
      }
    } catch (err: any) {
      alert('فشل في رفع صورة الفاتورة: ' + (err.message || 'خطأ في الرفع'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Add Item to Invoice Form
  const handleAddItemToInvoice = () => {
    setInvoiceFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          part_id: '',
          item_name: '',
          part_number: '',
          quantity: 1,
          unit_cost: 0,
          category: 'قطع غيار',
          is_new_part: false,
          create_in_inventory: false,
          storage_location: 'المستودع الرئيسي',
          sale_price: 0
        }
      ]
    }));
  };

  // Remove Item from Invoice Form
  const handleRemoveItemFromInvoice = (index: number) => {
    if (invoiceFormData.items.length === 1) return;
    setInvoiceFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update Item in Invoice Form
  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...invoiceFormData.items];
    const item = { ...newItems[index], [field]: value };

    // If selecting an existing inventory part
    if (field === 'part_id') {
      const part = inventoryParts.find(p => p.id === value);
      if (part) {
        item.item_name = part.name;
        item.part_number = part.part_number;
        item.unit_cost = part.cost_price;
        item.category = part.category;
        item.sale_price = part.sale_price;
        item.is_new_part = false;
      }
    }

    newItems[index] = item;
    setInvoiceFormData(prev => ({ ...prev, items: newItems }));
  };

  // Calculations for Invoice Creation
  const invoiceSubtotal = invoiceFormData.items.reduce((acc, it) => acc + (Number(it.quantity || 1) * Number(it.unit_cost || 0)), 0);
  const invoiceTaxAmount = (invoiceSubtotal * (Number(invoiceFormData.tax_percent || 15))) / 100;
  const invoiceGrandTotal = invoiceSubtotal + invoiceTaxAmount;
  const invoiceBalanceDue = Math.max(0, invoiceGrandTotal - Number(invoiceFormData.paid_amount || 0));

  // Submit Create Invoice
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceFormData.supplier_name.trim()) {
      alert('يرجى تحديد أو إدخال اسم المورد');
      return;
    }
    if (invoiceFormData.items.some(it => !it.item_name.trim() || Number(it.quantity) <= 0)) {
      alert('يرجى التأكد من كتابة اسم الصنف والكمية لجميع البنود');
      return;
    }

    try {
      const payload = {
        ...invoiceFormData,
        subtotal: invoiceSubtotal,
        tax_amount: invoiceTaxAmount,
        grand_total: invoiceGrandTotal
      };

      const res = await api.createPurchaseInvoice(payload);
      if (res.success) {
        alert(res.message || 'تم حفظ فاتورة المورد بنجاح');
        setShowCreateInvoiceModal(false);
        // Reset form
        setInvoiceFormData({
          supplier_id: '',
          supplier_name: '',
          supplier_phone: '',
          invoice_number: '',
          invoice_date: new Date().toISOString().slice(0, 10),
          due_date: '',
          payment_method: 'cash',
          paid_amount: 0,
          tax_percent: 15,
          notes: '',
          invoice_image_url: '',
          items: [
            {
              part_id: '',
              item_name: '',
              part_number: '',
              quantity: 1,
              unit_cost: 0,
              category: 'قطع غيار',
              is_new_part: false,
              create_in_inventory: false,
              storage_location: 'المستودع الرئيسي',
              sale_price: 0
            }
          ]
        });
        loadData();
      }
    } catch (err: any) {
      alert('فشل في حفظ الفاتورة: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  // Submit Supplier Form (Create or Edit)
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name.trim()) {
      alert('اسم المورد حقل إلزامي');
      return;
    }

    try {
      if (isEditingSupplier && supplierFormData.id) {
        const res = await api.updateSupplier(supplierFormData.id, supplierFormData);
        if (res.success) {
          alert('تم تحديث بيانات المورد بنجاح');
          setShowSupplierModal(false);
          loadData();
        }
      } else {
        const res = await api.createSupplier(supplierFormData);
        if (res.success) {
          alert(res.message || 'تم إضافة المورد بنجاح');
          setShowSupplierModal(false);
          loadData();
        }
      }
    } catch (err: any) {
      alert('خطأ: ' + (err.message || 'فشلت العملية'));
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!window.confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) return;
    try {
      const res = await api.deleteSupplier(supplier.id);
      if (res.success) {
        alert(res.message || 'تم حذف المورد بنجاح');
        loadData();
      }
    } catch (err: any) {
      alert('فشل في حذف المورد: ' + err.message);
    }
  };

  // Delete Invoice
  const handleDeleteInvoice = async (inv: PurchaseInvoice) => {
    if (!window.confirm(`هل أنت متأكد من حذف فاتورة المورد رقم [${inv.invoice_number}]؟`)) return;
    try {
      const res = await api.deletePurchaseInvoice(inv.id);
      if (res.success) {
        alert('تم حذف الفاتورة بنجاح');
        if (showInvoiceDetailsModal) setShowInvoiceDetailsModal(false);
        loadData();
      }
    } catch (err: any) {
      alert('فشل في حذف الفاتورة: ' + err.message);
    }
  };

  // Open Invoice Details
  const handleViewInvoiceDetails = async (invoice: PurchaseInvoice) => {
    try {
      const res = await api.getPurchaseInvoiceById(invoice.id);
      if (res.success) {
        setSelectedInvoice(res.data);
        setShowInvoiceDetailsModal(true);
      }
    } catch (err: any) {
      alert('فشل في تحميل تفاصيل الفاتورة: ' + err.message);
    }
  };

  // Open Supplier Ledger
  const handleViewSupplierLedger = async (supplier: Supplier) => {
    try {
      setSelectedSupplier(supplier);
      const res = await api.getSupplierById(supplier.id);
      if (res.success) {
        setSupplierDetails(res.data);
        setShowSupplierLedgerModal(true);
      }
    } catch (err: any) {
      alert('فشل في تحميل كشف حساب المورد: ' + err.message);
    }
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (target: 'invoice' | 'supplier', item: any) => {
    setPaymentTargetType(target);
    if (target === 'invoice') {
      setSelectedInvoice(item);
      setPaymentAmount(item.balance_due || 0);
    } else {
      setSelectedSupplier(item);
      setPaymentAmount(item.balance_due || 0);
    }
    setPaymentMethod('transfer');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert('مبلغ السداد يجب أن يكون أكبر من صفر');
      return;
    }

    try {
      if (paymentTargetType === 'invoice' && selectedInvoice) {
        const res = await api.recordSupplierPayment(selectedInvoice.id, {
          amount: paymentAmount,
          payment_method: paymentMethod,
          notes: paymentNotes
        });
        if (res.success) {
          alert(res.message || 'تم تسجيل سداد الفاتورة بنجاح');
          setShowPaymentModal(false);
          if (showInvoiceDetailsModal) setShowInvoiceDetailsModal(false);
          loadData();
        }
      } else if (paymentTargetType === 'supplier' && selectedSupplier) {
        const res = await api.paySupplierBalance(selectedSupplier.id, {
          amount: paymentAmount,
          payment_method: paymentMethod,
          notes: paymentNotes
        });
        if (res.success) {
          alert(res.message || 'تم سداد دفعة لحساب المورد بنجاح');
          setShowPaymentModal(false);
          if (showSupplierLedgerModal) setShowSupplierLedgerModal(false);
          loadData();
        }
      }
    } catch (err: any) {
      alert('فشل في تسجيل السداد: ' + err.message);
    }
  };

  // Print Invoice Function
  const handlePrintInvoice = () => {
    window.print();
  };

  // Dates & Months helpers
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  // Available Months List for Dropdown
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, number>();

    // Seed recent 6 months
    const cur = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap.set(ym, 0);
    }

    // Tally from invoices
    invoices.forEach((inv) => {
      const dStr = inv.invoice_date || inv.created_at;
      if (dStr && dStr.length >= 7) {
        const ym = dStr.slice(0, 7);
        monthsMap.set(ym, (monthsMap.get(ym) || 0) + 1);
      }
    });

    const sortedYm = Array.from(monthsMap.keys()).sort((a, b) => b.localeCompare(a));
    return sortedYm.map((ym) => ({
      value: ym,
      label: formatMonthName(ym),
      count: monthsMap.get(ym) || 0
    }));
  }, [invoices]);

  // Aggregate monthly stats breakdown
  const monthlyStats = useMemo(() => {
    const map = new Map<string, {
      month: string;
      monthName: string;
      count: number;
      totalPurchases: number;
      totalPaid: number;
      balanceDue: number;
    }>();

    invoices.forEach((inv) => {
      const dStr = inv.invoice_date || inv.created_at || '';
      if (!dStr || dStr.length < 7) return;
      const ym = dStr.slice(0, 7);
      const item = map.get(ym) || {
        month: ym,
        monthName: formatMonthName(ym),
        count: 0,
        totalPurchases: 0,
        totalPaid: 0,
        balanceDue: 0
      };
      item.count += 1;
      item.totalPurchases += Number(inv.grand_total || 0);
      item.totalPaid += Number(inv.paid_amount || 0);
      item.balanceDue += Number(inv.balance_due || 0);
      map.set(ym, item);
    });

    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [invoices]);

  // Filtered Invoices by search, status, and month
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.supplier_phone && inv.supplier_phone.includes(searchQuery));

      let matchesStatus = true;
      if (invoiceStatusFilter === 'paid') matchesStatus = inv.payment_status === 'paid';
      if (invoiceStatusFilter === 'unpaid') matchesStatus = inv.payment_status !== 'paid';

      let matchesMonth = true;
      if (selectedMonth !== 'all') {
        const dStr = inv.invoice_date || inv.created_at || '';
        matchesMonth = dStr.startsWith(selectedMonth);
      }

      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [invoices, searchQuery, invoiceStatusFilter, selectedMonth]);

  // Dynamic KPI summary reflecting selected month
  const activeSummary = useMemo(() => {
    if (selectedMonth === 'all' && invoicesSummary) {
      return {
        total_purchases: invoicesSummary.total_purchases || 0,
        total_paid: invoicesSummary.total_paid || 0,
        total_balance_due: invoicesSummary.total_balance_due || 0,
        total_invoices: invoicesSummary.total_invoices || invoices.length,
        periodLabel: 'جميع الشهور'
      };
    }

    const total_purchases = filteredInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
    const total_paid = filteredInvoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
    const total_balance_due = filteredInvoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);

    return {
      total_purchases,
      total_paid,
      total_balance_due,
      total_invoices: filteredInvoices.length,
      periodLabel: selectedMonth !== 'all' ? formatMonthName(selectedMonth) : 'جميع الشهور'
    };
  }, [filteredInvoices, selectedMonth, invoicesSummary, invoices.length]);

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter(sup => {
    const matchesSearch =
      sup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sup.phone && sup.phone.includes(searchQuery)) ||
      (sup.contact_person && sup.contact_person.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      supplierCategoryFilter === 'all' || sup.category === supplierCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* 1. Header with title & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-sky-500 via-indigo-500 to-sky-400 rounded-2xl shadow-xl shadow-sky-500/20 text-white">
              <Truck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                إدارة الموردين وفواتير المشتريات
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                سجل الشركات والموزعين المعتمدين، فواتير التوريد، إرفاق صور الفواتير، ومتابعة الأرصدة الآجلة
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons & Primary Actions */}
        <div className="flex items-center gap-2.5">
          <div className="bg-white/[0.04] border border-white/[0.08] p-1 rounded-2xl flex items-center">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'invoices'
                  ? 'bg-white text-slate-950 shadow-md shadow-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>فواتير المشتريات</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === 'invoices' ? 'bg-slate-950 text-white' : 'bg-white/[0.08] text-slate-300'
              }`}>
                {invoices.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'suppliers'
                  ? 'bg-white text-slate-950 shadow-md shadow-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>دليل الموردين</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === 'suppliers' ? 'bg-slate-950 text-white' : 'bg-white/[0.08] text-slate-300'
              }`}>
                {suppliers.length}
              </span>
            </button>
          </div>

          {activeTab === 'invoices' ? (
            <button
              onClick={() => setShowCreateInvoiceModal(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-white/15 transition-all hover:scale-[1.02] active:scale-95 border border-white cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ فاتورة مشتريات جديدة</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsEditingSupplier(false);
                setSupplierFormData({
                  id: '',
                  name: '',
                  contact_person: '',
                  phone: '',
                  email: '',
                  tax_number: '',
                  address: '',
                  category: 'قطع غيار',
                  payment_terms: 'cash',
                  notes: ''
                });
                setShowSupplierModal(true);
              }}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-white/15 transition-all hover:scale-[1.02] active:scale-95 border border-white cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ إضافة مورد جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchases */}
        <div className="glass-card rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400">إجمالي المشتريات والتوريدات</span>
              <span className="block text-[11px] font-bold text-sky-400 mt-0.5">
                {selectedMonth !== 'all' ? `(لشهر: ${formatMonthName(selectedMonth)})` : '(إجمالي كل الشهور)'}
              </span>
            </div>
            <div className="p-2 bg-sky-500/15 text-sky-300 rounded-xl border border-sky-400/25">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {(activeSummary.total_purchases || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-slate-400">ج.م</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>عدد الفواتير: {activeSummary.total_invoices}</span>
          </div>
        </div>

        {/* Total Paid */}
        <div className="glass-card border-emerald-500/20 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400">المسدد للموردين</span>
              <span className="block text-[11px] font-bold text-emerald-400 mt-0.5">
                {selectedMonth !== 'all' ? `(لشهر: ${formatMonthName(selectedMonth)})` : '(إجمالي كل الشهور)'}
              </span>
            </div>
            <div className="p-2 bg-emerald-500/15 text-emerald-300 rounded-xl border border-emerald-400/25">
              <CheckCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 tracking-tight">
              {(activeSummary.total_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-emerald-400/70">ج.م</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400/90 flex items-center gap-1.5 font-medium">
            <span>دفعات نقدية وتحويلات مكتملة</span>
          </div>
        </div>

        {/* Total Outstanding Dues (الآجل) */}
        <div className="glass-card border-amber-500/20 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-300">المتبقي والآجل للموردين (مستحق)</span>
              <span className="block text-[11px] font-bold text-amber-400 mt-0.5">
                {selectedMonth !== 'all' ? `(لشهر: ${formatMonthName(selectedMonth)})` : '(إجمالي كل الشهور)'}
              </span>
            </div>
            <div className="p-2 bg-amber-500/15 text-amber-300 rounded-xl border border-amber-400/25">
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 tracking-tight">
              {(activeSummary.total_balance_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-amber-400/70">ج.م</span>
          </div>
          <div className="mt-2 text-xs text-amber-400/80 flex items-center gap-1.5 font-medium">
            <span>مستحقات واجبة السداد للشركات</span>
          </div>
        </div>

        {/* Suppliers Count */}
        <div className="glass-card border-purple-500/20 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">الموردون المعتمدون بالدليل</span>
            <div className="p-2 bg-purple-500/15 text-purple-300 rounded-xl border border-purple-400/25">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-300 tracking-tight">
              {suppliers.length}
            </span>
            <span className="text-xs font-bold text-slate-400">مورد مسجل</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <span>شامل موزعي الزيوت والقطع واللمبات</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'invoices' ? 'بحث برقم الفاتورة أو اسم المورد...' : 'بحث باسم المورد أو رقم الهاتف أو المسؤول...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Filters according to active tab */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'invoices' ? (
            <>
              {/* Month Selector Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs shadow-inner">
                <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-slate-400 font-bold whitespace-nowrap">الشهر:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs pr-1"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    كل الشهور (الكل)
                  </option>
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                      {m.label} {m.count > 0 ? `(${m.count} فاتورة)` : ''}
                    </option>
                  ))}
                </select>
                {selectedMonth !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonth('all')}
                    className="text-slate-400 hover:text-white p-0.5 cursor-pointer ml-1"
                    title="إلغاء فلترة الشهر والعودة للكل"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Month Shortcuts */}
              <button
                type="button"
                onClick={() => setSelectedMonth(selectedMonth === currentYearMonth ? 'all' : currentYearMonth)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedMonth === currentYearMonth
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25'
                    : 'text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                الشهر الحالي ({formatMonthName(currentYearMonth).split(' ')[0]})
              </button>

              <button
                type="button"
                onClick={() => setSelectedMonth(selectedMonth === prevYearMonth ? 'all' : prevYearMonth)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedMonth === prevYearMonth
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25'
                    : 'text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                الشهر السابق ({formatMonthName(prevYearMonth).split(' ')[0]})
              </button>

              {/* Status Filters */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setInvoiceStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceStatusFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({activeSummary.total_invoices})
                </button>
                <button
                  onClick={() => setInvoiceStatusFilter('paid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceStatusFilter === 'paid'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  مسددة
                </button>
                <button
                  onClick={() => setInvoiceStatusFilter('unpaid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceStatusFilter === 'unpaid'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                      : 'text-slate-400 hover:text-amber-400'
                  }`}
                >
                  آجلة
                </button>
              </div>

              {/* Monthly Breakdown Toggle Button */}
              <button
                type="button"
                onClick={() => setShowMonthlyBreakdown((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  showMonthlyBreakdown
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-purple-950/50 text-purple-300 border border-purple-800/60 hover:bg-purple-900/40'
                }`}
                title="عرض جدول مقارنة إجمالي الفواتير والمبالغ لكل شهر"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>كشف الفواتير بالشهور 📊</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 ml-1">التصنيف:</span>
              <select
                value={supplierCategoryFilter}
                onChange={(e) => setSupplierCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {SUPPLIER_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3.5 Monthly Breakdown Table Section */}
      {activeTab === 'invoices' && showMonthlyBreakdown && (
        <div className="glass-card border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-400/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                  <span>كشف ومقارنة فواتير المشتريات بالشهور</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                    Monthly Purchases Breakdown
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ملخص تفصيلي لإجمالي المشتريات والمبالغ المسددة والمتبقية في كل شهر، اضغط على أي شهر لعرض فواتيره فوراً
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMonthlyBreakdown(false)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
              title="إغلاق كشف الشهور"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {monthlyStats.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              لا توجد فواتير مشتريات مسجلة حتى الآن لحساب كشف الشهور
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-xs">
                    <th className="py-2.5 px-4 font-bold">الشهر / السنة</th>
                    <th className="py-2.5 px-4 font-bold text-center">عدد الفواتير</th>
                    <th className="py-2.5 px-4 font-bold">إجمالي المشتريات</th>
                    <th className="py-2.5 px-4 font-bold">المسدد للموردين</th>
                    <th className="py-2.5 px-4 font-bold">المتبقي (الآجل)</th>
                    <th className="py-2.5 px-4 font-bold text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {monthlyStats.map((ms) => {
                    const isSelected = selectedMonth === ms.month;
                    return (
                      <tr
                        key={ms.month}
                        className={`transition-colors ${
                          isSelected ? 'bg-purple-900/30 border-r-4 border-purple-500' : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-3 px-4 font-black text-white">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            <span>{ms.monthName}</span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                              {ms.month}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-200">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                            {ms.count} فاتورة
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-sky-400">
                          {ms.totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {ms.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {ms.balanceDue > 0 ? (
                            <span className="text-amber-400 font-bold">
                              {ms.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">0.00 ج.م (مسدد بالكامل)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMonth(isSelected ? 'all' : ms.month);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            {isSelected ? '✓ معروض حالياً (إلغاء)' : 'عرض فواتير هذا الشهر 🔍'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Tab 1: Purchase Invoices List */}
      {activeTab === 'invoices' && (
        <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 text-center text-slate-500">جاري تحميل فواتير الموردين...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-16 text-center">
              <Truck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold text-base">
                {selectedMonth !== 'all'
                  ? `لا توجد فواتير مشتريات مسجلة لشهر (${formatMonthName(selectedMonth)})`
                  : 'لا توجد فواتير مشتريات مسجلة'}
              </p>
              <p className="text-slate-600 text-xs mt-1">
                {selectedMonth !== 'all'
                  ? 'يمكنك إلغاء فلتر الشهر أو تسجيل فاتورة جديدة لهذا الشهر وتحديث المخزن'
                  : 'اضغط على زر "+ فاتورة مشتريات جديدة" لتسجيل فاتورة توريد وإرفاق صورتها وتحديث المخزن'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {selectedMonth !== 'all' && (
                  <button
                    onClick={() => setSelectedMonth('all')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
                  >
                    عرض جميع الشهور
                  </button>
                )}
                <button
                  onClick={() => setShowCreateInvoiceModal(true)}
                  className="px-4 py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  + إضافة فاتورة الآن
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800/80 text-slate-400 text-xs">
                    <th className="py-3 px-4 font-bold">رقم الفاتورة</th>
                    <th className="py-3 px-4 font-bold">المورد</th>
                    <th className="py-3 px-4 font-bold">التاريخ والشهر</th>
                    <th className="py-3 px-4 font-bold">عدد الأصناف</th>
                    <th className="py-3 px-4 font-bold">الإجمالي الشامل (15%)</th>
                    <th className="py-3 px-4 font-bold">المدفوع</th>
                    <th className="py-3 px-4 font-bold">المتبقي (الآجل)</th>
                    <th className="py-3 px-4 font-bold">الحالة</th>
                    <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">
                        <div className="flex items-center gap-2">
                          <span>{inv.invoice_number}</span>
                          {inv.invoice_image_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(inv.invoice_image_url!)}
                              className="p-1 text-emerald-400 hover:text-white bg-emerald-950/60 border border-emerald-800/60 rounded-md transition-colors"
                              title="عرض صورة الفاتورة المرفقة"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex flex-col">
                          <span>{inv.supplier_name}</span>
                          {inv.supplier_phone && (
                            <span className="text-xs text-slate-500 font-mono" dir="ltr">
                              {inv.supplier_phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-slate-300 font-bold">{inv.invoice_date}</span>
                          <span className="text-[11px] text-purple-300/90 bg-purple-950/50 border border-purple-800/40 rounded px-1.5 py-0.5 inline-block w-fit">
                            {formatMonthName(inv.invoice_date.substring(0, 7))}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                          {inv.items_count || 1} أصناف
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-mono">
                        {Number(inv.grand_total).toFixed(2)} ج.م
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400 font-mono">
                        {Number(inv.paid_amount).toFixed(2)} ج.م
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {inv.balance_due > 0 ? (
                          <span className="text-amber-400 font-bold">
                            {Number(inv.balance_due).toFixed(2)} ج.م
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">0.00 ج.م</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {inv.payment_status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                            <CheckCircle className="w-3 h-3" />
                            مسددة بالكامل
                          </span>
                        ) : inv.paid_amount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/60 text-amber-400 border border-amber-800/60">
                            <Clock className="w-3 h-3" />
                            مسددة جزئياً
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/60 text-rose-400 border border-rose-800/60">
                            <AlertCircle className="w-3 h-3" />
                            آجلة / غير مسددة
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewInvoiceDetails(inv)}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-950/40 rounded-lg transition-colors"
                            title="عرض تفاصيل الفاتورة"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {inv.invoice_image_url && (
                            <button
                              onClick={() => setPreviewImage(inv.invoice_image_url!)}
                              className="p-1.5 text-emerald-400 hover:text-white hover:bg-emerald-950/40 rounded-lg transition-colors"
                              title="معاينة صورة الفاتورة"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                          )}

                          {inv.balance_due > 0 && (
                            <button
                              onClick={() => handleOpenPaymentModal('invoice', inv)}
                              className="px-2 py-1 text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-700/50 rounded-lg transition-colors"
                              title="سداد دفعة من الفاتورة"
                            >
                              سداد دفعة
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
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
      )}

      {/* 5. Tab 2: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-20 text-center text-slate-500">جاري تحميل دليل الموردين...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
              <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold text-base">لا يوجد موردون مطابقون للبحث</p>
              <button
                onClick={() => {
                  setIsEditingSupplier(false);
                  setSupplierFormData({
                    id: '',
                    name: '',
                    contact_person: '',
                    phone: '',
                    email: '',
                    tax_number: '',
                    address: '',
                    category: 'قطع غيار',
                    payment_terms: 'cash',
                    notes: ''
                  });
                  setShowSupplierModal(true);
                }}
                className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                + إضافة مورد جديد الآن
              </button>
            </div>
          ) : (
            filteredSuppliers.map((sup) => (
              <div
                key={sup.id}
                className="glass-card rounded-2xl p-5 flex flex-col justify-between transition-all shadow-sm"
              >
                <div>
                  {/* Header: Name & Category badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{sup.name}</span>
                      </h3>
                      {sup.contact_person && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          المسؤول: <span className="text-slate-300 font-medium">{sup.contact_person}</span>
                        </p>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-950/60 text-sky-400 border border-sky-800/60">
                      {sup.category || 'قطع غيار'}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                    {sup.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono" dir="ltr">{sup.phone}</span>
                      </div>
                    )}
                    {sup.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{sup.address}</span>
                      </div>
                    )}
                    {sup.tax_number && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>الرقم الضريبي: <span className="font-mono text-slate-300">{sup.tax_number}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Financial Counters */}
                  <div className="mt-4 grid grid-cols-2 gap-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">إجمالي المسحوبات</span>
                      <span className="text-xs font-black text-white font-mono">
                        {Number(sup.total_purchases || 0).toFixed(0)} ج.م
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-400 block">الرصيد الآجل المستحق</span>
                      <span className="text-xs font-black text-amber-400 font-mono">
                        {Number(sup.balance_due || 0).toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleViewSupplierLedger(sup)}
                    className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>كشف الحساب</span>
                  </button>

                  {Number(sup.balance_due || 0) > 0 && (
                    <button
                      onClick={() => handleOpenPaymentModal('supplier', sup)}
                      className="py-1.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-700/50 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>سداد دفعة</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setIsEditingSupplier(true);
                        setSupplierFormData({
                          id: sup.id,
                          name: sup.name,
                          contact_person: sup.contact_person || '',
                          phone: sup.phone || '',
                          email: sup.email || '',
                          tax_number: sup.tax_number || '',
                          address: sup.address || '',
                          category: sup.category || 'قطع غيار',
                          payment_terms: sup.payment_terms || 'cash',
                          notes: sup.notes || ''
                        });
                        setShowSupplierModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="تعديل بيانات المورد"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteSupplier(sup)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="حذف المورد"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: + فاتورة مشتريات جديدة                         */}
      {/* ======================================================== */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-4">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">تسجيل فاتورة مشتريات وتوريد أصناف</h2>
                  <p className="text-xs text-slate-400">تحديث كميات المخزن تلقائياً، إرفاق صورة الفاتورة، وحفظها بقاعدة البيانات</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateInvoiceModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateInvoiceSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Supplier & Invoice Header (Row 1: Supplier, Phone, Attachment) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                {/* 1. Supplier Picker / Input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    المورد <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={invoiceFormData.supplier_id}
                    onChange={(e) => handleSelectSupplierForInvoice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- اختر من دليل الموردين أو اكتب يدوياً --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                    ))}
                  </select>
                  {!invoiceFormData.supplier_id && (
                    <input
                      type="text"
                      placeholder="أو اكتب اسم مورد جديد هنا..."
                      value={invoiceFormData.supplier_name}
                      onChange={(e) => setInvoiceFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                      className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  )}
                </div>

                {/* 2. Supplier Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">هاتف المورد</label>
                  <input
                    type="text"
                    placeholder="05XXXXXXXX"
                    value={invoiceFormData.supplier_phone}
                    onChange={(e) => setInvoiceFormData(prev => ({ ...prev, supplier_phone: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                    dir="ltr"
                  />
                </div>

                {/* 3. Attach Invoice Image / PDF (replaces supplier tax number) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sky-400">
                      <Camera className="w-3.5 h-3.5" />
                      <span>إرفاق صورة الفاتورة</span>
                    </span>
                    {invoiceFormData.invoice_image_url && (
                      <span className="text-[10px] text-emerald-400 font-bold">تم الإرفاق ✓</span>
                    )}
                  </label>

                  {invoiceFormData.invoice_image_url ? (
                    <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-900 border border-emerald-500/40 rounded-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={invoiceFormData.invoice_image_url}
                          alt="صورة الفاتورة"
                          className="w-8 h-8 rounded-lg object-cover border border-slate-700 cursor-pointer"
                          onClick={() => setPreviewImage(invoiceFormData.invoice_image_url)}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] text-emerald-300 font-semibold truncate">تم حفظ الصورة</p>
                          <button
                            type="button"
                            onClick={() => setPreviewImage(invoiceFormData.invoice_image_url)}
                            className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                          >
                            <Eye className="w-3 h-3" /> معاينة
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInvoiceFormData(prev => ({ ...prev, invoice_image_url: '' }))}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="إزالة الصورة"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex items-center justify-center gap-2 p-2 border border-dashed rounded-xl cursor-pointer transition-all ${
                      uploadingImage
                        ? 'border-sky-500/50 bg-sky-950/20 text-sky-400'
                        : 'border-slate-700 hover:border-sky-500/60 bg-slate-900/90 hover:bg-slate-900 text-slate-300'
                    }`}>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        onChange={handleInvoiceImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                          <span className="text-xs font-semibold">جاري الرفع...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-sky-400" />
                          <span className="text-xs font-semibold">ارفق صورة أو التقط بالكاميرا</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                {/* 4. Invoice Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">رقم الفاتورة (الورقية / المورد)</label>
                  <input
                    type="text"
                    placeholder="مثال: INV-10492"
                    value={invoiceFormData.invoice_number}
                    onChange={(e) => setInvoiceFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                {/* 5. Invoice Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    value={invoiceFormData.invoice_date}
                    onChange={(e) => setInvoiceFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                {/* 6. Payment Method */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">طريقة السداد</label>
                  <select
                    value={invoiceFormData.payment_method}
                    onChange={(e) => setInvoiceFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="cash">نقداً (كاش من الخزينة)</option>
                    <option value="transfer">تحويل بنكي</option>
                    <option value="card">بطاقة / مدى</option>
                    <option value="credit">آجل بالكامل (سداد لاحق)</option>
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>أصناف وقطع الفاتورة المستلمة</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItemToInvoice}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-600/40 rounded-xl text-xs font-bold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة صنف آخر</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {invoiceFormData.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 transition-colors hover:border-slate-700"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        {/* Select from Inventory */}
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400">
                            اختر صنفاً من المخزن:
                          </label>
                          <select
                            value={item.part_id}
                            onChange={(e) => handleUpdateItem(idx, 'part_id', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                          >
                            <option value="">-- أو تكويد صنف جديد بالأسفل --</option>
                            {inventoryParts.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.part_number}) — رصيد حالي: {p.stock_quantity}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Item Name */}
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400">
                            اسم الصنف <span className="text-rose-500">*</span>:
                          </label>
                          <input
                            type="text"
                            placeholder="اسم الزيت / اللمبة / القطعة..."
                            value={item.item_name}
                            onChange={(e) => handleUpdateItem(idx, 'item_name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400">الكمية:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono text-center"
                          />
                        </div>

                        {/* Unit Cost */}
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400">سعر الشراء:</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.unit_cost}
                            onChange={(e) => handleUpdateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono text-center"
                          />
                        </div>

                        {/* Remove Button */}
                        <div className="md:col-span-1 flex items-end justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromInvoice(idx)}
                            disabled={invoiceFormData.items.length === 1}
                            className={`p-2 rounded-lg transition-colors ${
                              invoiceFormData.items.length === 1
                                ? 'text-slate-700 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                            }`}
                            title="حذف البند"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* If creating new part (toggle details) */}
                      {!item.part_id && (
                        <div className="pt-2 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                          <label className="flex items-center gap-1.5 text-sky-400 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.is_new_part}
                              onChange={(e) => handleUpdateItem(idx, 'is_new_part', e.target.checked)}
                              className="rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-0"
                            />
                            <span>تكويد وإضافة للمخزن تلقائياً</span>
                          </label>

                          {item.is_new_part && (
                            <>
                              <div>
                                <input
                                  type="text"
                                  placeholder="كود القطعة (Part Number)"
                                  value={item.part_number}
                                  onChange={(e) => handleUpdateItem(idx, 'part_number', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                                />
                              </div>
                              <div>
                                <select
                                  value={item.category}
                                  onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                                >
                                  <option value="قطع غيار">قطع غيار</option>
                                  <option value="زيوت وسوائل">زيوت وسوائل</option>
                                  <option value="لمبات وإضاءة">لمبات وإضاءة</option>
                                  <option value="فلاتر">فلاتر</option>
                                  <option value="فرامل">فرامل</option>
                                  <option value="كهرباء وبواجي">كهرباء وبواجي</option>
                                </select>
                              </div>
                              <div>
                                <input
                                  type="number"
                                  placeholder="سعر البيع للعميل"
                                  value={item.sale_price || ''}
                                  onChange={(e) => handleUpdateItem(idx, 'sale_price', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Line Item Total */}
                      <div className="flex justify-end text-xs text-slate-400 font-mono">
                        إجمالي البند: <span className="text-white font-bold mr-1">{(item.quantity * item.unit_cost).toFixed(2)} ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Footer */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <span className="text-xs text-slate-400 block">المجموع قبل الضريبة</span>
                    <span className="text-sm font-bold text-white font-mono">{invoiceSubtotal.toFixed(2)} ج.م</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">ضريبة القيمة المضافة (15%)</span>
                    <span className="text-sm font-bold text-sky-400 font-mono">{invoiceTaxAmount.toFixed(2)} ج.م</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">الإجمالي الشامل للضريبة</span>
                    <span className="text-base font-black text-emerald-400 font-mono">{invoiceGrandTotal.toFixed(2)} ج.م</span>
                  </div>
                  <div>
                    <span className="text-xs text-amber-400 block">الرصيد الآجل المتبقي</span>
                    <span className="text-base font-black text-amber-400 font-mono">{invoiceBalanceDue.toFixed(2)} ج.م</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row items-center gap-4">
                  <div className="w-full md:w-1/2 space-y-1">
                    <label className="text-xs font-bold text-emerald-400">
                      المبلغ المدفوع كاش/تحويل الآن:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={invoiceGrandTotal}
                      value={invoiceFormData.paid_amount}
                      onChange={(e) => setInvoiceFormData(prev => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-emerald-700/60 rounded-xl px-3 py-2 text-sm text-emerald-300 font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div className="w-full md:w-1/2 space-y-1">
                    <label className="text-xs font-bold text-slate-400">ملاحظات الفاتورة:</label>
                    <input
                      type="text"
                      placeholder="أي شروط أو تفاصيل إضافية..."
                      value={invoiceFormData.notes}
                      onChange={(e) => setInvoiceFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ الفاتورة وتحديث المخزون</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL: تفاصيل الفاتورة والطباعة                       */}
      {/* ======================================================== */}
      {showInvoiceDetailsModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-4 print:bg-white print:text-black">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">تفاصيل فاتورة المشتريات #{selectedInvoice.invoice_number}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة</span>
                </button>
                <button
                  onClick={() => setShowInvoiceDetailsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Invoice Meta */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block">رقم الفاتورة:</span>
                  <span className="font-mono font-bold text-white text-sm">{selectedInvoice.invoice_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">المورد:</span>
                  <span className="font-bold text-white text-sm">{selectedInvoice.supplier_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">تاريخ الفاتورة:</span>
                  <span className="font-mono text-slate-300">{selectedInvoice.invoice_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">طريقة السداد:</span>
                  <span className="font-medium text-slate-300">{selectedInvoice.payment_method}</span>
                </div>
              </div>

              {/* Attached Invoice Image (if exists) */}
              {selectedInvoice.invoice_image_url && (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>صورة الفاتورة المرفقة والمحفوظة:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(selectedInvoice.invoice_image_url!)}
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>معاينة وتكبير الصورة</span>
                    </button>
                  </div>
                  <div
                    className="relative group max-w-xs rounded-xl overflow-hidden border border-slate-700/80 cursor-pointer shadow-md"
                    onClick={() => setPreviewImage(selectedInvoice.invoice_image_url!)}
                  >
                    <img
                      src={selectedInvoice.invoice_image_url}
                      alt={`فاتورة ${selectedInvoice.invoice_number}`}
                      className="w-full max-h-48 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" /> اضغط للتكبير
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">الصنف المستلم</th>
                      <th className="py-2.5 px-3">رقم القطعة</th>
                      <th className="py-2.5 px-3 text-center">الكمية</th>
                      <th className="py-2.5 px-3 text-center">سعر الوحدة</th>
                      <th className="py-2.5 px-3 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedInvoice.items?.map((it, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-500">{i + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{it.item_name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{it.part_number || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{Number(it.unit_cost).toFixed(2)} ج.م</td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-white">
                          {(it.quantity * it.unit_cost).toFixed(2)} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono text-white">{Number(selectedInvoice.subtotal).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>ضريبة القيمة المضافة (15%):</span>
                    <span className="font-mono text-white">{Number(selectedInvoice.tax_amount).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-slate-800">
                    <span>الإجمالي الكلي:</span>
                    <span className="font-mono text-emerald-400">{Number(selectedInvoice.grand_total).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs text-emerald-400">
                    <span>المدفوع:</span>
                    <span className="font-mono">{Number(selectedInvoice.paid_amount).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs text-amber-400 pt-1 border-t border-slate-800">
                    <span>المتبقي الآجل:</span>
                    <span className="font-mono">{Number(selectedInvoice.balance_due).toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 print:hidden">
              {selectedInvoice.balance_due > 0 ? (
                <button
                  onClick={() => handleOpenPaymentModal('invoice', selectedInvoice)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  سداد دفعة من هذه الفاتورة
                </button>
              ) : (
                <span className="text-xs text-emerald-400 font-bold">الفاتورة مسددة بالكامل ✓</span>
              )}
              <button
                onClick={() => setShowInvoiceDetailsModal(false)}
                className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL: + إضافة وتعديل مورد                            */}
      {/* ======================================================== */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden my-4">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">
                  {isEditingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد / موزع معتمد جديد'}
                </h3>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  اسم الشركة / المورد <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: شركة بترومين للزيوت، مؤسسة الرواد لقطع الغيار..."
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">مسؤول المبيعات / الاتصال</label>
                  <input
                    type="text"
                    placeholder="اسم المندوب أو المسؤول"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">رقم الهاتف / الجوال</label>
                  <input
                    type="text"
                    placeholder="05XXXXXXXX"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">تصنيف ما يورده</label>
                  <select
                    value={supplierFormData.category}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="قطع غيار">قطع غيار عامة</option>
                    <option value="زيوت ومواد تشحيم">زيوت ومواد تشحيم</option>
                    <option value="كهرباء ولمبات">كهرباء ولمبات</option>
                    <option value="فلاتر وبواجي">فلاتر وبواجي</option>
                    <option value="إطارات وبطاريات">إطارات وبطاريات</option>
                    <option value="متنوع">مورد متنوع</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">الرقم الضريبي / السجل التجاري</label>
                  <input
                    type="text"
                    placeholder="300XXXXXXXXXXXX"
                    value={supplierFormData.tax_number}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, tax_number: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">العنوان / المدينة</label>
                <input
                  type="text"
                  placeholder="مثال: الرياض - صناعية الشفاء - شارع المعارض"
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">ملاحظات وشروط التعامل</label>
                <textarea
                  rows={2}
                  placeholder="شروط الدفع الآجل، مواعيد التوصيل، خصومات الجملة..."
                  value={supplierFormData.notes}
                  onChange={(e) => setSupplierFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  {isEditingSupplier ? 'حفظ التعديلات' : 'إضافة المورد للدليل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. MODAL: كشف حساب المورد                                */}
      {/* ======================================================== */}
      {showSupplierLedgerModal && supplierDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-4 print:bg-white print:text-black">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 print:hidden">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">كشف حساب المورد: {supplierDetails.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة كشف الحساب</span>
                </button>
                <button onClick={() => setShowSupplierLedgerModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Financial Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400 block">إجمالي المشتريات المسحوبة</span>
                  <span className="text-lg font-black text-white font-mono">
                    {Number(supplierDetails.total_purchases || 0).toFixed(2)} ج.م
                  </span>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400 block">إجمالي المسدد له</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {Number(supplierDetails.total_paid || 0).toFixed(2)} ج.م
                  </span>
                </div>
                <div className="p-4 bg-slate-950/60 border border-amber-900/40 rounded-xl">
                  <span className="text-xs text-amber-300 block">الرصيد الآجل المتبقي (مستحق له)</span>
                  <span className="text-lg font-black text-amber-400 font-mono">
                    {Number(supplierDetails.balance_due || 0).toFixed(2)} ج.م
                  </span>
                </div>
              </div>

              {/* Invoices List */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3">سجل فواتير التوريد من هذا المورد:</h4>
                {supplierDetails.invoices?.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">لا توجد فواتير مشتريات مسجلة لهذا المورد بعد.</p>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">رقم الفاتورة</th>
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3">إجمالي الفاتورة</th>
                          <th className="py-2.5 px-3">المدفوع</th>
                          <th className="py-2.5 px-3">المتبقي</th>
                          <th className="py-2.5 px-3">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {supplierDetails.invoices?.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-mono font-bold text-sky-400">{inv.invoice_number}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">{inv.invoice_date}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-white">{Number(inv.grand_total).toFixed(2)} ج.م</td>
                            <td className="py-2.5 px-3 font-mono text-emerald-400">{Number(inv.paid_amount).toFixed(2)} ج.م</td>
                            <td className="py-2.5 px-3 font-mono text-amber-400 font-bold">{Number(inv.balance_due).toFixed(2)} ج.م</td>
                            <td className="py-2.5 px-3">
                              {inv.balance_due === 0 ? (
                                <span className="text-emerald-400">مسددة بالكامل</span>
                              ) : (
                                <span className="text-amber-400">بها متبقي</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Supplied Parts in Inventory */}
              {supplierDetails.parts && supplierDetails.parts.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-white mb-3">الأصناف المرتبطة بهذا المورد في المخزن:</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">كود الصنف</th>
                          <th className="py-2.5 px-3">اسم الصنف</th>
                          <th className="py-2.5 px-3">التصنيف</th>
                          <th className="py-2.5 px-3">سعر التكلفة</th>
                          <th className="py-2.5 px-3">سعر البيع</th>
                          <th className="py-2.5 px-3 text-center">الرصيد بالمخزن</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {supplierDetails.parts.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-mono text-sky-400">{p.part_number}</td>
                            <td className="py-2.5 px-3 font-semibold text-white">{p.name}</td>
                            <td className="py-2.5 px-3 text-slate-400">{p.category}</td>
                            <td className="py-2.5 px-3 font-mono">{Number(p.cost_price).toFixed(2)} ج.م</td>
                            <td className="py-2.5 px-3 font-mono text-emerald-400">{Number(p.sale_price).toFixed(2)} ج.م</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{p.stock_quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 print:hidden">
              {Number(supplierDetails.balance_due || 0) > 0 && (
                <button
                  onClick={() => handleOpenPaymentModal('supplier', supplierDetails)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  سداد دفعة لحساب المورد
                </button>
              )}
              <button
                onClick={() => setShowSupplierLedgerModal(false)}
                className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. MODAL: سداد دفعة للمورد                               */}
      {/* ======================================================== */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">تسجيل سداد دفعة للمورد</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">المورد:</span>
                  <span className="font-bold text-white">
                    {paymentTargetType === 'invoice' ? selectedInvoice?.supplier_name : selectedSupplier?.name}
                  </span>
                </div>
                {paymentTargetType === 'invoice' && selectedInvoice && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">رقم الفاتورة:</span>
                    <span className="font-mono text-sky-400">{selectedInvoice.invoice_number}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-amber-400">المبلغ المستحق حالياً:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {paymentTargetType === 'invoice'
                      ? Number(selectedInvoice?.balance_due || 0).toFixed(2)
                      : Number(selectedSupplier?.balance_due || 0).toFixed(2)}{' '}
                    ج.م
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">مبلغ السداد (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-emerald-600 rounded-xl px-3 py-2 text-base text-emerald-400 font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">طريقة السداد</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="transfer">تحويل بنكي</option>
                  <option value="cash">نقداً (كاش من الخزينة)</option>
                  <option value="card">شبكة / بطاقة</option>
                  <option value="cheque">شيك مصرفي</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">ملاحظات أو رقم الحوالة</label>
                <input
                  type="text"
                  placeholder="رقم مرجع التحويل أو سند الصرف..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/30"
                >
                  تأكيد تسجيل السداد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 11. MODAL: تكبير ومعاينة صورة الفاتورة (Lightbox)         */}
      {/* ======================================================== */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5 text-white">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>أصل صورة الفاتورة المرفقة</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                >
                  فتح / تحميل الأصل
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-950">
              <img
                src={previewImage}
                alt="معاينة الفاتورة"
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesView;
