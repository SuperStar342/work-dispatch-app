import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import http from 'node:http'

const keepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 64 })

export default defineConfig({
  plugins: [uni()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/api/blade-system': {
        target: 'http://127.0.0.1:8106',
        changeOrigin: true,
        agent: keepAliveAgent,
        timeout: 60000,
        proxyTimeout: 60000,
        rewrite: (path) => path.replace(/^\/api\/blade-system/, ''),
      },
      '/api/blade-auth': {
        target: 'http://127.0.0.1:8100',
        changeOrigin: true,
        agent: keepAliveAgent,
        timeout: 60000,
        proxyTimeout: 60000,
        rewrite: (path) => path.replace(/^\/api\/blade-auth/, ''),
      },
      '/api': {
        target: 'http://127.0.0.1:80',
        changeOrigin: true,
        agent: keepAliveAgent,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
