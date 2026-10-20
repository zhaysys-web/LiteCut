import React, { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ToolShell } from './components/layout/ToolShell';
import { TutorialModal } from './components/layout/TutorialModal';
import { PrivacyModal } from './components/layout/PrivacyModal';
import { GlassCard } from './components/ui/GlassCard';
import { AdContainer } from './components/ads/AdContainer';

// 8 大工具组件
import { WatermarkRemover } from './components/tools/WatermarkRemover';
import { LosslessTrimmer } from './components/tools/LosslessTrimmer';
import { VideoCompressor } from './components/tools/VideoCompressor';
import { AspectRatioTool } from './components/tools/AspectRatioTool';
import { VideoConverter } from './components/tools/VideoConverter';
import { GifMaker } from './components/tools/GifMaker';
import { AudioExtractor } from './components/tools/AudioExtractor';
import { CoverExtractor } from './components/tools/CoverExtractor';

import { ToolCategory, ToolId, ToolItem } from './types';
import {
  Link2,
  Scissors,
  FileArchive,
  LayoutGrid,
  RefreshCw,
  Image as ImageIcon,
  Music,
  Camera,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';

const TOOLS: ToolItem[] = [
  {
    id: 'watermark',
    name: '视频去水印解析',
    category: 'watermark',
    description: '支持抖音/快手/小红书/TikTok/B站分享链接，一键提取超清无水印原画视频与音频。',
    badge: '热门推荐',
    iconName: 'Link2',
    isLocalOnly: false,
  },
  {
    id: 'trim',
    name: '极速无损剪辑',
    category: 'video',
    description: '采用流复制技术 (Stream Copy)，1秒瞬间截取片段，100% 原始画质与 HDR 色彩零损耗。',
    badge: '零损耗',
    iconName: 'Scissors',
    isLocalOnly: true,
  },
  {
    id: 'compress',
    name: '智能视频压缩',
    category: 'video',
    description: '通过 CRF 算法精准控制画质与体积，体积减小最高达 80%，完美兼容 Safari 与安卓。',
    badge: '瘦身神器',
    iconName: 'FileArchive',
    isLocalOnly: true,
  },
  {
    id: 'aspect',
    name: '画幅比例转换',
    category: 'video',
    description: '横竖屏自由互转（9:16、16:9、1:1），支持优雅的高级毛玻璃背景虚化与经典黑边填充。',
    badge: '全画幅',
    iconName: 'LayoutGrid',
    isLocalOnly: true,
  },
  {
    id: 'convert',
    name: '格式与分辨率转换',
    category: 'video',
    description: 'MP4、MOV、WebM 互转，支持自由降采样或上采样重设 1080P/720P 分辨率。',
    badge: '多格式',
    iconName: 'RefreshCw',
    isLocalOnly: true,
  },
  {
    id: 'gif',
    name: '视频转高保真 GIF',
    category: 'video',
    description: '基于 Palette 调色板优化算法，生成高清晰、无雪花杂色、平滑流畅的 GIF 动图与表情包。',
    badge: '高清动图',
    iconName: 'ImageIcon',
    isLocalOnly: true,
  },
  {
    id: 'audio',
    name: '视频提取音频',
    category: 'audio',
    description: '一键剥离画面导出纯净音轨，支持 320kbps 超清 MP3、无损 WAV 与高保真 AAC。',
    badge: '原声音频',
    iconName: 'Music',
    isLocalOnly: true,
  },
  {
    id: 'cover',
    name: '高清封面与截帧',
    category: 'cover',
    description: '逐帧精确定位（0.04秒），抓取视频精彩画面并导出无损 PNG/JPG，预设多种裁切比例。',
    badge: '原画截图',
    iconName: 'Camera',
    isLocalOnly: true,
  },
];

export const App: React.FC = () => {
  const [currentCategory, setCurrentCategory] = useState<ToolCategory>('watermark');
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);

  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);
  const [privacyOpen, setPrivacyOpen] = useState<boolean>(false);

  const activeTool = TOOLS.find((t) => t.id === activeToolId);

  // 图标映射
  const getToolIcon = (id: ToolId) => {
    switch (id) {
      case 'watermark':
        return <Link2 className="w-6 h-6 text-brand-blue-500" />;
      case 'trim':
        return <Scissors className="w-6 h-6 text-brand-pink-500" />;
      case 'compress':
        return <FileArchive className="w-6 h-6 text-brand-blue-500" />;
      case 'aspect':
        return <LayoutGrid className="w-6 h-6 text-indigo-500" />;
      case 'convert':
        return <RefreshCw className="w-6 h-6 text-brand-pink-500" />;
      case 'gif':
        return <ImageIcon className="w-6 h-6 text-amber-500" />;
      case 'audio':
        return <Music className="w-6 h-6 text-purple-500" />;
      case 'cover':
        return <Camera className="w-6 h-6 text-emerald-500" />;
    }
  };

  const renderActiveToolComponent = () => {
    switch (activeToolId) {
      case 'watermark':
        return <WatermarkRemover />;
      case 'trim':
        return <LosslessTrimmer />;
      case 'compress':
        return <VideoCompressor />;
      case 'aspect':
        return <AspectRatioTool />;
      case 'convert':
        return <VideoConverter />;
      case 'gif':
        return <GifMaker />;
      case 'audio':
        return <AudioExtractor />;
      case 'cover':
        return <CoverExtractor />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-brand-pink-200">
      <div>
        <Navbar
          currentCategory={currentCategory}
          onSelectCategory={(cat) => {
            setCurrentCategory(cat);
            setActiveToolId(null);
          }}
          onOpenTutorial={() => setTutorialOpen(true)}
          onOpenPrivacy={() => setPrivacyOpen(true)}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
          {activeTool ? (
            <ToolShell tool={activeTool} onBack={() => setActiveToolId(null)}>
              {renderActiveToolComponent()}
            </ToolShell>
          ) : (
            <div className="space-y-8">
              {/* 首页 Hero 区域 */}
              <div className="text-center max-w-3xl mx-auto space-y-4 pt-4 sm:pt-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-brand-pink-200/80 shadow-sm text-xs font-semibold text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-brand-pink-500 animate-pulse" />
                  <span>无需上传云端 · 纯浏览器本地硬解加速</span>
                  <Sparkles className="w-3.5 h-3.5 text-brand-blue-500" />
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-800 leading-tight">
                  极速、高画质的{' '}
                  <span className="bg-gradient-to-r from-brand-blue-500 via-brand-pink-400 to-brand-pink-600 bg-clip-text text-transparent">
                    短视频生产力工具箱
                  </span>
                </h1>

                <p className="text-xs sm:text-base text-slate-500 leading-relaxed max-w-2xl mx-auto">
                  集短视频链接无水印解析、极速无损剪辑、智能画质压缩、画幅转换与提取音频于一体。100%
                  本地计算保护隐私，手机与电脑自适应。
                </p>

                {/* 亮点胶囊 */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white/60 px-3 py-1.5 rounded-xl border border-white/80 shadow-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>0 数据上传隐私保护</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white/60 px-3 py-1.5 rounded-xl border border-white/80 shadow-xs">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>秒级无损切片 (Stream Copy)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white/60 px-3 py-1.5 rounded-xl border border-white/80 shadow-xs">
                    <Sparkles className="w-4 h-4 text-brand-pink-500" />
                    <span>免登录 · 永久免费</span>
                  </div>
                </div>
              </div>

              {/* 首页横幅广告 */}
              <AdContainer slotType="banner" />

              {/* 工具卡片网格列表 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-5 rounded-full bg-btn-gradient" />
                    <span>全部功能工具集</span>
                  </h2>
                  <span className="text-xs text-slate-400">共 8 款实用工具</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {TOOLS.map((tool) => (
                    <GlassCard
                      key={tool.id}
                      hoverable
                      onClick={() => setActiveToolId(tool.id)}
                      className="group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {getToolIcon(tool.id)}
                          </div>
                          {tool.badge && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-pink-50 text-brand-pink-600 border border-brand-pink-200">
                              {tool.badge}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-800 text-base mb-1.5 group-hover:text-brand-blue-600 transition-colors">
                          {tool.name}
                        </h3>

                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">
                          {tool.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-brand-blue-600 group-hover:text-brand-pink-600 transition-colors">
                        <span>立即使用</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <Footer
        onOpenTutorial={() => setTutorialOpen(true)}
        onOpenPrivacy={() => setPrivacyOpen(true)}
      />

      {/* 弹窗组件 */}
      <TutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
};
export default App;
