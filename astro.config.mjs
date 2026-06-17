// content2html - astro.config.mjs
// 按 ADR-0002 (独立 Astro project + 强解耦主站) + ADR-0003 (双语 + 默认中文)
// 对比主站 (~/Repo/webs/active/mykcs.github.io/astro/astro.config.mjs):
//   - **不**导入主站 build-pipeline integration
//   - **不**复用主站 image-map / data-im 占位符
//   - defaultLocale 改 zh (主站是 en), prefixDefaultLocale: true (主站是 false)
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://mykcs.github.io/content2html/',
  base: '/content2html',
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/404/'),
    }),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  output: 'static',
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mykcs.github.io',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'arxiv.org',
      },
      {
        protocol: 'https',
        hostname: 'export.arxiv.org',
      },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
