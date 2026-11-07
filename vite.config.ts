import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from "path"
import fs from "fs"


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

// In dev mode crxjs writes the extension to dist/ but does not copy public/ files.
// The Swagger preload stylesheet and guard script are loaded by the extension, so keep them in sync manually.
const devPublicCopyPlugin: Plugin = {
    name: 'dev-public-copy',
    apply: 'serve',
    configureServer(server) {
        const files = ['swagger-preload.css', 'swagger-guard.js'];
        const copy = () => {
            fs.mkdirSync(path.resolve(__dirname, 'dist'), { recursive: true });
            for (const file of files) {
                fs.copyFileSync(path.resolve(__dirname, 'public', file), path.resolve(__dirname, 'dist', file));
            }
        };
        copy();
        server.httpServer?.once('listening', () => setTimeout(copy, 1000));
        server.watcher.add(files.map((file) => path.resolve(__dirname, 'public', file)));
        server.watcher.on('change', (changed) => {
            if (files.some((file) => changed.endsWith(file))) copy();
        });
    },
};

// In dev (`npm run dev`) crxjs injects an HMR client into every page a content script runs on, and that
// client reloads the page whenever the extension is reloaded. Limiting the content scripts to API docs
// pages keeps unrelated tabs from reloading. Production builds keep the manifest's <all_urls>.
const DEV_CONTENT_MATCHES = [
    "*://*/*docs*",
    "*://*/*swagger*",
    "*://*/*redoc*",
    "*://*/*openapi*",
];

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const isDevServer = command === "serve";
    const extensionManifest = {
        ...manifest,
        content_scripts: isDevServer
            ? manifest.content_scripts.map((script) => ({ ...script, matches: DEV_CONTENT_MATCHES }))
            : manifest.content_scripts,
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
            devPublicCopyPlugin,
        ],

        build: {
            // Vite's preload helper adds <link rel="modulepreload" href="/assets/…"> to the document. In a content
            // script that document is the web page, so the links would point at the page's own server.
            modulePreload: false,
        },

        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    };
});
