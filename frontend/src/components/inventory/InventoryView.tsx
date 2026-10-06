import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  X,
  Package,
  Trash2,
  Tag,
  Printer,
  Sparkles,
  Droplet,
  Filter,
  Copy,
  Check,
  QrCode,
  FileText,
  Paperclip,
  Save,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Flame,
  Wrench,
  Disc,
  Layers,
  Thermometer,
  History,
  ScanLine,
  ArrowDownCircle,
  ArrowUpCircle,
  Volume2,
  RefreshCw,
  ExternalLink,
  User,
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { Part } from '../../types';
import { useSync } from '../../context/SyncContext';
import { BarcodeSvg, playScannerBeep } from '../../utils/barcode128';

export interface InventoryViewProps {
  initialTab?: 'add' | 'stock' | 'scanner' | 'movements';
  onTabChange?: (tab: string) => void;
}

const CATEGORIES = [
  'فلاتر',
  'زيوت',
  'إشعال',
  'فرامل',
  'مساعدات',
  'محرك',
  'تبريد',
  'قطع غيار',
  'كهرباء',
  'عفشة',
  'مستهلكات'
];

const BRANDS = [
  'تويوتا',
  'نيسان',
  'هيونداي',
  'كيا',
  'موبيل',
  'شل',
  'كاسترول',
  'Total',
  'بوش',
  'بريمبو',
  'NGK',
  'KYB',
  'أصلي',
  'مان',
  'دينسو'
];

const STORAGE_LOCATIONS = [
  'رف A-1',
  'رف A-2',
  'رف B-1',
  'رف B-2',
  'رف C-1',
  'رف D-1',
  'رف D-2',
  'رف E-1',
  'مستودع الزيوت',
  'مستودع السوائل',
  'قسم الفلاتر',
  'قسم الفرامل',
  'قسم الكهرباء'
];

const DEFAULT_SUPPLIERS = [
  'تويوتا الوكالة',
  'شركة النيل لقطع الغيار',
  'مؤسسة الأهرام للتجارة',
  'المنصور للسيارات',
  'موبيل مصر',
  'كاسترول مصر',
  'بوش الوكيل المعتمد',
  'مستورد مباشر'
];

function getPartCategoryVisual(category?: string, name?: string) {
  const c = (category || '').toLowerCase();
  const n = (name || '').toLowerCase();

  if (c.includes('زيت') || n.includes('زيت')) {
    return {
      icon: Droplet,
      bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400',
      label: 'زيت'
    };
  }
  if (c.includes('فلت') || n.includes('فلتر')) {
    return {
      icon: Filter,
      bg: 'bg-sky-500/10 text-sky-500 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-400',
      label: 'فلتر'
    };
  }
  if (c.includes('إشعال') || c.includes('كهر') || n.includes('بوجي') || n.includes('شمع')) {
    return {
      icon: Flame,
      bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400',
      label: 'إشعال'
    };
  }
  if (c.includes('فرم') || n.includes('فحم') || n.includes('تيل') || n.includes('طنبور')) {
    return {
      icon: Disc,
      bg: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400',
      label: 'فرامل'
    };
  }
  if (c.includes('مساعد') || c.includes('عفش') || n.includes('مساعد')) {
    return {
      icon: Layers,
      bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400',
      label: 'مساعدات'
    };
  }
  if (c.includes('تبريد') || n.includes('ردياتير') || n.includes('ماء')) {
    return {
      icon: Thermometer,
      bg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-400',
      label: 'تبريد'
    };
  }
  if (c.includes('محرك') || n.includes('سير') || n.includes('كاتينة') || n.includes('بستن')) {
    return {
      icon: Wrench,
      bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400',
      label: 'محرك'
    };
  }
  return {
    icon: Package,
    bg: 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-700/40 dark:text-slate-300',
    label: 'صنف'
  };
}

