import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-native": "react-native-web",
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  define: {
    // react-native-web 内部引用 global（如 global.performance.now()），
    // 浏览器环境下 global 未定义，需指向 globalThis
    global: "globalThis",
  },
});
