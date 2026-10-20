import React, { useRef, useState, useEffect } from 'react';
import { formatTime } from '../../core/formatters';

interface RangeSliderProps {
  duration: number;
  startTime: number;
  endTime: number;
  currentTime?: number;
  onChange: (start: number, end: number) => void;
  onSeek?: (time: number) => void;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  duration,
  startTime,
  endTime,
  currentTime,
  onChange,
  onSeek,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null);

  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const currentPercent =
    duration > 0 && currentTime !== undefined
      ? Math.min((currentTime / duration) * 100, 100)
      : null;

  const handlePointerDown = (handle: 'start' | 'end', e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveHandle(handle);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * duration;

    if (activeHandle === 'start') {
      const newStart = Math.min(targetTime, endTime - 0.5);
      onChange(Math.max(0, newStart), endTime);
      onSeek?.(newStart);
    } else {
      const newEnd = Math.max(targetTime, startTime + 0.5);
      onChange(startTime, Math.min(duration, newEnd));
      onSeek?.(newEnd);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setActiveHandle(null);
    }
  };

  const adjustTime = (type: 'start' | 'end', delta: number) => {
    if (type === 'start') {
      const next = Math.max(0, Math.min(startTime + delta, endTime - 0.2));
      onChange(next, endTime);
      onSeek?.(next);
    } else {
      const next = Math.min(duration, Math.max(endTime + delta, startTime + 0.2));
      onChange(startTime, next);
      onSeek?.(next);
    }
  };

  return (
    <div className="w-full select-none">
      {/* 选区与时长信息 */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-mono mb-2 text-slate-600">
        <div className="flex items-center gap-1.5 bg-brand-blue-50/80 px-2.5 py-1 rounded-lg border border-brand-blue-100">
          <span className="text-slate-400">起:</span>
          <span className="font-bold text-brand-blue-600">{formatTime(startTime, true)}</span>
        </div>

        <div className="text-center font-sans font-medium text-slate-500 text-xs">
          选择时长: <span className="font-bold text-slate-800 font-mono">{formatTime(Math.max(0, endTime - startTime), true)}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-brand-pink-50/80 px-2.5 py-1 rounded-lg border border-brand-pink-100">
          <span className="text-slate-400">止:</span>
          <span className="font-bold text-brand-pink-600">{formatTime(endTime, true)}</span>
        </div>
      </div>

      {/* 双滑块轨道 */}
      <div
        ref={trackRef}
        className="relative h-10 bg-slate-200/80 rounded-xl overflow-hidden cursor-pointer touch-none shadow-inner"
        onClick={(e) => {
          if (!trackRef.current || duration <= 0) return;
          const rect = trackRef.current.getBoundingClientRect();
          const clickTime = ((e.clientX - rect.left) / rect.width) * duration;
          onSeek?.(clickTime);
        }}
      >
        {/* 未选中遮罩 (左) */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-slate-400/40 backdrop-blur-[1px]"
          style={{ width: `${startPercent}%` }}
        />

        {/* 激活的高亮选区 (中) */}
        <div
          className="absolute top-0 bottom-0 bg-btn-gradient opacity-80 border-t-2 border-b-2 border-brand-pink-400 shadow-sm"
          style={{
            left: `${startPercent}%`,
            width: `${Math.max(0, endPercent - startPercent)}%`,
          }}
        />

        {/* 未选中遮罩 (右) */}
        <div
          className="absolute right-0 top-0 bottom-0 bg-slate-400/40 backdrop-blur-[1px]"
          style={{ width: `${100 - endPercent}%` }}
        />

        {/* 播放头光标 (实时位置) */}
        {currentPercent !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md z-20 pointer-events-none"
            style={{ left: `${currentPercent}%` }}
          >
            <div className="w-2.5 h-2.5 bg-white rounded-full -ml-1 mt-0.5 shadow-sm" />
          </div>
        )}

        {/* 左手柄 (Start Handle) */}
        <div
          className="absolute top-0 bottom-0 w-6 -ml-3 flex items-center justify-center cursor-ew-resize z-30 touch-none"
          style={{ left: `${startPercent}%` }}
          onPointerDown={(e) => handlePointerDown('start', e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="w-3.5 h-7 rounded-md bg-white shadow-md border-2 border-brand-blue-500 flex items-center justify-center">
            <div className="w-0.5 h-3 bg-brand-blue-400 rounded-full" />
          </div>
        </div>

        {/* 右手柄 (End Handle) */}
        <div
          className="absolute top-0 bottom-0 w-6 -ml-3 flex items-center justify-center cursor-ew-resize z-30 touch-none"
          style={{ left: `${endPercent}%` }}
          onPointerDown={(e) => handlePointerDown('end', e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="w-3.5 h-7 rounded-md bg-white shadow-md border-2 border-brand-pink-500 flex items-center justify-center">
            <div className="w-0.5 h-3 bg-brand-pink-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* 微调按钮组 (方便手指精细调节 0.1s) */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <button
            onClick={() => adjustTime('start', -0.5)}
            className="px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 active:scale-95"
          >
            -0.5s
          </button>
          <button
            onClick={() => adjustTime('start', 0.5)}
            className="px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 active:scale-95"
          >
            +0.5s
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline">可直接拖拽手柄或点击轨道定位</span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => adjustTime('end', -0.5)}
            className="px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 active:scale-95"
          >
            -0.5s
          </button>
          <button
            onClick={() => adjustTime('end', 0.5)}
            className="px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 active:scale-95"
          >
            +0.5s
          </button>
        </div>
      </div>
    </div>
  );
};
