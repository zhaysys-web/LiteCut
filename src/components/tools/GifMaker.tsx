import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GradientButton } from '../ui/GradientButton';
import { ProgressBar } from '../ui/ProgressBar';
import { CompatibleVideo } from '../player/CompatibleVideo';
import { RangeSlider } from '../player/RangeSlider';
import { FFmpegService } from '../../core/ffmpegService';
import { downloadFileSafely, createSafeBlob } from '../../core/downloadHelper';
import { formatFFmpegTime } from '../../core/formatters';
import { makeInputName, baseName } from '../../core/media';
import { VideoMetadata, ProcessingState, ProcessingResult } from '../../types';
import { Image as ImageIcon, UploadCloud, Download, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const GifMaker: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [fps, setFps] = useState<number>(12);
  const [width, setWidth] = useState<number>(480);

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
      const dur = Math.min(tempVideo.duration, 10); // GIF 建议默认最多截取 10 秒
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
      setEndTime(dur);
    };
  };

  const handleMakeGif = async () => {
    if (!videoFile || !metadata) return;

    setState('loading_engine');
    setProgress(5);
    setStatusMsg('正在启动调色板渲染引擎...');
    setErrorMsg(null);

    const ffmpegService = FFmpegService.getInstance();

    try {
      await ffmpegService.load((pct, msg) => {
        setProgress(pct * 0.25);
        setStatusMsg(msg);
      });

      setState('processing');
      setStatusMsg('正在读取视频源...');
      setProgress(25);

      const inputName = makeInputName(videoFile);
      const outputName = `animated_${Date.now()}.gif`;

      const fileBuffer = new Uint8Array(await videoFile.arrayBuffer());
      await ffmpegService.writeFile(inputName, fileBuffer);

      // 高清双通调色板生成滤镜，避免噪点
      const cutDuration = Math.max(0.5, endTime - startTime);
      // 宽度不超过源视频宽度，避免把小视频放大成糊图还更慢
      const outWidth = metadata.width > 0 ? Math.min(width, metadata.width) : width;
      const filter = `fps=${fps},scale=${outWidth}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer`;

      const args = [
        '-ss',
        formatFFmpegTime(startTime),
        '-i',
        inputName,
        '-t',
        formatFFmpegTime(cutDuration),
        '-vf',
        filter,
        '-loop',
        '0',
        outputName,
      ];

      setStatusMsg('正在计算 256 色全局调色板并生成高保真 GIF...');
      await ffmpegService.run(args, (pct) => {
        setProgress(25 + Math.round(pct * 0.65));
      });

      const outputData = await ffmpegService.readFile(outputName);
      const blob = createSafeBlob(outputData, 'image/gif');
      const blobUrl = URL.createObjectURL(blob);

      setResult({
        data: outputData,
        blobUrl,
        outputName: `LiteCut_${baseName(videoFile)}.gif`,
        outputSize: outputData.byteLength,
        mimeType: 'image/gif',
      });

      await ffmpegService.deleteFile(inputName);
      await ffmpegService.deleteFile(outputName);

      setProgress(100);
      setState('completed');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'GIF 制作失败，请缩短截取时间后重试');
      setState('error');
    }
  };

  return (
    <div className="w-full space-y-6">
      <GlassCard className="border-t-4 border-t-brand-pink-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-xl bg-brand-pink-100 flex items-center justify-center text-brand-pink-600">
              <ImageIcon className="w-4 h-4" />
            </div>
            <span>视频转高保真 GIF 动图 (Video to GIF)</span>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
            双通道 Palette 调色板优化
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
            onClick={() => document.getElementById('gif-video-upload')?.click()}
          >
            <input
              type="file"
              id="gif-video-upload"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-pink-50 group-hover:bg-brand-pink-100 text-brand-pink-500 flex items-center justify-center mb-4 transition-colors">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-700 mb-1">
              上传短视频制作表情包或动图
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              智能 256 色抗锯齿算法，彻底告别画面雪花杂色与失真
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 aspect-video max-h-[380px] rounded-2xl overflow-hidden shadow-lg">
                <CompatibleVideo src={metadata.url} autoPlay={false} />
              </div>

              <div className="lg:col-span-5 space-y-4 bg-white/60 p-5 rounded-2xl border border-white/80">
                {/* 截取时间轴 */}
                <RangeSlider
                  duration={metadata.duration}
                  startTime={startTime}
                  endTime={endTime}
                  onChange={(s, e) => {
                    setStartTime(s);
                    setEndTime(e);
                  }}
                />

                {/* 帧率与尺寸 */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      动图帧率 (FPS)：
                    </label>
                    <select
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                    >
                      <option value={10}>10 FPS (小体积)</option>
                      <option value={12}>12 FPS (推荐)</option>
                      <option value={15}>15 FPS (较流畅)</option>
                      <option value={20}>20 FPS (超流畅)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      输出宽度：
                    </label>
                    <select
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                    >
                      <option value={320}>320 px (微信表情包)</option>
                      <option value={480}>480 px (标准清晰)</option>
                      <option value={640}>640 px (大图)</option>
                    </select>
                  </div>
                </div>

                <GradientButton
                  onClick={handleMakeGif}
                  isLoading={state === 'loading_engine' || state === 'processing'}
                  size="lg"
                  className="w-full mt-2"
                  icon={<Sparkles className="w-5 h-5" />}
                >
                  开始生成 GIF
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
                  <span>GIF 动图生成完成！</span>
                </div>

                {result.blobUrl && (
                  <div className="max-w-[320px] rounded-xl overflow-hidden border border-emerald-200 shadow-sm mx-auto sm:mx-0">
                    <img src={result.blobUrl} alt="GIF Preview" className="w-full h-auto" />
                  </div>
                )}

                <GradientButton
                  onClick={() =>
                    downloadFileSafely(result.data!, result.outputName, result.mimeType)
                  }
                  icon={<Download className="w-4 h-4" />}
                >
                  保存 GIF 动图到本地
                </GradientButton>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
