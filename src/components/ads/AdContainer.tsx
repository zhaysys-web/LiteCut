import React, { useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';

interface AdContainerProps {
  slotType: 'banner' | 'sidebar' | 'inline' | 'modal';
  className?: string;
}

export const AdContainer: React.FC<AdContainerProps> = ({
  slotType,
  className = '',
}) => {
  const [adLoaded] = useState<boolean>(false);

  // 广告位占位与赞助自营降级展示
  const renderFallback = () => {
    switch (slotType) {
      case 'banner':
        return (
          <div className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-blue-50/80 via-white to-brand-pink-50/80 border border-brand-blue-100/60 shadow-sm flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="px-2 py-0.5 rounded bg-brand-pink-100 text-brand-pink-600 font-bold text-[10px]">
                赞助位
              </span>
              <span>纯浏览器本地算力，100% 保护您的视频隐私，永久免费使用</span>
            </div>
            <a
              href="#support"
              className="hidden sm:inline-flex items-center gap-1 text-brand-pink-600 font-medium hover:underline text-xs"
            >
              <Heart className="w-3.5 h-3.5 fill-brand-pink-400 text-brand-pink-400" />
              支持作者
            </a>
          </div>
        );

      case 'sidebar':
        return (
          <div className="w-full p-4 rounded-2xl bg-white/70 border border-slate-200/60 text-center text-xs text-slate-500 shadow-sm">
            <div className="flex justify-center mb-2">
              <div className="w-10 h-10 rounded-full bg-brand-blue-100 flex items-center justify-center text-brand-blue-500">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="font-bold text-slate-700 text-sm mb-1">LiteCut 创作者引擎</div>
            <p className="text-slate-400 text-[11px] mb-3">高速 WebAssembly 硬解驱动</p>
            <div className="p-2 rounded-xl bg-brand-blue-50/50 text-[11px] text-brand-blue-700 font-medium">
              无水印 · 零上传 · 极速处理
            </div>
          </div>
        );

      case 'modal':
      case 'inline':
      default:
        return (
          <div className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-50/60 to-pink-50/60 border border-blue-100/50 text-xs text-slate-500 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">广告赞助商</span>
            <div className="font-medium text-slate-700">高性能短视频创作 · 纯本地一键极速出片</div>
          </div>
        );
    }
  };

  return (
    <div className={`ad-wrapper my-3 select-none overflow-hidden ${className}`}>
      {/* 真实 Google AdSense 容器可在配置 client-id 后在此处初始化 */}
      {adLoaded ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        renderFallback()
      )}
    </div>
  );
};
