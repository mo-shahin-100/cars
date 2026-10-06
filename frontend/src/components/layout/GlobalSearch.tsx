import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  Car,
  AlertCircle,
  ClipboardList,
  Cpu,
  ChevronLeft,
  Loader2,
  Clock,
  Phone,
  Tag,
  Hash
} from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface GlobalSearchProps {
  onNavigate: (tab: string, targetId?: string, searchParam?: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'customers' | 'vehicles' | 'visits' | 'workOrders' | 'diagnosticCodes'>('all');
  const [results, setResults] = useState<{
    customers: any[];
    vehicles: any[];
    visits: any[];
    workOrders: any[];
    diagnosticCodes: any[];
    totalResults: number;
  }>({
    customers: [],
    vehicles: [],
    visits: [],
    workOrders: [],
    diagnosticCodes: [],
    totalResults: 0
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global hotkey Ctrl+K or / to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        customers: [],
        vehicles: [],
        visits: [],
        workOrders: [],
        diagnosticCodes: [],
        totalResults: 0
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.globalSearch(query.trim());
        if (res.success && res.data) {
          setResults(res.data);
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (tab: string, targetId?: string, searchParam?: string) => {
    setIsOpen(false);
    onNavigate(tab, targetId, searchParam);
  };

  const statusLabels: Record<string, { text: string; color: string }> = {
    received: { text: 'استلام جديد', color: 'bg-slate-700 text-slate-200' },
    diagnosing: { text: 'فحص كمبيوتر', color: 'bg-purple-500/20 text-purple-400' },
    in_repair: { text: 'قيد الإصلاح', color: 'bg-amber-500/20 text-amber-400' },
    waiting_parts: { text: 'انتظار قطع', color: 'bg-rose-500/20 text-rose-400' },
    ready: { text: 'جاهزة للتسليم', color: 'bg-emerald-500/20 text-emerald-400' },
    delivered: { text: 'تم التسليم', color: 'bg-sky-500/20 text-sky-400' },
    cancelled: { text: 'ملغية', color: 'bg-red-500/20 text-red-400' },
    new: { text: 'أمر جديد', color: 'bg-slate-700 text-slate-200' },
    in_progress: { text: 'جاري العمل', color: 'bg-amber-500/20 text-amber-400' },
    completed: { text: 'مكتمل', color: 'bg-emerald-500/20 text-emerald-400' },
  };

  const hasAnyResults = results.totalResults > 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md lg:max-w-xl mx-2 md:mx-4">
      {/* Search Input Box */}
      <div className={`relative flex items-center rounded-2xl transition-all duration-200 border ${
        isOpen
          ? isDark
            ? 'bg-[#0f172a] border-sky-500/60 shadow-lg shadow-sky-500/10 ring-2 ring-sky-500/20'
            : 'bg-white border-sky-500 shadow-md ring-2 ring-sky-500/20'
          : isDark
            ? 'bg-white/[0.05] border-white/[0.1] hover:bg-white/[0.08] hover:border-white/20'
            : 'bg-slate-100 border-slate-200 hover:bg-slate-200/70 hover:border-slate-300'
      }`}>
        <div className="pr-3 pl-2 flex items-center pointer-events-none text-slate-400">
          {loading ? (
            <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder="بحث سريع: اسم العميل، لوحة أو سيارة، عطل أو شكوى..."
          className={`w-full py-2 pl-16 pr-1 text-xs md:text-sm bg-transparent focus:outline-none placeholder-slate-400 font-medium ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults({
                customers: [],
                vehicles: [],
                visits: [],
                workOrders: [],
                diagnosticCodes: [],
                totalResults: 0
              });
              inputRef.current?.focus();
            }}
            className="p-1.5 ml-1 text-slate-400 hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-md bg-white/[0.08] border border-white/[0.1] text-[10px] text-slate-400 font-mono select-none">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        )}
      </div>

      {/* Dropdown Floating Results Panel */}
      {isOpen && (
        <div className={`absolute top-full mt-2 right-0 left-0 max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl border backdrop-blur-2xl z-50 flex flex-col ${
          isDark
            ? 'bg-[#0a0f1d]/95 border-white/[0.12] text-slate-200 shadow-sky-950/40'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300'
        }`}>
          {/* Filter Pills Header */}
          <div className={`p-2.5 border-b flex items-center gap-1.5 overflow-x-auto text-xs ${
            isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
          }`}>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                  : isDark ? 'text-slate-400 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل {hasAnyResults ? `(${results.totalResults})` : ''}
            </button>

            {results.customers.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('customers')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                  filterType === 'customers'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : isDark ? 'text-slate-400 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                العملاء ({results.customers.length})
              </button>
            )}

            {results.vehicles.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('vehicles')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                  filterType === 'vehicles'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : isDark ? 'text-slate-400 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                السيارات ({results.vehicles.length})
              </button>
            )}

            {results.visits.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('visits')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                  filterType === 'visits'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : isDark ? 'text-slate-400 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                الأعطال والشكاوى ({results.visits.length})
              </button>
            )}

            {results.workOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('workOrders')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                  filterType === 'workOrders'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : isDark ? 'text-slate-400 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                أوامر الشغل ({results.workOrders.length})
              </button>
            )}

            {results.diagnosticCodes.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('diagnosticCodes')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                  filterType === 'diagnosticCodes'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : isDark ? 'text-slate-400 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                أكواد الفحص DTC ({results.diagnosticCodes.length})
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="p-2 space-y-3">
            {/* If no query */}
            {!query.trim() && (
              <div className="p-6 text-center text-xs text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-50" />
                <p className="font-bold">ابدأ بكتابة اسم العميل، رقم الهاتف، رقم اللوحة، نوع السيارة، أو وصف العطل...</p>
                <div className="flex flex-wrap justify-center gap-2 mt-3 text-[11px]">
                  <span className="px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08]">أمثلة: محمد، 123، لانسر، تفتفة، زيت، P0301</span>
                </div>
              </div>
            )}

            {/* If loading */}
            {loading && query.trim() && (
              <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>جاري البحث في قاعدة البيانات...</span>
              </div>
            )}

            {/* If searched and no results */}
            {!loading && query.trim() && !hasAnyResults && (
              <div className="p-6 text-center text-xs text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-60" />
                <p className="font-bold text-sm text-slate-300">لم يتم العثور على نتائج تطابق: "{query}"</p>
                <p className="text-slate-500 mt-1">تأكد من صحة الحروف أو جرب كلمة بحث أخرى (اسم، هاتف، لوحة، أو عطل)</p>
              </div>
            )}

            {/* 1. CUSTOMERS SECTION */}
            {(filterType === 'all' || filterType === 'customers') && results.customers.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-black text-sky-400">
                  <User className="w-3.5 h-3.5" />
                  <span>العملاء ({results.customers.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {results.customers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelect('customers', c.id, c.full_name)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                        isDark ? 'hover:bg-white/[0.06] bg-white/[0.02]' : 'hover:bg-sky-50 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-black text-sm">
                          {c.full_name?.charAt(0) || 'ع'}
                        </div>
                        <div>
                          <div className="text-xs md:text-sm font-bold flex items-center gap-2">
                            <span>{c.full_name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 font-mono">
                              {c.customer_code}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-emerald-400" />
                              {c.phone}
                            </span>
                            {c.total_balance_due > 0 && (
                              <span className="text-rose-400 font-bold">
                                مديونية: {c.total_balance_due.toLocaleString()} ج.م
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. VEHICLES SECTION */}
            {(filterType === 'all' || filterType === 'vehicles') && results.vehicles.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-black text-emerald-400">
                  <Car className="w-3.5 h-3.5" />
                  <span>السيارات ({results.vehicles.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {results.vehicles.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleSelect('vehicles', v.id, v.plate_number)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                        isDark ? 'hover:bg-white/[0.06] bg-white/[0.02]' : 'hover:bg-emerald-50 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs md:text-sm font-bold flex items-center gap-2">
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono text-xs">
                              {v.plate_number}
                            </span>
                            <span>{v.make} {v.model} ({v.year})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                            {v.owner_name && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                المالك: <strong className="text-slate-300">{v.owner_name}</strong>
                              </span>
                            )}
                            {v.current_odometer > 0 && (
                              <span>العداد: {v.current_odometer.toLocaleString()} كم</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. VISITS & FAULTS / COMPLAINTS SECTION */}
            {(filterType === 'all' || filterType === 'visits') && results.visits.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-black text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>الأعطال والشكاوى والزيارات ({results.visits.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {results.visits.map((vi) => (
                    <div
                      key={vi.id}
                      onClick={() => handleSelect('visits', vi.id, vi.customer_complaint)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                        isDark ? 'hover:bg-white/[0.06] bg-white/[0.02]' : 'hover:bg-amber-50 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm font-bold text-amber-300 truncate">
                            العطل: {vi.customer_complaint || 'صيانة عامة'}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center flex-wrap gap-2 mt-0.5">
                            <span className="font-mono text-slate-300 bg-slate-800/80 px-1.5 py-0.2 rounded">
                              {vi.plate_number}
                            </span>
                            <span>{vi.customer_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${statusLabels[vi.status]?.color || 'bg-slate-800 text-slate-300'}`}>
                              {statusLabels[vi.status]?.text || vi.status}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              #{vi.visit_number}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. WORK ORDERS SECTION */}
            {(filterType === 'all' || filterType === 'workOrders') && results.workOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-black text-indigo-400">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>أوامر العمل والإصلاح ({results.workOrders.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {results.workOrders.map((wo) => (
                    <div
                      key={wo.id}
                      onClick={() => handleSelect('work-orders', wo.id, wo.description)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                        isDark ? 'hover:bg-white/[0.06] bg-white/[0.02]' : 'hover:bg-indigo-50 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm font-bold text-slate-100 truncate">
                            {wo.description}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center flex-wrap gap-2 mt-0.5">
                            <span className="font-mono text-slate-300 bg-slate-800/80 px-1.5 py-0.2 rounded">
                              {wo.plate_number}
                            </span>
                            <span>{wo.customer_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${statusLabels[wo.status]?.color || 'bg-slate-800 text-slate-300'}`}>
                              {statusLabels[wo.status]?.text || wo.status}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              #{wo.order_number}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. DIAGNOSTICS DTC CODES SECTION */}
            {(filterType === 'all' || filterType === 'diagnosticCodes') && results.diagnosticCodes.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-black text-rose-400">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>فحص الكمبيوتر وأكواد الأعطال DTC ({results.diagnosticCodes.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {results.diagnosticCodes.map((dtc) => (
                    <div
                      key={dtc.id}
                      onClick={() => handleSelect('diagnostics', dtc.id, dtc.dtc_code)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                        isDark ? 'hover:bg-white/[0.06] bg-white/[0.02]' : 'hover:bg-rose-50 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-mono font-black text-xs shrink-0">
                          DTC
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs md:text-sm font-bold flex items-center gap-2">
                            <span className="font-mono text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded font-black">
                              {dtc.dtc_code}
                            </span>
                            <span className="text-slate-200 truncate">{dtc.description}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {dtc.system && <span>المنظومة: {dtc.system}</span>}
                            <span className="font-mono text-slate-300">السيارة: {dtc.plate_number}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Footer */}
          <div className={`p-2 px-3 border-t text-[11px] flex items-center justify-between ${
            isDark ? 'border-white/[0.08] text-slate-500' : 'border-slate-100 text-slate-400'
          }`}>
            <span>اضغط على أي نتيجة للانتقال المباشر إليها</span>
            <span>Esc للإغلاق</span>
          </div>
        </div>
      )}
    </div>
  );
};
