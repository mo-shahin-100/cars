import React, { useRef, useEffect } from 'react';

interface LicensePlateInputProps {
  value: string;
  onChange: (plateNumber: string) => void;
  required?: boolean;
}

export const LicensePlateInput: React.FC<LicensePlateInputProps> = ({
  value,
  onChange,
  required = false
}) => {
  const l1Ref = useRef<HTMLInputElement>(null);
  const l2Ref = useRef<HTMLInputElement>(null);
  const l3Ref = useRef<HTMLInputElement>(null);
  const numRef = useRef<HTMLInputElement>(null);

  // Parse plate value into 3 letters and numbers
  const parsePlate = (str: string) => {
    if (!str) return { l1: '', l2: '', l3: '', num: '' };
    const numMatch = str.match(/\d+/);
    const num = numMatch ? numMatch[0].slice(0, 4) : '';
    const lettersOnly = str.replace(/[\d\s]/g, '');
    return {
      l1: lettersOnly[0] || '',
      l2: lettersOnly[1] || '',
      l3: lettersOnly[2] || '',
      num
    };
  };

  const { l1, l2, l3, num } = parsePlate(value);

  const updateCombined = (newL1: string, newL2: string, newL3: string, newNum: string) => {
    const letters = [newL1.trim(), newL2.trim(), newL3.trim()].filter(Boolean).join(' ');
    const full = letters + (newNum ? (letters ? ' ' : '') + newNum : '');
    onChange(full.trim());
  };

  const handleLetterChange = (
    index: 1 | 2 | 3,
    val: string,
    nextRef: React.RefObject<HTMLInputElement> | null
  ) => {
    // Only accept 1 letter (Arabic or English)
    const letter = val.replace(/[\d\s]/g, '').slice(-1).toUpperCase();

    if (index === 1) updateCombined(letter, l2, l3, num);
    if (index === 2) updateCombined(l1, letter, l3, num);
    if (index === 3) updateCombined(l1, l2, letter, num);

    if (letter && nextRef?.current) {
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

  const handleNumberChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    updateCombined(l1, l2, l3, cleaned);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentVal: string,
    prevRef: React.RefObject<HTMLInputElement> | null
  ) => {
    if (e.key === 'Backspace' && !currentVal && prevRef?.current) {
      e.preventDefault();
      prevRef.current.focus();
      prevRef.current.select();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const parsed = parsePlate(pasted);
    updateCombined(parsed.l1, parsed.l2, parsed.l3, parsed.num);
    if (parsed.num && numRef.current) {
      numRef.current.focus();
    }
  };

  return (
    <div className="space-y-1.5" dir="rtl">
      {/* 3 Letter Boxes + 1 Number Box */}
      <div className="flex items-center gap-2">
        {/* Letters Section (3 boxes) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Letter 1 */}
          <div className="relative">
            <input
              ref={l1Ref}
              type="text"
              maxLength={1}
              required={required}
              placeholder="أ"
              value={l1}
              onChange={(e) => handleLetterChange(1, e.target.value, l2Ref)}
              onKeyDown={(e) => handleKeyDown(e, l1, null)}
              onPaste={handlePaste}
              className="w-10 sm:w-11 h-11 text-center font-bold text-base bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-700 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner"
              title="الحرف الأول"
            />
          </div>

          {/* Letter 2 */}
          <div className="relative">
            <input
              ref={l2Ref}
              type="text"
              maxLength={1}
              required={required}
              placeholder="ب"
              value={l2}
              onChange={(e) => handleLetterChange(2, e.target.value, l3Ref)}
              onKeyDown={(e) => handleKeyDown(e, l2, l1Ref)}
              onPaste={handlePaste}
              className="w-10 sm:w-11 h-11 text-center font-bold text-base bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-700 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner"
              title="الحرف الثاني"
            />
          </div>

          {/* Letter 3 */}
          <div className="relative">
            <input
              ref={l3Ref}
              type="text"
              maxLength={1}
              required={required}
              placeholder="ج"
              value={l3}
              onChange={(e) => handleLetterChange(3, e.target.value, numRef)}
              onKeyDown={(e) => handleKeyDown(e, l3, l2Ref)}
              onPaste={handlePaste}
              className="w-10 sm:w-11 h-11 text-center font-bold text-base bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-700 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner"
              title="الحرف الثالث"
            />
          </div>
        </div>

        {/* Plate Vertical Divider */}
        <div className="flex flex-col items-center justify-center px-0.5">
          <div className="w-[1.5px] h-8 bg-slate-700 rounded-full" />
        </div>

        {/* Numbers Box (3-4 digits) */}
        <div className="flex-1 relative">
          <input
            ref={numRef}
            type="text"
            inputMode="numeric"
            maxLength={4}
            required={required}
            placeholder="123"
            value={num}
            onChange={(e) => handleNumberChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, num, l3Ref)}
            onPaste={handlePaste}
            className="w-full h-11 text-center font-mono font-bold text-base bg-slate-950 border border-slate-800 rounded-xl text-sky-400 placeholder-slate-700 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all tracking-widest shadow-inner"
            title="الأرقام (3 أرقام)"
          />
        </div>
      </div>

      {/* Mini Helper & Live Preview */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span className="flex items-center gap-1">
          <span>3 حروف</span>
          <span className="text-slate-700">•</span>
          <span>3 أرقام</span>
        </span>
        {(l1 || l2 || l3 || num) && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-200 font-bold">{[l1, l2, l3].filter(Boolean).join(' ') || '...'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-sky-400 font-bold">{num || '---'}</span>
          </span>
        )}
      </div>
    </div>
  );
};
