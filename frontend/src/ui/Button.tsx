import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn.js';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-strong disabled:opacity-50 shadow-card',
  secondary:
    'bg-surface text-ink border border-line hover:bg-brand-soft disabled:opacity-50',
  ghost: 'bg-transparent text-brand hover:bg-brand-soft disabled:opacity-50',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
  accent: 'bg-accent text-white hover:opacity-90 disabled:opacity-50 shadow-card',
};

const sizes: Record<Size, string> = {
  md: 'min-h-[44px] px-4 text-base',
  lg: 'min-h-[56px] px-6 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    />
  );
}
