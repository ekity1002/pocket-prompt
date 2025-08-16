import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  return {
    css: {
      postcss: './postcss.config.js',
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          // Chrome Extension entry points
          background: resolve(__dirname, 'src/background/index.ts'),
          'popup/popup': resolve(__dirname, 'src/popup/popup.ts'),
          'popup/popup-styles': resolve(__dirname, 'src/popup/popup.css'),
          'options/options': resolve(__dirname, 'src/options/options.ts'),
          'options/options-styles': resolve(__dirname, 'src/options/options.css'),
          'content/content': resolve(__dirname, 'src/content/index.ts'),
        },
        output: [
          {
            entryFileNames: '[name].js',
            chunkFileNames: isDevelopment ? 'chunks/[name].js' : 'chunks/[name]-[hash].js',
            assetFileNames: isDevelopment ? 'assets/[name].[ext]' : 'assets/[name]-[hash].[ext]',
            format: 'es', // ES Module format for Manifest V3
            inlineDynamicImports: false,
            preserveModules: false,
          }
        ],
        external: [], // Don't externalize any dependencies for Chrome extension
      },
      minify: isProduction,
      sourcemap: true,
      target: 'es2022',
      lib: false, // Don't use library mode - build as application
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@/types': resolve(__dirname, './src/types'),
        '@/utils': resolve(__dirname, './src/utils'),
        '@/components': resolve(__dirname, './src/components'),
        '@/core': resolve(__dirname, './src/core'),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      __DEV__: isDevelopment,
      __PROD__: isProduction,
    },
    server: {
      port: 3000,
      hmr: false, // Disable HMR for Chrome extension
    },
    // Copy static files like manifest.json
    publicDir: 'public',
  };
});
