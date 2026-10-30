import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple';
  size?: 'sm' | 'md';
  hasDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'blue',
  size = 'sm',
  hasDot = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-bold tracking-tight rounded-full transition-colors';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const variantStyles = {
    blue: 'bg-blue-50 text-blue-700 border border-blue-200/90 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200/90 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200/90 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/90 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  };

  const dotColors = {
    blue: 'bg-blue-600 dark:bg-blue-400',
    emerald: 'bg-emerald-600 dark:bg-emerald-400',
    amber: 'bg-amber-600 dark:bg-amber-400',
    rose: 'bg-rose-600 dark:bg-rose-400',
    slate: 'bg-slate-500',
    purple: 'bg-purple-600 dark:bg-purple-400',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {hasDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} shrink-0`} />
      )}
      <span>{children}</span>
    </span>
  );
};

