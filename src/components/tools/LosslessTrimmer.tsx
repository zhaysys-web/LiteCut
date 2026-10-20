import React, { useState, useRef } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GradientButton } from '../ui/GradientButton';
import { ProgressBar } from '../ui/ProgressBar';
import { SizeBadge } from '../ui/SizeBadge';
import { CompatibleVideo, CompatibleVideoRef } from '../player/CompatibleVideo';
import { RangeSlider } from '../player/RangeSlider';
import { FFmpegService } from '../../core/ffmpegService';
import { downloadFileSafely, createSafeBlob } from '../../core/downloadHelper';
import { formatTime, formatFFmpegTime } from '../../core/formatters';
import { makeInputName, baseName, copyOutputExtension, mimeForExtension } from '../../core/media';
import { VideoMetadata, ProcessingState, ProcessingResult } from '../../types';
import { Scissors, UploadCloud, Download, CheckCircle2, AlertCircle } from 'lucide-react';

export const LosslessTrimmer: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const [state, setState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const videoRef = useRef<CompatibleVideoRef | null>(null);

  // 处理文件上传
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

    // 预检文件对象元数据
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
      setStartTime(0);
      setEndTime(tempVideo.duration);
      setCurrentTime(0);
    };
  };

  // 极速无损剪辑处理
  const handleTrim = async () => {
    if (!videoFile || !metadata) return;

    setState('loading_engine');
    setProgress(5);
    setStatusMsg('正在初始化极速剪辑引擎...');
    setErrorMsg(null);
    setResult(null);

    const ffmpegService = FFmpegService.getInstance();

    try {
      await ffmpegService.load((pct, msg) => {
        setProgress(pct * 0.3);
        setStatusMsg(msg);
      });

      setState('processing');
      setStatusMsg('正在读取视频流（零损耗极速复制模式）...');
      setProgress(35);

      // 保留源文件容器格式：把 VP9/HEVC 等编码硬塞进 .mp4 是旧版「剪完打不开」的主因
      const outExt = copyOutputExtension(videoFile);
      const inputName = makeInputName(videoFile);
      const outputName = `trimmed_${Date.now()}.${outExt}`;

      const fileBuffer = new Uint8Array(await videoFile.arrayBuffer());
      await ffmpegService.writeFile(inputName, fileBuffer);

      setStatusMsg('正在执行无损切片 (Stream Copy)...');
      setProgress(50);

      // 核心高画质无损命令：-c copy 跳过所有编解码过程，100% 原始画质
      const cutDuration = Math.max(0.1, endTime - startTime);
      const args = [
        '-ss',
        formatFFmpegTime(startTime),
        '-i',
        inputName,
        '-t',
        formatFFmpegTime(cutDuration),
        '-c',
        'copy',
        '-avoid_negative_ts',
        'make_zero',
        ...(outExt === 'mp4' || outExt === 'mov' || outExt === 'm4v'
          ? ['-movflags', '+faststart']
          : []),
        outputName,
      ];

      await ffmpegService.run(args, (pct) => {
        setProgress(50 + Math.round(pct * 0.4));
      });

      setStatusMsg('切片完成，正在封装输出...');
      setProgress(95);

      const outputData = await ffmpegService.readFile(outputName);
      const outMime = mimeForExtension(outExt);
      const blob = createSafeBlob(outputData, outMime);
      const blobUrl = URL.createObjectURL(blob);

      setResult({
        data: outputData,
        blobUrl,
        outputName: `LiteCut_${baseName(videoFile)}_cut.${outExt}`,
        outputSize: outputData.byteLength,
        mimeType: outMime,
      });

      // 清理 FFmpeg 虚拟内存中的临时文件
      await ffmpegService.deleteFile(inputName);
      await ffmpegService.deleteFile(outputName);

      setProgress(100);
      setState('completed');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '剪辑过程中出现异常');
      setState('error');
    }
  };

  const handleDownload = async () => {
    if (!result || !result.data) return;
    await downloadFileSafely(result.data, result.outputName, result.mimeType);
  };

  return (
    <div className="w-full space-y-6">
      <GlassCard className="border-t-4 border-t-brand-pink-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-xl bg-brand-pink-100 flex items-center justify-center text-brand-pink-600">
              <Scissors className="w-4 h-4" />
            </div>
            <span>极速无损视频剪辑 (Trim)</span>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            100% 原始画质 · 0秒转码
          </span>
        </div>

        {/* 文件上传状态 */}
        {!metadata ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]);
            }}
            className="w-full border-2 border-dashed border-slate-200 hover:border-brand-blue-400 rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer bg-white/40 hover:bg-white/80 group"
            onClick={() => document.getElementById('trim-video-upload')?.click()}
          >
            <input
              type="file"
              id="trim-video-upload"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-blue-50 group-hover:bg-brand-blue-100 text-brand-blue-500 flex items-center justify-center mb-4 transition-colors">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-700 mb-1">
              点击选择或将短视频拖放到此处
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              采用本地直接流复制技术，保留 4K/1080P 原画质与 HDR 色彩
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 播放器与时间轴联动 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 aspect-video max-h-[420px] rounded-2xl overflow-hidden shadow-lg">
                <CompatibleVideo
                  ref={videoRef}
                  src={metadata.url}
                  onTimeUpdate={(t) => setCurrentTime(t)}
                  autoPlay={false}
                />
              </div>

              <div className="lg:col-span-5 space-y-4 bg-white/60 p-4 sm:p-5 rounded-2xl border border-white/80">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                  <span className="text-xs font-semibold text-slate-500">当前文件</span>
                  <button
                    onClick={() => {
                      setMetadata(null);
                      setVideoFile(null);
                      setResult(null);
                    }}
                    className="text-xs text-brand-blue-600 hover:underline"
                  >
                    更换视频
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">文件名:</span>
                    <span className="font-medium truncate max-w-[180px]">{metadata.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">分辨率:</span>
                    <span className="font-mono">{metadata.width} × {metadata.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">总时长:</span>
                    <span className="font-mono font-bold text-slate-700">{formatTime(metadata.duration, true)}</span>
                  </div>
                </div>

                {/* 剪辑时间轴双滑块 */}
                <div className="pt-2">
                  <RangeSlider
                    duration={metadata.duration}
                    startTime={startTime}
                    endTime={endTime}
                    currentTime={currentTime}
                    onChange={(s, e) => {
                      setStartTime(s);
                      setEndTime(e);
                    }}
                    onSeek={(t) => videoRef.current?.seek(t)}
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  无损剪辑按关键帧切分，起点可能有零点几秒的自动对齐，这是流复制不重编码的固有特性；如需逐帧精确，请用压缩工具重编码导出。
                </p>

                {/* 开始执行剪辑 */}
                <div className="pt-3">
                  <GradientButton
                    onClick={handleTrim}
                    isLoading={state === 'loading_engine' || state === 'processing'}
                    className="w-full"
                    size="lg"
                    icon={<Scissors className="w-5 h-5" />}
                  >
                    开始无损极速剪辑
                  </GradientButton>
                </div>
              </div>
            </div>

            {/* 处理中进度卡片 */}
            {(state === 'loading_engine' || state === 'processing') && (
              <ProgressBar
                progress={progress}
                statusText={statusMsg}
                onCancel={() => {
                  FFmpegService.getInstance().cancel();
                  setState('idle');
                  setProgress(0);
                  setStatusMsg('已取消任务');
                }}
              />
            )}

            {/* 错误提示 */}
            {state === 'error' && errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 text-xs sm:text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 剪辑完成结果与下载卡片 */}
            {state === 'completed' && result && (
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm sm:text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>无损裁剪完成！</span>
                  </div>

                  <SizeBadge originalSize={metadata.size} newSize={result.outputSize} />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <GradientButton
                    onClick={handleDownload}
                    className="w-full sm:w-auto"
                    icon={<Download className="w-4 h-4" />}
                  >
                    保存剪辑视频至本地
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
