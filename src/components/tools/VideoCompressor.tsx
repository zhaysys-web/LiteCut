import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GradientButton } from '../ui/GradientButton';
import { ProgressBar } from '../ui/ProgressBar';
import { SizeBadge } from '../ui/SizeBadge';
import { CompatibleVideo } from '../player/CompatibleVideo';
import { FFmpegService } from '../../core/ffmpegService';
import { downloadFileSafely, createSafeBlob } from '../../core/downloadHelper';
import { formatBytes } from '../../core/formatters';
import { makeInputName, baseName, downscaleFilter } from '../../core/media';
import { VideoMetadata, ProcessingState, ProcessingResult } from '../../types';
import { FileArchive, UploadCloud, Download, CheckCircle2, AlertCircle, Sparkles, Smartphone } from 'lucide-react';

export const VideoCompressor: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  // 压缩参数配置
  const [crfPreset, setCrfPreset] = useState<'high' | 'balanced' | 'small'>('balanced');
  const [targetResolution, setTargetResolution] = useState<'original' | '1080' | '720' | '480'>('original');

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

  const handleCompress = async () => {
    if (!videoFile || !metadata) return;

    setState('loading_engine');
    setProgress(5);
    setStatusMsg('正在初始化智能压制引擎...');
    setErrorMsg(null);
    setResult(null);

    const ffmpegService = FFmpegService.getInstance();

    try {
      await ffmpegService.load((pct, msg) => {
        setProgress(pct * 0.25);
        setStatusMsg(msg);
      });

      setState('processing');
      setStatusMsg('正在导入视频数据进行智能分帧...');
      setProgress(25);

      const inputName = makeInputName(videoFile);
      const outputName = `compressed_${Date.now()}.mp4`;

      const fileBuffer = new Uint8Array(await videoFile.arrayBuffer());
      await ffmpegService.writeFile(inputName, fileBuffer);

      // CRF 画质配置映射
      const crfMap = {
        high: '19', // 高画质保真
        balanced: '23', // 平衡推荐
        small: '28', // 极致瘦身
      };

      const args = [
        '-i',
        inputName,
        '-c:v',
        'libx264',
        '-crf',
        crfMap[crfPreset],
        '-preset',
        'veryfast',
        // 核心色彩保真与播放器兼容性必加参数
        '-pix_fmt',
        'yuv420p',
      ];

      // 分辨率缩放：只缩小、不放大（旧版会把 720P 源强行拉到 1080P，越压越大还更慢）
      if (targetResolution !== 'original') {
        args.push('-vf', downscaleFilter(Number(targetResolution), metadata.width, metadata.height));
      }

      // 音频流保持良好音质 + faststart 让导出文件可边下边播
      args.push('-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outputName);

      setStatusMsg('正在运用 H.264 智能编码器压制体积...');

      await ffmpegService.run(args, (pct) => {
        setProgress(25 + Math.round(pct * 0.65));
      });

      setStatusMsg('压制完成，正在保存视频...');
      setProgress(95);

      const outputData = await ffmpegService.readFile(outputName);
      const blob = createSafeBlob(outputData, 'video/mp4');
      const blobUrl = URL.createObjectURL(blob);

      setResult({
        data: outputData,
        blobUrl,
        outputName: `LiteCut_${baseName(videoFile)}_compressed.mp4`,
        outputSize: outputData.byteLength,
        mimeType: 'video/mp4',
      });

      await ffmpegService.deleteFile(inputName);
      await ffmpegService.deleteFile(outputName);

      setProgress(100);
      setState('completed');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '压缩处理失败，请尝试调小分辨率或更换视频');
      setState('error');
    }
  };

  return (
    <div className="w-full space-y-6">
      <GlassCard className="border-t-4 border-t-brand-blue-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-xl bg-brand-blue-100 flex items-center justify-center text-brand-blue-600">
              <FileArchive className="w-4 h-4" />
            </div>
            <span>智能视频画质压缩 (Compress)</span>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-blue-50 text-brand-blue-600 border border-brand-blue-200">
            H.264 智能双通压制
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
            onClick={() => document.getElementById('compress-video-upload')?.click()}
          >
            <input
              type="file"
              id="compress-video-upload"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-blue-50 group-hover:bg-brand-blue-100 text-brand-blue-500 flex items-center justify-center mb-4 transition-colors">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-700 mb-1">
              上传需要瘦身的短视频
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              精准调控 CRF 编码矩阵，体积减少最高达 80%，画质肉眼几无差别
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* iOS 大文件内存防溢出警告 */}
            {metadata.size > 200 * 1024 * 1024 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  检测到视频体积较大 ({formatBytes(metadata.size)})。手机浏览器内存有限，建议选择「平衡压缩」或在电脑端获得最佳速度。
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 aspect-video max-h-[380px] rounded-2xl overflow-hidden shadow-lg">
                <CompatibleVideo src={metadata.url} autoPlay={false} />
              </div>

              <div className="lg:col-span-5 space-y-5 bg-white/60 p-5 rounded-2xl border border-white/80">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 text-xs">
                  <span className="font-semibold text-slate-500">原始体积</span>
                  <span className="font-bold font-mono text-slate-800 text-sm">
                    {formatBytes(metadata.size)}
                  </span>
                </div>

                {/* 压缩画质模式 */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    压缩策略模式：
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'high', label: '高画质微压', desc: 'CRF 19' },
                      { id: 'balanced', label: '平衡推荐', desc: 'CRF 23' },
                      { id: 'small', label: '极致瘦身', desc: 'CRF 28' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setCrfPreset(item.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          crfPreset === item.id
                            ? 'bg-brand-blue-500 text-white border-brand-blue-500 shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 目标分辨率 */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    输出分辨率：
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'original', label: '保持原样' },
                      { id: '1080', label: '1080P' },
                      { id: '720', label: '720P' },
                      { id: '480', label: '480P' },
                    ].map((res) => (
                      <button
                        key={res.id}
                        onClick={() => setTargetResolution(res.id as any)}
                        className={`py-2 px-1 text-xs rounded-xl border font-medium transition-all ${
                          targetResolution === res.id
                            ? 'bg-brand-pink-500 text-white border-brand-pink-500 shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                </div>

                <GradientButton
                  onClick={handleCompress}
                  isLoading={state === 'loading_engine' || state === 'processing'}
                  size="lg"
                  className="w-full mt-2"
                  icon={<Sparkles className="w-5 h-5" />}
                >
                  开始智能压缩
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm sm:text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>压缩成功完成！</span>
                  </div>

                  <SizeBadge originalSize={metadata.size} newSize={result.outputSize} />
                </div>

                <div className="flex items-center gap-3">
                  <GradientButton
                    onClick={() =>
                      downloadFileSafely(result.data!, result.outputName, result.mimeType)
                    }
                    icon={<Download className="w-4 h-4" />}
                  >
                    保存已压缩视频
                  </GradientButton>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
