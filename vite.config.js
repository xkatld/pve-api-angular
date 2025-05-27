import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 5173, // 您可以指定开发服务器端口
    // proxy: {
    //   '/api': {
    //     target: 'https://<你的Debian服务器IP>:8000', // 代理到您的后端 API 地址
    //     changeOrigin: true,
    //     secure: false, // 如果后端是自签名证书，需要设置为 false
    //     // rewrite: (path) => path.replace(/^\/api/, ''), // 如果需要重写路径
    //   }
    // }
  }
})
