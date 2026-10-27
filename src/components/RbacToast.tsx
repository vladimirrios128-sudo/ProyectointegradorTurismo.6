import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  isWarning?: boolean;
}

interface RbacToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const RbacToastContainer: React.FC<RbacToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-[#141b24]/95 backdrop-blur-xl border rounded-2xl p-4 shadow-2xl flex gap-3 items-start transition-all duration-300 animate-in slide-in-from-bottom-4 ${
            toast.isWarning
              ? 'border-[#E67E22]/50 shadow-[#E67E22]/10'
              : 'border-red-500/50 shadow-red-500/10'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              toast.isWarning
                ? 'bg-[#E67E22]/20 text-[#E67E22]'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {toast.isWarning ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
          </div>

          <div className="flex-1 pr-2">
            <h4 className="text-xs font-bold text-white mb-0.5">{toast.title}</h4>
            <p className="text-[11px] text-neutral-300 leading-snug">{toast.message}</p>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
