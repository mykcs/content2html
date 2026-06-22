// src/types/katex.d.ts
// katex@0.16.11 无 .d.ts, 手动声明 (避免 astro check 报错)
declare module "katex" {
  const katex: any;
  export default katex;
}

declare module "katex/contrib/auto-render" {
  interface RenderMathOptions {
    delimiters?: { left: string; right: string; display: boolean }[];
    ignoredTags?: string[];  // v4 修: 默认含 "code", 我们要排除 (option 名是 ignoredTags, 不是 ignoredElements)
    throwOnError?: boolean;
    strict?: boolean | "ignore" | "warn" | "error";
    trust?: boolean;
    output?: "html" | "mathml" | "htmlAndMathml";
  }
  const renderMathInElement: (
    element: Element | Document,
    options?: RenderMathOptions
  ) => void;
  export default renderMathInElement;
}
