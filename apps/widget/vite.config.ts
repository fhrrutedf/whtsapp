import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'OmniChatWidget',
      fileName: (format) => `omni-widget.${format}.js`,
      formats: ['umd', 'iife'],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    minify: 'esbuild',
  },
});
