/**
 * 安全下载大文件辅助模块
 * 重点解决浏览器内存溢出 (OOM) 导致页面白屏崩溃与移动端下载失败问题
 */

/**
 * 安全创建 Blob，避免 SharedArrayBuffer 被直接传入 Blob 引起特定浏览器异常
 */
export function createSafeBlob(data: Uint8Array, mimeType: string): Blob {
  const cleanBuffer = new Uint8Array(data.byteLength);
  cleanBuffer.set(data);
  return new Blob([cleanBuffer.buffer], { type: mimeType });
}

export async function downloadFileSafely(
  data: Uint8Array,
  filename: string,
  mimeType: string
): Promise<void> {
  // 1. 如果支持现代 File System Access API (桌面端 Chromium 浏览器)
  if ('showSaveFilePicker' in window && window.isSecureContext) {
    try {
      const ext = filename.split('.').pop() || 'mp4';
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Processed Video/Audio',
            accept: { [mimeType]: [`.${ext}`] },
          },
        ],
      });

      const writable = await handle.createWritable();
      const cleanBuffer = new Uint8Array(data.byteLength);
      cleanBuffer.set(data);
      await writable.write(cleanBuffer);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.warn('showSaveFilePicker 出错，回退到 Blob 触发下载:', err);
    }
  }

  // 2. 移动端 Safari / 安卓 / 普通浏览器回退机制
  const blob = createSafeBlob(data, mimeType);
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename;

  // 兼容 iOS Safari
  a.setAttribute('target', '_blank');
  document.body.appendChild(a);
  a.click();

  // 延迟释放：旧版只等 2 秒就 revoke，大文件在慢速设备上下载会被中途切断。
  // 改为 60 秒后再释放，给浏览器下载队列留足读取时间。
  setTimeout(() => {
    try {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn('清理 BlobURL 失败:', e);
    }
  }, 60000);
}
