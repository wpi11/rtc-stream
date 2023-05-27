import { defineConfig } from "vite";
import path from "path";
import { dependencies } from "./package.json";

/**
 * Vite will build, compile, and minify the package and output to /dist
 */
export default defineConfig({
  build: {
    outDir: "./dist",
    copyPublicDir: false,
    lib: {
      formats: ["es", "cjs"],
      entry: path.resolve("./src/module/RTCModule.ts"),
      fileName: (ext) => `index.${ext}.js`,
    },
    rollupOptions: {
      external: [...Object.keys(dependencies)],
    },
    target: "esnext",
    sourcemap: true,
    minify: true,
  },
});
