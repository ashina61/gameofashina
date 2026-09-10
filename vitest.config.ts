import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Sistemler Phaser'dan bagimsiz; ancak EventBus Phaser.Events kullandigi
    // icin DOM benzeri bir ortam gerekmez, node yeterlidir.
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
