import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 去水印解析后端（LiveCraft 媒体服务）。开发/预览时经同源代理转发，
// 绕开浏览器 CORS；生产静态部署时也可保留此代理（需自备 Node 托管）
// 或设置 VITE_PARSER_API_BASE 直连（需把域名加入后端 CORS 白名单）。
const PARSER_BACKEND = 'https://livecraft-media.onrender.com';

const proxy = {
  '/api': {
    target: PARSER_BACKEND,
    changeOrigin: true,
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy,
  },
  preview: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy,
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    // FFmpeg 的 worker/wasm 必须以真实文件 URL 加载，
    // 不能被 Vite 内联成 data: URI（部分浏览器禁止 data: 形式的 Worker）
    assetsInlineLimit: 0,
  },
});
