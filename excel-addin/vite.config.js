import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const certDir = join(homedir(), ".office-addin-dev-certs");

export default defineConfig({
    plugins: [react()],
    server: {
        host: "localhost",
        port: 3000,
        strictPort: true,
        https: {
            key: readFileSync(join(certDir, "localhost.key")),
            cert: readFileSync(join(certDir, "localhost.crt")),
        },
        proxy: {
            "/api": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});