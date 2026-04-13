import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase/auth')) return 'firebase-auth'
          if (id.includes('firebase/storage')) return 'firebase-storage'
          if (id.includes('firebase/app') || id.includes('firebase')) return 'firebase-app'

          if (id.includes('quill')) return 'quill'
          if (id.includes('html2canvas')) return 'html2canvas'

          if (id.includes('react-dom')) return 'react-dom'
          if (id.includes('react-router')) return 'react-router'
          if (id.includes('react')) return 'react-vendor'

          if (id.includes('node_modules')) return 'vendor'
        }
      }
    },
    chunkSizeWarningLimit: 500,
  }
})