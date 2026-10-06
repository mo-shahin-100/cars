import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  User,
  Phone,
  Mail,
  Wrench,
  X,
  Check,
  Trash2,
  Edit3,
  Search,
  Key,
  DollarSign,
  AlertTriangle,
  MessageCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { User as UserType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const UsersView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserType | null>(null);

  // Add form data
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    phone: '',
    email: '',
    role: 'mechanic',
    specialty: 'ميكانيكا عامة ومحركات',
    hourly_rate: 0
  });

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    role: 'mechanic',
    specialty: '',
    hourly_rate: 0,
    password: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    api.getUsers()
      .then(res => setUsers(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim() || !formData.full_name.trim()) {
      alert('يرجى كتابة الاسم الكامل واسم الدخول وكلمة المرور');
      return;
    }

    setSubmitting(true);
    try {
      await api.createUser(formData);
      setShowAddModal(false);
      setFormData({
        username: '',
        password: '',
        full_name: '',
        phone: '',
        email: '',
        role: 'mechanic',
        specialty: 'ميكانيكا عامة ومحركات',
        hourly_rate: 0
      });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'فشل في إنشاء الحساب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (u: any) => {
    setEditingUser(u);
    setEditFormData({
      full_name: u.full_name || '',
      phone: u.phone || '',
      email: u.email || '',
      role: u.role || 'mechanic',
      specialty: u.specialty || '',
      hourly_rate: u.hourly_rate || 0,
      password: ''
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    try {
      await api.updateUser(editingUser.id, editFormData);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'فشل في تحديث بيانات المستخدم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setSubmitting(true);
    try {
      await api.deleteUser(deletingUser.id);
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'فشل في حذف المستخدم');
    } finally {
      setSubmitting(false);
    }
  };

  const roleBadges: Record<string, { label: string; color: string }> = {
    owner: {
      label: 'صاحب الورشة (Owner)',
      color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
    },
    manager: {
      label: 'مدير العمليات (Manager)',
      color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
    },
    reception: {
      label: 'موظف الاستقبال (Reception)',
      color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30'
    },
    accountant: {
      label: 'محاسب الورشة (Accountant)',
      color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    },
    mechanic: {
      label: 'فني / ميكانيكي (Mechanic)',
      color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
    }
  };

  // Filter users based on search and role
  const filteredUsers = users.filter((u: any) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.specialty?.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const cardBg = isDark ? 'bg-[#0b1329] border-white/10' : 'bg-white border-slate-200 shadow-sm';
  const inputBg = isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-sky-500" />
            <span>طاقم العمل والمستخدمون</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            إدارة حسابات الفنيين والموظفين، وتعيين الصلاحيات، وإضافة وحذف الأعضاء
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة موظف / فني جديد</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، اسم المستخدم، التخصص، أو الهاتف..."
            className={`w-full pr-9 pl-4 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:border-sky-500 ${inputBg}`}
          />
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
        </div>

        {/* Role Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'mechanic', label: 'الميكانيكيون' },
            { id: 'reception', label: 'الاستقبال' },
            { id: 'accountant', label: 'المحاسبة' },
            { id: 'manager', label: 'الإدارة' },
            { id: 'owner', label: 'المالك' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                roleFilter === tab.id
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : isDark
                    ? 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.08]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="font-bold">جاري تحميل طاقم العمل...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 border border-dashed rounded-3xl border-slate-300 dark:border-white/10">
            <User className="w-12 h-12 mx-auto mb-3 text-slate-500 opacity-60" />
            <p className="font-bold text-slate-700 dark:text-slate-300">لم يتم العثور على موظفين يطابقون البحث</p>
            <p className="text-xs text-slate-500 mt-1">يمكنك إضافة عضو جديد لطاقم العمل بالضغط على زر الإضافة أعلاه</p>
          </div>
        ) : (
          filteredUsers.map((u: any) => {
            const roleInfo = roleBadges[u.role] || {
              label: u.role_display || u.role,
              color: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
            };
            const isSelf = currentUser?.id === u.id;

            return (
              <div
                key={u.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all hover:border-sky-500/30 ${cardBg}`}
              >
                <div>
                  {/* Card Header: Avatar + Role Badge + Self Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center font-black text-sky-400 text-base shadow-inner">
                        {u.full_name?.charAt(0) || 'م'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">
                          {u.full_name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5" dir="ltr">
                          @{u.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.2 rounded-md border border-emerald-500/20">
                          حسابك الحالي ✓
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Specialty Box */}
                  {u.specialty && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-white/[0.06] text-xs">
                      <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">التخصص والمهام:</span>
                      <p className="text-slate-700 dark:text-slate-200 font-medium">{u.specialty}</p>
                    </div>
                  )}

                  {/* Contact Info & Rate */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {u.phone && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>الهاتف:</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                            {u.phone}
                          </span>
                          <a
                            href={`https://api.whatsapp.com/send?phone=${u.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors"
                            title="محادثة واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {u.hourly_rate > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                          <span>أجر الساعة:</span>
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {u.hourly_rate} ج.م / س
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions: Edit & Delete */}
                <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleStartEdit(u)}
                    className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/[0.05] hover:bg-sky-50 dark:hover:bg-sky-500/15 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-white/10 hover:border-sky-500/30 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>

                  <button
                    onClick={() => setDeletingUser(u)}
                    disabled={isSelf}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isSelf
                        ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-white/[0.02] text-slate-400'
                        : 'bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 active:scale-95'
                    }`}
                    title={isSelf ? 'لا يمكنك حذف حسابك الحالي' : 'حذف من طاقم العمل'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${cardBg}`}>
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-800 dark:text-white">إضافة موظف / فني لطاقم العمل</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 overflow-y-auto text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد الله"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الدخول (Username) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ahmed"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">كلمة المرور *</label>
                  <input
                    type="password"
                    required
                    placeholder="كلمة المرور للدخول"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الدور الوظيفي والصلاحية *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 ${inputBg}`}
                  >
                    <option value="mechanic">فني / ميكانيكي (Mechanic)</option>
                    <option value="reception">موظف استقبال (Reception)</option>
                    <option value="accountant">محاسب الورشة (Accountant)</option>
                    <option value="manager">مدير عمليات (Manager)</option>
                    <option value="owner">صاحب الورشة (Owner)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف / الواتساب</label>
                  <input
                    type="tel"
                    placeholder="01012345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">التخصص والمهام الفنية</label>
                  <input
                    type="text"
                    placeholder="ميكانيكا محركات، كهرباء وتشخيص، عفشة..."
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">أجر الساعة (إن وجد)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.hourly_rate || ''}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'جاري الإنشاء...' : 'إضافة الموظف الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${cardBg}`}>
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">تعديل بيانات الموظف</h3>
                  <p className="text-xs text-slate-400 font-mono">@{editingUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-5 space-y-4 overflow-y-auto text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الدور الوظيفي والصلاحية *</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 ${inputBg}`}
                  >
                    <option value="mechanic">فني / ميكانيكي (Mechanic)</option>
                    <option value="reception">موظف استقبال (Reception)</option>
                    <option value="accountant">محاسب الورشة (Accountant)</option>
                    <option value="manager">مدير عمليات (Manager)</option>
                    <option value="owner">صاحب الورشة (Owner)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف / الواتساب</label>
                  <input
                    type="tel"
                    placeholder="01012345678"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">التخصص والمهام</label>
                  <input
                    type="text"
                    placeholder="ميكانيكا محركات، كهرباء..."
                    value={editFormData.specialty}
                    onChange={(e) => setEditFormData({ ...editFormData, specialty: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">أجر الساعة (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editFormData.hourly_rate || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, hourly_rate: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة مرور جديدة (اختياري - اتركه فارغاً إذا لم ترغب بتغييرها)
                </label>
                <input
                  type="password"
                  placeholder="******"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-sky-500 font-mono ${inputBg}`}
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95 duration-150">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-5 space-y-4 ${cardBg}`}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-black text-base text-slate-800 dark:text-white">
                تأكيد حذف الموظف من طاقم العمل
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                هل أنت متأكد من حذف حساب الموظف <strong className="text-slate-800 dark:text-white">"{deletingUser.full_name}"</strong>؟
                <br />
                <span className="text-[11px] text-amber-500 block mt-1">
                  ملاحظة: سيتم إيقاف دخوله للنظام مع الاحتفاظ بسجل المهام والأوامر السابقة للأمان والتدقيق.
                </span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all"
              >
                {submitting ? 'جاري الحذف...' : 'نعم، تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
