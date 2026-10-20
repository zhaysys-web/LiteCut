import React from 'react';
import { Shield, Sparkles, Heart } from 'lucide-react';

interface FooterProps {
  onOpenTutorial: () => void;
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTutorial, onOpenPrivacy }) => {
  return (
    <footer className="w-full mt-16 border-t border-slate-200/60 bg-white/40 backdrop-blur-md py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-btn-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm">
            L
          </div>
          <div>
            <div className="font-bold text-slate-700 text-sm">轻剪工具箱 LiteCut</div>
            <p className="text-[11px] text-slate-400">
              基于 WebAssembly 与 WebCodecs 的纯客户端短视频生产力工具
            </p>
          </div>
        </div>

        {/* 声明与隐私保证 */}
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
            <Shield className="w-3.5 h-3.5" />
            100% 视频本地计算，保护隐私
          </span>
          <button onClick={onOpenTutorial} className="hover:text-slate-800 transition-colors">
            使用教程
          </button>
          <button onClick={onOpenPrivacy} className="hover:text-slate-800 transition-colors">
            隐私政策与免责声明
          </button>
        </div>

        <div className="text-center sm:text-right text-[11px] text-slate-400">
          <span>免费开源体验 · 无需登录 · 永久免费</span>
        </div>
      </div>
    </footer>
  );
};
