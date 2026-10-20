import { FFmpeg } from '@ffmpeg/ffmpeg';
// FFmpeg 核心改为随项目本地打包（node_modules -> Vite 静态资源），
// 不再从 unpkg.com 外链加载：外链在国内网络下经常超时/被限速，
// 是此前「点了开始处理就一直卡在加载引擎 / 直接报错」的头号原因。
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

/**
 * 为什么只用单线程核心（实测结论，2026-10-20）：
 * 多线程 core-mt 在当前主流 Chromium 上跑 libx264 重编码
 * （视频压缩、画幅转换、格式转换）会触发
 * `RuntimeError: function signature mismatch` 直接崩溃，
 * VP9 编码甚至会把整个页面带崩。单线程核心下全部工具实测通过，
 * 短视频处理时长完全可接受。稳定 > 理论速度，故移除多线程路径。
 */
export class FFmpegService {
  private static instance: FFmpegService;
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;
  /** 最近的 FFmpeg 日志行，报错时带给用户看真实原因，而不是只有一个退出码 */
  private recentLogs: string[] = [];

  private constructor() {}

  public static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  public isReady(): boolean {
    return this.isLoaded && this.ffmpeg !== null;
  }

  private attachLogCapture(ffmpeg: FFmpeg) {
    this.recentLogs = [];
    ffmpeg.on('log', ({ message }: { message: string }) => {
      this.recentLogs.push(message);
      if (this.recentLogs.length > 60) this.recentLogs.shift();
    });
  }

  /** 从日志尾部提炼一句人能看懂的失败原因 */
  private summarizeError(fallback: string): string {
    const interesting = [...this.recentLogs]
      .reverse()
      .find((l) =>
        /(error|invalid|no such|not found|matches no streams|unsupported|failed|could not|unable|moov atom not found)/i.test(
          l
        )
      );
    return interesting ? `${fallback}：${interesting.trim()}` : fallback;
  }

  public async load(
    onProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    if (this.isLoaded && this.ffmpeg) return;
    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.isLoaded && this.ffmpeg) return;
      // 并发等待的那次加载失败了，继续走下面的重试流程
    }

    this.isLoading = true;
    onProgress?.(40, '正在加载本地处理引擎...');
    // 每次加载都新建实例：加载失败过的实例不能复用（旧版降级失败的原因之一）
    const ffmpeg = new FFmpeg();
    this.attachLogCapture(ffmpeg);
    try {
      await ffmpeg.load({ coreURL, wasmURL });
    } catch (err: any) {
      this.isLoading = false;
      this.ffmpeg = null;
      throw new Error(
        `本地处理引擎加载失败（${err?.message || '未知错误'}）。请刷新页面重试；若在微信内置浏览器中打开，请改用系统浏览器。`
      );
    }
    this.ffmpeg = ffmpeg;
    this.isLoaded = true;
    this.isLoading = false;
    onProgress?.(100, '引擎准备就绪');
  }

  public async run(
    args: string[],
    onProgress?: (percent: number) => void
  ): Promise<void> {
    if (!this.ffmpeg || !this.isLoaded) {
      throw new Error('FFmpeg 尚未加载完成');
    }
    this.recentLogs = [];

    let progressHandler: any = null;
    if (onProgress) {
      progressHandler = ({ progress }: { progress: number }) => {
        const pct = Math.min(Math.max(Math.round(progress * 100), 0), 100);
        onProgress(pct);
      };
      this.ffmpeg.on('progress', progressHandler);
    }

    try {
      const exitCode = await this.ffmpeg.exec(args);
      if (exitCode !== 0) {
        throw new Error(
          this.summarizeError(`处理失败（FFmpeg 退出码 ${exitCode}）`)
        );
      }
    } finally {
      if (progressHandler) {
        this.ffmpeg.off('progress', progressHandler);
      }
    }
  }

  /** 真正的取消：终止 Wasm 工作线程。终止后下次处理会自动重新加载引擎。 */
  public cancel() {
    try {
      this.ffmpeg?.terminate();
    } catch {
      // 忽略终止异常
    }
    this.ffmpeg = null;
    this.isLoaded = false;
    this.isLoading = false;
  }

  public async writeFile(name: string, data: Uint8Array): Promise<void> {
    if (!this.ffmpeg) throw new Error('FFmpeg 未就绪');
    await this.ffmpeg.writeFile(name, data);
  }

  public async readFile(name: string): Promise<Uint8Array> {
    if (!this.ffmpeg) throw new Error('FFmpeg 未就绪');
    const result = await this.ffmpeg.readFile(name);
    if (typeof result === 'string') {
      throw new Error('读取处理结果失败：结果为空或格式异常（文件可能已损坏）');
    }
    if (!result || result.byteLength === 0) {
      throw new Error(
        this.summarizeError('处理结果为空文件，源视频编码可能不受支持')
      );
    }
    return result as Uint8Array;
  }

  public async deleteFile(name: string): Promise<void> {
    if (!this.ffmpeg) return;
    try {
      await this.ffmpeg.deleteFile(name);
    } catch {
      // 忽略文件不存在等异常
    }
  }

  public getIsMultiThread(): boolean {
    return false;
  }
}
