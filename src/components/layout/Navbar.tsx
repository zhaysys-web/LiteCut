import React from 'react';
import { ToolCategory } from '../../types';
import { Sparkles, HelpCircle, Shield, Scissors } from 'lucide-react';

interface NavbarProps {
  currentCategory: ToolCategory;
  onSelectCategory: (cat: ToolCategory) => void;
  onOpenTutorial: () => void;
  onOpenPrivacy: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onSelectCategory,
  onOpenTutorial,
  onOpenPrivacy,
}) => {
  const categories: { id: ToolCategory; label: string }[] = [
    { id: 'watermark', label: '视频去水印' },
    { id: 'video', label: '视频处理' },
    { id: 'audio', label: '音频提取' },
    { id: 'cover', label: '图片与封面' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-btn-gradient flex items-center justify-center text-white shadow-md shadow-brand-pink-200/50">
            <Scissors className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-slate-900 via-brand-blue-600 to-brand-pink-500 bg-clip-text text-transparent">
                轻剪 LiteCut
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-pink-100 text-brand-pink-600">
                本地处理
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              视频本地处理 · 解析走云端 · 隐私安全
            </p>
          </div>
        </div>

        {/* 分类快捷导航 (桌面端) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/60">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCategory(c.id)}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                currentCategory === c.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </nav>

        {/* 顶部右侧帮助与隐私入口 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTutorial}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-slate-600 hover:bg-white/80 text-xs font-medium flex items-center gap-1.5 transition-colors border border-transparent hover:border-slate-200"
          >
            <HelpCircle className="w-4 h-4 text-brand-blue-500" />
            <span className="hidden sm:inline">使用教程</span>
          </button>

          <button
            onClick={onOpenPrivacy}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-slate-600 hover:bg-white/80 text-xs font-medium flex items-center gap-1.5 transition-colors border border-transparent hover:border-slate-200"
          >
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">隐私政策</span>
          </button>
        </div>
      </div>

      {/* 移动端横向滑动分类栏 */}
      <div className="md:hidden flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar border-t border-slate-100/60 bg-white/40">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelectCategory(c.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentCategory === c.id
                ? 'bg-btn-gradient text-white shadow-sm'
                : 'bg-white/70 text-slate-600 border border-slate-200/50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </header>
  );
};
