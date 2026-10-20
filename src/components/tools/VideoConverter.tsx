import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GradientButton } from '../ui/GradientButton';
import { ProgressBar } from '../ui/ProgressBar';
import { CompatibleVideo } from '../player/CompatibleVideo';
import { FFmpegService } from '../../core/ffmpegService';
import { downloadFileSafely, createSafeBlob } from '../../core/downloadHelper';
import { VideoMetadata, ProcessingState, ProcessingResult } from '../../types';
import { makeInputName, baseName, downscaleFilter } from '../../core/media';
import { RefreshCw, UploadCloud, Download, CheckCircle2, AlertCircle } from 'lucide-react';

export const VideoConverter: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const [targetFormat, setTargetFormat] = useState<'mp4' | 'webm' | 'mov'>('mp4');
  const [targetRes, setTargetRes] = useState<'same' | '1080' | '720' | '480'>('same');

  const [state, setState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const handleFileChange = (file: File) => {
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

  const handleConvert = async () => {
    if (!videoFile || !metadata) return;

    setState('loading_engine');
    setProgress(5);
    setStatusMsg('正在准备格式转换引擎...');
    setErrorMsg(null);

    const ffmpegService = FFmpegService.getInstance();

    try {
      await ffmpegService.load((pct, msg) => {
        setProgress(pct * 0.25);
        setStatusMsg(msg);
      });

      setState('processing');
      setStatusMsg('正在载入视频数据...');
      setProgress(25);

      const inputName = makeInputName(videoFile);
      const outputName = `converted_${Date.now()}.${targetFormat}`;

      const fileBuffer = new Uint8Array(await videoFile.arrayBuffer());
      await ffmpegService.writeFile(inputName, fileBuffer);

      const args = ['-i', inputName];

      // 分辨率缩放：只缩小、不放大
      if (targetRes !== 'same') {
        args.push('-vf', downscaleFilter(Number(targetRes), metadata.width, metadata.height));
      }

      // 格式对应编码器（veryfast 预设显著降低 Wasm 转码耗时）
      if (targetFormat === 'mp4') {
        args.push('-c:v', 'libx264', '-crf', '22', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart');
      } else if (targetFormat === 'webm') {
        // WebM：VP8 + Vorbis。实测（2026-10-20）VP9 编码器在本 Wasm 核心里
        // 会直接把页面进程带崩，故用更轻、更稳的 VP8 约束质量模式；
        // deadline=realtime + cpu-used=4 保证浏览器里跑得动。
        args.push('-c:v', 'libvpx', '-b:v', '0', '-crf', '12', '-deadline', 'realtime', '-cpu-used', '4', '-pix_fmt', 'yuv420p', '-c:a', 'libvorbis', '-b:a', '128k');
      } else if (targetFormat === 'mov') {
        args.push('-c:v', 'libx264', '-crf', '22', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart');
      }

      args.push(outputName);

      setStatusMsg(`正在转码为 ${targetFormat.toUpperCase()} 格式...`);
      await ffmpegService.run(args, (pct) => {
        setProgress(25 + Math.round(pct * 0.65));
      });

      const outputData = await ffmpegService.readFile(outputName);
      const mimeMap: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
      };
      const mime = mimeMap[targetFormat] || 'video/mp4';
      const blob = createSafeBlob(outputData, mime);
      const blobUrl = URL.createObjectURL(blob);

      setResult({
        data: outputData,
        blobUrl,
        outputName: `LiteCut_${baseName(videoFile)}.${targetFormat}`,
        outputSize: outputData.byteLength,
        mimeType: mime,
      });

      await ffmpegService.deleteFile(inputName);
      await ffmpegService.deleteFile(outputName);

      setProgress(100);
      setState('completed');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '转换失败，请重试');
      setState('error');
    }
  };

  return (
    <div className="w-full space-y-6">
      <GlassCard className="border-t-4 border-t-brand-blue-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-xl bg-brand-blue-100 flex items-center justify-center text-brand-blue-600">
              <RefreshCw className="w-4 h-4" />
            </div>
            <span>格式转换与分辨率重设 (Convert & Resize)</span>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-blue-50 text-brand-blue-600 border border-brand-blue-200">
            MP4 / WebM / MOV
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
            onClick={() => document.getElementById('convert-video-upload')?.click()}
          >
            <input
              type="file"
              id="convert-video-upload"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-blue-50 group-hover:bg-brand-blue-100 text-brand-blue-500 flex items-center justify-center mb-4 transition-colors">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-700 mb-1">
              上传需要转换格式的视频
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              全面兼容不同剪辑软件与移动端播放器的通用标准格式
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
                  当前格式: {metadata.name.split('.').pop()?.toUpperCase()} ({metadata.width} × {metadata.height})
                </div>

                {/* 目标格式 */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    目标导出格式：
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'mp4', label: 'MP4', desc: '全平台通用标准' },
                      { id: 'mov', label: 'MOV', desc: 'Apple/QuickTime' },
                      { id: 'webm', label: 'WebM', desc: '高压缩网页格式' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setTargetFormat(f.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          targetFormat === f.id
                            ? 'bg-brand-blue-500 text-white border-brand-blue-500 shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{f.label}</div>
                        <div className="text-[10px] opacity-75">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 目标分辨率 */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    重设分辨率：
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'same', label: '保持原分辨率' },
                      { id: '1080', label: '1080P' },
                      { id: '720', label: '720P' },
                      { id: '480', label: '480P' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setTargetRes(r.id as any)}
                        className={`py-2 px-1 text-xs rounded-xl border font-medium transition-all ${
                          targetRes === r.id
                            ? 'bg-brand-pink-500 text-white border-brand-pink-500 shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <GradientButton
                  onClick={handleConvert}
                  isLoading={state === 'loading_engine' || state === 'processing'}
                  size="lg"
                  className="w-full mt-2"
                  icon={<RefreshCw className="w-5 h-5" />}
                >
                  开始转换格式
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
                  <span>格式转换成功！</span>
                </div>

                <GradientButton
                  onClick={() =>
                    downloadFileSafely(result.data!, result.outputName, result.mimeType)
                  }
                  icon={<Download className="w-4 h-4" />}
                >
                  保存转换后的视频
                </GradientButton>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
