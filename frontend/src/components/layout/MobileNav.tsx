import React from 'react';
import { LayoutDashboard, Car, PlusCircle, Wrench, ClipboardList } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickIntake: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, onQuickIntake }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const items = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'vehicles', label: 'السيارات', icon: Car },
    { id: 'intake', label: 'دخول سيارة', icon: PlusCircle, isAction: true },
    { id: 'mechanic_station', label: 'مهام الفني', icon: Wrench },
    { id: 'work-orders', label: 'أوامر العمل', icon: ClipboardList }
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t px-2 py-2 flex items-center justify-around backdrop-blur-xl md:hidden shadow-2xl transition-colors ${
      isDark ? 'bg-[#0a0f1d]/95 border-white/[0.08]' : 'bg-white/95 border-slate-200'
    }`}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        if (item.isAction) {
          return (
            <button
              key={item.id}
              onClick={onQuickIntake}
              className={`flex flex-col items-center justify-center -mt-6 w-12 h-12 rounded-full shadow-xl active:scale-90 transition-all border-2 ${
                isDark
                  ? 'bg-white text-slate-950 shadow-white/20 border-[#0a0f1d]'
                  : 'bg-slate-900 text-white shadow-slate-900/20 border-white'
              }`}
            >
              <Icon className="w-6 h-6 stroke-[2.5]" />
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all ${
              isActive
                ? isDark ? 'text-white font-black bg-white/[0.08]' : 'text-slate-900 font-black bg-slate-100'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
