import React, { useState, useEffect } from 'react';
import { Plus, Check, RotateCcw, Sparkles } from 'lucide-react';
import {
  getCarCatalog,
  addCustomBrand,
  addCustomModel,
  CarBrand
} from '../../data/carCatalog';

interface CarBrandModelSelectorProps {
  selectedMake: string;
  selectedModel: string;
  onMakeChange: (make: string) => void;
  onModelChange: (model: string) => void;
  required?: boolean;
}

export const CarBrandModelSelector: React.FC<CarBrandModelSelectorProps> = ({
  selectedMake,
  selectedModel,
  onMakeChange,
  onModelChange,
  required = true
}) => {
  const [catalog, setCatalog] = useState<CarBrand[]>([]);
  const [customMakeMode, setCustomMakeMode] = useState(false);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [newMakeInput, setNewMakeInput] = useState('');
  const [newModelInput, setNewModelInput] = useState('');

  // Load catalog on mount
  useEffect(() => {
    const data = getCarCatalog();
    setCatalog(data);
  }, []);

  // Determine active brand in catalog
  const currentBrand = catalog.find(
    b =>
      b.name.toLowerCase() === (selectedMake || '').toLowerCase() ||
      b.nameAr === selectedMake ||
      b.id === selectedMake
  );

  // Available models for currently selected brand
  const availableModels = currentBrand ? currentBrand.models : [];

  // When selectedMake changes externally and is not in catalog, activate custom mode; or reset when empty
  useEffect(() => {
    if (selectedMake && catalog.length > 0) {
      const exists = catalog.some(
        b =>
          b.name.toLowerCase() === selectedMake.toLowerCase() ||
          b.nameAr === selectedMake ||
          b.id === selectedMake
      );
      if (!exists && !customMakeMode) {
        setCustomMakeMode(true);
        setNewMakeInput(selectedMake);
      }
    } else if (!selectedMake) {
      setCustomMakeMode(false);
      setCustomModelMode(false);
      setNewMakeInput('');
      setNewModelInput('');
    }
  }, [selectedMake, catalog]);

  // Handle Make select change
  const handleSelectMake = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setCustomMakeMode(true);
      setNewMakeInput('');
      onMakeChange('');
      onModelChange('');
      return;
    }

    onMakeChange(val);
    onModelChange(''); // Reset model when make changes
    setCustomModelMode(false);
  };

  // Save new custom brand
  const handleSaveCustomBrand = () => {
    const trimmed = newMakeInput.trim();
    if (!trimmed) return;

    const updated = addCustomBrand(trimmed);
    setCatalog(updated);
    onMakeChange(trimmed);
    setCustomMakeMode(false);
  };

  // Handle Model select change
  const handleSelectModel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setCustomModelMode(true);
      setNewModelInput('');
      onModelChange('');
      return;
    }

    onModelChange(val);
  };

  // Save new custom model
  const handleSaveCustomModel = () => {
    const trimmed = newModelInput.trim();
    if (!trimmed) return;

    if (selectedMake) {
      const updated = addCustomModel(selectedMake, trimmed);
      setCatalog(updated);
    }
    onModelChange(trimmed);
    setCustomModelMode(false);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 col-span-1 sm:col-span-2">
      {/* 1. حقل الماركة (نوع العربية) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-slate-300">
            ماركة السيارة (النوع) {required && <span className="text-rose-400">*</span>}
          </label>
          <button
            type="button"
            onClick={() => {
              if (customMakeMode) {
                setCustomMakeMode(false);
                setNewMakeInput('');
              } else {
                setCustomMakeMode(true);
                setNewMakeInput(selectedMake || '');
              }
            }}
            className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium transition-colors"
          >
            {customMakeMode ? (
              <>
                <RotateCcw className="w-3 h-3" />
                <span>اختيار من القائمة</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>إضافة ماركة جديدة</span>
              </>
            )}
          </button>
        </div>

        {customMakeMode ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              required={required}
              placeholder="اكتب الماركة (مثال: تويوتا / Toyota)..."
              value={newMakeInput}
              onChange={(e) => {
                setNewMakeInput(e.target.value);
                onMakeChange(e.target.value);
              }}
              className="flex-1 bg-slate-950 border border-sky-500/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500/40"
              autoFocus
            />
            {newMakeInput.trim() && (
              <button
                type="button"
                onClick={handleSaveCustomBrand}
                title="حفظ الماركة في القائمة الدائمة"
                className="bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">حفظ</span>
              </button>
            )}
          </div>
        ) : (
          <select
            required={required}
            value={
              currentBrand
                ? currentBrand.name
                : selectedMake || ''
            }
            onChange={handleSelectMake}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
          >
            <option value="">اختر ماركة السيارة (النوع)...</option>
            {catalog.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name} ({b.nameAr})
              </option>
            ))}
            <option value="__ADD_NEW__" className="text-sky-400 font-bold bg-slate-900">
              ➕ إضافة ماركة غير موجودة بالقائمة...
            </option>
          </select>
        )}
      </div>

      {/* 2. حقل الموديل */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-slate-300">
            موديل السيارة {required && <span className="text-rose-400">*</span>}
          </label>
          <button
            type="button"
            onClick={() => {
              if (customModelMode) {
                setCustomModelMode(false);
                setNewModelInput('');
              } else {
                setCustomModelMode(true);
                setNewModelInput(selectedModel || '');
              }
            }}
            className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium transition-colors"
          >
            {customModelMode ? (
              <>
                <RotateCcw className="w-3 h-3" />
                <span>اختيار من القائمة</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>إضافة موديل جديد</span>
              </>
            )}
          </button>
        </div>

        {customModelMode ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              required={required}
              placeholder="اكتب الموديل (مثال: Corolla / Yaris)..."
              value={newModelInput}
              onChange={(e) => {
                setNewModelInput(e.target.value);
                onModelChange(e.target.value);
              }}
              className="flex-1 bg-slate-950 border border-sky-500/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500/40"
              autoFocus
            />
            {newModelInput.trim() && (
              <button
                type="button"
                onClick={handleSaveCustomModel}
                title="حفظ الموديل في القائمة الدائمة لهذه الماركة"
                className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">حفظ</span>
              </button>
            )}
          </div>
        ) : (
          <select
            required={required}
            value={selectedModel}
            onChange={handleSelectModel}
            disabled={!selectedMake}
            className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-colors ${
              !selectedMake
                ? 'border-slate-800/60 opacity-60 cursor-not-allowed text-slate-500'
                : 'border-slate-800'
            }`}
          >
            <option value="">
              {!selectedMake
                ? 'اختر الماركة أولاً لتحديد الموديل...'
                : `اختر موديل ${selectedMake}...`}
            </option>
            {availableModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            {selectedMake && (
              <option value="__ADD_NEW__" className="text-emerald-400 font-bold bg-slate-900">
                ➕ إضافة موديل آخر لـ {selectedMake}...
              </option>
            )}
          </select>
        )}
      </div>
    </div>
  );
};
