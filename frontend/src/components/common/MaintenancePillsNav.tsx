import React from 'react';
import { Wrench, Hammer, Gauge, Cpu } from 'lucide-react';

export type MaintenanceCategory = 'all' | 'maintenance' | 'repair' | 'overhaul' | 'diagnostics';

export interface MaintenancePillsNavProps {
  activeCategory: MaintenanceCategory;
  onSelectCategory: (category: MaintenanceCategory) => void;
  allCount?: number;
}

export const MaintenancePillsNav: React.FC<MaintenancePillsNavProps> = ({
  activeCategory,
  onSelectCategory,
  allCount
}) => {
  return (
    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
      <button
        type="button"
        onClick={() => onSelectCategory('all')}
        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
          activeCategory === 'all'
            ? 'bg-slate-800 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        الكل {allCount !== undefined ? `(${allCount})` : ''}
      </button>
      <button
        type="button"
        onClick={() => onSelectCategory('maintenance')}
        className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
          activeCategory === 'maintenance'
            ? 'bg-sky-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Wrench className="w-3.5 h-3.5" />
        <span>صيانة</span>
      </button>
      <button
        type="button"
        onClick={() => onSelectCategory('repair')}
        className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
          activeCategory === 'repair'
            ? 'bg-amber-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Hammer className="w-3.5 h-3.5" />
        <span>تصليح</span>
      </button>
      <button
        type="button"
        onClick={() => onSelectCategory('overhaul')}
        className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
          activeCategory === 'overhaul'
            ? 'bg-rose-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Gauge className="w-3.5 h-3.5" />
        <span>عمرة ماتور</span>
      </button>
      <button
        type="button"
        onClick={() => onSelectCategory('diagnostics')}
        className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
          activeCategory === 'diagnostics'
            ? 'bg-purple-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Cpu className="w-3.5 h-3.5" />
        <span>فحص كمبيوتر</span>
      </button>
    </div>
  );
};
