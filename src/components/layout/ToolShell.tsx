import React from 'react';
import { ToolItem } from '../../types';
import { ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { AdContainer } from '../ads/AdContainer';

interface ToolShellProps {
  tool: ToolItem;
  onBack: () => void;
  children: React.ReactNode;
}

export const ToolShell: React.FC<ToolShellProps> = ({ tool, onBack, children }) => {
  return (
    <div className="w-full space-y-6">
      {/* 顶部面包屑与返回导航 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-white/60 hover:bg-white border border-slate-200/60 shadow-sm transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回工具大全</span>
        </button>

        <div className="flex items-center gap-2">
          {tool.isLocalOnly && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              浏览器本地运算 · 零上传
            </span>
          )}
          {tool.badge && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-pink-100 text-brand-pink-600 border border-brand-pink-200">
              {tool.badge}
            </span>
          )}
        </div>
      </div>

      {/* 工具内容主体与侧栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-9">{children}</div>

        <div className="lg:col-span-3 space-y-4 hidden lg:block">
          <AdContainer slotType="sidebar" />
          <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60 text-xs text-slate-500">
            <div className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-blue-500" />
              极速处理建议
            </div>
            <p className="leading-relaxed text-[11px] text-slate-400">
              短视频剪辑推荐使用「无损裁剪」，跳过编解码，1秒直接出片；压缩建议优先选择「平衡推荐」模式。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
