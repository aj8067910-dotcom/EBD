import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn.js';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${inputId}-desc` : undefined}
        className={cn(
          'min-h-[52px] rounded-xl border bg-surface px-4 text-lg text-ink',
          'placeholder:text-muted',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      />
      {(hint || error) && (
        <span
          id={`${inputId}-desc`}
          className={cn('text-sm', error ? 'text-danger' : 'text-muted')}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  );
});
