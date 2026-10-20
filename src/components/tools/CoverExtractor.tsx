import React, { useState, useRef } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GradientButton } from '../ui/GradientButton';
import { CompatibleVideo, CompatibleVideoRef } from '../player/CompatibleVideo';
import { formatTime } from '../../core/formatters';
import { VideoMetadata } from '../../types';
import { Camera, UploadCloud, Download, CheckCircle2, ChevronLeft, ChevronRight, Crop } from 'lucide-react';

export const CoverExtractor: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [coverAspect, setCoverAspect] = useState<'origin' | '9:16' | '16:9' | '1:1'>('origin');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const videoRef = useRef<CompatibleVideoRef | null>(null);

  const handleFileChange = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setCapturedImage(null);

    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      setMetadata({
        name: file.name,
        size: file.size,
        type: file.type || 'video/mp4',
        duration: tempVideo.duration,
        width: tempVideo.videoWidth,
        height: tempVideo.videoHeight,
        url,
      });
      setCurrentTime(0);
    };
  };

  // 截取当前帧画面
  const handleCaptureFrame = async () => {
    const videoEl = videoRef.current?.getVideoElement();
    if (!videoEl) return;

    // 旧版不管视频是否解码出当前帧就直接 drawImage，
    // 刚拖动/刚加载完就点截取会得到一张黑图。这里等到帧数据就绪再截。
    if (videoEl.readyState < 2) {
      await new Promise<void>((resolve) => {
        const done = () => {
          videoEl.removeEventListener('loadeddata', done);
          videoEl.removeEventListener('seeked', done);
          resolve();
        };
        videoEl.addEventListener('loadeddata', done);
        videoEl.addEventListener('seeked', done);
        setTimeout(done, 1500);
      });
    }

    const canvas = document.createElement('canvas');
    let w = videoEl.videoWidth;
    let h = videoEl.videoHeight;

    // 比例裁剪计算
    let sx = 0;
    let sy = 0;
    let sWidth = w;
    let sHeight = h;

    if (coverAspect === '9:16') {
      const targetRatio = 9 / 16;
      if (w / h > targetRatio) {
        sWidth = h * targetRatio;
        sx = (w - sWidth) / 2;
      } else {
        sHeight = w / targetRatio;
        sy = (h - sHeight) / 2;
      }
    } else if (coverAspect === '16:9') {
      const targetRatio = 16 / 9;
      if (w / h > targetRatio) {
        sWidth = h * targetRatio;
        sx = (w - sWidth) / 2;
      } else {
        sHeight = w / targetRatio;
        sy = (h - sHeight) / 2;
      }
    } else if (coverAspect === '1:1') {
      const minSide = Math.min(w, h);
      sWidth = minSide;
      sHeight = minSide;
      sx = (w - minSide) / 2;
      sy = (h - minSide) / 2;
    }

    canvas.width = Math.max(2, Math.round(sWidth));
    canvas.height = Math.max(2, Math.round(sHeight));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoEl, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL(
      exportFormat === 'png' ? 'image/png' : 'image/jpeg',
      exportFormat === 'jpeg' ? 0.95 : undefined
    );
    setCapturedImage(dataUrl);
  };

  const handleStepFrame = (deltaSeconds: number) => {
    if (!videoRef.current || !metadata) return;
    const nextTime = Math.max(0, Math.min(metadata.duration, currentTime + deltaSeconds));
    videoRef.current.seek(nextTime);
    setCurrentTime(nextTime);
  };

  const handleDownload = () => {
    if (!capturedImage) return;
    const a = document.createElement('a');
    a.href = capturedImage;
    a.download = `LiteCut_Cover_${Date.now()}.${exportFormat === 'png' ? 'png' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full space-y-6">
      <GlassCard className="border-t-4 border-t-brand-pink-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-xl bg-brand-pink-100 flex items-center justify-center text-brand-pink-600">
              <Camera className="w-4 h-4" />
            </div>
            <span>高清封面提取与逐帧截取 (Cover Capture)</span>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
            原画分辨率 · 0秒即时抓取
          </span>
        </div>

        {!metadata ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]);
            }}
            className="w-full border-2 border-dashed border-slate-200 hover:border-brand-pink-400 rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer bg-white/40 hover:bg-white/80 group"
            onClick={() => document.getElementById('cover-video-upload')?.click()}
          >
            <input
              type="file"
              id="cover-video-upload"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-pink-50 group-hover:bg-brand-pink-100 text-brand-pink-500 flex items-center justify-center mb-4 transition-colors">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-700 mb-1">
              选择需要截取封面的短视频
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              支持毫秒级定位和逐帧微调，一键导出 1080P/4K 无损高清封面
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 aspect-video max-h-[400px] rounded-2xl overflow-hidden shadow-lg">
                <CompatibleVideo
                  ref={videoRef}
                  src={metadata.url}
                  onTimeUpdate={(t) => setCurrentTime(t)}
                  autoPlay={false}
                />
              </div>

              <div className="lg:col-span-5 space-y-4 bg-white/60 p-5 rounded-2xl border border-white/80">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                  <span className="text-xs font-semibold text-slate-500">当前时间戳</span>
                  <span className="font-mono font-bold text-brand-blue-600 text-sm">
                    {formatTime(currentTime, true)}
                  </span>
                </div>

                {/* 时间轴拖动定位 */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    拖动定位画面：
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={metadata.duration || 0}
                    step={0.04}
                    value={currentTime}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setCurrentTime(t);
                      videoRef.current?.seek(t);
                    }}
                    className="w-full accent-brand-pink-500"
                  />
                </div>

                {/* 逐帧微调按钮 */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    逐帧精确定位：
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleStepFrame(-1)}
                      className="py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-50 flex items-center justify-center gap-0.5"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> -1秒
                    </button>
                    <button
                      onClick={() => handleStepFrame(-0.04)}
                      className="py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-50"
                    >
                      -1帧
                    </button>
                    <button
                      onClick={() => handleStepFrame(0.04)}
                      className="py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-50"
                    >
                      +1帧
                    </button>
                    <button
                      onClick={() => handleStepFrame(1)}
                      className="py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-50 flex items-center justify-center gap-0.5"
                    >
                      +1秒 <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 封面裁剪比例 */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    封面比例裁切预设：
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'origin', label: '原画比例' },
                      { id: '9:16', label: '9:16 (小红书/抖音)' },
                      { id: '16:9', label: '16:9 (B站)' },
                      { id: '1:1', label: '1:1 (方图)' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setCoverAspect(item.id as any)}
                        className={`py-2 px-1 text-xs rounded-xl border font-semibold transition-all ${
                          coverAspect === item.id
                            ? 'bg-brand-pink-500 text-white border-brand-pink-500 shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 格式选择 */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    保存图片格式：
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportFormat('png')}
                      className={`py-2 px-2 text-xs rounded-xl border font-semibold transition-all ${
                        exportFormat === 'png'
                          ? 'bg-brand-blue-500 text-white border-brand-blue-500 shadow-md'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      PNG 无损原画
                    </button>
                    <button
                      onClick={() => setExportFormat('jpeg')}
                      className={`py-2 px-2 text-xs rounded-xl border font-semibold transition-all ${
                        exportFormat === 'jpeg'
                          ? 'bg-brand-blue-500 text-white border-brand-blue-500 shadow-md'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      JPG 高压缩比
                    </button>
                  </div>
                </div>

                <GradientButton
                  onClick={handleCaptureFrame}
                  size="lg"
                  className="w-full mt-2"
                  icon={<Camera className="w-5 h-5" />}
                >
                  截取当前画面为封面
                </GradientButton>
              </div>
            </div>

            {/* 截取结果展示 */}
            {capturedImage && (
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-4">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm sm:text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>封面截取成功！</span>
                </div>

                <div className="max-w-[320px] rounded-xl overflow-hidden border border-emerald-200 shadow-sm mx-auto sm:mx-0">
                  <img src={capturedImage} alt="Cover Preview" className="w-full h-auto" />
                </div>

                <GradientButton onClick={handleDownload} icon={<Download className="w-4 h-4" />}>
                  下载高清封面图片 ({exportFormat.toUpperCase()})
                </GradientButton>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
