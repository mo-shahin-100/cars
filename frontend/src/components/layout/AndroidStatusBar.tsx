import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Bell, Sparkles } from 'lucide-react';

export const AndroidStatusBar: React.FC = () => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-8 px-5 flex items-center justify-between text-[11px] font-semibold text-slate-300 select-none z-50 shrink-0 bg-transparent">
      {/* Right side (RTL context: clock & notification icons) */}
      <div className="flex items-center gap-1.5 min-w-[70px]">
        <span className="font-mono font-bold text-white tracking-tight">{timeStr || '10:45'}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" title="إشعارات نشطة" />
      </div>

      {/* Center: Punch-Hole Front Camera */}
      <div className="flex items-center justify-center">
        <div className="w-3.5 h-3.5 rounded-full bg-[#050810] border border-slate-700/80 flex items-center justify-center shadow-inner relative">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-950/90 border border-sky-400/30" />
          <div className="absolute top-0.5 right-0.5 w-0.5 h-0.5 rounded-full bg-white/40" />
        </div>
      </div>

      {/* Left side: Network, Wi-Fi, Battery */}
      <div className="flex items-center gap-1.5 min-w-[70px] justify-end font-mono">
        <span className="text-[9px] font-black text-sky-400 uppercase tracking-tighter">5G</span>
        <Wifi className="w-3 h-3 text-slate-200" />
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-slate-300">98%</span>
          <div className="w-4 h-2 rounded-[3px] border border-slate-400 p-[1px] flex items-center">
            <div className="w-full h-full bg-emerald-400 rounded-[1.5px]" />
          </div>
        </div>
      </div>
    </div>
  );
};
