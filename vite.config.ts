import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path';
import fs from 'fs';
const privateKey  = fs.readFileSync('key.pem', 'utf8');
const certificate = fs.readFileSync('cert.pem', 'utf8');
// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
      //设置别名
      alias: {
          '@': path.resolve(__dirname, 'src')
      }
  },
  plugins: [vue()],
  
  server: {
      port: 8088, //启动端口
      hmr: {
          host: '192.168.0.27',
          port: 8088
      },
      https: {
        key: privateKey,
        cert: certificate
      }
      // 设置 https 代理
      // proxy: {
      //     '/api': {
      //         target: 'your https address',
      //         changeOrigin: true,
      //         rewrite: (path: string) => path.replace(/^\/api/, '')
      //     }
      // }
  }
});
