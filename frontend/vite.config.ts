import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

function prismFixPlugin() {
  return {
    name: "prism-fix",
    renderChunk(code: string) {
      return code.replace(/(?<![.\w$])Prism(?![.\w$])/g, "globalThis.Prism");
    },
  };
}

export default defineConfig({
  plugins: [react(), prismFixPlugin()],
  resolve: {
    alias: [
      {
        find: /^prismjs(\/.*)?$/,
        replacement: path.resolve(__dirname, "src/stubs/prism-stub.ts"),
      },
    ],
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
