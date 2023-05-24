import { defineConfig } from "vite";
import path from "path";
import { dependencies } from "./package.json";

export default defineConfig({
  build: {
    outDir: "./dist",
    copyPublicDir: false,
    lib: {
      formats: ["es", "cjs"],
      entry: path.resolve("./src/modules/WRTC-Stream.ts"),
      fileName: (ext) => `index.${ext}.js`,
    },
    rollupOptions: {
      external: [...Object.keys(dependencies)],
    },
    target: "esnext",
    sourcemap: true,
  },
});
