import React from 'react';
import { formatBytes, calcRatio } from '../../core/formatters';
import { ArrowRight, Sparkles } from 'lucide-react';

interface SizeBadgeProps {
  originalSize: number;
  newSize: number;
  className?: string;
}

export const SizeBadge: React.FC<SizeBadgeProps> = ({
  originalSize,
  newSize,
  className = '',
}) => {
  const ratioText = calcRatio(originalSize, newSize);
  const isReduced = originalSize > newSize;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium ${
        isReduced
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
          : 'bg-brand-blue-50/80 border-brand-blue-200 text-brand-blue-700'
      } ${className}`}
    >
      <span className="line-through opacity-60 font-mono">
        {formatBytes(originalSize)}
      </span>
      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
      <span className="font-bold font-mono text-slate-800">
        {formatBytes(newSize)}
      </span>
      <span
        className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-0.5 ${
          isReduced
            ? 'bg-emerald-500 text-white'
            : 'bg-brand-blue-500 text-white'
        }`}
      >
        <Sparkles className="w-3 h-3" />
        {ratioText}
      </span>
    </div>
  );
};
