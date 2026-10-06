import React, { useState, useEffect } from 'react';
import { WalletCards, Plus, Search, Calendar, DollarSign, X, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { Expense } from '../../types';

export const ExpensesView: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [formData, setFormData] = useState({
    category: 'إيجار الورشة',
    amount: 1500,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    recipient: 'مالك العقار',
    description: 'دفعة إيجار شهرية للمركز'
  });

  const [submitting, setSubmitting] = useState(false);

  const loadExpenses = () => {
    api.getExpenses(categoryFilter)
      .then(res => setExpenses(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExpenses();
  }, [categoryFilter]);

  const handleDeleteExpense = async (id: string, number: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف سند المصروف رقم "${number}" نهائياً؟`)) {
      return;
    }
    try {
      await api.deleteExpense(id);
      loadExpenses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.amount || !formData.description) return;

    setSubmitting(true);
    try {
      await api.createExpense(formData);
      setShowAddModal(false);
      loadExpenses();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs">
            <span className="text-slate-400">إجمالي المصروفات: </span>
            <strong className="text-rose-400 font-mono text-sm">{totalAmount.toLocaleString()} ج.م</strong>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل مصروف جديد</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">جاري جلب المصروفات...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <WalletCards className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-300">لم يتم تسجيل أي مصروفات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-xs">
                <tr>
                  <th className="py-3.5 px-4">رقم السند</th>
                  <th className="py-3.5 px-4">التصنيف</th>
                  <th className="py-3.5 px-4">البيان</th>
                  <th className="py-3.5 px-4">المستلم / الجهة</th>
                  <th className="py-3.5 px-4">المبلغ</th>
                  <th className="py-3.5 px-4">التاريخ</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">{e.expense_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{e.category}</td>
                    <td className="py-3 px-4 text-slate-300">{e.description}</td>
                    <td className="py-3 px-4 text-slate-400">{e.recipient || '-'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">{e.amount.toLocaleString()} ج.م</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{e.expense_date}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteExpense(e.id, e.expense_number)}
                        className="p-1 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors"
                        title="حذف هذا المصروف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white">تسجيل مصروف جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">تصنيف المصروف *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                >
                  <option value="إيجار الورشة">إيجار الورشة والمستودع</option>
                  <option value="رواتب وأجور">رواتب وأجور العمالة</option>
                  <option value="فواتير كهرباء ومياه">فواتير كهرباء ومياه وهاتف</option>
                  <option value="أدوات ومعدات صيانة">أدوات ومعدات فحص وصيانة</option>
                  <option value="شحن ونقل">شحن ونقل قطع</option>
                  <option value="مصاريف نثرية">مصاريف نثرية وضيافة</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ الصرف</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الجهة المستلمة</label>
                <input
                  type="text"
                  placeholder="اسم الشخص أو الشركة المستلمة"
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">البيان والشرح *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="وصف تفصيلي لبند المصروف..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ المصروف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
