import { defineConfig, loadEnv, Plugin } from 'vite';
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

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const extensionManifest = {
        ...manifest,
        oauth2: {
            ...manifest.oauth2,
            client_id: env.VITE_GOOGLE_OAUTH_CLIENT_ID || manifest.oauth2.client_id,
        },
    };

    return {
        plugins: [
            react(),
            manifestPlugin,
            crx({ manifest: extensionManifest }),
        ],

        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    };
});
