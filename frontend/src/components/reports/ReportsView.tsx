import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Wrench, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../../services/api';

export const ReportsView: React.FC = () => {
  const [financialData, setFinancialData] = useState<any | null>(null);
  const [productivity, setProductivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getFinancialReport(),
      api.getMechanicsProductivity()
    ]).then(([finRes, prodRes]) => {
      setFinancialData(finRes.data);
      setProductivity(prodRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">جاري تجميع التقارير المحاسبية...</div>;
  }

  const s = financialData?.sales || {};
  const p = financialData?.partsAccounting || {};
  const expenses = financialData?.expenses || 0;
  const netProfit = financialData?.netProfit || 0;

  return (
    <div className="space-y-6">
      {/* Financial Executive Summary Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          ملخص قائمة الدخل والأرباح الصافية
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <p className="text-xs text-slate-400 font-medium">إجمالي المبيعات (Gross Sales)</p>
            <p className="text-2xl font-black text-white mt-1">
              {(s.gross_sales || 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">ج.م</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-2">شامل أجور اليد والقطع والسوائل والضريبة</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <p className="text-xs text-slate-400 font-medium">التحصيلات الفعلية (Cash Inflow)</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {(s.cash_collections || 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">ج.م</span>
            </p>
            <p className="text-[11px] text-emerald-400/80 mt-2">المبالغ المستلمة بسندات قبض</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <p className="text-xs text-slate-400 font-medium">المصروفات التشغيلية</p>
            <p className="text-2xl font-black text-rose-400 mt-1">
              {expenses.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ج.م</span>
            </p>
            <p className="text-[11px] text-rose-400/80 mt-2">إيجار، رواتب، وفواتير المركز</p>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-sky-950/40 border border-sky-500/30 p-4 rounded-2xl">
            <p className="text-xs text-sky-400 font-bold">صافي الربح التقديري (Net Profit)</p>
            <p className="text-2xl font-black text-white mt-1">
              {netProfit.toLocaleString()} <span className="text-xs text-sky-400 font-normal">ج.م</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-2">أجور العمل + هامش ربح القطع - المصاريف</p>
          </div>
        </div>
      </div>

      {/* Accounting Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5">
        <h4 className="font-bold text-sm text-slate-200 mb-3">تفصيل الإيرادات وهوامش الربح:</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <p className="font-bold text-slate-300">أجور العمل والتشخيص:</p>
            <div className="flex justify-between">
              <span className="text-slate-400">إجمالي عمالة الورشة:</span>
              <span className="font-mono text-white font-bold">{s.total_labor_revenue || 0} ج.م</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <p className="font-bold text-slate-300">محاسبة قطع الغيار والمخزون:</p>
            <div className="flex justify-between">
              <span className="text-slate-400">مبيعات القطع:</span>
              <span className="font-mono text-white">{p.billed || 0} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">تكلفة الشراء الفعلية:</span>
              <span className="font-mono text-rose-400">{p.cost || 0} ج.م</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1 font-bold">
              <span className="text-slate-300">هامش ربح القطع:</span>
              <span className="font-mono text-emerald-400">{p.margin || 0} ج.م</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <p className="font-bold text-slate-300">الضرائب والخصومات:</p>
            <div className="flex justify-between">
              <span className="text-slate-400">ضريبة القيمة المضافة:</span>
              <span className="font-mono text-slate-300">{s.total_vat || 0} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">خصومات العملاء:</span>
              <span className="font-mono text-rose-400">{s.total_discounts || 0} ج.م</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1">
              <span className="text-slate-400">ديون مستحقة بذمة العملاء:</span>
              <span className="font-mono text-amber-400 font-bold">{s.outstanding_receivables || 0} ج.م</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mechanics Productivity Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-sky-400" />
            إنتاجية الفنيين وساعات العمل المسجلة
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-xs">
              <tr>
                <th className="py-3 px-4">اسم الفني</th>
                <th className="py-3 px-4">التخصص</th>
                <th className="py-3 px-4">المهام المسندة</th>
                <th className="py-3 px-4">المهام المكتملة</th>
                <th className="py-3 px-4">نسبة الإنجاز</th>
                <th className="py-3 px-4">ساعات العمل المسجلة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {productivity.map((m) => {
                const rate = m.total_assigned_tasks > 0
                  ? Math.round((m.completed_tasks / m.total_assigned_tasks) * 100)
                  : 0;

                return (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">{m.full_name}</td>
                    <td className="py-3 px-4 text-slate-400">{m.specialty || 'ميكانيكا عامة'}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{m.total_assigned_tasks}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{m.completed_tasks}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-950 rounded-full h-2 max-w-[80px] overflow-hidden">
                          <div className="bg-sky-500 h-full rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-300">{rate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{m.total_hours_logged} ساعة</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
