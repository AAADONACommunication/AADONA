import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase/app'))       return 'firebase-app';
          if (id.includes('firebase/auth'))      return 'firebase-auth';
          if (id.includes('firebase/firestore')) return 'firebase-firestore';
          if (id.includes('firebase/storage'))   return 'firebase-storage';
          if (id.includes('react-router'))       return 'vendor-router';
          if (id.includes('react-helmet'))       return 'vendor-helmet';
          if (id.includes('node_modules'))       return 'vendor';
        }
      },
    },
  },
})