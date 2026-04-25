// @ts-ignore
import tailwindcss from '@tailwindcss/vite';
// @ts-ignore
import react from '@vitejs/plugin-react';
import path from 'path';
// @ts-ignore
import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        plugins: [
            react(),
            tailwindcss(),
            {
                name: 'load-js-as-jsx',
                async transform(code, id) {
                    if (id.includes('node_modules/expo-router') && id.endsWith('.js')) {
                        // @ts-ignore
                        const { transform } = await import('esbuild');
                        const result = await transform(code, {
                            loader: 'jsx',
                            format: 'esm',
                            sourcemap: true,
                        });
                        return {
                            code: result.code,
                            map: result.map ? JSON.parse(result.map) : null,
                        };
                    }
                },
            }
        ],
        define: {
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.EXPO_PUBLIC_GEMINI_API_KEY': JSON.stringify(env.EXPO_PUBLIC_GEMINI_API_KEY),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
                'react-native': 'react-native-web',
            },
            extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
        },
        optimizeDeps: {
            esbuildOptions: {
                loader: {
                    '.js': 'jsx',
                },
            },
        },
        server: {
            port: 3000,
            host: '0.0.0.0',
            // HMR is disabled in AI Studio via DISABLE_HMR env var.
            // Do not modify—file watching is disabled to prevent flickering during agent edits.
            hmr: process.env.DISABLE_HMR !== 'true',
        },
    };
});
