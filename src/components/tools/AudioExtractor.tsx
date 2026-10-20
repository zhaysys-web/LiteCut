import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GradientButton } from '../ui/GradientButton';
import { ProgressBar } from '../ui/ProgressBar';
import { FFmpegService } from '../../core/ffmpegService';
import { downloadFileSafely, createSafeBlob } from '../../core/downloadHelper';
import { VideoMetadata, ProcessingState, ProcessingResult } from '../../types';
import { makeInputName, baseName } from '../../core/media';
import { Music, UploadCloud, Download, CheckCircle2, AlertCircle, PlayCircle, Volume2 } from 'lucide-react';

export const AudioExtractor: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav' | 'aac'>('mp3');
  const [bitrate, setBitrate] = useState<'320k' | '192k' | '128k'>('320k');

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

  const handleExtract = async () => {
    if (!videoFile || !metadata) return;

    setState('loading_engine');
    setProgress(5);
    setStatusMsg('正在初始化音频分离引擎...');
    setErrorMsg(null);

    const ffmpegService = FFmpegService.getInstance();

    try {
      await ffmpegService.load((pct, msg) => {
        setProgress(pct * 0.25);
        setStatusMsg(msg);
      });

      setState('processing');
      setStatusMsg('正在读取音视频混合轨道...');
      setProgress(25);

      const inputName = makeInputName(videoFile);
      const outputName = `audio_${Date.now()}.${audioFormat}`;

      const fileBuffer = new Uint8Array(await videoFile.arrayBuffer());
      await ffmpegService.writeFile(inputName, fileBuffer);

      // 明确只取第一条音轨：无音轨的视频会在这里给出清晰报错，而不是生成空文件
      const args = ['-i', inputName, '-map', '0:a:0', '-vn'];

      if (audioFormat === 'mp3') {
        args.push('-c:a', 'libmp3lame', '-b:a', bitrate);
      } else if (audioFormat === 'wav') {
        args.push('-c:a', 'pcm_s16le');
      } else if (audioFormat === 'aac') {
        args.push('-c:a', 'aac', '-b:a', bitrate);
      }

      args.push(outputName);

      setStatusMsg(`正在提取纯净音轨并封装为 ${audioFormat.toUpperCase()}...`);
      await ffmpegService.run(args, (pct) => {
        setProgress(25 + Math.round(pct * 0.65));
      });

      const outputData = await ffmpegService.readFile(outputName);
      const mimeMap: Record<string, string> = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        aac: 'audio/aac',
      };
      const mime = mimeMap[audioFormat] || 'audio/mpeg';
      const blob = createSafeBlob(outputData, mime);
      const blobUrl = URL.createObjectURL(blob);

      setResult({
        data: outputData,
        blobUrl,
        outputName: `LiteCut_${baseName(videoFile)}.${audioFormat}`,
        outputSize: outputData.byteLength,
        mimeType: mime,
      });

      await ffmpegService.deleteFile(inputName);
      await ffmpegService.deleteFile(outputName);

      setProgress(100);
      setState('completed');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '音频提取失败');
      setState('error');
    }
  };

  return (
    <div className="w-full space-y-6">
      <GlassCard className="border-t-4 border-t-brand-blue-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-xl bg-brand-blue-100 flex items-center justify-center text-brand-blue-600">
              <Music className="w-4 h-4" />
            </div>
            <span>视频提取音频与格式转换 (Audio Extract)</span>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-blue-50 text-brand-blue-600 border border-brand-blue-200">
            支持 320kbps 母带级超清音质
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
            onClick={() => document.getElementById('audio-video-upload')?.click()}
          >
            <input
              type="file"
              id="audio-video-upload"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-blue-50 group-hover:bg-brand-blue-100 text-brand-blue-500 flex items-center justify-center mb-4 transition-colors">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-700 mb-1">
              选择短视频提取背景音乐或伴奏
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              极速无损剥离画面，纯净导出 MP3、无损 WAV 或高兼容 AAC
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/70 p-5 rounded-2xl border border-white/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue-100 flex items-center justify-center text-brand-blue-600">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 truncate max-w-[280px]">
                      {metadata.name}
                    </h4>
                    <p className="text-xs text-slate-400">视频时长: {Math.round(metadata.duration)} 秒</p>
                  </div>
                </div>

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

              {/* 格式与码率 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    音频封装格式：
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'mp3', label: 'MP3 (通用)' },
                      { id: 'wav', label: 'WAV (无损)' },
                      { id: 'aac', label: 'AAC (高保真)' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setAudioFormat(f.id as any)}
                        className={`py-2 px-2 text-xs rounded-xl border font-semibold transition-all ${
                          audioFormat === f.id
                            ? 'bg-brand-blue-500 text-white border-brand-blue-500 shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    音质码率选择：
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '320k', label: '320 kbps (高品质)' },
                      { id: '192k', label: '192 kbps (标准)' },
                      { id: '128k', label: '128 kbps (精简)' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBitrate(b.id as any)}
                        disabled={audioFormat === 'wav'}
                        className={`py-2 px-1 text-xs rounded-xl border font-semibold transition-all disabled:opacity-40 ${
                          bitrate === b.id
                            ? 'bg-brand-pink-500 text-white border-brand-pink-500 shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <GradientButton
                onClick={handleExtract}
                isLoading={state === 'loading_engine' || state === 'processing'}
                size="lg"
                className="w-full mt-2"
                icon={<Music className="w-5 h-5" />}
              >
                开始提取音频
              </GradientButton>
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
                  <span>音频提取成功！</span>
                </div>

                {/* 实时在线试听播放器 */}
                {result.blobUrl && (
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-sm flex items-center gap-3">
                    <PlayCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <audio src={result.blobUrl} controls className="w-full h-8" />
                  </div>
                )}

                <GradientButton
                  onClick={() =>
                    downloadFileSafely(result.data!, result.outputName, result.mimeType)
                  }
                  icon={<Download className="w-4 h-4" />}
                >
                  保存音频文件 ({result.outputName.split('.').pop()?.toUpperCase()})
                </GradientButton>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
