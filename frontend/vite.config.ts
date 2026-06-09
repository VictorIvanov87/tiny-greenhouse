import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // fail loudly instead of silently drifting to :5174, :5175, etc.
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/firebase/')) return 'vendor-firebase'
          if (
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/react-router-dom/') ||
            id.includes('/@tanstack/')
          )
            return 'vendor-react'
        },
      },
    },
  },
})
