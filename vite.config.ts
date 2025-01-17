import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from "path"


const manifestPlugin: Plugin = {
    name: 'manifest-plugin',
    generateBundle(_, bundle) {
        if (bundle['.vite/manifest.json']) {
            bundle['manifest.json'] = bundle['.vite/manifest.json'];
            bundle['manifest.json'].fileName = 'manifest.json';
            delete bundle['.vite/manifest.json'];
        }
    },
};

export default defineConfig({
    plugins: [
        react(),
        manifestPlugin,
        // viteManifestHackIssue846,
        crx({ manifest }),
    ],

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    }
});