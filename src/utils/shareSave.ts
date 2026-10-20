/**
 * 视频保存工具：同源化媒体地址 + Blob/File 准备 + Web Share 文件分享。
 *
 * 背景（iOS Safari 保存相册的现实路径）：
 * - 解析后端返回的是 Render 域名的跨域绝对地址。iOS Safari 对跨域链接
 *   直接忽略 <a download> 属性，点击后按普通导航处理，视频落到
 *   Safari 下载列表 /「文件」App，而不是「照片」。
 * - 后端 CORS 白名单也不包含本站域名，前端无法直接 fetch 跨域文件。
 * - 本站 /api/* 已由 Vercel 代理到同一后端，媒体签名校验与域名无关，
 *   因此把地址换成同源路径后，前端就能 fetch 到完整 Blob，
 *   再封装为 File 通过 Web Share API 调起系统分享面板，
 *   用户在面板里选「存储视频」即可进入系统「照片」App。
 * - 纯 Web 没有静默写入相册的接口；share() 成功只代表面板已完成
 *   分享动作，不能据此断言用户已保存到相册。
 */

/** 后端（*.onrender.com）媒体地址 → 本站同源 /api 路径；其它地址原样返回。 */
export function toSameOriginUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('.onrender.com') && u.pathname.startsWith('/api/')) {
      return u.pathname + u.search;
    }
  } catch {
    // 相对地址或非法地址：原样返回，交给 fetch 报错处理
  }
  return url;
}

function safeBaseName(name: string): string {
  const cleaned = (name || '')
    .replace(/[\\/:*?"<>|#\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  return cleaned || 'LiteCut-视频';
}

/**
 * 把远程视频完整抓回本地并封装为 File。
 * 只有响应成功且 Blob 大小有效时才返回；MIME 以响应为准，
 * 响应未给视频类型时按 MP4 兜底（后端媒体代理输出即 MP4）。
 */
export async function fetchVideoFile(url: string, title: string): Promise<File> {
  const res = await fetch(toSameOriginUrl(url));
  if (!res.ok) {
    throw new Error(`视频文件获取失败（HTTP ${res.status}），链接可能已过期，请重新解析`);
  }
  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    throw new Error('视频文件为空或未完整生成，无法保存');
  }
  const type = blob.type && blob.type.startsWith('video/') ? blob.type : 'video/mp4';
  const ext = type.includes('webm') ? 'webm' : type.includes('quicktime') ? 'mov' : 'mp4';
  return new File([blob], `${safeBaseName(title)}.${ext}`, { type });
}

const EXT_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
};

/** 通用版：把远程媒体（图片/音乐等）完整抓回本地封装为 File，类型以响应为准。 */
export async function fetchBlobFile(url: string, baseName: string): Promise<File> {
  const res = await fetch(toSameOriginUrl(url));
  if (!res.ok) {
    throw new Error(`文件获取失败（HTTP ${res.status}），链接可能已过期，请重新解析`);
  }
  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    throw new Error('文件为空或未完整生成，无法保存');
  }
  const type = blob.type || 'application/octet-stream';
  const ext = EXT_BY_TYPE[type] || type.split('/')[1] || 'bin';
  return new File([blob], `${safeBaseName(baseName)}.${ext}`, { type });
}

/** 当前环境是否支持「把这个文件」通过 Web Share 分享（必须以具体 File 检测）。 */
export function canShareFile(file: File): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] } as ShareData)
    );
  } catch {
    return false;
  }
}

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported' | 'failed';

/**
 * 调起系统分享面板分享视频文件。
 * 用户取消（AbortError）与失败严格区分：取消不是错误。
 * 'shared' 仅表示分享动作完成，不代表用户已存入相册。
 */
export async function shareVideoFile(file: File, title: string): Promise<ShareOutcome> {
  if (!canShareFile(file)) return 'unsupported';
  try {
    await navigator.share({ files: [file], title: title || file.name } as ShareData);
    return 'shared';
  } catch (err: any) {
    if (err?.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

/** 传统 Blob 下载（分享不可用时的回退）：文件已在本地，直接保存 Blob。 */
export function downloadFile(file: File, revokeDelayMs = 60000): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), revokeDelayMs);
}

/** 分享体积软上限：超过后 iOS 分享面板大概率失败/内存不足，直接走下载并提示。 */
export const SHARE_SIZE_LIMIT_BYTES = 200 * 1024 * 1024;

export const SHARE_UNSUPPORTED_TIP =
  '当前浏览器无法直接调起视频分享，请尝试下载后通过分享菜单存储视频。';
