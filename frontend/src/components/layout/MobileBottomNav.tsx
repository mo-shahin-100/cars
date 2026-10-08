import React, { useState } from 'react';
import {
  LayoutDashboard,
  Car,
  Plus,
  Wrench,
  ClipboardList,
  Grid,
  Users,
  Boxes,
  Cpu,
  Droplet,
  Receipt,
  WalletCards,
  BarChart3,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ShieldCheck,
  Package
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickIntake: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onQuickIntake
}) => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const isDark = theme === 'dark';
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  const mainTabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'vehicles', label: 'السيارات', icon: Car },
    { id: 'intake', label: 'دخول سريع', icon: Plus, isAction: true },
    { id: 'work-orders', label: 'أوامر العمل', icon: ClipboardList },
    { id: 'more', label: 'المزيد', icon: Grid, isMore: true }
  ];

  const moreSections = [
    { id: 'customers', label: 'إدارة العملاء', icon: Users, color: 'text-indigo-400 bg-indigo-500/15' },
    { id: 'visits', label: 'سجل الزيارات', icon: Car, color: 'text-sky-400 bg-sky-500/15' },
    { id: 'mechanic_station', label: 'محطة الفني (الميدان)', icon: Wrench, color: 'text-amber-400 bg-amber-500/15' },
    { id: 'diagnostics', label: 'فحص الكمبيوتر (DTC)', icon: Cpu, color: 'text-purple-400 bg-purple-500/15' },
    { id: 'fluids', label: 'الزيوت والسوائل', icon: Droplet, color: 'text-cyan-400 bg-cyan-500/15' },
    { id: 'inventory', label: 'المخزون والقطع', icon: Boxes, color: 'text-teal-400 bg-teal-500/15' },
    { id: 'purchases', label: 'فواتير المشتريات', icon: Package, color: 'text-blue-400 bg-blue-500/15' },
    { id: 'invoices', label: 'الفواتير والقبض', icon: Receipt, color: 'text-emerald-400 bg-emerald-500/15' },
    { id: 'expenses', label: 'المصروفات العامة', icon: WalletCards, color: 'text-rose-400 bg-rose-500/15' },
    { id: 'reports', label: 'التقارير والأرباح', icon: BarChart3, color: 'text-violet-400 bg-violet-500/15' },
    { id: 'settings', label: 'الإعدادات والنسخ', icon: Settings, color: 'text-slate-300 bg-white/10' }
  ];

  return (
    <>
      {/* Floating Bottom Navigation Bar */}
      <nav
        className={`absolute bottom-2 left-2 right-2 z-40 px-2 py-1.5 rounded-2xl backdrop-blur-2xl border transition-all duration-300 shadow-2xl flex items-center justify-around select-none ${
          isDark
            ? 'bg-[#0a0f1d]/90 border-white/[0.1] shadow-black/80'
            : 'bg-white/95 border-slate-200/90 shadow-slate-400/20'
        }`}
      >
        {mainTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={onQuickIntake}
                className="relative -mt-6 group focus:outline-none"
                title="تسجيل دخول سيارة جديدة فوراً"
              >
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 opacity-75 blur-sm group-hover:opacity-100 transition-opacity animate-pulse" />
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 via-indigo-500 to-sky-400 text-white flex items-center justify-center shadow-xl shadow-sky-500/30 active:scale-90 transition-transform border-2 border-[#0a0f1d]">
                  <Plus className="w-6 h-6 stroke-[3]" />
                </div>
              </button>
            );
          }

          if (item.isMore) {
            return (
              <button
                key={item.id}
                onClick={() => setShowMoreDrawer(true)}
                className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all active:scale-95 ${
                  showMoreDrawer
                    ? 'text-sky-400 font-bold bg-sky-500/15'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? isDark
                    ? 'text-white font-black bg-white/[0.08] shadow-sm'
                    : 'text-slate-950 font-black bg-slate-100 shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Android Bottom Sheet Drawer (المزيد) */}
      {showMoreDrawer && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
          <div
            className="w-full max-h-[82%] bg-[#0a0f1d] border-t border-white/[0.1] rounded-t-[32px] p-4 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mb-3" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-black text-white">أقسام وخدمات الورشة</h3>
                <p className="text-[11px] text-slate-400">وصول سريع لكافة شاشات النظام</p>
              </div>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Info Tile */}
            <div className="my-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center font-black text-white text-sm shadow-sm">
                  {user?.full_name?.charAt(0) || 'م'}
                </div>
                <div>
                  <p className="text-xs font-black text-white">{user?.full_name}</p>
                  <span className="text-[10px] text-sky-400 font-bold">
                    {user?.role_display || user?.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMoreDrawer(false);
                  logout();
                }}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all text-xs flex items-center gap-1 border border-rose-500/20"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">خروج</span>
              </button>
            </div>

            {/* Sections Grid */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              <div className="grid grid-cols-2 gap-2">
                {moreSections.map((sec) => {
                  const Icon = sec.icon;
                  const isCurrent = activeTab === sec.id;

                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setActiveTab(sec.id);
                        setShowMoreDrawer(false);
                      }}
                      className={`p-2.5 rounded-2xl border text-right flex items-center gap-2.5 transition-all active:scale-95 ${
                        isCurrent
                          ? 'bg-sky-500/20 border-sky-400/50 shadow-sm'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.06]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${sec.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white truncate">
                        {sec.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
