# 轻剪工具箱 (LiteCut) - 项目开发与架构说明

本项目为高颜值、多端自适应、功能真实可用的纯前端短视频处理工具箱，已完成全套核心架构与功能落地。

- **线上站点**：https://litecut.vercel.app
- **解析后端**：LiveCraft 媒体服务（`POST /api/parser`，见第四节）

## 快速开始

前置要求：Node.js ≥ 18（推荐 20）、npm。

```bash
git clone https://github.com/zhaysys-web/LiteCut.git
cd LiteCut
npm install        # 或 npm ci（按 package-lock.json 精确还原）
npm run dev        # http://localhost:3000，/api 自动代理到解析后端，开箱可用
npm run build      # 类型检查 + 生产构建，产物在 dist/
npm run preview    # 本地预览生产构建（同样带 /api 代理）
```

无需任何密钥或环境变量即可跑通全部功能。唯一可选变量见 `.env.example`
（`VITE_PARSER_API_BASE`，仅在不用同源代理、改为直连解析后端时才需要）。

## 部署指南（Vercel）

方式一：连接 GitHub 仓库自动部署（推荐）

1. 登录 vercel.com → Add New → Project → Import 本仓库。
2. Framework Preset 选 Vite（或 Other 后手动填 Build Command `npm run build`、Output Directory `dist`）。
3. 无需配置任何环境变量。直接 Deploy。
4. 仓库根目录的 `vercel.json` 已包含 `/api/*` → 解析后端的重写规则，部署后解析功能即通。

方式二：文件直传部署（当前线上站点的方式）：用 Vercel API/CLI 上传构建文件并创建
production deployment，效果与方式一相同，区别是更新时需手动重新上传。

后端说明：解析后端是独立仓库（LiveCraft 的 media-service，部署在 Render），
本仓库不包含后端代码与其环境变量。若改用直连模式
（`VITE_PARSER_API_BASE`），需先在 Render 后端把本站域名加入环境变量
`CORS_ORIGINS`（逗号分隔），再重新构建前端。

CI：`.github/workflows/build.yml` 在每次 push / PR 到 main 时执行 `npm ci && npm run build` 做构建校验。

---

## 一、 技术栈概览
- **框架**：Vite 6 + React 18 + TypeScript
- **样式与组件**：Tailwind CSS 3 + Lucide React + Glassmorphism（毛玻璃马卡龙粉蓝配色）
- **本地音视频算力**：`@ffmpeg/ffmpeg 0.12+` + `@ffmpeg/util` + Canvas 2D
- **引擎稳定性**：FFmpeg 核心本地打包 + 单线程稳定核心（多线程 core-mt 实测会让 libx264 重编码崩溃，详见 OPTIMIZATION_NOTES.md）；`coi-serviceworker` 保留作跨域隔离垫片
- **大文件安全落盘**：File System Access API (`showSaveFilePicker`) + Stream 降级机制，彻底根除 Blob 内存溢出 (OOM) 导致 Safari 白屏崩溃的问题。

---

## 二、 核心目录与功能映射

