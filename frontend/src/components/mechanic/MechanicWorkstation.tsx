import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Camera,
  Play,
  CheckCircle2,
  Clock,
  Upload,
  AlertCircle,
  FileImage,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';

export const MechanicWorkstation: React.FC = () => {
  const { user } = useAuth();
  const { status, lastEvent } = useSync();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Photo upload state
  const [uploading, setUploading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const loadMechanicTasks = () => {
    // If logged in user is a mechanic, filter for their tasks, otherwise show all active work orders
    const mechFilter = user?.role === 'mechanic' ? user.id : undefined;
    api.getWorkOrders('in_progress', mechFilter)
      .then(res => setOrders(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMechanicTasks();
  }, []);

  useEffect(() => {
    if (lastEvent?.entity === 'tasks' || lastEvent?.entity === 'work_orders') {
      loadMechanicTasks();
    }
  }, [lastEvent]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      loadMechanicTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, workOrderId: string, taskId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('work_order_id', workOrderId);
    if (taskId) formData.append('task_id', taskId);
    formData.append('category', 'damage');
    formData.append('caption', 'صورة من باحة العمل الميدانية للفني');

    try {
      await api.uploadAttachment(formData);
      alert('تم رفع الصورة ومزامنتها مع أجهزة الإدارة في الوقت الفعلي!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Mobile Bay Header */}
      <div className="bg-gradient-to-r from-sky-900/60 to-slate-900 border border-sky-500/30 p-5 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">لوحة العمل الميدانية (Android Bay)</h3>
              <p className="text-xs text-sky-400">الفني: {user?.full_name}</p>
            </div>
          </div>
          <button
            onClick={loadMechanicTasks}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري تحميل المهام...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-bold text-slate-200">لا توجد مهام صيانة معلقة لك حالياً</p>
            <p className="text-xs text-slate-500 mt-1">جميع المهام منجزة أو لم تسند مهام جديدة بعد</p>
          </div>
        ) : (
          orders.map((wo) => (
            <div key={wo.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-sky-400 bg-slate-950 px-2 py-0.5 rounded">
                    {wo.order_number}
                  </span>
                  <h4 className="font-black text-base text-white mt-1">
                    {wo.make} {wo.model} ({wo.plate_number})
                  </h4>
                </div>
                <label className="cursor-pointer flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-2xl text-xs font-bold active:scale-95 transition-transform shadow-md shadow-sky-600/20">
                  <Camera className="w-4 h-4" />
                  <span>التقاط صورة</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, wo.id)}
                  />
                </label>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                {wo.description}
              </p>

              {/* Action Buttons for Mobile Touch */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => handleStatusChange(wo.id, 'in_progress')}
                  className="flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-3 rounded-2xl text-xs font-bold active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>بدء العمل بالمهمة</span>
                </button>
                <button
                  onClick={() => handleStatusChange(wo.id, 'completed')}
                  className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-3 rounded-2xl text-xs font-bold active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إكمال وإنجاز</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
