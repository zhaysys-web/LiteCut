/**
 * 媒体文件小工具：扩展名保留、缩放滤镜、输出命名。
 *
 * 此前多个工具把输入文件一律写成 input_xxx.mp4、输出也一律 .mp4，
 * 遇到 WebM(VP9)/MOV(HEVC) 等源文件时，-c copy 会把编码原样塞进 MP4 容器，
 * 生成的文件很多播放器打不开；缩放滤镜还会把小视频强行放大，既慢又糊。
 * 这里统一收口处理。
 */

/** 取文件扩展名（小写、无点），取不到时回退 mp4 */
export function getFileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName && fromName.length <= 5) return fromName;
  const fromType = file.type.split('/').pop()?.toLowerCase();
  if (fromType === 'quicktime') return 'mov';
  if (fromType) return fromType;
  return 'mp4';
}

/** 生成 FFmpeg 虚拟文件系统里的输入文件名，保留真实扩展名 */
export function makeInputName(file: File): string {
  return `input_${Date.now()}.${getFileExtension(file)}`;
}

/** 去掉扩展名的文件名主体（用于拼输出名） */
export function baseName(file: File): string {
  return file.name.replace(/\.[^/.]+$/, '') || 'video';
}

const MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  aac: 'audio/aac',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export function mimeForExtension(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] || 'application/octet-stream';
}

/** -c copy 无损场景下可以直接沿用的容器扩展名 */
const COPY_SAFE_EXTS = ['mp4', 'm4v', 'mov', 'webm', 'mkv'];

export function copyOutputExtension(file: File): string {
  const ext = getFileExtension(file);
  return COPY_SAFE_EXTS.includes(ext) ? ext : 'mp4';
}

/**
 * 「缩到目标 P 数、绝不放大」的缩放滤镜。
 * targetP 指短边分辨率：横屏按高度、竖屏按宽度，与用户对 720P/1080P 的直觉一致。
 * 源尺寸未知时回退为按高度缩放且不放大。
 */
export function downscaleFilter(
  targetP: number,
  srcWidth?: number,
  srcHeight?: number
): string {
  if (srcWidth && srcHeight && srcWidth < srcHeight) {
    // 竖屏：限制宽度（短边）
    return `scale=min(${targetP}\\,iw):-2`;
  }
  // 横屏 / 方形 / 未知：限制高度（短边）
  return `scale=-2:min(${targetP}\\,ih)`;
}

/** 取偶数（编码器要求宽高为偶数） */
export function toEven(n: number): number {
  const v = Math.max(2, Math.round(n));
  return v % 2 === 0 ? v : v - 1;
}
