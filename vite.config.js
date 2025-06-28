import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
    host: true
  },
  build: {
    outDir: 'dist',
    // لا نريد تقسيم الكود كثيراً
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          // دمج المكتبات الخارجية
          'vendor': ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js']
        }
      }
    }
  },
  // تحسين الأداء
  optimizeDeps: {
    exclude: ['js/tools'] // لا نريد pre-bundling للأدوات
  }
});