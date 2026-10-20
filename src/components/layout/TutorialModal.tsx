import React from 'react';
import { Modal } from '../ui/Modal';
import { Scissors, FileArchive, Link2, Camera, Music, CheckCircle2 } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const steps = [
    {
      title: '1. 短视频去水印解析',
      icon: <Link2 className="w-5 h-5 text-brand-blue-500" />,
      content:
        '在抖音、快手、小红书等 App 点击“分享”，复制作品链接后粘贴至输入框，点击“去水印解析”，即可一键预览并下载无水印超清视频与提取原声背景音乐。',
    },
    {
      title: '2. 极速无损视频剪辑 (Trim)',
      icon: <Scissors className="w-5 h-5 text-brand-pink-500" />,
      content:
        '上传任意视频，拖动时间轴两侧手柄或使用微调按钮设定截取范围。由于采用直接流复制技术（Stream Copy），完全跳过耗时重编码，1秒内即可导出且 100% 原始画质无损！',
    },
    {
      title: '3. 智能视频压缩瘦身',
      icon: <FileArchive className="w-5 h-5 text-amber-500" />,
      content:
        '提供高画质微压、平衡推荐和极致瘦身三档预设。内置 H.264 与 yuv420p 色彩矩阵，视频体积最高可节省 80%，完美适配微信传输、邮件发送和网页上传。',
    },
    {
      title: '4. 封面提取与逐帧截取',
      icon: <Camera className="w-5 h-5 text-emerald-500" />,
      content:
        '通过微调按钮可以精确到每一帧（0.04秒），抓取短视频中最精彩的高清瞬间。内置 9:16（小红书/抖音）、16:9（B站横屏）、1:1 裁剪框，直接生成封面大片。',
    },
    {
      title: '5. 音频提取与格式转换',
      icon: <Music className="w-5 h-5 text-purple-500" />,
      content:
        '一键剥离视频轨道，快速导出 320kbps 极清 MP3 或无损 WAV 音频，并支持在浏览器中即时试听。',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💡 轻剪工具箱新手指南与常见问题" maxWidth="lg">
      <div className="space-y-4">
        {steps.map((s, idx) => (
          <div key={idx} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white shadow-sm shrink-0 mt-0.5">{s.icon}</div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">{s.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{s.content}</p>
            </div>
          </div>
        ))}

        <div className="p-4 rounded-2xl bg-brand-blue-50/60 border border-brand-blue-100 mt-4">
          <h5 className="font-bold text-brand-blue-800 text-xs mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand-blue-600" />
            为什么要在浏览器本地处理？
          </h5>
          <p className="text-[11px] text-brand-blue-700 leading-relaxed">
            普通在线视频转换网站会将您的视频上传至云端服务器，既耗费您的大量上传流量，又有视频隐私泄露的风险。轻剪 LiteCut 引入了先进的 WebAssembly 与 WebCodecs，让所有音视频处理直接在您的手机或电脑本地芯片上完成，安全、隐私、零带宽等待！
          </p>
        </div>
      </div>
    </Modal>
  );
};
