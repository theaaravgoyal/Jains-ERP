import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

/**
 * DatePicker with strict DD/MM/YYYY formatting:
 * - Displays DD/MM/YYYY format in the text input box
 * - Allows typing in DD/MM/YYYY directly
 * - Hidden native date picker for the interactive calendar popup
 * - Automatically keeps formatted display text and ISO YYYY-MM-DD in sync
 */
const DatePicker = ({
  label = '',
  value = '',
  onChange,
  className = '',
  placeholder = 'DD/MM/YYYY',
  ...props
}) => {
  const hiddenInputRef = useRef(null);

  // Convert YYYY-MM-DD or date string to DD/MM/YYYY for display
  const toDisplayFormat = (val) => {
    if (!val) return '';
    // If already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
    // If in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      const parts = val.split('T')[0].split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD
  const toIsoFormat = (val) => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const parts = val.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return val;
  };

  const [displayText, setDisplayText] = useState(() => toDisplayFormat(value));

  useEffect(() => {
    setDisplayText(toDisplayFormat(value));
  }, [value]);

  const handleTextChange = (e) => {
    const raw = e.target.value;
    setDisplayText(raw);
    
    if (raw === '') {
      onChange && onChange('');
      return;
    }

    // If matches DD/MM/YYYY
    const parts = raw.split('/');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange && onChange(iso);
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      onChange && onChange(raw);
    }
  };

  const handleCalendarPickerChange = (e) => {
    const selectedIso = e.target.value;
    if (selectedIso) {
      setDisplayText(toDisplayFormat(selectedIso));
      onChange && onChange(selectedIso);
    }
  };

  const openCalendar = () => {
    if (hiddenInputRef.current) {
      try {
        if (typeof hiddenInputRef.current.showPicker === 'function') {
          hiddenInputRef.current.showPicker();
        } else {
          hiddenInputRef.current.focus();
        }
      } catch (err) {
        hiddenInputRef.current.focus();
      }
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>}
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={openCalendar}
          className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-amber-500 transition-colors bg-transparent border-0 cursor-pointer outline-none z-10"
          title="Open Calendar"
        >
          <Calendar size={15} />
        </button>
        <input
          type="text"
          value={displayText}
          onChange={handleTextChange}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2 border border-[#DEDCD8] bg-white rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300 transition-all font-mono"
          {...props}
        />
        {/* Hidden native date input to show calendar dialog */}
        <input
          ref={hiddenInputRef}
          type="date"
          value={toIsoFormat(value)}
          onChange={handleCalendarPickerChange}
          className="absolute opacity-0 pointer-events-none w-0 h-0 -z-10"
          tabIndex={-1}
        />
      </div>
    </div>
  );
};

export default DatePicker;
