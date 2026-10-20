import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GradientButton } from '../ui/GradientButton';
import { ProgressBar } from '../ui/ProgressBar';
import { CompatibleVideo } from '../player/CompatibleVideo';
import { FFmpegService } from '../../core/ffmpegService';
import { downloadFileSafely, createSafeBlob } from '../../core/downloadHelper';
import { VideoMetadata, ProcessingState, ProcessingResult } from '../../types';
import { makeInputName, baseName, toEven } from '../../core/media';
import { LayoutGrid, UploadCloud, Download, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const AspectRatioTool: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  // 比例与填充模式
  const [targetRatio, setTargetRatio] = useState<'9:16' | '16:9' | '1:1' | '4:3'>('9:16');
  const [padMode, setPadMode] = useState<'black' | 'blur'>('black');

  const [state, setState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('请选择有效的视频文件');
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setResult(null);
    setErrorMsg(null);
    setState('idle');

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
    };
  };

  const handleConvertRatio = async () => {
    if (!videoFile || !metadata) return;

    setState('loading_engine');
    setProgress(5);
    setStatusMsg('正在初始化画幅转换流水线...');
    setErrorMsg(null);

    const ffmpegService = FFmpegService.getInstance();

    try {
      await ffmpegService.load((pct, msg) => {
        setProgress(pct * 0.25);
        setStatusMsg(msg);
      });

      setState('processing');
      setStatusMsg('正在写入视频帧...');
      setProgress(25);

      const inputName = makeInputName(videoFile);
      const outputName = `aspect_${Date.now()}.mp4`;

      const fileBuffer = new Uint8Array(await videoFile.arrayBuffer());
      await ffmpegService.writeFile(inputName, fileBuffer);

      // 计算目标画布：按目标比例完整装下源画面，但绝不放大源分辨率。
      // 旧版一律输出 1080x1920/1920x1080，小视频被强行放大，
      // 在 Wasm 里又慢又糊，是这个工具「转半天转不出来」的主因。
      const ratioMap: Record<string, number> = {
        '9:16': 9 / 16,
        '16:9': 16 / 9,
        '1:1': 1,
        '4:3': 4 / 3,
      };
      const R = ratioMap[targetRatio];
      const srcW = metadata.width || 1280;
      const srcH = metadata.height || 720;
      let targetW: number;
      let targetH: number;
      if (srcW / srcH > R) {
        targetW = srcW;
        targetH = srcW / R;
      } else {
        targetH = srcH;
        targetW = srcH * R;
      }
      targetW = toEven(targetW);
      targetH = toEven(targetH);

      let filterString = '';
      if (padMode === 'blur') {
        // 智能毛玻璃虚化背景填充滤镜（输出打上 [vout] 标签并显式 -map，无音轨视频也不会失败）
        filterString = `[0:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH},boxblur=20:5[bg];[0:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease:force_divisible_by=2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[vout]`;
      } else {
        // 经典黑边填充
        filterString = `[0:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black[vout]`;
      }

      const args = [
        '-i',
        inputName,
        '-filter_complex',
        filterString,
        '-map',
        '[vout]',
        '-map',
        '0:a?',
        '-c:v',
        'libx264',
        '-crf',
        '22',
        '-preset',
        'veryfast',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'copy',
        '-movflags',
        '+faststart',
        outputName,
      ];

      setStatusMsg('正在合成新画幅比例与色彩空间...');
      await ffmpegService.run(args, (pct) => {
        setProgress(25 + Math.round(pct * 0.65));
      });

      setStatusMsg('转换完成，正在封装输出...');
      const outputData = await ffmpegService.readFile(outputName);
      const blob = createSafeBlob(outputData, 'video/mp4');
      const blobUrl = URL.createObjectURL(blob);

      setResult({
        data: outputData,
        blobUrl,
        outputName: `LiteCut_${targetRatio.replace(':', '_')}_${baseName(videoFile)}.mp4`,
        outputSize: outputData.byteLength,
        mimeType: 'video/mp4',
      });

      await ffmpegService.deleteFile(inputName);
      await ffmpegService.deleteFile(outputName);

      setProgress(100);
      setState('completed');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '比例转换失败，请重试');
      setState('error');
    }
  };

  return (
    <div className="w-full space-y-6">
      <GlassCard className="border-t-4 border-t-brand-blue-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-xl bg-brand-blue-100 flex items-center justify-center text-brand-blue-600">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <span>短视频画幅比例转换 (Aspect Ratio)</span>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-pink-50 text-brand-pink-600 border border-brand-pink-200">
            支持模糊虚化背景填充
          </span>
        </div>

        {!metadata ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]);
            }}
            className="w-full border-2 border-dashed border-slate-200 hover:border-brand-blue-400 rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer bg-white/40 hover:bg-white/80 group"
            onClick={() => document.getElementById('aspect-video-upload')?.click()}
          >
            <input
              type="file"
              id="aspect-video-upload"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-blue-50 group-hover:bg-brand-blue-100 text-brand-blue-500 flex items-center justify-center mb-4 transition-colors">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-700 mb-1">
              选择或拖入需要改画幅的视频
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              横竖屏无缝切换，横屏转 9:16 抖音竖屏，竖屏转 16:9 横屏，支持美观背景虚化
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 aspect-video max-h-[380px] rounded-2xl overflow-hidden shadow-lg">
                <CompatibleVideo src={metadata.url} autoPlay={false} />
              </div>

              <div className="lg:col-span-5 space-y-4 bg-white/60 p-5 rounded-2xl border border-white/80">
                <div className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200/60">
                  原分辨率: {metadata.width} × {metadata.height}
                </div>

                {/* 目标画幅选择 */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    目标画幅比例：
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: '9:16', label: '9:16', desc: '抖音/小红书' },
                      { id: '16:9', label: '16:9', desc: 'B站/横屏' },
                      { id: '1:1', label: '1:1', desc: '正方形' },
                      { id: '4:3', label: '4:3', desc: '经典画幅' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setTargetRatio(r.id as any)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          targetRatio === r.id
                            ? 'bg-brand-blue-500 text-white border-brand-blue-500 shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{r.label}</div>
                        <div className="text-[10px] opacity-75">{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 边缘填充样式 */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    边缘留白处理方式：
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPadMode('blur')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        padMode === 'blur'
                          ? 'bg-brand-pink-500 text-white border-brand-pink-500 shadow-md'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      毛玻璃模糊虚化 (推荐)
                    </button>
                    <button
                      onClick={() => setPadMode('black')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        padMode === 'black'
                          ? 'bg-brand-pink-500 text-white border-brand-pink-500 shadow-md'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      纯黑遮罩黑边
                    </button>
                  </div>
                </div>

                <GradientButton
                  onClick={handleConvertRatio}
                  isLoading={state === 'loading_engine' || state === 'processing'}
                  size="lg"
                  className="w-full mt-2"
                  icon={<Sparkles className="w-5 h-5" />}
                >
                  开始转换比例
                </GradientButton>
              </div>
            </div>

            {(state === 'loading_engine' || state === 'processing') && (
              <ProgressBar
                progress={progress}
                statusText={statusMsg}
                onCancel={() => {
                  FFmpegService.getInstance().cancel();
                  setState('idle');
                  setProgress(0);
                }}
              />
            )}

            {state === 'error' && errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 text-xs sm:text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {state === 'completed' && result && (
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-4">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm sm:text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>画幅比例转换成功！</span>
                </div>

                <GradientButton
                  onClick={() =>
                    downloadFileSafely(result.data!, result.outputName, result.mimeType)
                  }
                  icon={<Download className="w-4 h-4" />}
                >
                  保存新比例视频
                </GradientButton>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
