import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === 'serve'
  
  return {
    plugins: [react()],
    base: isDev ? '/' : '/Pomodoro_app/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: true
    }
  }
})
