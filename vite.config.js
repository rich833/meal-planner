// vite.config.js
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    base: './',
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            'supabase': ['@supabase/supabase-js']
          }
        }
      }
    },
    resolve: {
      browserField: true,
      mainFields: ['browser', 'module', 'main']
    },
    optimizeDeps: {
      include: ['@supabase/supabase-js']
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
    }
  }
})