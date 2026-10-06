import React, { useState, useEffect } from 'react';
import { Settings, Download, Database, ShieldCheck, HardDrive, RefreshCw, AlertOctagon, Trash2, Edit3, Check, X, Building2, MapPin, Receipt, Phone, Mail } from 'lucide-react';
import { api, getAuthToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Workshop Profile State
  const [workshop, setWorkshop] = useState<any>({
    name: 'مركز النخبة المتقدم لصيانة وبرمجة السيارات',
    commercial_reg: '1010987654',
    tax_number: '300987654300003',
    phone: '',
    email: '',
    address: 'القاهرة — المنطقة الصناعية — مصر',
    currency: 'EGP',
    tax_rate: 15.0
  });

  const [isEditingWorkshop, setIsEditingWorkshop] = useState(false);
  const [workshopForm, setWorkshopForm] = useState<any>({ ...workshop });
  const [savingWorkshop, setSavingWorkshop] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadWorkshop = () => {
    api.getWorkshopProfile()
      .then(res => {
        if (res.data) {
          setWorkshop(res.data);
          setWorkshopForm(res.data);
        }
      })
      .catch(err => console.error(err));
  };

  const loadBackups = () => {
    if (user?.role !== 'owner') return;
    setLoading(true);
    api.listBackups()
      .then(res => setBackups(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWorkshop();
    loadBackups();
  }, []);

  const handleStartEditWorkshop = () => {
    setWorkshopForm({ ...workshop });
    setIsEditingWorkshop(true);
  };

  const handleSaveWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWorkshop(true);
    try {
      const res = await api.updateWorkshopProfile(workshopForm);
      if (res.data) {
        setWorkshop(res.data);
      }
      setIsEditingWorkshop(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      alert(err.message || 'فشل في حفظ بيانات الورشة');
    } finally {
      setSavingWorkshop(false);
    }
  };

  const handleResetDemoData = async () => {
    const confirmText = prompt('تنبيه هام جداً: سيتم حذف كافة البيانات التجريبية (العملاء، السيارات، الزيارات، أوامر الإصلاح، الفواتير، المصروفات، وحركات المخزون) لتفريغ الورشة للعمل الفعلي الحقيقي.\n\nلتأكيد المسح النهائي، اكتب كلمة "حذف" في المربع أدناه ثم اضغط موافق:');
    if (confirmText !== 'حذف') {
      if (confirmText !== null) alert('تم إلغاء العملية لعدم مطابقة كلمة التأكيد.');
      return;
    }

    setResetting(true);
    try {
      const res = await api.resetDemoData();
      alert(res.message || 'تم تصفير البيانات بنجاح!');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'فشل في تصفير البيانات');
    } finally {
      setResetting(false);
    }
  };

  const handleDownloadBackup = () => {
    setBackingUp(true);
    const token = getAuthToken();
    const downloadUrl = `/api/backup/create`;

    // Fetch as blob to download safely with token
    fetch(downloadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('فشل في إنشاء النسخة الاحتياطية');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workshop_backup_${new Date().toISOString().slice(0, 10)}.db`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        loadBackups();
      })
      .catch(err => alert(err.message))
      .finally(() => setBackingUp(false));
  };

  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const itemBg = isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';
  const inputBg = isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="font-bold text-sm text-slate-300">إعدادات الورشة والنسخ الاحتياطي</h3>
        <p className="text-xs text-slate-500 mt-0.5">معلومات المركز التجاري، وأدوات الحماية، والنسخ الاحتياطي اللحظي</p>
      </div>

      {/* Workshop Profile Card */}
      <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-400" />
            <div>
              <h4 className="font-bold text-sm text-white">بيانات ورشة الصيانة</h4>
              <p className="text-xs text-slate-400">تظهر هذه البيانات على الفواتير، التقارير المطبوعة، ورسائل الواتساب</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-xl flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>تم حفظ التعديلات بنجاح!</span>
              </span>
            )}

            {!isEditingWorkshop && (
              <button
                onClick={handleStartEditWorkshop}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 active:scale-95 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل البيانات</span>
              </button>
            )}
          </div>
        </div>

        {/* Display Mode */}
        {!isEditingWorkshop ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className={`p-3.5 rounded-xl border ${itemBg}`}>
              <span className="text-slate-400">اسم الورشة التجاري:</span>
              <p className="font-bold text-slate-100 text-sm mt-1">{workshop.name || '-'}</p>
            </div>
            <div className={`p-3.5 rounded-xl border ${itemBg}`}>
              <span className="text-slate-400">السجل التجاري:</span>
              <p className="font-mono font-bold text-slate-100 text-sm mt-1">{workshop.commercial_reg || '-'}</p>
            </div>
            <div className={`p-3.5 rounded-xl border ${itemBg}`}>
              <span className="text-slate-400">الرقم الضريبي (VAT):</span>
              <p className="font-mono font-bold text-slate-100 text-sm mt-1">{workshop.tax_number || '-'}</p>
            </div>
            <div className={`p-3.5 rounded-xl border ${itemBg}`}>
              <span className="text-slate-400">العملة الأساسية المعتمدة:</span>
              <p className="font-bold text-emerald-400 text-sm mt-1">
                {workshop.currency === 'EGP' ? 'الجنيه المصري (EGP / ج.م)' : workshop.currency}
              </p>
            </div>
            <div className={`p-3.5 rounded-xl border ${itemBg} sm:col-span-2`}>
              <span className="text-slate-400">العنوان:</span>
              <p className="font-semibold text-slate-100 mt-1">{workshop.address || '-'}</p>
            </div>
            {workshop.phone && (
              <div className={`p-3.5 rounded-xl border ${itemBg}`}>
                <span className="text-slate-400">هاتف الورشة:</span>
                <p className="font-mono font-bold text-slate-100 text-sm mt-1" dir="ltr">{workshop.phone}</p>
              </div>
            )}
            {workshop.email && (
              <div className={`p-3.5 rounded-xl border ${itemBg}`}>
                <span className="text-slate-400">البريد الإلكتروني:</span>
                <p className="font-mono font-bold text-slate-100 text-sm mt-1">{workshop.email}</p>
              </div>
            )}
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSaveWorkshop} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم الورشة التجاري *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مركز النخبة المتقدم لصيانة وبرمجة السيارات"
                  value={workshopForm.name || ''}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-bold ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">السجل التجاري</label>
                <input
                  type="text"
                  placeholder="رقم السجل التجاري"
                  value={workshopForm.commercial_reg || ''}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, commercial_reg: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الرقم الضريبي (VAT)</label>
                <input
                  type="text"
                  placeholder="رقم البطاقة أو التسجيل الضريبي"
                  value={workshopForm.tax_number || ''}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, tax_number: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">العنوان الكامل للورشة</label>
                <input
                  type="text"
                  placeholder="المدينة — المنطقة — الشارع..."
                  value={workshopForm.address || ''}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, address: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم هاتف الورشة للتواصل</label>
                <input
                  type="tel"
                  placeholder="010xxxxxxxx"
                  value={workshopForm.phone || ''}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, phone: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">البريد الإلكتروني للورشة</label>
                <input
                  type="email"
                  placeholder="info@workshop.com"
                  value={workshopForm.email || ''}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, email: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingWorkshop(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingWorkshop}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{savingWorkshop ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Database Hot Backup Card (Owner Only) */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              النسخ الاحتياطي اللحظي والساخن (Hot Database Backup)
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              إنشاء نسخة متطابقة كاملة من قاعدة البيانات SQLite دون إيقاف الخادم أو مقاطعة عمل الفنيين.
            </p>
          </div>

          <button
            onClick={handleDownloadBackup}
            disabled={backingUp || user?.role !== 'owner'}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{backingUp ? 'جاري النسخ...' : 'إنشاء وتحميل نسخة احتياطية الآن'}</span>
          </button>
        </div>

        {user?.role !== 'owner' ? (
          <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">
            تنبيه: تنزيل النسخ الاحتياطية مقيد ومحصور بصلاحية صاحب الورشة (Owner) فقط.
          </p>
        ) : (
          <div className="pt-2">
            <h5 className="text-xs font-bold text-slate-400 mb-2">النسخ الاحتياطية المحفوظة محلياً على الخادم:</h5>
            <div className="space-y-2">
              {backups.length > 0 ? (
                backups.map((b, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                    <span className="font-mono text-slate-200">{b.name}</span>
                    <span className="text-slate-400 font-mono">{(b.size / 1024).toFixed(1)} KB | {new Date(b.created_at).toLocaleString('ar-SA')}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  لم يتم حفظ نسخ مجدولة سابقة حتى الآن.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Wipe & Reset Demo Data Card (Owner Only) */}
      <div className="bg-slate-900 border border-rose-900/40 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-sm text-rose-400 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              تصفير النظام وحذف كافة البيانات التجريبية (Purge Demo Data)
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              حذف كافة بيانات الاختبار والبيانات التجريبية (العملاء، السيارات، الزيارات، أوامر الإصلاح، الفواتير، المصروفات، وحركات المخزون) لتبدأ بسجل نظيف تماماً مع الحفاظ على حسابات المستخدمين وصلاحياتهم.
            </p>
          </div>

          <button
            onClick={handleResetDemoData}
            disabled={resetting || user?.role !== 'owner'}
            className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/20 active:scale-95 disabled:opacity-50 transition-all shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>{resetting ? 'جاري التصفير...' : 'تصفير وحذف كافة البيانات التجريبية'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
