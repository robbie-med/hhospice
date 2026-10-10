import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Dev port is registered in /home/user/Projects/PORTS.md (palliative-tools → 3111).
export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 3111, strictPort: true },
  preview: { host: '127.0.0.1', port: 3111, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Hospice Certification Workbench',
        short_name: 'HospiceCert',
        description: 'Offline hospice eligibility, certification narratives, decline tracking and goals-of-care notes. Nothing leaves the browser.',
        theme_color: '#0b5d6b',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
    }),
  ],
})
