import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    /*
     * Arena canli onizlemesi oyunu `*.e2b.app` altinda bir alt alan adindan
     * sunar. Vite 5'in `allowedHosts` varsayilani yalnizca localhost'a izin
     * verir ve onizleme istegi 403 ile reddedilir. `true` tum host'lari kabul
     * eder; bu bir gelistirme sunucusudur ve yalnizca statik dosya sunar.
     */
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
