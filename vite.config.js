import { defineConfig } from 'vite';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

// تحديد البيئة
const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  root: '.',
  base: './',
  
  server: {
    port: 3000,
    open: true,
    host: true, // للوصول من الشبكة المحلية
    cors: true,
    hmr: {
      overlay: true
    },
    // تحسين الأداء في التطوير
    fs: {
      strict: false
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@core': resolve(__dirname, './js/core'),
      '@tools': resolve(__dirname, './js/tools'),
      '@geometry': resolve(__dirname, './js/geometry'),
      '@ui': resolve(__dirname, './js/ui'),
      '@lib': resolve(__dirname, './js/lib'),
      '@utils': resolve(__dirname, './js/utils'),
      '@assets': resolve(__dirname, './assets')
    }
  },
  
  css: {
    preprocessorOptions: {
      css: {
        charset: false
      }
    },
    // تحسين CSS في الإنتاج
    postcss: {
      plugins: isDev ? [] : [
        {
          postcssPlugin: 'internal:charset-removal',
          AtRule: {
            charset: (atRule) => {
              if (atRule.name === 'charset') {
                atRule.remove();
              }
            }
          }
        }
      ]
    }
  },
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: isDev, // sourcemap في التطوير فقط
    
    // تحسين حجم الملفات
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: !isDev,
        drop_debugger: !isDev,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      
      output: {
        // أسماء الملفات النهائية
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          } else if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          } else {
            return `assets/[name]-[hash][extname]`;
          }
        },
        
        // تقسيم ذكي للملفات
        manualChunks: (id) => {
          // Three.js في ملف منفصل
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
          
          // Font Awesome
          if (id.includes('fontawesome') || id.includes('font-awesome')) {
            return 'vendor-icons';
          }
          
          // المكتبات الخارجية الأخرى
          if (id.includes('node_modules')) {
            const packageName = id.split('node_modules/')[1].split('/')[0];
            // مكتبات صغيرة في vendor واحد
            if (['clipboard', 'file-saver', 'jszip'].includes(packageName)) {
              return 'vendor-utils';
            }
            return 'vendor';
          }
          
          // Geometry المتقدمة
          if (id.includes('GeometryAdvanced') || id.includes('boolean') || id.includes('clipper')) {
            return 'geometry-advanced';
          }
          
          // Workers
          if (id.includes('.worker')) {
            return 'workers';
          }
          
          // أدوات الرسم الأساسية
          if (id.includes('/tools/drawing/')) {
            return 'tools-drawing';
          }
          
          // أدوات التعديل
          if (id.includes('/tools/modify/')) {
            return 'tools-modify';
          }
          
          // الأدوات المتقدمة
          if (id.includes('/tools/advanced/')) {
            return 'tools-advanced';
          }
          
          // UI System
          if (id.includes('/ui/')) {
            return 'ui-system';
          }
          
          // Core و Geometry الأساسية في الملف الرئيسي
          // لا نحدد شيء، سيكون في الملف الرئيسي
        }
      },
      
      // تحسينات إضافية
      external: [],
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false
      }
    },
    
    // حد التحذير لحجم الملفات (2MB)
    chunkSizeWarningLimit: 2000,
    
    // تحسينات إضافية
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // inline للملفات الصغيرة (4KB)
    
    // تقليل حجم الملفات
    reportCompressedSize: false, // تسريع البناء
    
    // target للمتصفحات الحديثة
    target: 'es2020'
  },
  
  // تحسين الأداء في وضع التطوير
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/controls/OrbitControls',
      'three/examples/jsm/loaders/GLTFLoader'
    ],
    exclude: [],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  
  // دعم المتصفحات الحديثة
  esbuild: {
    target: 'es2020',
    supported: {
      'top-level-await': true
    },
    legalComments: 'none' // إزالة التعليقات القانونية
  },
  
  // Plugins
  plugins: [
    // تحليل حجم الحزم (في البناء فقط)
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true
    }),
    
    // ضغط الملفات
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // ضغط الملفات أكبر من 10KB
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false
    }),
    
    // دعم Brotli أيضاً
    viteCompression({
      verbose: false,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
      deleteOriginFile: false
    }),
    
    // PWA Support
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'TyrexCAD Professional',
        short_name: 'TyrexCAD',
        description: 'Professional CAD System for Web',
        theme_color: '#00d4aa',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'landscape',
        categories: ['productivity', 'graphics'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // استراتيجيات التخزين المؤقت
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // سنة
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // سنة
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  
  // تحسينات إضافية
  json: {
    namedExports: true,
    stringify: false
  },
  
  // معالجة الأخطاء
  clearScreen: false,
  logLevel: 'info'
});