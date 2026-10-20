/**
 * 格式化字节大小为可读字符串 (如 12.5 MB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 格式化秒数为 hh:mm:ss 或 mm:ss
 */
export function formatTime(seconds: number, includeMs: boolean = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  const pad = (n: number) => n.toString().padStart(2, '0');

  let res = '';
  if (hrs > 0) {
    res = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  } else {
    res = `${pad(mins)}:${pad(secs)}`;
  }

  if (includeMs) {
    res += `.${pad(ms)}`;
  }
  return res;
}

/**
 * 将秒数转为 FFmpeg 接受的 00:00:00.000 格式
 */
export function formatFFmpegTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00.000';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z: number = 2) => n.toString().padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
}

/**
 * 格式化计算压缩比百分比
 */
export function calcRatio(original: number, current: number): string {
  if (original <= 0 || current <= 0) return '0%';
  const diff = original - current;
  const percent = Math.round((diff / original) * 100);
  if (percent > 0) {
    return `瘦身 -${percent}%`;
  } else if (percent < 0) {
    return `增加 +${Math.abs(percent)}%`;
  }
  return '体积相同';
}
