import React from 'react';
import { Loader2 } from 'lucide-react';

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl min-h-[36px]',
    md: 'px-5 py-2.5 text-sm rounded-xl min-h-[44px]',
    lg: 'px-7 py-3.5 text-base rounded-2xl min-h-[50px] font-semibold',
  }[size];

  const variantClasses = {
    primary:
      'bg-btn-gradient hover:bg-btn-gradient-hover text-white shadow-md shadow-brand-pink-200/50 hover:shadow-lg hover:shadow-brand-pink-300/60 active:scale-[0.98]',
    secondary:
      'bg-white/90 hover:bg-white text-slate-700 border border-slate-200/80 shadow-sm hover:shadow active:scale-[0.98]',
    outline:
      'bg-transparent border border-brand-blue-400 text-brand-blue-600 hover:bg-brand-blue-50/60 active:scale-[0.98]',
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none select-none ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
