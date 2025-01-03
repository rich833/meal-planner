// vite.config.js
export default {
    base: 'meal-planner.github.io', // Replace with your repository name
    build: {
      outDir: 'dist',
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    }
  }