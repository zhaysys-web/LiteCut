# 短视频工具箱 (VideoKit) 完整技术方案与架构设计

## 一、 产品定位与核心功能矩阵

### 1.1 定位与商业模式
- **定位**：纯前端、免上传、极速隐私安全的“轻量级多功能短视频工具箱”。
- **商业模式**：**免费 + 广告盈利（Google AdSense / 联盟广告 / 赞助广告）**。
- **架构优势**：用户视频 100% 在本地浏览器完成解析与导出，**无需昂贵的 GPU 渲染云服务器与流媒体下行带宽**，服务器仅承载轻量静态网页托管，运维成本几乎为零，毛利率极高。

### 1.2 核心工具矩阵
| 模块分类 | 工具名称 | 核心技术原理 | 耗时与算力消耗 |
| :--- | :--- | :--- | :--- |
| **基础剪辑** | **无损极速剪辑 (Trim)** | `ffmpeg.wasm` `-c copy` / WebCodecs | **毫秒级~秒级**（无需二次重编码） |
| **体积优化** | **智能视频压缩 (Compress)** | 动态双模式：WebCodecs硬件加速或 FFmpeg CRF/Preset 智能压制 | 依时长而定（硬件加速下通常 < 15秒） |
| **音视分离** | **音频提取 (Extract Audio)** | 直接剥离音轨并封装为 MP3 / AAC | **极快**（无转码直接封装） |
| **格式互转** | **格式转换 (Convert)** | MP4 / WebM / MOV 互转 | 中等 |
| **动图制作** | **视频转 GIF (Video to GIF)** | FFmpeg palettegen/paletteuse 调色板调优 | 算法增强调色板，防止杂色 |
| **画面调整** | **画面裁剪与旋转 (Crop & Rotate)** | Canvas 2D / WebGL 硬件滤镜 + WebCodecs 编码 | 实时预览，快速导出 |
| **辅助提取** | **高清封面提取 (Frame Capture)** | HTML5 Video + OffscreenCanvas 逐帧精确定位 | **即时**，可导出原始画质 PNG/JPG |

---

## 二、 关键痛点专项攻坚方案（核心技术壁垒）

### 2.1 痛点一：视频画质劣化与色彩失真
- **根因**：浏览器端 FFmpeg 默认转码会触发重编码，若未指定 CRF、预设和色彩空间，会导致二次量化失真、暗部断层、色彩泛白。
- **解决方案**：
  1. **首选 Stream Copy（无损流复制）**：在做视频剪切、音频提取、格式重封装（如 MOV 转 MP4）时，严格使用 `-c copy`（或 `-c:v copy -c:a copy`），**不解码、不重编码**，保证 100% 原始画质与色彩。
  2. **智能 CRF 控画质机制**：针对必须转码的场景，使用 H.264 `crf=20` 到 `23`（视觉无损范围），并强制追加 `-pix_fmt yuv420p`，防止 Safari 与安卓原生播放器因色彩格式不支持而黑屏或色彩偏色。
  3. **高帧率与关键帧吸附**：剪辑时间轴对齐 GOP（关键帧），避免非关键帧切入导致的开场首帧花屏或画面停滞。

### 2.2 痛点二：处理速度慢与浏览器假死
- **根因**：单线程运行 FFmpeg 会阻塞主线程 UI，软解 1080P/4K 视频极为耗时。
- **解决方案**：
  1. **WebCodecs API 硬件加速先行**：针对现代浏览器（Chrome、Edge、Safari 16.4+），优先采用 WebCodecs 的 `VideoDecoder` 和 `VideoEncoder`，调用设备 GPU 硬解/硬编，速度提升 5~10 倍。
  2. **Wasm 多线程 + SIMD 极速优化**：引入开启了 `pthread`（多线程）与 SIMD 指令集的 `@ffmpeg/ffmpeg 0.12+`，并利用 `coi-serviceworker` 或服务端返回特定 HTTP 头激活 `SharedArrayBuffer`。
  3. **Web Worker 隔离**：所有的解码、运算和进度计算完全置入 Dedicated Web Worker 中运行，主线程 UI 保持 60 FPS 丝滑响应。

### 2.3 痛点三：大文件下载失败与内存溢出 (OOM) 崩溃
- **根因**：传统方案是将转码完成的视频全部读入内存拼成一个巨大的 `Blob`，然后创建 `blob:http://...` 触发 `<a download>`。当处理 500MB~2GB 的长视频或手机 Safari 内存超过 1GB 上限时，浏览器内核直接 OOM 崩溃刷新，导致下载失败。
- **解决方案**：
  1. **流式文件落盘（StreamSaver.js / File System Access API）**：
     - PC 端 Chromium 优先调用 `window.showSaveFilePicker()`，将 Worker 中转码的 chunk 流式写入硬盘，**内存占用恒定在几十兆内**。
     - 移动端或不支持的文件系统，接入 `StreamSaver.js`（基于 Service Worker 模拟流式网络下载响应），边转码边写入文件。
  2. **显式内存释放**：一旦分块保存完成，立即调用 `ffmpeg.deleteFile()` 并释放 ArrayBuffer，避免垃圾回收不及时。
  3. **iOS Safari 降级处理**：针对 iOS 严格的 Blob 内存限制，在用户操作前进行文件大小预检（>300MB 提前警告推荐在电脑端处理，或引导使用分段处理）。

