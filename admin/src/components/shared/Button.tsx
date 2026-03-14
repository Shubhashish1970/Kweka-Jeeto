/**
 * Shared Button per UI_STANDARDS — primary, secondary, danger, ghost.
 * Heights: h-10 for form/list actions; sizes sm/md/lg.
 */
import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center font-bold rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 disabled:opacity-70 disabled:pointer-events-none';
const variants: Record<Variant, string> = {
  primary: 'bg-primary hover:bg-primary-variant text-white',
  secondary:
    'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300',
  danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/20',
  ghost: 'text-slate-700 hover:bg-slate-100',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-10 min-h-10 px-4 py-2 text-sm',
  lg: 'h-12 px-6 text-base',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
