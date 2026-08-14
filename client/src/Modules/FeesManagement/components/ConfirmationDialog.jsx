import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmationDialog - Modal dialog for operations confirming destructive changes.
 */
const ConfirmationDialog = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Are you absolutely sure?',
  message = 'This action cannot be undone and will permanently modify or delete the records.',
  confirmText = 'Yes, Proceed',
  cancelText = 'Cancel',
  type = 'warning' // warning, danger, info
}) => {
  if (!isOpen) return null;

  const getColorTheme = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-rose-50 border-rose-100 text-rose-600',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-rose-600/10'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-50 border-blue-100 text-blue-600',
          btnBg: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-blue-600/10'
        };
      default: // warning
        return {
          iconBg: 'bg-amber-50 border-amber-100 text-amber-600',
          btnBg: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-amber-500/10'
        };
    }
  };

  const theme = getColorTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-white border border-[#EBEAE6] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
        {/* Header Close */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg border border-slate-200 hover:bg-[#FAF9F6] text-slate-400 hover:text-slate-600 transition-all cursor-pointer outline-none"
        >
          <X size={14} />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${theme.iconBg}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">{title}</h4>
            <p className="text-[10px] text-slate-400 font-semibold leading-normal">Confirm administrative request</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
          {message}
        </p>

        {/* Actions Button Grid */}
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="w-full py-2 border border-[#DEDCD8] bg-white text-slate-600 hover:bg-[#FAF9F6] rounded-xl text-[11px] font-bold transition-all cursor-pointer outline-none"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full py-2 border rounded-xl text-[11px] font-bold transition-all cursor-pointer outline-none shadow-sm ${theme.btnBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
