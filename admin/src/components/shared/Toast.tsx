/**
 * Toast — per UI_STANDARDS.md
 * Fixed top-right; auto-dismiss after 4s.
 * Success: bg-primary/10 border-primary/30 text-primary
 * Error:   bg-red-50 border-red-200 text-red-800
 */
import { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
}

const styles: Record<ToastType, { container: string; icon: string }> = {
  success: {
    container: 'bg-primary/10 border-primary/30 text-primary',
    icon: 'bg-primary/20 text-primary',
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: 'bg-red-100 text-red-600',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'bg-blue-100 text-blue-600',
  },
};

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'i',
};

export default function Toast({ type, message, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const s = styles[type];
  return (
    <div className={`fixed top-4 right-4 z-[10000] flex items-center gap-3 rounded-xl border shadow-lg px-4 py-3 ${s.container}`}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${s.icon}`}>
        {icons[type]}
      </span>
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
    </div>
  );
}
