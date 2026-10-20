import React from 'react';
import { XCircle } from 'lucide-react';

interface ProgressBarProps {
  progress: number; // 0 ~ 100
  statusText?: string;
  onCancel?: () => void;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  statusText = '正在极速处理中...',
  onCancel,
  className = '',
}) => {
  const clampedProgress = Math.min(Math.max(Math.round(progress), 0), 100);

  return (
    <div className={`w-full bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/80 shadow-md ${className}`}>
      <div className="flex items-center justify-between text-xs sm:text-sm font-medium mb-2.5">
        <span className="text-slate-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-blue-400 animate-ping" />
          {statusText}
        </span>
        <span className="font-mono text-brand-blue-600 font-bold text-sm sm:text-base">
          {clampedProgress}%
        </span>
      </div>

      {/* 进度条轨道 */}
      <div className="w-full h-3 bg-slate-100/90 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
        <div
          className="h-full rounded-full bg-btn-gradient transition-all duration-300 relative shadow-sm"
          style={{ width: `${clampedProgress}%` }}
        >
          {/* 流光微动效 */}
          <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
        </div>
      </div>

      {onCancel && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onCancel}
            type="button"
            className="text-xs text-slate-400 hover:text-rose-500 inline-flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            取消处理
          </button>
        </div>
      )}
    </div>
  );
};
