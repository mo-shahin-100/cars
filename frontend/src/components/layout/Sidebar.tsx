import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Car,
  Calendar,
  Wrench,
  Hammer,
  Gauge,
  Cpu,
  Boxes,
  Truck,
  Droplet,
  Receipt,
  WalletCards,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  History,
  FileSpreadsheet,
  ScanLine
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDevice } from '../../context/DeviceContext';

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { isMobile, deviceMode } = useDevice();
  const isDark = theme === 'dark';

  const isMaintenanceTab = ['maintenance', 'repairs', 'engine_overhaul', 'diagnostics', 'work-orders'].includes(activeTab);
  const [maintenanceOpen, setMaintenanceOpen] = useState(true);

  const isPartsTab = ['inventory', 'inventory_add', 'inventory_stock', 'inventory_scanner', 'inventory_movements'].includes(activeTab);
  const [partsOpen, setPartsOpen] = useState(true);

  useEffect(() => {
    if (isMaintenanceTab) {
      setMaintenanceOpen(true);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isPartsTab) {
      setPartsOpen(true);
    }
  }, [activeTab]);

  // 1. القائمة العلوية الأساسية
  const topItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'customers', label: 'العملاء',   icon: Users },
    { id: 'vehicles',  label: 'السيارات',  icon: Car },
    { id: 'visits',    label: 'الزيارات',  icon: Calendar },
  ];

  // 2. بنود الصيانة والفحوصات الأربعة
  const maintenanceSubItems = [
    { id: 'maintenance',     label: 'صيانة',         icon: Wrench, badge: 'دورية' },
    { id: 'repairs',         label: 'تصليح',         icon: Hammer, badge: 'أعطال' },
    { id: 'engine_overhaul', label: 'عمرة الماتور',  icon: Gauge,  badge: 'توضيب' },
    { id: 'diagnostics',     label: 'فحص الكمبيوتر', icon: Cpu,    badge: 'DTC' },
  ];

  // 3. بنود المخزون وقطع الغيار
  const partsSubItems = [
    { id: 'inventory_add',       label: 'إضافة صنف',             icon: Plus,            badge: 'جديد' },
    { id: 'inventory_stock',     label: 'قائمة الأصناف',         icon: Boxes,           badge: 'المخزون' },
    { id: 'inventory_scanner',   label: 'المسح السريع بالباركود', icon: ScanLine,        badge: 'سريع' },
    { id: 'inventory_movements', label: 'تقرير حركة المخزن',     icon: FileSpreadsheet, badge: 'تقرير' },
  ];

  // 4. باقي بنود الإدارة والعمليات
  const secondaryItems = [
    { id: 'purchases',       label: 'الموردين والمشتريات',           icon: Truck },
    { id: 'invoices',        label: 'الفواتير والمدفوعات',           icon: Receipt },
    { id: 'expenses',        label: 'المصروفات',                    icon: WalletCards },
    { id: 'reports',         label: 'التقارير المالية والإنتاجية',   icon: BarChart3 },
    { id: 'notifications',   label: 'التنبيهات',                    icon: Bell },
    { id: 'users',           label: 'المستخدمون والصلاحيات',         icon: ShieldCheck, ownerOnly: true },
    { id: 'settings',        label: 'الإعدادات والنسخ الاحتياطي',   icon: Settings },
  ];

  const sidebarBg   = isDark ? 'bg-[#0a0f1d]/95 border-l border-white/[0.08]' : 'bg-white border-l border-slate-200';
  const headerBorder= isDark ? 'border-white/[0.08]' : 'border-slate-100';
  const userAreaBg  = isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-slate-50 border-slate-100';
  const activeItem  = isDark ? 'bg-white text-slate-950 shadow-lg shadow-white/10' : 'bg-slate-900 text-white shadow-md shadow-slate-900/15';
  const inactiveItem= isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100';
  const iconActive  = isDark ? 'text-slate-950 stroke-[2.5]' : 'text-white stroke-[2.5]';
  const iconInactive= isDark ? 'text-slate-400' : 'text-slate-400';
  const bottomBg    = isDark ? 'border-white/[0.08] bg-white/[0.01]' : 'border-slate-100 bg-slate-50';
  const closeBtnCls = isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200';
  const titleCls    = isDark ? 'text-white' : 'text-slate-800';
  const subtitleCls = isDark ? 'text-sky-400' : 'text-sky-600';
  const userNameCls = isDark ? 'text-white' : 'text-slate-800';
  const logoInner   = isDark ? 'bg-[#0a0f1d]' : 'bg-white';

  return (
    <>
      {/* Backdrop for Slide Bar: when open on mobile or tablet */}
      {isOpen && (
        <div
          className={`${
            deviceMode === 'mobile' ? 'absolute inset-0' : 'fixed inset-0 lg:hidden'
          } bg-black/60 z-40 backdrop-blur-sm transition-opacity duration-300`}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide Bar Drawer */}
      <aside
        className={`${
          deviceMode === 'mobile' ? 'absolute h-full w-[280px]' : 'fixed h-screen w-72'
        } top-0 right-0 z-50 backdrop-blur-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${sidebarBg} ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Brand Header & Slide Bar Close Button */}
        <div className={`p-4 border-b ${headerBorder} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-sky-400 p-[1px] shadow-lg shadow-sky-500/20">
              <div className={`w-full h-full ${logoInner} rounded-2xl flex items-center justify-center`}>
                <Wrench className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <h1 className={`font-black text-sm sm:text-base ${titleCls} tracking-wide`}>ورشة السيارات</h1>
              <p className={`text-[10px] sm:text-[11px] ${subtitleCls} font-semibold tracking-wider`}>نظام الإدارة المركزي</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className={`p-1.5 rounded-xl transition-all ${closeBtnCls} flex items-center gap-1 group`}
            title="إخفاء القائمة الجانبية (Slide)"
          >
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* User Quick Info */}
        <div className={`px-4 py-3 border-b ${userAreaBg} flex items-center gap-3`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${
            isDark ? 'bg-gradient-to-br from-white/15 to-white/5 border border-white/15 text-white' : 'bg-gradient-to-br from-slate-200 to-slate-100 border border-slate-200 text-slate-700'
          }`}>
            {user?.full_name?.charAt(0) || 'م'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${userNameCls} truncate`}>{user?.full_name}</p>
            <span className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded-md ${
              isDark ? 'bg-sky-500/15 text-sky-300 border border-sky-400/25' : 'bg-sky-100 text-sky-700 border border-sky-200'
            }`}>
              {user?.role_display || user?.role}
            </span>
          </div>
        </div>

        {/* Navigation Items with Sleek Custom Scrollbar */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto sidebar-slide-scroll">
          {/* 1. القائمة العلوية الأساسية (الرئيسية، العملاء، السيارات، الزيارات) */}
          <div className="space-y-1">
            {topItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024 || isMobile) {
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                    isActive ? activeItem : inactiveItem
                  }`}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isActive ? iconActive : iconInactive}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* 2. قسم الصيانة والفحوصات (Accordion قابل للطي مع 4 بنود واضحة) */}
          <div className={`rounded-2xl transition-all duration-200 overflow-hidden border ${
            isMaintenanceTab
              ? isDark ? 'bg-sky-500/5 border-sky-500/30' : 'bg-sky-50/70 border-sky-200'
              : isDark ? 'border-white/[0.05] bg-white/[0.01]' : 'border-slate-100 bg-slate-50/50'
          }`}>
            <button
              type="button"
              onClick={() => setMaintenanceOpen(prev => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2.5 font-bold text-xs sm:text-sm transition-all duration-200 ${
                isMaintenanceTab
                  ? isDark ? 'text-sky-400' : 'text-sky-700'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  isMaintenanceTab
                    ? isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-600'
                    : isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-200/60 text-slate-600'
                }`}>
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <span>الصيانة والفحوصات</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${maintenanceOpen ? 'rotate-180' : ''}`} />
            </button>

            {maintenanceOpen && (
              <div className={`px-2 pb-2 pt-1 space-y-1 border-t ${
                isDark ? 'border-white/[0.05]' : 'border-slate-200/60'
              }`}>
                {maintenanceSubItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = activeTab === sub.id;

                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setActiveTab(sub.id);
                        if (window.innerWidth < 1024 || isMobile) {
                          setIsOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold text-xs transition-all duration-150 ${
                        isSubActive
                          ? isDark
                            ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25'
                            : 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                          : isDark
                            ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{sub.label}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isSubActive
                          ? 'bg-white/20 text-white'
                          : isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {sub.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* فاصل قسم الإدارة والعمليات */}
          <div className="pt-2 pb-1 px-3">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              العمليات والمخزون
            </span>
          </div>

          {/* قسم قطع الغيار (Accordion قابل للطي: 1. إضافة وتكويد قطعة غيار  2. المخزون) */}
          <div className={`rounded-2xl transition-all duration-200 overflow-hidden border ${
            isPartsTab
              ? isDark ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-200'
              : isDark ? 'border-white/[0.05] bg-white/[0.01]' : 'border-slate-100 bg-slate-50/50'
          }`}>
            <button
              type="button"
              onClick={() => setPartsOpen(prev => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2.5 font-bold text-xs sm:text-sm transition-all duration-200 ${
                isPartsTab
                  ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  isPartsTab
                    ? isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-600'
                    : isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-200/60 text-slate-600'
                }`}>
                  <Boxes className="w-3.5 h-3.5" />
                </div>
                <span>المخزون</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${partsOpen ? 'rotate-180' : ''}`} />
            </button>

            {partsOpen && (
              <div className={`px-2 pb-2 pt-1 space-y-1 border-t ${
                isDark ? 'border-white/[0.05]' : 'border-slate-200/60'
              }`}>
                {partsSubItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = activeTab === sub.id || (sub.id === 'inventory_stock' && activeTab === 'inventory');

                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setActiveTab(sub.id);
                        if (window.innerWidth < 1024 || isMobile) {
                          setIsOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold text-xs transition-all duration-150 ${
                        isSubActive
                          ? isDark
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                            : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : isDark
                            ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{sub.label}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isSubActive
                          ? 'bg-white/20 text-white'
                          : isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {sub.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. باقي بنود الإدارة والعمليات */}
          <div className="space-y-1">
            {secondaryItems.map((item) => {
              if (item.ownerOnly && user?.role !== 'owner') return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024 || isMobile) {
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                    isActive ? activeItem : inactiveItem
                  }`}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isActive ? iconActive : iconInactive}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className={`p-3.5 border-t ${bottomBg}`}>
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold border border-transparent transition-all ${
              isDark
                ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/20'
                : 'text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
            }`}
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
};
