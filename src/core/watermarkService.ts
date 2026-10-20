import { WatermarkParseResult } from '../types';

export interface SupportedPlatform {
  id: string;
  name: string;
  color: string;
  pattern: RegExp;
  example: string;
}

export const SUPPORTED_PLATFORMS: SupportedPlatform[] = [
  {
    id: 'douyin',
    name: '抖音 / TikTok',
    color: 'from-slate-900 to-rose-600',
    pattern: /(v\.douyin\.com|douyin\.com|tiktok\.com|iesdouyin\.com)/i,
    example: 'https://v.douyin.com/xxxxx/',
  },
  {
    id: 'kuaishou',
    name: '快手',
    color: 'from-orange-500 to-amber-500',
    pattern: /(kuaishou\.com|v\.kuaishou\.com|gifshow\.com)/i,
    example: 'https://v.kuaishou.com/xxxxx',
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    color: 'from-red-500 to-rose-500',
    pattern: /(xhslink\.com|xiaohongshu\.com)/i,
    example: 'http://xhslink.com/xxxxx',
  },
  {
    id: 'bilibili',
    name: '哔哩哔哩 (B站)',
    color: 'from-sky-400 to-blue-500',
    pattern: /(b23\.tv|bilibili\.com)/i,
    example: 'https://b23.tv/xxxxx',
  },
  {
    id: 'weibo',
    name: '微博视频',
    color: 'from-amber-500 to-red-600',
    pattern: /(weibo\.com|weibo\.cn)/i,
    example: 'https://weibo.com/tv/show/xxxxx',
  },
];

/**
 * 从用户粘贴的长文本中清洗提取 URL
 */
export function extractUrlFromText(text: string): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9+&@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#/%=~_|]/i);
  return match ? match[0] : null;
}

/**
 * 识别匹配平台
 */
export function detectPlatform(url: string): SupportedPlatform | null {
  for (const p of SUPPORTED_PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return null;
}

/**
 * 解析接口地址：
 * - 默认走同源 /api/parser（开发环境由 vite.config.ts 代理到解析后端；
 *   生产环境可用反向代理同样转发，或用下面的环境变量直连）。
 * - 设置 VITE_PARSER_API_BASE 后直连该后端，例如
 *   VITE_PARSER_API_BASE=https://livecraft-media.onrender.com
 *   注意直连时需把本站域名加入后端 CORS_ORIGINS 白名单。
 */
const PARSER_API_BASE: string = (import.meta as any).env?.VITE_PARSER_API_BASE || '';

/**
 * 视频去水印解析。
 *
 * 旧版本在接口不存在时会编造一条示例视频冒充「解析成功」——用户下载到的
 * 永远是同一条无关视频，这是这个工具此前最严重的不可用。现在只认真实
 * 后端（LiveCraft 媒体服务 POST /api/parser）的返回；失败就把后端给出的
 * 真实原因展示出来，绝不造假。
 */
export async function parseWatermarkUrl(rawInput: string): Promise<WatermarkParseResult> {
  const url = extractUrlFromText(rawInput);
  if (!url) {
    throw new Error('未在输入内容中找到有效的 HTTP/HTTPS 分享链接，请重新核对');
  }

  const platform = detectPlatform(url);
  const endpoint = `${PARSER_API_BASE}/api/parser`;

  let response: Response;
  try {
    const controller = new AbortController();
    // 解析后端为免费实例，冷启动可能需要 30~60 秒，给足等待时间
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_text: rawInput }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('解析服务响应超时（服务可能正在冷启动），请稍等十几秒后重试');
    }
    throw new Error(
      '连接不到解析服务。请检查网络；若本站为纯静态部署，需要配置解析后端（见 README「去水印解析后端」一节）'
    );
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    // 非 JSON 响应按状态码处理
  }

  if (!response.ok) {
    // 后端结构化错误：{ error_code, message }
    const msg = json?.message || json?.detail;
    throw new Error(msg || `解析失败（服务返回 ${response.status}），请稍后重试或换一条分享链接`);
  }

  // 图文作品：没有视频流，后端返回图片组 + 背景音乐，走专门的展示分支
  if ((json?.content_kind || json?.data?.content_kind) === 'image_album') {
    const images: string[] = json.images || json.data?.images || [];
    if (images.length === 0) {
      throw new Error('这条图文作品没有提取到图片，请换一条分享链接重试');
    }
    return {
      title: json.title || json.data?.title || '图文作品',
      author: json.author || json.data?.author || undefined,
      platform: platform ? platform.name : json.platform || '短视频',
      coverUrl: json.cover_url || json.data?.cover_url || images[0],
      videoUrl: '',
      downloadUrl: '',
      audioUrl: undefined,
      qualityList: undefined,
      contentKind: 'image_album',
      images,
      musicUrl: json.music_url || json.data?.music_url || undefined,
      musicTitle: json.music_title || json.data?.music_title || undefined,
    };
  }

  // 后端成功返回：{ platform, video_url, download_url, title, author, cover_url, ... }
  const videoUrl: string = json?.video_url || json?.data?.video_url || '';
  if (!videoUrl) {
    throw new Error('解析服务未返回可用的视频地址，请换一条分享链接重试');
  }

  return {
    title: json.title || json.data?.title || '无水印视频',
    author: json.author || json.data?.author || undefined,
    platform: platform ? platform.name : json.platform || '短视频',
    coverUrl: json.cover_url || json.data?.cover_url || '',
    videoUrl,
    downloadUrl: json.download_url || json.data?.download_url || videoUrl,
    audioUrl: undefined,
    qualityList: undefined,
    contentKind: 'video',
  };
}
