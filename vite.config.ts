import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // 相对 base：产物资源用 ./assets/... 引用，可部署在 nginx 任意子路径下
  // （若希望固定前缀，改为 '/xxx/' 并在 nginx location 中保持一致）
  base: "./",
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
  build: {
    rolldownOptions: {
      output: {
        // 手动分包：稳定第三方依赖拆成独立 chunk，浏览器长缓存 + 并行加载，
        // 减小首屏入口 chunk，避免单文件过大（rolldown codeSplitting.groups）。
        // includeDependenciesRecursively:false —— 组内只收 test 命中的模块，
        // 传递依赖交给其他组 / 自动分包，避免把 react 等核心库卷进 markdown 组
        // 导致 markdown 被入口静态依赖、首屏提前预加载。
        codeSplitting: {
          groups: [
            // 1) React 核心（react / react-dom / scheduler 等）
            {
              name: "react-vendor",
              test: /[\\/]node_modules[\\/](react|react-dom|react-is|scheduler|loose-envify|object-assign|prop-types)[@\\/]/,
              priority: 30,
              includeDependenciesRecursively: false,
            },
            // 2) react-native-web 及其运行时依赖（UI 基础库，体积大且跨版本稳定）
            {
              name: "rnw",
              test: /[\\/]node_modules[\\/](react-native-web|fbjs|fbjs-css-vars|inline-style-prefixer|css-in-js-utils|hyphenate-style-name|@react-native|@babel[\\/]runtime|styleq|nullthrows|memoize-one|postcss-value-parser|create-react-class|react-timer-mixin)[@\\/]/,
              priority: 20,
              includeDependenciesRecursively: false,
            },
            // 3) Markdown 渲染链（react-markdown / remark-gfm / unified…），仅 AI 页使用；
            //    AI 页已懒加载，此 chunk 在进入 AI 页时才请求。
            //    前半段为精确包名（后接 @版本号或路径分隔符），后半段为前缀式包名
            //    （remark-parse / micromark-util-* 等，包名后继续拼接 -util 等）。
            {
              name: "markdown",
              test: /[\\/]node_modules[\\/](react-markdown|remark-gfm|unified|vfile|vfile-message|bail|is-plain-obj|trough|zwitch|extend|devlop|property-information|space-separated-tokens|comma-separated-tokens|decode-named-character-reference|character-entities|ccount|stringify-entities|parse-entities|escape-string-regexp|trim-lines|longest-streak|html-void-elements|web-namespaces|style-to-js|style-to-object|inline-style-parser|html-url-attributes|estree-util-is-identifier-name|mdast-util-to-string|unist-util-position|unist-util-stringify-position|@ungap)[@\\/]|remark-|rehype-|unist-|mdast-|hast-|micromark/,
              priority: 40,
              includeDependenciesRecursively: false,
            },
            // 4) axios（SDK 适配器静态引入；运行时走 FetchAdapter，axios 仅兜底）
            {
              name: "axios",
              test: /[\\/]node_modules[\\/]axios[@\\/]/,
              priority: 25,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
});
