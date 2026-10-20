# GitHub 发布前检查报告（2026-10-21）

对象：本地项目 `~/workspace/litecut` ↔ 远程仓库 `zhaysys-web/LiteCut`（main 分支）。

## 对比结论

- 已推送文件与本地**内容零差异**（逐文件 diff）。
- 本地独有 3 个文件：`deploy_refs.json`（部署清单，可再生成，已忽略，正确）、
  `LITECUT_MASTER_AI_PROMPT.md`（AI 协作工作稿，非项目运行所需，已加入 .gitignore 并注明）、
  `SHORT_VIDEO_TOOLBOX_PLAN.md`（项目规划文档，本次已补推）。
- 远程历史完整保留：共 8+ 次提交（含仓库自带 Initial commit），无覆盖/强推。

## 审计结果

- `.gitignore`：忽略项均为可再生成内容（node_modules、dist、部署清单），
  未误伤任何运行必需文件；`public/`、`reports/`、`src/` 均正常入库。
- 代码引用资源：`public/coi-serviceworker.js`（index.html 引用）已入库；
  favicon 为内联 data URI；无图片/字体等外部资源文件依赖；
  FFmpeg 核心（wasm/worker）由 `@ffmpeg/core` npm 包在构建时产出，不需手动入库。
- 环境变量：全项目仅一个可选变量 `VITE_PARSER_API_BASE`（watermarkService 读取，
  空值=同源代理），`.env.example` 已补全用途与两种模式说明。
- 硬编码路径 / 密钥扫描：源码、配置中无本地绝对路径、无真实密钥/Token；
  解析后端地址为公开服务地址（vite.config.ts 代理目标），已在 README 中说明。
- 不适用项：无数据库/迁移（纯前端项目）、无 Git 子模块、无 Git LFS 需求。

## 本次补齐（3 个提交）

1. `chore`：本地 .gitignore 落盘并与仓库一致；`.env.example` 补全注释；
   `package.json` 增加 `engines: node >=18`。
2. `docs`：README 新增「快速开始」（前置要求/克隆/安装/构建）与「部署指南」
   （Vercel 连接 GitHub 自动部署的完整步骤、直传方式、CORS 配置说明、CI 说明）；
   补推项目规划文档。
3. `ci`（未入库，见下）：`.github/workflows/build.yml` 已在本地备妥，
   因 GitHub 应用缺少 Workflows 权限被平台拒绝（403），需仓库所有者手动添加。

## 干净环境验证（真实执行）

- 从 GitHub 全新克隆 → `npm ci` 成功 → `npm run build` 成功（4.89s，含 tsc 类型检查）。
- 产物完整：主 JS 与线上部署同内容哈希（index-Adbo6VJ4.js）、ffmpeg-core wasm（32MB）、
  worker、coi-serviceworker 均生成。
- 预览冒烟：首页 200、coi-serviceworker 200、`/api/health` 经代理连通真实后端。

## 仍需手动完成（按顺序）

1. 添加 CI 工作流（约 1 分钟）：打开仓库 → Add file → Create new file →
   文件名填 `.github/workflows/build.yml` → 粘贴下方内容 → Commit。
   （或把本地 `~/workspace/litecut/.github/workflows/build.yml` 通过网页 Upload files 上传。）
2. （可选）仓库 About 描述与 Topics：在仓库主页右上角齿轮里填一句话简介
   （如「免费在线短视频工具箱：去水印解析、剪辑、压缩、转 GIF，浏览器本地处理」）。

工作流内容与本地 `.github/workflows/build.yml` 一致：checkout → Node 20 → npm ci → npm run build。
