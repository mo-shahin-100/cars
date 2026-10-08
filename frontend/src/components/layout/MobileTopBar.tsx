import React, { useState } from 'react';
import {
  Menu,
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  Moon,
  Sun,
  Wrench,
  X,
  Bell,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSync } from '../../context/SyncContext';
import { GlobalSearch } from './GlobalSearch';

interface MobileTopBarProps {
  activeTab: string;
  onOpenSidebar: () => void;
  onNavigate?: (tab: string, targetId?: string, searchParam?: string) => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  activeTab,
  onOpenSidebar,
  onNavigate
}) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { status, offlineQueueCount } = useSync();
  const isDark = theme === 'dark';
  const [showSearchModal, setShowSearchModal] = useState(false);

  const tabTitles: Record<string, string> = {
    dashboard: 'لوحة التحكم',
    customers: 'العملاء',
    vehicles: 'السيارات',
    visits: 'الزيارات',
    maintenance: 'الصيانة الدورية',
    repairs: 'أوامر التصليح',
    engine_overhaul: 'عمرة المحرك',
    diagnostics: 'فحص الكمبيوتر',
    'work-orders': 'أوامر العمل',
    mechanics: 'الميكانيكيون',
    inventory: 'المخزون',
    inventory_stock: 'المخزون',
    inventory_add: 'إضافة صنف',
    inventory_scanner: 'مسح الباركود',
    inventory_movements: 'حركة المخزن',
    purchases: 'المشتريات',
    fluids: 'الزيوت والسوائل',
    invoices: 'الفواتير',
    expenses: 'المصروفات',
    reports: 'التقارير',
    notifications: 'التنبيهات',
    users: 'المستخدمون',
    settings: 'الإعدادات',
    mechanic_station: 'محطة الفني'
  };

  return (
    <>
      <header
        className={`w-full h-14 px-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl border-b transition-colors select-none ${
          isDark
            ? 'bg-[#0a0f1d]/90 border-white/[0.08] text-white shadow-lg shadow-black/20'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        {/* Right side: Menu button + Avatar + Brand & Title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenSidebar}
            className={`p-2 rounded-xl transition-all active:scale-95 border ${
              isDark
                ? 'bg-white/[0.05] hover:bg-white/[0.1] text-sky-400 border-white/[0.08]'
                : 'bg-slate-100 hover:bg-slate-200 text-sky-600 border-slate-200'
            }`}
            title="القائمة الجانبية"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-sky-400 p-[1px] shrink-0 shadow-sm relative">
              <div
                className={`w-full h-full rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-[#0a0f1d]' : 'bg-white'
                }`}
              >
                <Wrench className="w-4 h-4 text-sky-400" />
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0f1d]"
                title="متصل بالخادم"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-white truncate leading-tight">
                  ورشة السيارات
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-sky-500/15 text-sky-400 border border-sky-400/25 shrink-0">
                  {tabTitles[activeTab] || 'الرئيسية'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                {user?.full_name || 'مهندس الورشة'}
              </p>
            </div>
          </div>
        </div>

        {/* Left side: Search trigger, Theme toggle, Sync badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Search Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className={`p-2 rounded-xl transition-all active:scale-95 border ${
              isDark
                ? 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border-white/[0.08]'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="بحث شامل في النظام"
          >
            <Search className="w-4 h-4 text-sky-400" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all active:scale-95 border ${
              isDark
                ? 'bg-white/[0.05] hover:bg-white/[0.1] text-amber-400 border-white/[0.08]'
                : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border-slate-200'
            }`}
            title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Sync Status Badge */}
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center border text-xs font-bold transition-colors ${
              status === 'online'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : status === 'syncing'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}
            title={status === 'online' ? 'مزامنة لحظية نشطة' : 'جاري المزامنة...'}
          >
            {status === 'online' && <Wifi className="w-3.5 h-3.5" />}
            {status === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {status === 'offline' && <WifiOff className="w-3.5 h-3.5" />}
          </div>
        </div>
      </header>

      {/* Mobile Full-Screen Search Modal Overlay */}
      {showSearchModal && (
        <div className="absolute inset-0 z-50 bg-[#070b14]/95 backdrop-blur-2xl flex flex-col p-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-black text-white">بحث شامل في الورشة</span>
            </div>
            <button
              onClick={() => setShowSearchModal(false)}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto">
            <GlobalSearch
              onNavigate={(tab, id, search) => {
                setShowSearchModal(false);
                if (onNavigate) onNavigate(tab, id, search);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};
