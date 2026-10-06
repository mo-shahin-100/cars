import React from 'react';
import { Menu, Wifi, WifiOff, RefreshCw, Smartphone, Monitor, Plus, Moon, Sun } from 'lucide-react';
import { useSync } from '../../context/SyncContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import { GlobalSearch } from './GlobalSearch';

interface TopbarProps {
  activeTab: string;
  onOpenSidebar: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  deviceMode: 'desktop' | 'mobile';
  setDeviceMode: (mode: 'desktop' | 'mobile') => void;
  onQuickAction: (action: string) => void;
  onNavigate?: (tab: string, targetId?: string, searchParam?: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  onOpenSidebar,
  onToggleSidebar,
  sidebarOpen,
  deviceMode,
  setDeviceMode,
  onQuickAction,
  onNavigate
}) => {
  const { status, offlineQueueCount } = useSync();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  const tabTitles: Record<string, string> = {
    dashboard: 'الرئيسية ولوحة التحكم',
    customers: 'إدارة العملاء',
    vehicles: 'السيارات وتاريخ السيارة',
    visits: 'سجل واستقبال الزيارات',
    maintenance: 'الصيانة والفحوصات • صيانة دورية وسريعة',
    repairs: 'الصيانة والفحوصات • أوامر التصليح والإصلاحات',
    engine_overhaul: 'الصيانة والفحوصات • عمرة الماتور والمحركات',
    diagnostics: 'الصيانة والفحوصات • فحص الكمبيوتر والأعطال (DTC)',
    'work-orders': 'أوامر العمل والمهام الفنية',
    mechanics: 'الميكانيكيون والفنيون',
    inventory: 'المخزون • قائمة الأصناف',
    inventory_stock: 'المخزون • قائمة الأصناف',
    inventory_add: 'المخزون • إضافة صنف',
    inventory_scanner: 'المخزون • المسح السريع بالباركود',
    inventory_movements: 'المخزون • تقرير حركة المخزن',
    purchases: 'الموردين وفواتير المشتريات والتوريد',
    fluids: 'الزيوت وسوائل الصيانة الدورية',
    invoices: 'الفواتير وسندات القبض',
    expenses: 'المصروفات العامة',
    reports: 'التقارير المالية والإنتاجية',
    notifications: 'مركز الإشعارات والتنبيهات',
    users: 'المستخدمون ومصفوفة الصلاحيات',
    settings: 'إعدادات الورشة والنسخ الاحتياطي',
    mechanic_station: 'لوحة مهام الفني (الميدان)'
  };

  return (
    <header className={`h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl shadow-sm transition-colors duration-300 ${
      isDark
        ? 'bg-[#0a0f1d]/85 border-b border-white/[0.08]'
        : 'bg-white/90 border-b border-slate-200 shadow-sm'
    }`}>
      {/* Right side: Sidebar toggle and Title */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar || onOpenSidebar}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            sidebarOpen
              ? isDark
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                : 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm'
              : isDark
                ? 'text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
          title={sidebarOpen ? "إخفاء القائمة (Slide bar)" : "إظهار القائمة (Slide bar)"}
        >
          <Menu className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">
            {sidebarOpen ? 'إخفاء القائمة' : 'القائمة'}
          </span>
        </button>
        <div>
          <h2 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {tabTitles[activeTab] || 'النظام'}
          </h2>
        </div>
      </div>

      {/* Center: Global Unified Search (اسم العميل أو السيارة أو العطل) */}
      <GlobalSearch onNavigate={onNavigate || (() => {})} />

      {/* Left side */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Sync Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            status === 'online'
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-300 dark:border-emerald-500/25'
              : status === 'syncing'
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-300 dark:border-amber-500/25'
              : 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-300 dark:border-rose-500/25'
          }`}
          title={
            status === 'online'
              ? 'متصل بالخادم وتصلك التحديثات فورياً'
              : status === 'syncing'
              ? 'جارٍ رفع البيانات ومزامنة التغييرات'
              : 'وضع غير متصل: يتم الحفظ محلياً في جهازك تلقائياً'
          }
        >
          {status === 'online' && <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-500" />}
          {status === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />}
          {status === 'offline' && <WifiOff className="w-3.5 h-3.5 text-rose-500" />}
          <span className="hidden sm:inline">
            {status === 'online' ? 'مزامنة لحظية' : status === 'syncing' ? 'مزامنة...' : 'دون اتصال'}
          </span>
          {offlineQueueCount > 0 && (
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {offlineQueueCount} معلق
            </span>
          )}
        </div>

        {/* View Switcher */}
        <div className={`hidden lg:flex items-center p-1 rounded-xl border ${
          isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              deviceMode === 'desktop'
                ? isDark ? 'bg-white text-slate-950 shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>ويندوز</span>
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              deviceMode === 'mobile'
                ? isDark ? 'bg-white text-slate-950 shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>أندرويد</span>
          </button>
        </div>

        {/* ===== THEME TOGGLE BUTTON ===== */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            isDark
              ? 'bg-white/[0.06] border-white/[0.12] text-slate-300 hover:bg-white/[0.12] hover:text-white'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
          }`}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
              <span className="hidden sm:inline">فاتح</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-500 stroke-[2.5]" />
              <span className="hidden sm:inline">داكن</span>
            </>
          )}
        </button>

        {/* Quick Add Action */}
        <button
          onClick={() => onQuickAction('new_visit')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 border ${
            isDark
              ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-white/10 border-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 border-slate-900'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">تسجيل زيارة</span>
        </button>
      </div>
    </header>
  );
};
