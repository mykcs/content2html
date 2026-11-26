# Content2HTML 排版、间距与日期标准

本站把论文和进展记录分别呈现为演示 deck 与可滚动长文。两种阅读方式共用语义规则，演示和打印使用明确的尺寸变体。本站保留瑞士网格、无衬线标题、学术衬线正文及现有四类产物；本文件不要求其他仓库采用这些数值。

## 唯一归属与实际调用

| 归属 | 负责内容 | 实际消费者 |
| --- | --- | --- |
| `src/styles/tokens.css` | 字体、字号、字重、行距、字距、间距、文字宽度及演示/打印尺寸 | 全部生成 HTML；普通页面由 `global.css` 导入，独立 404 由构建同步嵌入 |
| `src/styles/global.css` | Tailwind 适配、全站基线、演示与长文角色、控件 | `BaseLayout.astro`、根跳转与双语 404 |
| `src/styles/message.css` | 跳转、双语错误页与独立错误页的可读回退 | 根页面、`[lang]/404.astro`、`public/404.html` |
| `src/styles/print.css` | 物理分页、打印布局和隐藏屏幕控件 | 每个 `.slide-page`，并保留既有全局打印 rem 设置 |
| `src/components/PaperSlideSection.astro` | 公式卡和解释文字的组合 | 两篇论文的双语演示；字号与间距仍引用 tokens |
| `src/lib/calendar.mjs` / `DateText.astro` | 校验与展示日历日期、期间 | 目录发布日期、论文元信息、进展期间与截止日期 |
| `ProgressLogText.astro` | 进展记录的日期标签与原文边界 | 进展报告、进展 deck |

`@theme inline` 只把既有 Tailwind 类接到本站语义变量，不能重新写一套数值。普通 `gap-n`、`p-n`、`m-n`、`space-y-n` 等类都从 `--space-unit` 推导。全站基线放在 `@layer base` 中；特定角色的规则由对应组件或全局角色选择器负责。

`public/404.html` 继续是可独立服务的静态文件。`npm run styles:sync` 从同一份 tokens 与 message CSS 更新其标记区域；源码门禁会拒绝陈旧副本，不能在该生成区域手工维护另一份标准。

## 字体与文字层级

| 角色 | 标准 |
| --- | --- |
| 界面、标题、图注、元信息 | `--type-font-sans`：Helvetica Neue、Inter、系统无衬线回退 |
| 长文与演示正文 | `--type-font-serif`：Times New Roman、Noto Serif SC、Georgia、serif |
| 代码与公式输入 | `--type-font-mono`：JetBrains Mono、Fira Code、SF Mono、monospace |
| 普通正文 | `--type-prose` 为 1rem；屏幕根字号 `--type-root` 为 16px |
| 演示标题/节标题 | `--type-headline` 为 3.5rem；`--type-display` 的 5rem 保留为更大展示角色 |
| 子标题/主要要点 | `--type-title` 为 2rem；长文三级标题 `--type-subheading` 为 1.25rem |
| 演示正文 | `--type-body` 为 1.125rem |
| 图注/标签 | `--type-caption` 为 .9375rem，`--type-kicker` 为 .8125rem |
| 公式、细节与控件 | `--type-formula-*`、`--type-detail`、`--type-meta-label`、`--type-control-*` 等紧凑角色；所有数值集中在 tokens |
| 字重 | normal 400、medium 500、semibold 600、bold 700；`strong`/`b` 显式使用 bold，避免原生 bolder 连续叠加 |

屏幕值以 CSS px/rem 解释，不能把 56px 写成 56pt。演示中的较小辅助文字随整张固定画布缩放；手机 Fit 是完整画布预览，原有放大与打印操作保留。长文保持可换行的普通网页阅读方式。

行距按角色区分：普通基线 1.5、长文 1.75、作者/摘要 relaxed 1.625、演示 H1 1.25、演示 H2 1.15、主要要点 1.35、图注 1.4、细节解释 1.45。每个值都有 `--leading-*` 归属。演示 H2 不再同时挂一个不会生效的 `leading-tight` 类。

字距同样使用 `--tracking-*`，包括标题收紧、正文、图注、大写标签与页码。KaTeX 自身的数学排版、上下标比例及图内字形属于数学/证据表示；不把这些内部字形强制改为正文大小。它们的外围说明、卡片、标签、间距仍受本站标准管理。

## 间距、宽度与物理尺寸

普通间距从 `.25rem` 的 `--space-unit` 推导。Tailwind 通过 `--space-grid` 引用这个步长；仅在打印 slide 内，grid adapter 保留既有 `.25em` 行为，而组件原有 rem 留白继续按根字号缩放，避免再被局部字号放大一次。长文纵向/横向 padding 分别由 `--space-prose-block` 与 `--space-prose-inline` 管理；标题前后间距、错误页留白也使用语义变量。紧凑公式卡与控件保留原来的步长倍数。

| 场景 | 归属与约束 |
| --- | --- |
| 长文 | `--measure-reading: 45rem`；两侧 padding 共用普通间距，正文可换行 |
| 跳转/错误页 | `--measure-message: 32rem`；同一消息布局与移动端换行规则 |
| 演示文字 | `--measure-slide-heading/title/body` 分别为 64/72/80rem；不再在页面分散写 `max-w-5xl/6xl/7xl` |
| 屏幕演示 | 1920×1080 固定画布，80px 外框余量；`slide-nav.ts` 从 CSS owner 读取尺寸后计算 Fit |
| 演示内部留白 | `--slide-space-block/inline` 为 80/100px，元信息位置与宽度也有独立演示角色 |
| 打印页面 | 297×167mm；`@page` 的固定纸张声明与 tokens 中的页面宽高一致 |
| 打印排版 | 根与 slide 基础字号 9.37px；保留每个 slide 的 em 型号、35/40px 留白和14px网格 gap |