```text
litecut/
├── public/
│   └── coi-serviceworker.js          # 跨域隔离拦截器（注入 COOP / COEP 响应头）
├── src/
│   ├── components/
│   │   ├── ads/
│   │   │   └── AdContainer.tsx       # Google AdSense 容错广告卡片
│   │   ├── layout/
│   │   │   ├── Navbar.tsx            # 淡粉淡蓝导航栏
│   │   │   ├── Footer.tsx            # 页脚与隐私声明
│   │   │   ├── ToolShell.tsx         # 通用工具壳层
│   │   │   ├── TutorialModal.tsx     # 新手使用教程弹窗
│   │   │   └── PrivacyModal.tsx      # 隐私政策弹窗
│   │   ├── player/
│   │   │   ├── CompatibleVideo.tsx   # 严格携带 playsinline 的播放器（防止 iOS 全屏劫持）
│   │   │   └── RangeSlider.tsx       # 触控与鼠标友好的双滑块时间轴
│   │   ├── tools/
│   │   │   ├── WatermarkRemover.tsx  # 1. 视频去水印解析（多清晰度下载、音频提取、失败重试）
│   │   │   ├── LosslessTrimmer.tsx   # 2-1. 极速无损剪辑（-c copy 流复制，100% 原始画质）
│   │   │   ├── VideoCompressor.tsx   # 2-2. 智能视频压缩（CRF 调控 + yuv420p 色彩保真）
│   │   │   ├── AspectRatioTool.tsx   # 2-3. 画幅比例转换（9:16/16:9/1:1 支持毛玻璃背景虚化）
│   │   │   ├── VideoConverter.tsx    # 2-4. 格式与分辨率重设（MP4/WebM/MOV 互转）
│   │   │   ├── GifMaker.tsx          # 2-5. 视频转高保真 GIF（Palette 256色调色板优化）
│   │   │   ├── AudioExtractor.tsx    # 3. 提取音频（320k MP3/WAV/AAC，内置试听播放器）
│   │   │   └── CoverExtractor.tsx    # 4. 高清封面提取（逐帧 0.04s 微调截帧，无损 PNG 导出）
│   │   └── ui/
│   │       ├── GlassCard.tsx         # 毛玻璃卡片
│   │       ├── GradientButton.tsx    # 渐变按钮
│   │       ├── ProgressBar.tsx       # 流光动画进度条
│   │       └── SizeBadge.tsx         # 处理前后体积瘦身对比徽章
│   ├── core/
│   │   ├── ffmpegService.ts          # FFmpeg 单例加载器（本地核心、单线程稳定版、日志化报错、真取消）
│   │   ├── downloadHelper.ts         # 防内存溢出的流式写盘与安全下载辅助
│   │   ├── watermarkService.ts       # 去水印平台识别与解析中转驱动
│   │   └── formatters.ts             # 时间与体积格式化工具函数
│   ├── types/
│   │   └── index.ts                  # 全局类型定义
│   ├── App.tsx                       # 首页网格工具分类与主控中枢
│   └── main.tsx                      # 主入口
├── index.html                        # 引入 coi-serviceworker 及元数据
├── package.json                      # 依赖与脚本
├── tailwind.config.js                # 配色与渐变定义
└── vite.config.ts                    # 本地开发服务器跨域隔离头配置
```

---

## 三、 本地开发与构建指南

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（默认端口 3000）
npm run dev

# 3. 生产环境编译打包
npm run build
```

---

## 四、去水印解析后端（重要，2026-10-20 修复后）

去水印解析无法在纯浏览器里完成（各平台接口有签名与跨域限制），必须对接解析后端。本项目对接的是已上线的 LiveCraft 媒体服务：

- 接口：`POST /api/parser`，请求体 `{ "share_text": "<整段分享文案或链接>" }`
- 默认后端地址经开发代理转发，本地直接可用：

```bash
npm install
npm run dev        # http://localhost:3000，/api 已在 vite.config.ts 中代理到解析后端，无需任何配置
npm run build && npm run preview   # 预览构建产物同样带代理
```

- 纯静态部署（Vercel/Nginx 等）二选一：
  1. 用 Nginx/平台重写把 `/api/` 反向代理到 `https://livecraft-media.onrender.com`（推荐，免 CORS 问题）；
  2. 构建时设置环境变量 `VITE_PARSER_API_BASE=https://livecraft-media.onrender.com` 直连，并把本站域名加入该后端 Render 环境变量 `CORS_ORIGINS`（逗号分隔追加即可）。

注意：该后端为免费实例，闲置后会休眠，首次解析需等待约 30~60 秒冷启动，属正常现象。

## 五、本轮修复清单

详见 `OPTIMIZATION_NOTES.md`：引擎本地化（告别 unpkg 外链）、去水印接真实后端（删除假数据）、容器/扩展名保留、缩放只降不升、画幅不再强行放大、WebM 换 VP9、真取消、封面防黑屏、播放器默认有声音、下载防中途断裂等。
