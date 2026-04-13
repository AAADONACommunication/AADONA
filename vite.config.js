import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/storage'],
          'quill': ['quill'],
          'html2canvas': ['html2canvas'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    },
    // Warn on large chunks
    chunkSizeWarningLimit: 500,
  }
})