import React from 'react';
import { Bell, AlertTriangle, Droplet, Clock, CheckCircle2 } from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const alerts = [
    {
      id: '1',
      title: 'موعد صيانة وتغيير زيت مستحق',
      message: 'السيارة BMW 320i (أ ب ج 1234) اقتربت من موعد تغيير الزيت (تبقى أقل من 500 كم).',
      category: 'maintenance',
      time: 'منذ ساعتين'
    },
    {
      id: '2',
      title: 'تنبيه انخفاض مخزون',
      message: 'صنف [04465-02220 - طقم أقمشة فرامل أمامية] وصل إلى 2 حبات، يرجى إجراء طلبية توريد جديدة.',
      category: 'stock',
      time: 'منذ 5 ساعات'
    },
    {
      id: '3',
      title: 'مهمة فحص منجزة بالكامل',
      message: 'قام الفني محمود عبد العزيز بإكمال فحص كمبيوتر للسيارة لكزس ES350 بنجاح.',
      category: 'task',
      time: 'اليوم 09:30 ص'
    }
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="font-bold text-sm text-slate-300">مركز الإشعارات والتنبيهات الآلية</h3>
        <p className="text-xs text-slate-500 mt-0.5">تنبيهات مواعيد الصيانة الدورية ونواقص قطع الغيار وتحديثات العمل</p>
      </div>

      <div className="space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3.5 shadow-sm">
            <div className={`p-2.5 rounded-xl ${
              a.category === 'stock' ? 'bg-rose-500/10 text-rose-400' :
              a.category === 'maintenance' ? 'bg-amber-500/10 text-amber-400' :
              'bg-emerald-500/10 text-emerald-400'
            }`}>
              {a.category === 'stock' && <AlertTriangle className="w-5 h-5" />}
              {a.category === 'maintenance' && <Droplet className="w-5 h-5" />}
              {a.category === 'task' && <CheckCircle2 className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white">{a.title}</h4>
                <span className="text-[11px] text-slate-500">{a.time}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{a.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
