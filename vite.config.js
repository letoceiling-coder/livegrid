import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['frontend/src/main.tsx'],
            refresh: true,
        }),
        react(),
    ],
    build: {
        // Vite 5 always places the manifest under .vite/manifest.json.
        // AppServiceProvider::boot() calls Vite::useManifestFilename('.vite/manifest.json')
        // so Laravel finds it correctly. Do not override the path here.
        manifest: true,
        outDir: 'public/build',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './frontend/src'),
        },
        // Resolve modules from frontend/node_modules first, then root node_modules
        modules: [
            path.resolve(__dirname, './frontend/node_modules'),
            path.resolve(__dirname, './node_modules'),
        ],
    },
});
