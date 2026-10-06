import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SyncProvider, useSync } from './context/SyncContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { MobileNav } from './components/layout/MobileNav';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { CustomersView } from './components/customers/CustomersView';
import { VehiclesView } from './components/vehicles/VehiclesView';
import { VisitsView } from './components/visits/VisitsView';
import { WorkOrdersView } from './components/workOrders/WorkOrdersView';
import { DiagnosticsView } from './components/diagnostics/DiagnosticsView';
import { FluidsView } from './components/fluids/FluidsView';
import { InventoryView } from './components/inventory/InventoryView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { UsersView } from './components/users/UsersView';
import { SettingsView } from './components/settings/SettingsView';
import { MechanicWorkstation } from './components/mechanic/MechanicWorkstation';

import { Wrench, Shield, Lock, User as UserIcon, ChevronLeft, Menu } from 'lucide-react';

const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const quickLogins = [
    { role: 'مالك الورشة (Owner)', u: 'admin', p: 'admin123', color: 'from-amber-500 to-amber-600' },
    { role: 'المدير (Manager)', u: 'manager', p: 'manager123', color: 'from-sky-500 to-sky-600' },
    { role: 'الاستقبال (Reception)', u: 'reception', p: 'reception123', color: 'from-teal-500 to-teal-600' },
    { role: 'ميكانيكي محركات', u: 'ahmed', p: 'ahmed123', color: 'from-blue-600 to-indigo-600' },
    { role: 'فحص وتشخيص', u: 'mahmoud', p: 'mahmoud123', color: 'from-purple-600 to-indigo-600' },
    { role: 'المحاسب (Accountant)', u: 'accountant', p: 'accountant123', color: 'from-emerald-600 to-teal-600' },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-card border border-white/[0.1] p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 relative z-10">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-sky-400 p-[1px] mx-auto shadow-xl shadow-sky-500/20 mb-4">
            <div className="w-full h-full bg-[#0a0f1d] rounded-2xl flex items-center justify-center">
              <Wrench className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">ورشة السيارات</h1>
          <p className="text-xs text-sky-400 mt-1 font-semibold tracking-wide">تسجيل الدخول للنظام المركزي المتكامل</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">اسم المستخدم</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#070b14] border border-white/[0.1] rounded-xl pr-10 pl-4 py-2.5 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 font-mono transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#070b14] border border-white/[0.1] rounded-xl pr-10 pl-4 py-2.5 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 font-mono transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-950 py-3 rounded-xl text-sm font-black shadow-xl shadow-white/10 disabled:opacity-50 transition-all active:scale-[0.98] border border-white"
          >
            {loading ? 'جاري التحقق...' : 'دخول النظام'}
          </button>
        </form>

        {/* Quick Role Tester Bar */}
        <div className="pt-4 border-t border-white/[0.08]">
          <p className="text-xs text-slate-400 text-center mb-2.5 font-bold">اختبار الصلاحيات السريع:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {quickLogins.map((ql, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setUsername(ql.u);
                  setPassword(ql.p);
                }}
                className="px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white text-center transition-all"
              >
                {ql.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_open');
    if (saved !== null) return saved === 'true';
    return window.innerWidth >= 1024;
  });
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [targetSearch, setTargetSearch] = useState<{ id?: string; search?: string } | null>(null);

  const handleGlobalNavigate = (tab: string, targetId?: string, searchParam?: string) => {
    setActiveTab(tab);
    setTargetSearch({ id: targetId, search: searchParam });
  };

  useEffect(() => {
    localStorage.setItem('sidebar_open', String(sidebarOpen));
  }, [sidebarOpen]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#070b14]' : 'bg-slate-100'}`}>
        <div className="text-center">
          <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3 ${theme === 'dark' ? 'border-white/20 border-t-white' : 'border-slate-300 border-t-sky-500'}`}></div>
          <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>جاري تهيئة النظام...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={handleGlobalNavigate} onQuickAction={() => setActiveTab('visits')} />;
      case 'customers':
        return <CustomersView initialSearch={targetSearch?.search} initialCustomerId={targetSearch?.id} />;
      case 'vehicles':
        return <VehiclesView initialSearch={targetSearch?.search} initialVehicleId={targetSearch?.id} />;
      case 'visits':
        return <VisitsView initialSearch={targetSearch?.search} initialVisitId={targetSearch?.id} />;
      case 'maintenance':
        return (
          <WorkOrdersView
            categoryFilter="maintenance"
            activeTab="maintenance"
            onTabChange={setActiveTab}
            viewTitle="الصيانة والفحوصات • الصيانة الدورية والسريعة"
            viewSubtitle="متابعة الصيانات الدورية، تغيير الزيوت والفلاتر، السيور، المكابح، والتربيط"
            initialSearch={targetSearch?.search}
            initialOrderId={targetSearch?.id}
          />
        );
      case 'repairs':
        return (
          <WorkOrdersView
            categoryFilter="repair"
            activeTab="repairs"
            onTabChange={setActiveTab}
            viewTitle="الصيانة والفحوصات • أوامر التصليح والإصلاحات"
            viewSubtitle="تشخيص وإصلاح الأعطال الميكانيكية والكهربائية والعفشة ونظام التبريد"
            initialSearch={targetSearch?.search}
            initialOrderId={targetSearch?.id}
          />
        );
      case 'engine_overhaul':
        return (
          <WorkOrdersView
            categoryFilter="overhaul"
            activeTab="engine_overhaul"
            onTabChange={setActiveTab}
            viewTitle="الصيانة والفحوصات • عمرة الماتور والمحركات"
            viewSubtitle="إدارة أعمال توضيب وتعمير المحركات، خراطة البلوك، وش سلندر، والبساتم"
            initialSearch={targetSearch?.search}
            initialOrderId={targetSearch?.id}
          />
        );
      case 'diagnostics':
        return (
          <DiagnosticsView
            activeTab="diagnostics"
            onTabChange={setActiveTab}
            initialDtcCode={targetSearch?.search}
          />
        );
      case 'work-orders':
        return (
          <WorkOrdersView
            categoryFilter="all"
            activeTab="work-orders"
            onTabChange={setActiveTab}
            initialSearch={targetSearch?.search}
            initialOrderId={targetSearch?.id}
          />
        );
      case 'mechanics':
        return <UsersView />;
      case 'inventory':
      case 'inventory_stock':
        return <InventoryView initialTab="stock" onTabChange={setActiveTab} />;
      case 'inventory_add':
        return <InventoryView initialTab="add" onTabChange={setActiveTab} />;
      case 'inventory_scanner':
        return <InventoryView initialTab="scanner" onTabChange={setActiveTab} />;
      case 'inventory_movements':
        return <InventoryView initialTab="movements" onTabChange={setActiveTab} />;
      case 'purchases':
        return <PurchasesView />;
      case 'fluids':
        return <InventoryView initialTab="stock" onTabChange={setActiveTab} />;
      case 'invoices':
        return <InvoicesView initialInvoiceId={targetSearch?.id} initialSearch={targetSearch?.search} />;
      case 'expenses':
        return <ExpensesView />;
      case 'reports':
        return <ReportsView />;
      case 'notifications':
        return <NotificationsView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      case 'mechanic_station':
        return <MechanicWorkstation />;
      default:
        return <DashboardView onNavigate={handleGlobalNavigate} onQuickAction={() => setActiveTab('visits')} />;
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#070b14] text-slate-100' : 'bg-slate-100 text-slate-900'
    } ${deviceMode === 'mobile' ? 'p-2 sm:p-6 justify-center' : ''}`}>
      {/* Mobile Device Frame when Mobile simulation mode is toggled */}
      <div className={`flex w-full ${deviceMode === 'mobile' ? `max-w-md h-[92vh] border-4 rounded-[38px] shadow-2xl overflow-hidden relative flex-col ${
        theme === 'dark' ? 'border-white/10 bg-[#070b14]' : 'border-slate-300 bg-white'
      }` : 'min-h-screen'}`}>
        
        {/* Slide Bar (Sidebar Drawer) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />

        {/* Floating Quick Tab to slide in the sidebar when closed on desktop */}
        {!sidebarOpen && deviceMode === 'desktop' && (
          <button
            onClick={() => setSidebarOpen(true)}
            className={`fixed top-24 right-0 z-40 flex items-center gap-1.5 py-2 px-2.5 rounded-l-xl shadow-lg transition-all duration-200 group border-y border-l ${
              theme === 'dark'
                ? 'bg-[#0a0f1d]/95 hover:bg-sky-500/20 text-sky-400 border-white/10 hover:border-sky-400/40 backdrop-blur-md'
                : 'bg-white hover:bg-sky-50 text-sky-700 border-slate-200 hover:border-sky-200 shadow-slate-200'
            }`}
            title="إظهار القائمة المنزلقة (Slide bar)"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold hidden sm:inline">القائمة</span>
          </button>
        )}

        {/* Content Wrapper */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          deviceMode === 'desktop' && sidebarOpen ? 'md:mr-72' : 'mr-0'
        }`}>
          <Topbar
            activeTab={activeTab}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            onOpenSidebar={() => setSidebarOpen(true)}
            deviceMode={deviceMode}
            setDeviceMode={setDeviceMode}
            onQuickAction={() => setActiveTab('visits')}
            onNavigate={handleGlobalNavigate}
          />

          <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
            {renderActiveView()}
          </main>

          {/* Android Bottom Navigation */}
          {(deviceMode === 'mobile' || window.innerWidth < 768) && (
            <MobileNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onQuickIntake={() => setActiveTab('visits')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SyncProvider>
          <MainApp />
        </SyncProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
