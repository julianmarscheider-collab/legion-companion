/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the same build works on a web server and inside Capacitor.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'licenses.txt'],
      // Also cache the bundled fonts, so they work offline and in the Android app.
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2,txt,webmanifest}'] },
      manifest: {
        name: 'Legion Companion',
        short_name: 'Legion',
        description: 'PvE game master for your own miniature collection',
        theme_color: '#1b1712',
        background_color: '#1b1712',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
});