### 2.4 痛点四：手机端与 iOS Safari 深度兼容性
- **根因**：
  1. `SharedArrayBuffer` 必须强制配置 `Cross-Origin-Opener-Policy: same-origin` (COOP) 和 `Cross-Origin-Embedder-Policy: require-corp` (COEP)，静态托管（如 GitHub Pages、Vercel 缺省）无法运行多线程。
  2. 手机端浏览器后台挂起时中断 Worker 任务。
  3. 移动端 `<video>` 默认全屏劫持。
- **解决方案**：
  1. **Service Worker 跨域隔离垫片 (`coi-serviceworker`)**：在 HTML 页面顶层引入微型 ServiceWorker 拦截器，自动模拟 COOP/COEP 响应头，即便部署在无法自由配置 nginx 响应头的静态空间，也能无感开启多线程加速。
  2. **双核引擎自适应降级**：
     - 若环境支持 `SharedArrayBuffer`，加载多线程高带宽 SIMD 版本的 core；
     - 若在微信内置浏览器或特殊 WebView 中受限，平滑降级为单线程核心（Single-thread wasm core），不弹报错。
  3. **移动端视图专属适配**：
     - 播放器强制添加 `playsinline webkit-playsinline x5-video-player-type="h5-page"` 属性，彻底禁止 iOS/安卓微信强制全屏播放。
     - 触控时间轴增加手势阻尼和两端放大镜（Loupe）模式，适配手指精细裁切。

---

## 三、 UI/UX 视觉与设计系统规范

### 3.1 色彩与质感体系
- **色彩理念**：粉蓝撞色马卡龙治愈系风格（Soft Pastel Sky & Sakura Rose），轻盈、活泼、充满现代感，打破传统音视频工具“黑客冷硬黑底”的压抑感。
- **主色彩搭配**：
  - **淡蓝主色 (Baby Blue)**：`#38BDF8` / 背景辅色 `#E0F2FE` / 暗态辅色 `#0284C7`
  - **淡粉主色 (Sakura Pink)**：`#F472B6` / 背景辅色 `#FCE7F3` / 重点激活 `#DB2777`
  - **背景渐变**：`bg-gradient-to-br from-blue-50/70 via-white/80 to-pink-50/70`
  - **毛玻璃卡片 (Glassmorphism)**：`backdrop-blur-md bg-white/70 border border-white/60 shadow-lg shadow-pink-100/30`
  - **文本主色**：`#1E293B`（Slate 800），副文本 `#64748B`（Slate 500）

### 3.2 响应式与交互规范
- **桌面端 (Desktop)**：
  - 宽屏双栏布局：左侧实时大视窗播放器与拖拽吸附时间轴，右侧功能参数调节（分辨率、码率、时间范围、格式）与导出进度卡片。
- **手机端 (Mobile)**：
  - 纵向单列流式布局，顶部吸顶视频预览区，底部采用 iOS 风格抽屉式面板（Bottom Sheet Drawer）切换工具，拇指热区友好的大按钮（高 48px+），触控滑块防误触优化。

---

## 四、 商业化变现与广告位布局

1. **页面顶部与底部横幅广告 (Sticky Top/Bottom Banner)**：
   - 尺寸：PC 端 728x90 Leaderboard，移动端 320x50 / 300x100 Mobile Banner。
2. **工具操作区侧边/下方插槽 (In-feed Native Ads)**：
   - 在参数设置区与导出按钮之间留出原生广告卡片位，视觉与网站风格高度一致。
3. **导出等待“进度激励位” (Processing Modal Ad)**：
   - 用户在等待视频处理与下载的 3~10 秒窗口期，弹窗内部提供赞助商展示位或精美小广告，既缓解等待焦虑，又具备极高展示曝光转化率。
4. **PWA（渐进式 Web 应用）支持**：
   - 配置 `manifest.json` 与 Service Worker 离线缓存，提示用户“添加到手机主屏幕”，形成类原生 App 的高频复访。

---

## 五、 项目工程目录推荐规范
```text
videokit/
├── public/
│   ├── coi-serviceworker.js      # 跨域隔离垫片，开启 SharedArrayBuffer
│   ├── favicon.ico
│   └── manifest.json             # PWA 配置
├── src/
│   ├── assets/                   # 图标、音效、占位图
│   ├── components/
│   │   ├── layout/               # Header, Footer, AdContainer, Shell
│   │   ├── ui/                   # Button, Slider, Modal, GlassCard, Toast
│   │   ├── player/               # VideoPreview, Timeline, CropOverlay
│   │   └── tools/                # Trimmer, Compressor, Converter, GifMaker...
│   ├── core/
│   │   ├── ffmpeg/               # FFmpeg 单例加载器、命令封装、Worker 桥接
│   │   ├── webcodecs/            # WebCodecs 硬件加速编解码流水线
│   │   └── streams/              # StreamSaver / FileSystem 导出包装
│   ├── hooks/                    # useVideoMetadata, useTranscode, useDeviceType
│   ├── styles/                   # Tailwind 全局配置与渐变动画
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.js
└── package.json
```