打印的 `--print-root` 与屏幕运行时 `--slide-scale` 各司其职。不能用屏幕 transform 代替物理分页。第2张起采用相邻 slide 的 `break-before: page`，最后一张 `break-after: auto`；打印时所有 slide 可见，工具栏和跳转链接隐藏。

图框宽高比、网格列数、装饰线、边框、阴影和固定画布属于几何表示，不是散落的正文排版例外。新增文字样式、阅读间距或文字最大宽度仍须进入 token owner，不能以“演示文件”为由豁免整个页面。

## 日期显示与源数据边界

完整日期：中文 `2026年6月17日`，英文 `2026-06-17`。仅月精度显示 `2026年6月` / `2026-06`，仅年精度显示 `2026年` / `2026`，不补造月份或日。

期间按两个端点分别投影，例如 `2026年6月4日 至 2026年6月17日` / `2026-06-04 – 2026-06-17`。源记录附带的期间说明保留。纯日历标签不经过 `Date`、系统时区或浏览器 locale；不接受无时区的 timestamp 当日期。机器时间、JSON-LD、sitemap、URL 和内容 ID 保持原格式。

进展条目只拆开已知的 `[YYYY-MM-DD]` 前缀：日期标签经 `DateText` 显示，后面的归档提交信息由 `ProgressLogText` 原样呈现，包括里面的代码、标识符和原文引用日期。门禁只认可源 JSON 中实际存在的归档消息及内容 ID；不能随意给新日期套一个“引用”属性来绕过规范。原始 content JSON 不因显示规范改变。

## 完整覆盖和验收入口

构建动态枚举 `dist/**/*.html`，并从论文/进展 collection 校验应有路由。现有输出为18个 HTML：

| 路由族 | 数量 | 页面/状态 |
| --- | ---: | --- |
| `/en/`、`/zh/` | 2 | 双语目录 |
| `/en/paper/{2603.12109,2606.18246}/summary/` 及中文对应页 | 4 | 论文长文 |
| `/en/progress/2026-06-17/report/` 及中文页 | 2 | 进展长文 |
| 以上三份内容的双语 `/slide/` | 6 | 16、6、5张 slide，各有中英文版本 |
| `/en/404/`、`/zh/404/` | 2 | 双语错误页 |
| `/` | 1 | 到 `/content2html/zh/` 的真实跳转及可读 fallback |
| `/404.html` | 1 | GitHub Pages 独立静态错误页 |

以下命令是可重复执行的验收定义：

```bash
npm ci
npm run test:standards
npm run build
npx playwright install --with-deps chromium webkit
npm run test:standards:browser
```

源码/构建门禁验证单一 owner、合法变量、无独立文字/间距/宽度值、DateText 与窄原文边界、全部构建路由和独立404同步。负例包括“外壳接对了但正文另写字体”、未知token、非标准英文月份与带空格中文日期、伪造引用边界。

浏览器入口在当前 `dist` 下启动 `/content2html/` 本地服务，检查 Chromium 与 WebKit 的1280×956和440×956视口；不把生产站 smoke 当作分支验收。全部页面及每张 slide 检查实际 computed 字体/字号/字重/行距、日期、溢出、文字裁切与本地图片，并保留截图。每条路由修改实际消费者引用的 font、size、leading、spacing、measure token，等待具体变化后恢复；宽度还必须改变真实元素矩形，不能只检查 CSS 声明。另有浏览器“正确外壳/错误正文”负例。

交互包括键盘跳页、Home、Zoom/Fit、跳过导航与语言切换。根页面先检查未经修改的跳转；仅在标记清楚的 fallback fixture 中去掉 refresh 检查可读回退。未知地址还必须实际返回独立404内容。

两个引擎都验证打印 computed 尺寸、9.37px rem、可见页与分页规则。六套 deck 还逐一执行原 `verify-print-e2e.mjs`，显式传入独立预期页数16/6/5，生成真实 PDF、校验页数及最后一页可提取文字；PDF和日志保留在证据目录。

## 发布与证据

生产仍是 `https://mykcs.github.io/content2html/`。`deploy.yml` 对 main push 执行便宜的标准/构建门禁并发布 Pages；手动选择候选 branch、传入完整 `expected_sha` 才运行上述浏览器/PDF验收。工作流核对 checkout SHA、使用冻结 npm 依赖并保留3天证据；feature branch 不上传生产 artifact，也不能进入 deploy job。没有新增自动 PR 浏览器矩阵或新 hosting provider。

生成证据位于 `test-results/standards/route-inventory.json` 与 `test-results/standards/browser/`，包含源码身份、每页HTML哈希、真实样式、扰动恢复、截图和PDF。最终候选、合并与发布状态以 [PR #17](https://github.com/mykcs/content2html/pull/17) 和对应 [Actions](https://github.com/mykcs/content2html/actions/workflows/deploy.yml) 为准；仓库标准文档不保存会过时的 CI 状态回执。

Feature-level goals and protected semantics: [Intent](intent/README.md). This file retains its existing ownership and history.
