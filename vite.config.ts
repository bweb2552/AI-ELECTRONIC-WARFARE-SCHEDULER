import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),

      'firebase/app': path.resolve(
        __dirname,
        './node_modules/firebase/app/dist/esm/index.esm.js',
      ),

      'firebase/auth': path.resolve(
        __dirname,
        './node_modules/firebase/auth/dist/esm/index.esm.js',
      ),
    },
  },

  server: {
    port: 3000,
    host: true,
    open: true,

    allowedHosts: [
      'grandpa-easiness-sedate.ngrok-free.dev',
    ],
  },

  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth'],
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
