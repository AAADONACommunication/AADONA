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
          // Firebase — already split, theek hai
          if (id.includes('firebase/app'))       return 'firebase-app';
          if (id.includes('firebase/auth'))      return 'firebase-auth';
          if (id.includes('firebase/firestore')) return 'firebase-firestore';
          if (id.includes('firebase/storage'))   return 'firebase-storage';

          // React core alag chunk mein
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom')) return 'react-vendor';

          // Baaki node_modules ek chunk mein
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
})