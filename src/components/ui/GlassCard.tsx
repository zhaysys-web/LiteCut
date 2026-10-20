import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={`glass-panel rounded-2xl p-4 sm:p-6 transition-all duration-300 ${
        hoverable ? 'glass-card-hover cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