interface ScanLogItem {
  id: string;
  time: string;
  part_name: string;
  part_number: string;
  action: 'dispense' | 'receive';
  quantity: number;
  prev_qty: number;
  new_qty: number;
  success: boolean;
  message: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ initialTab = 'stock', onTabChange }) => {
  const [activeSubTab, setActiveSubTab] = useState<'add' | 'stock' | 'scanner' | 'movements'>(initialTab);
  const [parts, setParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>(DEFAULT_SUPPLIERS);
  const [loading, setLoading] = useState(true);

  // Search & Filters for stock table
  const [searchCodeOrName, setSearchCodeOrName] = useState('');
  const [searchBrandOrName, setSearchBrandOrName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false);
  const [showReportPrintModal, setShowReportPrintModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // =========================================================================
  // REAL-TIME HARDWARE BARCODE SCANNER INTEGRATION
  // =========================================================================
  const [scannerOpen, setScannerOpen] = useState(true);
  const [scanAction, setScanAction] = useState<'dispense' | 'receive'>('dispense');
  const [scanQty, setScanQty] = useState(1);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<ScanLogItem[]>([]);
  const [lastScanResult, setLastScanResult] = useState<{
    type: 'success' | 'error';
    text: string;
    partName?: string;
    newQty?: number;
  } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Add Part Form State
  const [formData, setFormData] = useState({
    name: '',
    part_number: '',
    category: '',
    brand: '',
    description: '',
    stock_quantity: 50,
    min_stock_alert: 10,
    cost_price: 120,
    sale_price: 180,
    supplier_name: '',
    storage_location: '',
    type: 'Original',
    warranty_months: 6
  });

  const [submitting, setSubmitting] = useState(false);
  const { lastEvent } = useSync();

  // Customers for Linking Scan/Dispense Movements
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [scanCustomerId, setScanCustomerId] = useState<string>('');

  // Movements Audit Report States
  const [reportMovements, setReportMovements] = useState<any[]>([]);
  const [reportStats, setReportStats] = useState<any>({
    total_movements: 0,
    total_dispensed_qty: 0,
    total_received_qty: 0,
    total_dispensed_value: 0,
    total_received_cost: 0,
    unique_customers_count: 0
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [reportMovementType, setReportMovementType] = useState('all');
  const [reportCustomerFilter, setReportCustomerFilter] = useState('all');
  const [reportDateFilter, setReportDateFilter] = useState<'all' | 'today' | '7days' | 'month'>('all');

  // Synchronize activeSubTab if initialTab changes from parent
  useEffect(() => {
    if (initialTab && initialTab !== activeSubTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  const handleSwitchSubTab = (tab: 'add' | 'stock' | 'scanner' | 'movements') => {
    setActiveSubTab(tab);
    if (onTabChange) {
      if (tab === 'add') onTabChange('inventory_add');
      else if (tab === 'scanner') onTabChange('inventory_scanner');
      else if (tab === 'movements') onTabChange('inventory_movements');
      else onTabChange('inventory_stock');
    }
    if (tab === 'movements') {
      loadMovementsReport();
    }
    if (tab === 'scanner') {
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    }
  };

  const loadParts = () => {
    setLoading(true);
    api.getParts()
      .then((res) => {
        if (res && res.data) {
          setParts(res.data);
        }
      })
      .catch((err) => console.error('Error loading parts:', err))
      .finally(() => setLoading(false));
  };

  const loadSuppliers = () => {
    api.getSuppliers?.()
      .then((res: any) => {
        if (res?.data?.length) {
          const names = res.data.map((s: any) => s.name || s.company_name).filter(Boolean);
          const combined = Array.from(new Set([...names, ...DEFAULT_SUPPLIERS]));
          setSuppliers(combined);
        }
      })
      .catch(() => {});
  };

  const loadCustomers = () => {
    api.getCustomers?.()
      .then((res: any) => {
        if (res && res.data) {
          setCustomersList(res.data);
        }
      })
      .catch(() => {});
  };

  const loadMovementsReport = () => {
    setReportLoading(true);
    let startDate: string | undefined;
    let endDate: string | undefined;

    const now = new Date();
    if (reportDateFilter === 'today') {
      startDate = now.toISOString().split('T')[0];
      endDate = startDate;
    } else if (reportDateFilter === '7days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 7);
      startDate = past7.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    } else if (reportDateFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = startOfMonth.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }

    api.getStockMovementsReport?.({
      search: reportSearch.trim() || undefined,
      movement_type: reportMovementType !== 'all' ? reportMovementType : undefined,
      customer_id: reportCustomerFilter !== 'all' ? reportCustomerFilter : undefined,
      start_date: startDate,
      end_date: endDate,
      limit: 300
    })
      .then((res: any) => {
        if (res && res.data) {
          setReportMovements(res.data.movements || []);
          if (res.data.stats) {
            setReportStats(res.data.stats);
          }
        }
      })
      .catch((err) => console.error('Error loading movements report:', err))
      .finally(() => setReportLoading(false));
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const exportReportToCsv = () => {
    if (!reportMovements.length) return;
    const headers = [
      'التاريخ والوقت',
      'اسم الصنف',
      'كود الصنف SKU',
      'التصنيف',
      'الماركة',
      'نوع الحركة',
      'الكمية',
      'سعر الوحدة',
      'إجمالي القيمة',
      'المسؤول (من قام بالحركة)',
      'العميل المستفيد',
      'رقم هاتف العميل',
      'لوحة السيارة',
      'رقم أمر العمل',
      'الملاحظات'
    ];

    const rows = reportMovements.map((m) => [
      `"${formatDateTime(m.created_at)}"`,
      `"${(m.part_name || '').replace(/"/g, '""')}"`,
      `"${m.part_number || ''}"`,
      `"${m.part_category || ''}"`,
      `"${m.part_brand || ''}"`,
      m.quantity < 0 ? 'صرف' : 'توريد',
      m.quantity,
      m.unit_price || m.unit_cost || 0,
      Math.abs(m.quantity) * (m.unit_price || m.unit_cost || 0),
      `"${m.created_by_name || 'مدير الورشة'}"`,
      `"${m.customer_name || 'توريد عام / بدون عميل'}"`,
      `"${m.customer_phone || ''}"`,
      `"${m.vehicle_plate || ''}"`,
      `"${m.work_order_number || ''}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقرير_حركة_المخزن_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    const printContent = document.getElementById('printable-stock-report');
    if (!printContent) {
      window.print();
      return;
    }

    let iframe = document.getElementById('print-report-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-report-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير حركة المخزن والتوريدات</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 8px;
            font-size: 11px;
            line-height: 1.4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10px;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 5px 6px;
            text-align: right;
            color: #000000 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: 900;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .text-center { text-align: center; }
          .font-mono { font-family: monospace; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          .grid { display: grid; }
          .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
          .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
          .gap-3 { gap: 10px; }
          .gap-6 { gap: 20px; }
          .p-3 { padding: 10px; }
          .p-2 { padding: 5px; }
          .mb-4, .mb-5 { margin-bottom: 14px; }
          .mt-1 { margin-top: 4px; }
          .mt-3 { margin-top: 8px; }
          .mt-6 { margin-top: 24px; }
          .mt-8 { margin-top: 30px; }
          .pt-2 { padding-top: 6px; }
          .pt-10 { padding-top: 30px; }
          .pb-4 { padding-bottom: 12px; }
          .border-b-2 { border-bottom: 2px solid #000000; }
          .border-t-2 { border-top: 2px solid #000000; }
          .border-t { border-top: 1px solid #cbd5e1; }
          .border { border: 1px solid #000000; }
          .rounded-xl { border-radius: 6px; }
          .bg-slate-100, .bg-slate-200 {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .text-slate-900 { color: #0f172a !important; }
          .text-purple-900 { color: #581c87 !important; }
          .text-rose-800 { color: #9f1239 !important; font-weight: bold; }
          .text-emerald-800 { color: #065f46 !important; font-weight: bold; }
          .text-blue-900 { color: #1e3a8a !important; font-weight: bold; }
          .text-xs { font-size: 11px; }
          .text-sm { font-size: 12px; }
          .text-base { font-size: 13px; }
          .text-2xl { font-size: 18px; }
          .tracking-tight { letter-spacing: -0.025em; }
          .flex { display: flex; }
          .items-start { align-items: flex-start; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .whitespace-nowrap { white-space: nowrap; }
          .block { display: block; }
          .italic { font-style: italic; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  useEffect(() => {
    loadParts();
    loadSuppliers();
    loadCustomers();
    loadMovementsReport();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'movements') {
      loadMovementsReport();
    }
  }, [activeSubTab, reportDateFilter, reportMovementType, reportCustomerFilter]);

  useEffect(() => {
    if (lastEvent?.entity === 'inventory') {
      loadParts();
      loadMovementsReport();
    }
  }, [lastEvent]);

  // Auto-generate code from backend
  const handleAutoGenerateCode = async (categoryName?: string) => {
    const cat = categoryName || formData.category || 'فلاتر';
    setGeneratingCode(true);
    try {
      const res = await api.generatePartCode(cat);
      if (res.success && res.data?.code) {
        setFormData((prev) => ({ ...prev, part_number: res.data.code }));
      }
    } catch (err: any) {
      console.error('Failed to auto-generate code:', err);
      const pfx = cat.includes('فلت') ? 'FZ' : cat.includes('زيت') ? 'O' : cat.includes('إشعال') ? 'PL' : cat.includes('فرام') ? 'BR' : 'PRT';
      const num = String(Math.floor(1 + Math.random() * 99)).padStart(3, '0');
      setFormData((prev) => ({ ...prev, part_number: `${pfx}-${num}` }));
    } finally {
      setGeneratingCode(false);
    }
  };

  // Submit Add Part
  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('يرجى كتابة اسم الصنف');
      return;
    }
    if (!formData.part_number) {
      alert('يرجى إدخال كود الصنف أو توليده');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createPart({
        ...formData,
        cost_price: Number(formData.cost_price) || 0,
        sale_price: Number(formData.sale_price) || 0,
        stock_quantity: Number(formData.stock_quantity) || 0,
        min_stock_alert: Number(formData.min_stock_alert) || 2
      });

      const createdPart: Part = {
        id: res.data?.id || String(Date.now()),
        ...formData,
        cost_price: Number(formData.cost_price) || 0,
        sale_price: Number(formData.sale_price) || 0,
        stock_quantity: Number(formData.stock_quantity) || 0,
        min_stock_alert: Number(formData.min_stock_alert) || 2
      };

      // Reset form
      setFormData({
        name: '',
        part_number: '',
        category: '',
        brand: '',
        description: '',
        stock_quantity: 50,
        min_stock_alert: 10,
        cost_price: 120,
        sale_price: 180,
        supplier_name: '',
        storage_location: '',
        type: 'Original',
        warranty_months: 6
      });

      loadParts();

      // Show option to print barcode directly for the newly created part!
      if (window.confirm(`تم تكويد وإضافة الصنف "${createdPart.name}" بنجاح!\n\nهل تريد فتح ملصق الباركود لطباعته الآن للرف أو المنتج؟`)) {
        setSelectedPart(createdPart);
        setShowBarcodeModal(true);
      } else {
        handleSwitchSubTab('stock');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ الصنف');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Part Modal
  const handleOpenEdit = (p: Part) => {
    setEditingPart({ ...p });
    setShowEditModal(true);
  };

  // Save Edit Part
  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    setSubmitting(true);
    try {
      await api.updatePart(editingPart.id, {
        part_number: editingPart.part_number,
        name: editingPart.name,
        category: editingPart.category,
        brand: editingPart.brand,
        cost_price: Number(editingPart.cost_price) || 0,
        sale_price: Number(editingPart.sale_price) || 0,
        stock_quantity: Number(editingPart.stock_quantity) || 0,
        min_stock_alert: Number(editingPart.min_stock_alert) || 2,
        storage_location: editingPart.storage_location,
        supplier_name: editingPart.supplier_name,
        description: editingPart.description
      });
      setShowEditModal(false);
      setEditingPart(null);
      loadParts();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تحديث بيانات الصنف');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Part
  const handleDeletePart = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الصنف "${name}" من المخزون نهائياً؟`)) {
      return;
    }
    try {
      await api.deletePart(id);
      loadParts();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الحذف');
    }
  };

  // =========================================================================
  // EXECUTE BARCODE SCAN (HARDWARE READER OR MANUAL ENTER)
  // =========================================================================
  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setScanning(true);
    try {
      const selectedCust = customersList.find((c) => c.id === scanCustomerId);
      const res = await api.scanBarcode({
        barcode: code,
        action: scanAction,
        quantity: scanQty,
        customer_id: scanAction === 'dispense' && scanCustomerId ? scanCustomerId : undefined,
        customer_name: scanAction === 'dispense' && selectedCust ? selectedCust.full_name : undefined
      });

      if (res.success && res.part) {
        // 1. Play high-pitch confirmation beep (supermarket chime)
        playScannerBeep(true);

        // 2. Set visual toast
        setLastScanResult({
          type: 'success',
          text: res.message,
          partName: res.part.name,
          newQty: res.new_quantity
        });

        // 3. Log to recent scans feed
        const logItem: ScanLogItem = {
          id: String(Date.now()),
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          part_name: res.part.name,
          part_number: res.part.part_number,
          action: scanAction,
          quantity: scanQty,
          prev_qty: res.previous_quantity,
          new_qty: res.new_quantity,
          success: true,
          message: res.message
        };
        setScanLogs((prev) => [logItem, ...prev.slice(0, 7)]);

        // 4. Update local parts state immediately
        setParts((prev) =>
          prev.map((p) => (p.id === res.part.id ? { ...p, stock_quantity: res.new_quantity } : p))
        );

        // 5. Reload movements report
        loadMovementsReport();
      }
    } catch (err: any) {
      // Error buzzer audio
      playScannerBeep(false);

      const errMsg = err.message || `لم يتم العثور على صنف بالباركود: ${code}`;
      setLastScanResult({
        type: 'error',
        text: errMsg
      });

      const logItem: ScanLogItem = {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        part_name: 'صنف غير معرف',
        part_number: code,
        action: scanAction,
        quantity: scanQty,
        prev_qty: 0,
        new_qty: 0,
        success: false,
        message: errMsg
      };
      setScanLogs((prev) => [logItem, ...prev.slice(0, 7)]);
    } finally {
      setScanning(false);
      setBarcodeInput('');
      // Keep focus on input for the next scan immediately
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter parts based on search & dropdowns
  const filteredParts = useMemo(() => {
    return parts.filter((p) => {
      // Search 1: Name or code
      if (searchCodeOrName.trim()) {
        const q = searchCodeOrName.trim().toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCode = (p.part_number || '').toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }

      // Search 2: Brand or name
      if (searchBrandOrName.trim()) {
        const q = searchBrandOrName.trim().toLowerCase();
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchName = (p.name || '').toLowerCase().includes(q);
        if (!matchBrand && !matchName) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const pCat = (p.category || '').toLowerCase();
        const fCat = selectedCategory.toLowerCase();
        if (!pCat.includes(fCat) && !fCat.includes(pCat)) return false;
      }

      // Brand filter
      if (selectedBrand !== 'all') {
        const pBrand = (p.brand || '').toLowerCase();
        const fBrand = selectedBrand.toLowerCase();
        if (!pBrand.includes(fBrand) && !fBrand.includes(pBrand)) return false;
      }

      return true;
    });
  }, [parts, searchCodeOrName, searchBrandOrName, selectedCategory, selectedBrand]);

  // Paginated items
  const paginatedParts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredParts.slice(start, start + pageSize);
  }, [filteredParts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredParts.length / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 0. NAVIGATION SUBTABS BAR: المخزون / إضافة صنف / تقرير حركة المخزن        */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSwitchSubTab('stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'stock'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>قائمة المخزون والأصناف ({parts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchSubTab('add')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'add'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إضافة صنف وتكويد</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchSubTab('scanner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'scanner'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            <span>المسح السريع بالباركود</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold">
              سريع
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchSubTab('movements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeSubTab === 'movements'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-500" />
            <span>تقرير حركة المخزن 📋</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-200 font-mono font-bold">
              تتبع الصرف والعملاء
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'movements' ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={exportReportToCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
                title="تصدير ملف إكسل CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>تصدير Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReportPrintModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all cursor-pointer"
                title="طباعة التقرير"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة التقرير</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleSwitchSubTab('movements')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-300 dark:border-purple-800 transition-all cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-purple-500" />
              <span>عرض سجل الصرف والتوريد</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2.5 المسح السريع بالباركود (Quick Barcode Terminal Dedicated SubTab)     */}
      {/* ========================================================================= */}
      {activeSubTab === 'scanner' && (
        <div className="space-y-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <button
              type="button"
              onClick={() => handleSwitchSubTab('stock')}
              className="hover:text-blue-500 transition-colors cursor-pointer"
            >
              المخزون
            </button>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-blue-600 dark:text-blue-400 font-bold">المسح السريع بالباركود</span>
          </div>

          {/* Quick Stats of Current Scanning Session */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي عمليات المسح في الجلسة</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">{scanLogs.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                <ScanLine className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">قطع تم صرفها (-)</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
                  {scanLogs.filter(l => l.action === 'dispense').reduce((sum, l) => sum + l.quantity, 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
                <ArrowDownCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">قطع تم توريدها (+)</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {scanLogs.filter(l => l.action === 'receive').reduce((sum, l) => sum + l.quantity, 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Barcode Scanner Terminal Box */}
          <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Header & Modes */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner flex-shrink-0">
                  <ScanLine className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                      <span>محطة المسح السريع بالباركود</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono border border-blue-400/30 font-bold">
                        Live Barcode Scanner
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    اربط قارئ الباركود (USB أو لاسلكي) للمسح المباشر وتحديث المخزون فورياً في قاعدة البيانات
                  </p>
                </div>
              </div>

              {/* Action Mode Toggle (صرف -  أو  توريد +) & Stepper */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setScanAction('dispense');
                      if (barcodeInputRef.current) barcodeInputRef.current.focus();
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      scanAction === 'dispense'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span>صرف من المخزن (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScanAction('receive');
                      if (barcodeInputRef.current) barcodeInputRef.current.focus();
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      scanAction === 'receive'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    <span>توريد للمخزن (+)</span>
                  </button>
                </div>

                {/* Optional Customer Selector when dispensing */}
                {scanAction === 'dispense' && (
                  <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 gap-2 text-xs">
                    <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>العميل:</span>
                    </span>
                    <select
                      value={scanCustomerId}
                      onChange={(e) => setScanCustomerId(e.target.value)}
                      className="bg-transparent text-white font-medium focus:outline-none text-xs max-w-[140px] cursor-pointer"
                    >
                      <option value="" className="bg-slate-900 text-slate-300">
                        عام (بدون عميل)
                      </option>
                      {customersList.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                          {c.full_name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quantity Stepper */}
                <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 gap-1.5 text-xs">
                  <span className="text-[11px] text-slate-400 font-bold ml-1">الكمية:</span>
                  <button
                    type="button"
                    onClick={() => setScanQty((q) => Math.max(1, q - 1))}
                    className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-mono font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={scanQty}
                    onChange={(e) => setScanQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-9 bg-transparent text-center font-mono font-black text-white focus:outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setScanQty((q) => q + 1)}
                    className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-mono font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Scan Barcode Input & Scanner Listener */}
            <form onSubmit={handleBarcodeSubmit} className="mt-5 flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <ScanLine className="w-5 h-5 text-blue-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="امسح الباركود بجهاز القارئ الآن (أو اكتب الكود واضغط Enter)..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-blue-500/50 rounded-xl pr-11 pl-4 py-3.5 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 font-mono font-bold tracking-wider shadow-inner"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={scanning || !barcodeInput.trim()}
                className={`px-7 py-3.5 rounded-xl text-xs sm:text-sm font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
                  scanAction === 'receive'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                }`}
              >
                <span>{scanAction === 'receive' ? 'توريد بالباركود (+)' : 'صرف بالباركود (-)'}</span>
                {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
              </button>
            </form>

            {/* Live Audio & Visual Flash Result */}
            {lastScanResult && (
              <div
                className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm animate-in slide-in-from-top-2 duration-200 ${
                  lastScanResult.type === 'success'
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2.5 font-bold">
                  {lastScanResult.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 stroke-[2.5]" />
                  )}
                  <span>{lastScanResult.text}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-300 font-mono flex items-center gap-1 bg-black/30 px-2 py-1 rounded-md">
                    <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>تأكيد صوتي (Beep)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLastScanResult(null)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Scans History Feed Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                <span>سجل عمليات المسح المنفذة في هذه الجلسة ({scanLogs.length})</span>
              </h4>
              {scanLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScanLogs([])}
                  className="text-xs text-slate-400 hover:text-rose-500 font-bold transition-colors cursor-pointer"
                >
                  مسح السجل المؤقت
                </button>
              )}
            </div>

            {scanLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <ScanLine className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  لم يتم مسح أي صنف بعد في هذه الجلسة
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  قم بتوجيه قارئ الباركود على ملصق القطعة لمسحها وتعديل رصيدها مباشرة
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="py-2.5 px-3">الوقت</th>
                      <th className="py-2.5 px-3">اسم الصنف</th>
                      <th className="py-2.5 px-3">الباركود / الكود</th>
                      <th className="py-2.5 px-3 text-center">العملية</th>
                      <th className="py-2.5 px-3 text-center">الكمية</th>
                      <th className="py-2.5 px-3 text-center">الرصيد في المخزن</th>
                      <th className="py-2.5 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {scanLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{log.time}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{log.part_name}</td>
                        <td className="py-2.5 px-3 font-mono text-blue-500 font-bold">{log.part_number}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              log.action === 'receive'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {log.action === 'receive' ? 'توريد للمخزن (+)' : 'صرف من المخزن (-)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-sm">
                          {log.action === 'receive' ? `+${log.quantity}` : `-${log.quantity}`}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500 dark:text-slate-400">
                          {log.prev_qty} ➔ <strong className="text-slate-900 dark:text-white">{log.new_qty}</strong>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>تم الحفظ</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Barcode Device Usage Help Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>💡 ملاحظات تشغيل قارئ الباركود (Barcode Gun / Scanner):</span>
            </p>
            <ul className="list-disc list-inside space-y-1 pr-2">
              <li>يدعم النظام كافة أجهزة الباركود القياسية (USB السلكية، أو اللاسلكية Wireless 2.4G، أو البلوتوث) دون الحاجة لتثبيت أي برامج تعريف.</li>
              <li>بمجرد توجيه القارئ على كود القطعة، يُرسل القارئ الأحرف مصحوبة بمفتاح (Enter)، ليتم تعديل المخزون في قاعدة البيانات فوراً.</li>
              <li>يمكنك التبديل بين وضع الصرف ووضع التوريد في أي وقت بالضغط على الأزرار أعلاه.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. إضافة صنف جديد (Add Part View matching User's Exact Screenshot)       */}
      {/* ========================================================================= */}
      {activeSubTab === 'add' && (
        <div className="space-y-5">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <button
              type="button"
              onClick={() => handleSwitchSubTab('stock')}
              className="hover:text-blue-500 transition-colors cursor-pointer"
            >
              المخزون
            </button>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-200">إضافة صنف</span>
          </div>

          {/* Header Title with Blue Plus Circle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                <Plus className="w-5 h-5 stroke-[3]" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                إضافة صنف جديد
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Barcode Label Print trigger if code is entered */}
              {formData.part_number && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPart({
                      id: 'preview',
                      name: formData.name || 'معاينة الصنف',
                      part_number: formData.part_number,
                      category: formData.category || 'عام',
                      brand: formData.brand || 'وكالة',
                      sale_price: Number(formData.sale_price) || 0,
                      cost_price: Number(formData.cost_price) || 0,
                      stock_quantity: Number(formData.stock_quantity) || 0,
                      min_stock_alert: 2,
                      storage_location: formData.storage_location || 'الرف العام',
                      type: 'Original',
                      warranty_months: 6
                    });
                    setShowBarcodeModal(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3.5 py-1.5 rounded-lg border border-blue-300 dark:border-blue-500/30 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة ملصق التكويد 🖨️</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSwitchSubTab('stock')}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 transition-all cursor-pointer"
              >
                عرض قائمة المخزون ({parts.length})
              </button>
            </div>
          </div>

          {/* Main Add Part Form */}
          <form onSubmit={handleCreatePart} className="space-y-5">
            {/* Card 1: بيانات الصنف الأساسية */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-black text-sm">
                <FileText className="w-4 h-4 text-blue-500 stroke-[2.5]" />
                <span>بيانات الصنف الأساسية</span>
              </div>

              {/* Row 1: اسم الصنف *  |  كود الصنف * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم الصنف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: فلتر زيت"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      كود الصنف <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateCode()}
                      disabled={generatingCode}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      <span>{generatingCode ? 'جاري التوليد...' : 'توليد كود تلقائي'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="مثال: FZ-001"
                    value={formData.part_number}
                    onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono font-bold transition-all"
                  />
                </div>
              </div>

              {/* Row 2: الفئة *  |  العلامة التجارية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الفئة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setFormData({ ...formData, category: newCat });
                      if (!formData.part_number) {
                        handleAutoGenerateCode(newCat);
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    <option value="">اختر الفئة</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    العلامة التجارية
                  </label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    <option value="">اختر العلامة التجارية</option>
                    {BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: الوصف */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الوصف
                </label>
                <textarea
                  rows={3}
                  placeholder="أدخل وصف الصنف (اختياري)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium transition-all resize-y"
                />
              </div>
            </div>

            {/* Card 2: بيانات المخزون */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-black text-sm">
                <Package className="w-4 h-4 text-blue-500 stroke-[2.5]" />
                <span>بيانات المخزون</span>
              </div>

              {/* Row 1: الكمية الحالية *  |  الحد الأدنى للتنبيه */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الكمية الحالية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="مثال: 50"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الحد الأدنى للتنبيه
                  </label>
                  <input
                    type="number"
                    placeholder="مثال: 10"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono font-medium transition-all"
                  />
                </div>
              </div>

              {/* Row 2: سعر الشراء (جنيه)  |  سعر البيع (جنيه) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    سعر الشراء (جنيه)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="مثال: 120"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    سعر البيع (جنيه)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="مثال: 180"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono font-bold text-emerald-600 dark:text-emerald-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: معلومات إضافية */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-black text-sm">
                <Paperclip className="w-4 h-4 text-blue-500 stroke-[2.5]" />
                <span>معلومات إضافية</span>
              </div>

              {/* Row 1: المورد  |  موقع التخزين */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    المورد
                  </label>
                  <select
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    <option value="">اختر المورد</option>
                    {suppliers.map((s, idx) => (
                      <option key={idx} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    موقع التخزين
                  </label>
                  <select
                    value={formData.storage_location}
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    <option value="">اختر الموقع</option>
                    {STORAGE_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom Actions: إلغاء  |  حفظ الصنف */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleSwitchSubTab('stock')}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-600/25 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'جاري الحفظ والتكويد...' : 'حفظ الصنف'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. قائمة المخزون (Stock Table View matching User's Exact Screenshot)     */}
      {/* ========================================================================= */}
      {activeSubTab === 'stock' && (
        <div className="space-y-5">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="text-slate-400">المخزون</span>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-200">قائمة الأصناف</span>
          </div>

          {/* Header Title with Blue 3D Box Icon */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                <Boxes className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                قائمة المخزون
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSwitchSubTab('scanner')}
                className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="فتح محطة المسح السريع بالباركود"
              >
                <ScanLine className="w-4 h-4 text-blue-500" />
                <span>المسح بالباركود</span>
              </button>

              {/* Batch print all barcodes */}
              <button
                type="button"
                onClick={() => setShowBatchPrintModal(true)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
                title="طباعة شيت باركود كامل لجميع أصناف المخزون لتعليقها على الرفوف"
              >
                <Printer className="w-4 h-4 text-blue-500" />
                <span>طباعة شيت الباركود 🖨️</span>
              </button>

              <button
                onClick={() => handleSwitchSubTab('add')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>إضافة صنف جديد</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Box Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            {/* Top row: search inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="فلتر الصنف أو الكود..."
                  value={searchCodeOrName}
                  onChange={(e) => {
                    setSearchCodeOrName(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث باسم الصنف أو التجارية"
                  value={searchBrandOrName}
                  onChange={(e) => {
                    setSearchBrandOrName(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Bottom row: category and brand dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                >
                  <option value="all">الفئة: الكل</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                >
                  <option value="all">العلامة التجارية: الكل</option>
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Parts Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">جاري تحميل بيانات المخزون...</div>
            ) : filteredParts.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Boxes className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-base">لا توجد أصناف مطابقة للبحث</p>
                <p className="text-xs text-slate-400 mt-1">جرّب تغيير فلاتر البحث أو أضف صنفاً جديداً</p>
                <button
                  onClick={() => handleSwitchSubTab('add')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إضافة صنف جديد الآن
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">#</th>
                      <th className="py-3 px-4">اسم الصنف</th>
                      <th className="py-3 px-3">الكود</th>
                      <th className="py-3 px-3">الفئة</th>
                      <th className="py-3 px-3">العلامة التجارية</th>
                      <th className="py-3 px-3 text-center">الكمية</th>
                      <th className="py-3 px-3 text-center">الحد الأدنى</th>
                      <th className="py-3 px-3 font-mono">السعر (ج.م)</th>
                      <th className="py-3 px-4 text-center w-36">الإجراءات والباركود</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {paginatedParts.map((p, index) => {
                      const visual = getPartCategoryVisual(p.category, p.name);
                      const VisualIcon = visual.icon;
                      const globalIndex = (currentPage - 1) * pageSize + index + 1;
                      const isLowStock = p.stock_quantity <= p.min_stock_alert;

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* 1. # (Index) */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                            {globalIndex}
                          </td>

                          {/* 2. اسم الصنف مع الأيقونة/الصورة */}
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${visual.bg}`}
                                title={visual.label}
                              >
                                <VisualIcon className="w-4 h-4 stroke-[2]" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100 block leading-tight">
                                  {p.name}
                                </span>
                                {p.storage_location && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {p.storage_location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. الكود */}
                          <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                              {p.part_number}
                            </span>
                          </td>

                          {/* 4. الفئة */}
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                            {p.category || '-'}
                          </td>

                          {/* 5. العلامة التجارية */}
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                            {p.brand || '-'}
                          </td>

                          {/* 6. الكمية */}
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-black inline-block ${
                                isLowStock
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                                  : 'text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              {p.stock_quantity}
                            </span>
                          </td>

                          {/* 7. الحد الأدنى */}
                          <td className="py-3 px-3 text-center font-mono text-slate-500 dark:text-slate-400">
                            {p.min_stock_alert}
                          </td>

                          {/* 8. السعر (ج.م) */}
                          <td className="py-3 px-3 font-mono font-black text-slate-900 dark:text-emerald-400">
                            {p.sale_price}
                          </td>

                          {/* 9. الإجراءات (Blue Edit + Red Delete + Barcode Print) */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Button (Blue with pencil icon) */}
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
                                title="تعديل بيانات الصنف"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button (Red with trash icon) */}
                              <button
                                onClick={() => handleDeletePart(p.id, p.name)}
                                className="w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
                                title="حذف الصنف نهائياً"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Print Barcode Label Button */}
                              <button
                                onClick={() => {
                                  setSelectedPart(p);
                                  setShowBarcodeModal(true);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-500/20 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                                title="عرض وطباعة ملصق الباركود لهذا الصنف"
                              >
                                <Printer className="w-3 h-3 text-blue-500" />
                                <span>طباعة</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Footer & Pagination */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="font-bold">
                إجمالي الأصناف: <strong className="text-slate-900 dark:text-slate-100 font-mono">{filteredParts.length}</strong>
              </div>

              <div className="flex items-center gap-3">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1 font-medium">
                  <span>صفحة</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. تقرير حركة المخزن والتوريدات (Movements & Audit Report)                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'movements' && (
        <div className="space-y-6">
          {/* Breadcrumbs & Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <button
                  type="button"
                  onClick={() => handleSwitchSubTab('stock')}
                  className="hover:text-blue-500 transition-colors cursor-pointer"
                >
                  المخزون
                </button>
                <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-purple-600 dark:text-purple-300 font-bold">تقرير حركة المخزن</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-300 shadow-sm">
                  <FileSpreadsheet className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>تقرير حركة المخزن والتوريدات</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-400/20 font-bold">
                      سجل المتابعة والتدقيق
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تتبع تفصيلي لكل حركة: متى حدثت، من قام بها، ولصالح أي عميل أو سيارة تم الصرف
                  </p>
                </div>
              </div>
            </div>

            {/* Actions: Export, Print, Refresh */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadMovementsReport}
                disabled={reportLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${reportLoading ? 'animate-spin' : ''}`} />
                <span>تحديث</span>
              </button>

              <button
                type="button"
                onClick={exportReportToCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير Excel (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReportPrintModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/25 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة التقرير</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchSubTab('stock')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border border-slate-300 dark:border-slate-800 transition-all cursor-pointer"
              >
                العودة للأصناف
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                <History className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400">إجمالي الحركات المسجلة</p>
                <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {reportStats.total_movements} <span className="text-xs font-normal text-slate-400">حركة</span>
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <ArrowDownCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400">إجمالي المنصرف للعملاء</p>
                <h4 className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-0.5">
                  {reportStats.total_dispensed_qty} <span className="text-xs font-normal text-slate-400">قطعة</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  بقيمة: {reportStats.total_dispensed_value.toLocaleString('ar-EG')} ج.م
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <ArrowUpCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400">إجمالي الوارد والتوريدات</p>
                <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                  {reportStats.total_received_qty} <span className="text-xs font-normal text-slate-400">قطعة</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  بتكلفة: {reportStats.total_received_cost.toLocaleString('ar-EG')} ج.م
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400">العملاء المستفيدين</p>
                <h4 className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight mt-0.5">
                  {reportStats.unique_customers_count} <span className="text-xs font-normal text-slate-400">عميل</span>
                </h4>
                <p className="text-[10px] text-slate-400">مربوط بحركات صرف رسمية</p>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث باسم القطعة، الكود، اسم العميل، رقم السيارة، أو المسؤول..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadMovementsReport()}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              {/* Movement Type Filter */}
              <div>
                <select
                  value={reportMovementType}
                  onChange={(e) => setReportMovementType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-medium cursor-pointer"
                >
                  <option value="all">كل أنواع الحركات</option>
                  <option value="consumption">صرف للعملاء وأوامر العمل (-)</option>
                  <option value="purchase">توريد مشتريات للمخزن (+)</option>
                  <option value="adjustment">تسوية جردية</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <select
                  value={reportDateFilter}
                  onChange={(e) => setReportDateFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-medium cursor-pointer"
                >
                  <option value="all">كل التواريخ</option>
                  <option value="today">حركات اليوم فقط</option>
                  <option value="7days">آخر 7 أيام</option>
                  <option value="month">هذا الشهر الحالي</option>
                </select>
              </div>
            </div>

            {/* Customer Filter Dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-purple-500" />
                  <span>تصفية بالعميل:</span>
                </span>
                <select
                  value={reportCustomerFilter}
                  onChange={(e) => setReportCustomerFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-medium cursor-pointer max-w-xs"
                >
                  <option value="all">جميع العملاء</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-slate-400 text-[11px]">
                تم العثور على <span className="font-mono font-bold text-purple-600 dark:text-purple-300">{reportMovements.length}</span> حركة
              </div>
            </div>
          </div>

          {/* Movements Report Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">التاريخ والوقت</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">الصنف والتكويد</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">نوع الحركة</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">الكمية</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">مين اللى عملها (المسؤول)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">علشان أنهي عميل (المستفيد)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">سعر الوحدة والقيمة</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">الملاحظات والمرجع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {reportLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                          <span className="text-xs font-bold">جاري تحميل بيانات التقرير والحركات...</span>
                        </div>
                      </td>
                    </tr>
                  ) : reportMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <History className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            لا توجد حركات مخزنية مسجلة تطابق هذا الفلتر
                          </span>
                          <p className="text-xs text-slate-400">
                            جرب مسح باركود بالماسح السريع أو تغيير فلاتر البحث
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reportMovements.map((m) => {
                      const isDeduction = m.quantity < 0;
                      const absQty = Math.abs(m.quantity);
                      const unitVal = isDeduction ? (m.unit_price || m.unit_cost || 0) : (m.unit_cost || m.unit_price || 0);
                      const totalVal = absQty * unitVal;

                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* 1. التاريخ والوقت */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 font-mono text-xs text-slate-700 dark:text-slate-200 font-semibold">
                              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>{formatDateTime(m.created_at)}</span>
                            </div>
                          </td>

                          {/* 2. الصنف والتكويد */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 dark:text-slate-100">
                                {m.part_name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
                                  {m.part_number}
                                </span>
                                {m.part_category && (
                                  <span className="text-[10px] text-slate-400">
                                    {m.part_category}
                                  </span>
                                )}
                                {m.storage_location && (
                                  <span className="text-[10px] text-slate-400">
                                    • {m.storage_location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. نوع الحركة */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {m.movement_type === 'consumption' || isDeduction ? (
                              m.reference_type === 'work_order' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-300 dark:border-rose-800/40">
                                  <ArrowDownCircle className="w-3 h-3 text-rose-500" />
                                  <span>صرف لأمر عمل</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40">
                                  <ArrowDownCircle className="w-3 h-3 text-amber-500" />
                                  <span>صرف بالباركود</span>
                                </span>
                              )
                            ) : m.movement_type === 'purchase' || !isDeduction ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40">
                                <ArrowUpCircle className="w-3 h-3 text-emerald-500" />
                                <span>توريد مخزن (+)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-300">
                                <span>تسوية جرد</span>
                              </span>
                            )}
                          </td>

                          {/* 4. الكمية */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-block font-mono font-black text-sm px-2 py-0.5 rounded-lg ${
                                isDeduction
                                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                                  : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                              }`}
                            >
                              {isDeduction ? `−${absQty}` : `+${m.quantity}`} قطعة
                            </span>
                          </td>

                          {/* 5. مين اللى عملها (المسؤول) */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-purple-600 dark:text-purple-300 border border-slate-200 dark:border-slate-700">
                                {(m.created_by_name || 'م')[0]}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                  {m.created_by_name || 'مدير الورشة'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {m.created_by_role === 'owner' ? 'المالك' : m.created_by_role === 'mechanic' ? 'فني' : 'مسؤول النظام'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 6. علشان أنهي عميل (العميل المستفيد) */}
                          <td className="py-3.5 px-4">
                            {m.customer_name ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{m.customer_name}</span>
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  {m.customer_phone && <span>📞 {m.customer_phone}</span>}
                                  {m.vehicle_plate && (
                                    <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-300/40">
                                      🚗 {m.vehicle_plate}
                                    </span>
                                  )}
                                  {m.work_order_number && (
                                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                                      📋 {m.work_order_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                {isDeduction ? 'صرف عام بدون عميل' : 'توريد مخزني عام'}
                              </span>
                            )}
                          </td>

                          {/* 7. سعر الوحدة والقيمة */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col font-mono">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {totalVal.toLocaleString('ar-EG')} ج.م
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({unitVal.toLocaleString('ar-EG')} × {absQty})
                              </span>
                            </div>
                          </td>

                          {/* 8. الملاحظات والمرجع */}
                          <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            <span title={m.notes || '-'}>
                              {m.notes || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Edit Part Modal                                                          */}
      {/* ========================================================================= */}
      {showEditModal && editingPart && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  تعديل بيانات الصنف: {editingPart.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePart} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الصنف *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPart.name}
                    onChange={(e) => setEditingPart({ ...editingPart, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    كود الصنف *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPart.part_number}
                    onChange={(e) => setEditingPart({ ...editingPart, part_number: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الفئة
                  </label>
                  <select
                    value={editingPart.category || ''}
                    onChange={(e) => setEditingPart({ ...editingPart, category: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="">اختر الفئة</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    العلامة التجارية
                  </label>
                  <select
                    value={editingPart.brand || ''}
                    onChange={(e) => setEditingPart({ ...editingPart, brand: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="">اختر العلامة</option>
                    {BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الكمية الحالية
                  </label>
                  <input
                    type="number"
                    value={editingPart.stock_quantity}
                    onChange={(e) => setEditingPart({ ...editingPart, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سعر الشراء (ج.م)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingPart.cost_price}
                    onChange={(e) => setEditingPart({ ...editingPart, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سعر البيع (ج.م)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingPart.sale_price}
                    onChange={(e) => setEditingPart({ ...editingPart, sale_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono font-bold text-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    موقع التخزين (الرف)
                  </label>
                  <input
                    type="text"
                    value={editingPart.storage_location || ''}
                    onChange={(e) => setEditingPart({ ...editingPart, storage_location: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المورد
                  </label>
                  <input
                    type="text"
                    value={editingPart.supplier_name || ''}
                    onChange={(e) => setEditingPart({ ...editingPart, supplier_name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الوصف
                </label>
                <textarea
                  rows={2}
                  value={editingPart.description || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, description: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'جاري الحفظ...' : 'تأكيد التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE BARCODE & SHELF LABEL MODAL (STANDARDS-COMPLIANT CODE 128)      */}
      {/* ========================================================================= */}
      {showBarcodeModal && selectedPart && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="font-black text-sm sm:text-base text-white">
                  ملصق باركود وتكويد الصنف (جاهز للطباعة)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Thermal Label Card (White background, standard thermal paper 50x30mm or 60x40mm) */}
              <div
                id="thermal-barcode-sticker"
                className="bg-white text-slate-950 p-5 rounded-2xl border-2 border-black shadow-lg space-y-3 font-sans text-center print-card-content"
              >
                {/* Workshop Name & Item Header */}
                <div className="border-b border-slate-300 pb-2">
                  <p className="text-[10px] font-black tracking-wider text-slate-600">مركز صيانة السيارات</p>
                  <h4 className="font-black text-base text-slate-950 mt-0.5 leading-tight">
                    {selectedPart.name}
                  </h4>
                  <p className="text-xs text-slate-700 font-bold mt-0.5">
                    {selectedPart.brand || selectedPart.category}
                  </p>
                </div>

                {/* Scannable Code 128 Barcode */}
                <div className="py-2 flex flex-col items-center justify-center bg-white">
                  <BarcodeSvg
                    value={selectedPart.part_number}
                    height={52}
                    barWidth={1.8}
                    showText={true}
                  />
                </div>

                {/* Shelf Location & Sale Price */}
                <div className="flex items-center justify-between border-t border-slate-300 pt-2 text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-600 font-bold block">موقع الرف:</span>
                    <strong className="font-mono text-slate-950 text-xs font-black">
                      {selectedPart.storage_location || 'الرف العام'}
                    </strong>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-slate-600 font-bold block">سعر البيع:</span>
                    <strong className="font-mono text-emerald-800 text-base font-black">
                      {selectedPart.sale_price} ج.م
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 no-print">
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedPart.part_number)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  <span>{copiedCode ? 'تم النسخ!' : 'نسخ كود SKU'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-600/30 cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة ملصق الباركود الآن 🖨️</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center no-print font-medium">
                💡 هذا الباركود مطابق للمواصفات القياسية الدولية (Code 128) ويمكن قراءته فورياً بواسطة أي ماسح باركود ليزري أو كاميرا.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH PRINT ALL BARCODES SHEET MODAL                                      */}
      {/* ========================================================================= */}
      {showBatchPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="font-black text-base text-white">
                  شيت ملصقات الباركود المجمعة لجميع الأصناف ({parts.length} صنف)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الشيت بالكامل (A4 / ملصقات)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBatchPrintModal(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-white p-6 rounded-2xl text-slate-950">
                {parts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 border-2 border-black rounded-xl text-center space-y-1.5 font-sans bg-white"
                  >
                    <p className="text-[10px] font-black text-slate-800 truncate">{p.name}</p>
                    <p className="text-[9px] text-slate-600 font-bold">{p.brand || p.category}</p>
                    <div className="py-1 flex justify-center">
                      <BarcodeSvg value={p.part_number} height={38} barWidth={1.2} showText={true} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] border-t border-slate-300 pt-1 font-mono">
                      <span className="text-slate-600">{p.storage_location || 'الرف'}</span>
                      <strong className="text-emerald-700 font-black">{p.sale_price} ج.م</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. OFFICIAL STOCK MOVEMENTS AUDIT REPORT PRINT MODAL (A4 PRINTABLE)       */}
      {/* ========================================================================= */}
      {showReportPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print-backdrop">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] print-report-wrapper">
            {/* Modal Controls (Hidden in Print) */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-black text-base text-white">
                    معاينة طباعة تقرير حركة المخزن والتوريدات
                  </h3>
                  <p className="text-xs text-slate-400">
                    تقرير رسمي جاهز للطباعة على ورق A4 متوافق مع كافة طابعات الليزر (مثل HP LaserJet)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن (طابعة / PDF) 🖨️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportPrintModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body (A4 High-Contrast Black & White) */}
            <div
              id="printable-stock-report"
              className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-950 font-sans print-report-container"
            >
              {/* Report Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      نظام إدارة ورشة السيارات | Workshop Management
                    </h1>
                    <h2 className="text-base font-bold text-purple-900 mt-1">
                      تقرير حركة المخزن وسجل تتبع الصرف والتوريد
                    </h2>
                  </div>
                  <div className="text-left text-xs font-mono font-bold text-slate-700 space-y-0.5">
                    <p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                    <p>الوقت: {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                    <p>إجمالي الحركات: {reportMovements.length}</p>
                  </div>
                </div>

                {/* Filter info badges */}
                <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-slate-200 text-xs text-slate-700 font-bold">
                  <span>نوع الحركات: {reportMovementType === 'consumption' ? 'صرف فقط (-)' : reportMovementType === 'purchase' ? 'توريد فقط (+)' : 'جميع الحركات'}</span>
                  <span>•</span>
                  <span>العميل: {reportCustomerFilter !== 'all' ? (customersList.find((c) => c.id === reportCustomerFilter)?.full_name || reportCustomerFilter) : 'جميع العملاء'}</span>
                  <span>•</span>
                  <span>الفترة: {reportDateFilter === 'today' ? 'اليوم' : reportDateFilter === '7days' ? 'آخر 7 أيام' : reportDateFilter === 'month' ? 'الشهر الحالي' : 'كل الفترات'}</span>
                </div>
              </div>

              {/* Summary Stats Strip */}
              <div className="grid grid-cols-4 gap-3 mb-5 p-3 bg-slate-100 rounded-xl border border-slate-300 text-center">
                <div>
                  <span className="text-[10px] text-slate-600 block font-bold">إجمالي الحركات</span>
                  <strong className="text-base font-black font-mono text-slate-900">{reportStats.total_movements}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block font-bold">إجمالي المنصرف</span>
                  <strong className="text-base font-black font-mono text-rose-800">{reportStats.total_dispensed_qty} قطعة</strong>
                  <span className="text-[10px] text-slate-600 block font-mono">({reportStats.total_dispensed_value.toLocaleString('ar-EG')} ج.م)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block font-bold">إجمالي التوريد</span>
                  <strong className="text-base font-black font-mono text-emerald-800">{reportStats.total_received_qty} قطعة</strong>
                  <span className="text-[10px] text-slate-600 block font-mono">({reportStats.total_received_cost.toLocaleString('ar-EG')} ج.م)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block font-bold">العملاء المستفيدين</span>
                  <strong className="text-base font-black font-mono text-blue-900">{reportStats.unique_customers_count} عميل</strong>
                </div>
              </div>

              {/* Report Table */}
              <table className="w-full text-right text-xs border border-slate-900 border-collapse">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-900 text-slate-900 font-black">
                    <th className="p-2 border border-slate-900 text-center w-8">#</th>
                    <th className="p-2 border border-slate-900 whitespace-nowrap">التاريخ والوقت</th>
                    <th className="p-2 border border-slate-900">الصنف والتكويد</th>
                    <th className="p-2 border border-slate-900 text-center whitespace-nowrap">نوع الحركة</th>
                    <th className="p-2 border border-slate-900 text-center whitespace-nowrap">الكمية</th>
                    <th className="p-2 border border-slate-900 whitespace-nowrap">من قام بالحركة (المسؤول)</th>
                    <th className="p-2 border border-slate-900 whitespace-nowrap">العميل المستفيد / السيارة</th>
                    <th className="p-2 border border-slate-900 text-center whitespace-nowrap">سعر الوحدة</th>
                    <th className="p-2 border border-slate-900 text-center whitespace-nowrap">الإجمالي</th>
                    <th className="p-2 border border-slate-900">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {reportMovements.map((m, idx) => {
                    const isDeduction = m.quantity < 0;
                    const absQty = Math.abs(m.quantity);
                    const unitVal = isDeduction ? (m.unit_price || m.unit_cost || 0) : (m.unit_cost || m.unit_price || 0);
                    const totalVal = absQty * unitVal;

                    return (
                      <tr key={m.id} className="border-b border-slate-800 text-[11px] leading-relaxed">
                        <td className="p-2 border border-slate-800 text-center font-mono font-bold">{idx + 1}</td>
                        <td className="p-2 border border-slate-800 whitespace-nowrap font-mono">{formatDateTime(m.created_at)}</td>
                        <td className="p-2 border border-slate-800 font-bold">
                          <div>{m.part_name}</div>
                          <div className="font-mono text-[10px] text-slate-600">{m.part_number}</div>
                        </td>
                        <td className="p-2 border border-slate-800 text-center font-bold whitespace-nowrap">
                          {isDeduction ? (
                            <span className="text-rose-800 font-bold">صرف {m.reference_type === 'work_order' ? 'أمر عمل' : ''}</span>
                          ) : (
                            <span className="text-emerald-800 font-bold">توريد مخزن</span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-800 text-center font-black font-mono whitespace-nowrap">
                          {isDeduction ? `-${absQty}` : `+${m.quantity}`}
                        </td>
                        <td className="p-2 border border-slate-800 whitespace-nowrap">
                          <span className="font-bold">{m.created_by_name || 'مدير الورشة'}</span>
                          <span className="text-[10px] text-slate-500 block">({m.created_by_role || 'مسؤول'})</span>
                        </td>
                        <td className="p-2 border border-slate-800">
                          {m.customer_name ? (
                            <div>
                              <strong className="block text-slate-900">{m.customer_name}</strong>
                              <span className="text-[10px] text-slate-600 font-mono">
                                {m.customer_phone ? `📞 ${m.customer_phone} ` : ''}
                                {m.vehicle_plate ? `🚗 ${m.vehicle_plate} ` : ''}
                                {m.work_order_number ? `📋 ${m.work_order_number}` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">
                              {isDeduction ? 'صرف عام بدون عميل' : 'توريد للمخزن العام'}
                            </span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-800 text-center font-mono whitespace-nowrap">
                          {unitVal.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="p-2 border border-slate-800 text-center font-mono font-bold whitespace-nowrap">
                          {totalVal.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="p-2 border border-slate-800 text-[10px] text-slate-700">
                          {m.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Signatures Footer */}
              <div className="grid grid-cols-3 gap-6 pt-10 mt-8 border-t-2 border-slate-400 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">أمين المخزن</p>
                  <p className="text-[11px] text-slate-400 mt-6">............................................</p>
                </div>
                <div>
                  <p className="font-bold text-slate-800">مسؤول الصرف / الفني</p>
                  <p className="text-[11px] text-slate-400 mt-6">............................................</p>
                </div>
                <div>
                  <p className="font-bold text-slate-800">اعتماد إدارة الورشة</p>
                  <p className="text-[11px] text-slate-400 mt-6">............................................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
