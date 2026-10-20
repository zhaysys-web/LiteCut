import React, { useEffect, useRef, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GradientButton } from '../ui/GradientButton';
import { CompatibleVideo } from '../player/CompatibleVideo';
import { AdContainer } from '../ads/AdContainer';
import {
  parseWatermarkUrl,
  SUPPORTED_PLATFORMS,
  detectPlatform,
} from '../../core/watermarkService';
import { WatermarkParseResult } from '../../types';
import {
  fetchVideoFile,
  fetchBlobFile,
  canShareFile,
  shareVideoFile,
  downloadFile,
  SHARE_SIZE_LIMIT_BYTES,
  SHARE_UNSUPPORTED_TIP,
} from '../../utils/shareSave';
import {
  Link2,
  Download,
  RotateCcw,
  Sparkles,
  Music,
  CheckCircle2,
  AlertCircle,
  Copy,
  Share2,
  Loader2,
  Info,
} from 'lucide-react';

export const WatermarkRemover: React.FC = () => {
  const [inputUrl, setInputUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<WatermarkParseResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [retrying, setRetrying] = useState<boolean>(false);
  const [saving, setSaving] = useState<'idle' | 'preparing' | 'sharing'>('idle');
  const [saveMsg, setSaveMsg] = useState<{ kind: 'info' | 'success' | 'error'; text: string } | null>(null);
  const preparedRef = useRef<{ url: string; promise: Promise<File> } | null>(null);

  const currentPlatform = detectPlatform(inputUrl);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputUrl(text);
    } catch {
      // 剪贴板未授权时静默
    }
  };

  const handleParse = async () => {
    if (!inputUrl.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setResult(null);
    setRetrying(false);

    // 备用解析服务偶有超时/限流，首次失败后自动重试一次再报错
    let data: WatermarkParseResult | null = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        data = await parseWatermarkUrl(inputUrl);
        break;
      } catch (err: any) {
        lastError = err;
        if (attempt === 0) {
          setRetrying(true);
          await new Promise((r) => setTimeout(r, 4000));
        }
      }
    }
    setRetrying(false);

    try {
      if (!data) throw lastError || new Error('解析失败，请检查分享链接是否完整');
      setResult(data);
      if (data.qualityList && data.qualityList.length > 0) {
        setSelectedQuality(data.qualityList[0].url);
      } else {
        setSelectedQuality(data.videoUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '解析失败，请检查分享链接是否完整');
    } finally {
      setLoading(false);
    }
  };

  const activeUrl = selectedQuality || result?.downloadUrl || result?.videoUrl || '';

  // 解析成功后在后台预取完整视频文件：用户点击「保存到相册」时可立即调起
  // 分享面板，避免异步等待丢失 iOS Safari 要求的手势激活窗口。
  useEffect(() => {
    if (!result || !activeUrl) return;
    const promise = fetchVideoFile(activeUrl, result.title || 'LiteCut-视频');
    promise.catch(() => {
      // 预取失败不在此处提示，点击保存时会实时重试
    });
    preparedRef.current = { url: activeUrl, promise };
    setSaveMsg(null);
  }, [result, activeUrl]);

  const getPreparedFile = (): Promise<File> => {
    const cached = preparedRef.current;
    if (cached && cached.url === activeUrl) return cached.promise;
    const promise = fetchVideoFile(activeUrl, result?.title || 'LiteCut-视频');
    preparedRef.current = { url: activeUrl, promise };
    return promise;
  };

  /** 保存到相册：文件完整就绪后优先 Web Share 调起系统面板；不可用则回退下载。 */
  const handleSaveToAlbum = async () => {
    if (!result || !activeUrl || saving !== 'idle') return;
    setSaveMsg(null);
    try {
      setSaving('preparing');
      const file = await getPreparedFile();
      if (file.size > SHARE_SIZE_LIMIT_BYTES) {
        downloadFile(file);
        setSaveMsg({
          kind: 'info',
          text: `视频较大（约 ${(file.size / 1048576).toFixed(0)} MB），分享保存容易失败，已改为普通下载；下载后打开文件，用分享菜单里的「存储视频」同样可以存入相册。`,
        });
        return;
      }
      if (!canShareFile(file)) {
        downloadFile(file);
        setSaveMsg({ kind: 'info', text: SHARE_UNSUPPORTED_TIP });
        return;
      }
      setSaving('sharing');
      const outcome = await shareVideoFile(file, result.title || 'LiteCut 视频');
      if (outcome === 'shared') {
        setSaveMsg({
          kind: 'success',
          text: '已完成分享操作。若要存入相册，请在系统面板中选择「存储视频」，随后到「照片」App 里确认。',
        });
      } else if (outcome === 'cancelled') {
        // 用户取消不算失败
        setSaveMsg({ kind: 'info', text: '已取消分享，视频尚未保存。' });
      } else if (outcome === 'unsupported') {
        downloadFile(file);
        setSaveMsg({ kind: 'info', text: SHARE_UNSUPPORTED_TIP });
      } else {
        downloadFile(file);
        setSaveMsg({ kind: 'error', text: '分享调起失败，已自动改为普通下载。' });
      }
    } catch (err: any) {
      setSaveMsg({ kind: 'error', text: err?.message || '视频准备失败，请重新解析后再试' });
    } finally {
      setSaving('idle');
    }
  };

  /** 下载视频：优先把完整文件抓回本地再以 Blob 下载（iOS 不再跳原始直链）。 */
  const handleDownloadVideo = async () => {
    if (!result || !activeUrl || saving !== 'idle') return;
    setSaveMsg(null);
    try {
      setSaving('preparing');
      const file = await getPreparedFile();
      downloadFile(file);
      setSaveMsg({ kind: 'success', text: '已开始下载视频文件。' });
    } catch {
      handleDownload(result.downloadUrl || activeUrl, `${result.title || 'video'}_nowatermark.mp4`);
    } finally {
      setSaving('idle');
    }
  };

  /** 图文作品：保存单张图片（优先系统分享存相册，不支持时回退下载）。 */
  const handleSaveImage = async (src: string, idx: number) => {
    if (!result || saving !== 'idle') return;
    setSaveMsg(null);
    try {
      setSaving('preparing');
      const file = await fetchBlobFile(src, `${result.title || '图文作品'}-图${idx + 1}`);
      if (canShareFile(file)) {
        setSaving('sharing');
        const outcome = await shareVideoFile(file, result.title || '图片');
        if (outcome === 'shared') {
          setSaveMsg({ kind: 'success', text: `第 ${idx + 1} 张已完成分享操作；在系统面板里选「存储图像」即可存入相册。` });
        } else if (outcome === 'cancelled') {
          setSaveMsg({ kind: 'info', text: '已取消分享，图片尚未保存。' });
        } else {
          downloadFile(file);
          setSaveMsg({ kind: 'info', text: SHARE_UNSUPPORTED_TIP });
        }
      } else {
        downloadFile(file);
        setSaveMsg({ kind: 'info', text: SHARE_UNSUPPORTED_TIP });
      }
    } catch (err: any) {
      setSaveMsg({ kind: 'error', text: err?.message || '图片准备失败，请稍后重试' });
    } finally {
      setSaving('idle');
    }
  };

  /** 图文作品：下载背景音乐。 */
  const handleSaveMusic = async () => {
    if (!result?.musicUrl || saving !== 'idle') return;
    setSaveMsg(null);
    try {
      setSaving('preparing');
      const file = await fetchBlobFile(result.musicUrl, result.musicTitle || '背景音乐');
      downloadFile(file);
      setSaveMsg({ kind: 'success', text: '已开始下载背景音乐。' });
    } catch (err: any) {
      setSaveMsg({ kind: 'error', text: err?.message || '音乐获取失败，请稍后重试' });
    } finally {
      setSaving('idle');
    }
  };

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full space-y-6">
      {/* 链接输入区 */}
      <GlassCard className="border-t-4 border-t-brand-blue-400">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-xl bg-brand-blue-100 flex items-center justify-center text-brand-blue-600">
              <Link2 className="w-4 h-4" />
            </div>
            <span>短视频链接一键去水印</span>
          </div>

          {currentPlatform && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-blue-50 text-brand-blue-600 border border-brand-blue-200">
              已识别: {currentPlatform.name}
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-slate-500 mb-4">
          支持从抖音、快手、小红书、TikTok、B站等 App 复制分享链接直接粘贴，自动提取原画无水印视频。
          解析由云端服务完成，服务冷启动时最长可能需要约 1 分钟，请耐心等待，不要重复点击。
        </p>

        <div className="relative">
          <textarea
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="请在此粘贴短视频分享链接或包含链接的文案，例如：7.12 复制打开抖音，看看【小明的作品】 https://v.douyin.com/xxx/"
            className="w-full h-24 sm:h-28 p-3.5 sm:p-4 text-xs sm:text-sm bg-white/90 border border-slate-200/90 rounded-2xl focus:ring-2 focus:ring-brand-blue-300 focus:border-brand-blue-400 outline-none resize-none transition-all placeholder:text-slate-400 shadow-inner"
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {inputUrl && (
              <button
                onClick={() => setInputUrl('')}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                清空
              </button>
            )}
            <button
              onClick={handlePaste}
              className="px-3 py-1 text-xs text-brand-blue-600 font-medium hover:bg-brand-blue-50 rounded-lg border border-brand-blue-200 transition-colors flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              粘贴
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-1">支持平台:</span>
            {SUPPORTED_PLATFORMS.map((p) => (
              <span
                key={p.id}
                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
              >
                {p.name}
              </span>
            ))}
          </div>

          <GradientButton
            onClick={handleParse}
            isLoading={loading}
            disabled={!inputUrl.trim()}
            className="w-full sm:w-auto"
            icon={<Sparkles className="w-4 h-4" />}
          >
            {retrying ? '首次未成功，自动重试中…' : '开始去水印解析'}
          </GradientButton>
        </div>
      </GlassCard>

      {/* 广告插槽 */}
      <AdContainer slotType="banner" />

      {/* 解析失败错误提示与重试 */}
      {errorMsg && (
        <GlassCard className="border-l-4 border-l-rose-500 bg-rose-50/60">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-rose-800 text-sm">解析遇到问题</h4>
              <p className="text-xs text-rose-600 mt-1">{errorMsg}</p>
              <div className="mt-3">
                <button
                  onClick={handleParse}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-semibold hover:bg-rose-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  点击重新尝试
                </button>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 解析成功结果展示 */}
      {result && (
        <GlassCard className="border-t-4 border-t-emerald-400">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm sm:text-base">
              <CheckCircle2 className="w-5 h-5" />
              <span>{result.contentKind === 'image_album' ? '解析成功！这是一条图文作品' : '解析成功！无水印原画视频已就绪'}</span>
            </div>
            <span className="text-xs text-slate-400">来源: {result.platform}</span>
          </div>

          {result.contentKind === 'image_album' ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-800 text-base leading-snug line-clamp-2">
                  {result.title}
                </h4>
                {result.author && (
                  <p className="text-xs text-slate-500 mt-1">创作者: {result.author}</p>
                )}
                <p className="text-xs leading-relaxed text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5 mt-3">
                  这条链接是图文作品（在抖音里配乐自动播放，看起来像视频），本身没有视频文件。已提取 {result.images?.length || 0} 张原图，可逐张保存到相册。
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {result.images?.map((src, i) => (
                  <div key={i} className="space-y-1.5">
                    <img
                      src={src}
                      alt={`图文图片 ${i + 1}`}
                      loading="lazy"
                      className="w-full aspect-[3/4] object-cover rounded-xl bg-slate-100 shadow-sm"
                    />
                    <button
                      onClick={() => handleSaveImage(src, i)}
                      disabled={saving !== 'idle'}
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      保存第 {i + 1} 张
                    </button>
                  </div>
                ))}
              </div>

              {result.musicUrl && (
                <button
                  onClick={handleSaveMusic}
                  disabled={saving !== 'idle'}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Music className="w-4 h-4 text-brand-pink-500" />
                  下载背景音乐{result.musicTitle ? `：${result.musicTitle}` : ''}
                </button>
              )}

              {saveMsg && (
                <div
                  className={`flex items-start gap-2 text-xs leading-relaxed rounded-xl px-3 py-2.5 ${
                    saveMsg.kind === 'success'
                      ? 'bg-emerald-50 text-emerald-700'
                      : saveMsg.kind === 'error'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  {saveMsg.kind === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : saveMsg.kind === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{saveMsg.text}</span>
                </div>
              )}
            </div>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* 播放器预览 */}
            <div className="w-full aspect-[9/16] max-h-[460px] rounded-2xl overflow-hidden shadow-lg mx-auto">
              <CompatibleVideo
                src={selectedQuality || result.videoUrl}
                poster={result.coverUrl}
                autoPlay={false}
              />
            </div>

            {/* 下载与清晰度选项 */}
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-800 text-base leading-snug line-clamp-2">
                  {result.title}
                </h4>
                {result.author && (
                  <p className="text-xs text-slate-500 mt-1">创作者: {result.author}</p>
                )}
              </div>

              {/* 清晰度切换 */}
              {result.qualityList && result.qualityList.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2">
                    清晰度画质选择：
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {result.qualityList.map((q) => (
                      <button
                        key={q.label}
                        onClick={() => setSelectedQuality(q.url)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          selectedQuality === q.url
                            ? 'bg-brand-blue-500 text-white shadow-md'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 核心操作按钮 */}
              <div className="pt-2 space-y-2.5">
                <GradientButton
                  onClick={handleSaveToAlbum}
                  disabled={saving !== 'idle'}
                  size="lg"
                  className="w-full"
                  icon={
                    saving === 'preparing' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Share2 className="w-5 h-5" />
                    )
                  }
                >
                  {saving === 'preparing' ? '正在准备视频…' : saving === 'sharing' ? '正在调起分享…' : '保存到相册'}
                </GradientButton>

                <button
                  onClick={handleDownloadVideo}
                  disabled={saving !== 'idle'}
                  className="w-full py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载视频
                </button>

                {saveMsg && (
                  <div
                    className={`flex items-start gap-2 text-xs leading-relaxed rounded-xl px-3 py-2.5 ${
                      saveMsg.kind === 'success'
                        ? 'bg-emerald-50 text-emerald-700'
                        : saveMsg.kind === 'error'
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-sky-50 text-sky-700'
                    }`}
                  >
                    {saveMsg.kind === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : saveMsg.kind === 'error' ? (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{saveMsg.text}</span>
                  </div>
                )}
              </div>

                {result.audioUrl && (
                  <button
                    onClick={() => handleDownload(result.audioUrl!, `${result.title || 'audio'}_audio.mp3`)}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Music className="w-4 h-4 text-brand-pink-500" />
                    提取并下载背景音乐 (MP3)
                  </button>
                )}

                {result.coverUrl && (
                  <button
                    onClick={() => handleDownload(result.coverUrl, `${result.title || 'cover'}_cover.jpg`)}
                    className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-slate-800 text-xs transition-colors"
                  >
                    保存高清视频封面图
                  </button>
                )}
            </div>
          </div>
          </>
          )}
        </GlassCard>
      )}
    </div>
  );
};
