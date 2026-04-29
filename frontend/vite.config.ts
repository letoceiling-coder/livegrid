import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// При build root = корень репозитория, чтобы manifest.json содержал ключ "frontend/src/main.tsx"
// (совпадает с @vite(['frontend/src/main.tsx']) в Laravel). При dev root = frontend (index.html).
export default defineConfig(({ mode, command }) => {
  const projectRoot = path.resolve(__dirname, "..");
  const isBuild = command === "build";

  return {
    root: isBuild ? projectRoot : __dirname,
    publicDir: isBuild ? path.join(__dirname, "public") : "public",
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: isBuild ? "public/build" : "../public/build",
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input: {
          "frontend/src/main.tsx": path.resolve(__dirname, "src/main.tsx"),
        },
        output: {
          // Deploy guard: php artisan deploy verifies this literal exists in main bundle.
          intro: 'globalThis["LIVEGRID_BUILD_VERIFY_AppLayout_stack_2026"]="1";',
          entryFileNames: "assets/main-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
    base: "/build/",
  };
});
