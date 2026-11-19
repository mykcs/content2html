# Content2HTML 全站排版与年月日合同

## 目标

维护者要求每个网站在自己的仓库内统一字体、字号、字重、行距、间距、文字宽度与年月日表达，并让全部实际网页引用。本站保留既有四类产物、双语导航、`/content2html` base、科学内容、演示画布与打印行为；不要求跨仓库采用相同数值。

长期维护标准、全部路由族和验证命令由 [docs/site-standards.md](../site-standards.md) 负责，字体和尺寸的可执行归属是 `src/styles/tokens.css`。

## 交付标准

- 全部生成HTML拥有明确角色并消费同一个token owner；Tailwind、组件CSS、根跳转、双语404和独立静态404全部纳入。
- 新增漏接页面、独立字体/间距/宽度、未知token、非标准可见日期必须让源码或产物门禁失败。
- 中文完整日期为年月日、英文为年-月-日；年/月精度不补造。原始JSON、URL、内容ID、机器时间、科学数据、归档提交消息保持来源含义。
- 所有构建页面在Chromium/WebKit的1280×956、440×956视口检查实际生效样式、溢出、日期与截图；每张slide也必须进入测量。实际token变更须影响正文或标题消费者，宽度须改变真实矩形，恢复后回到原值。
- 保留1920×1080画布、297×167mm纸张、9.37px打印rem及逐张分页。原PDF回归必须覆盖双语的16、6、5张deck，证明页数正确、最后一页非空。
- 根跳转执行真实导航，另行验证去refresh的可读fallback；独立404以实际404响应检验。语言切换、跳页、Zoom/Fit和键盘入口保留。
- `npm run test:standards`、`npm run build`、候选完整SHA的手动hosted浏览器门禁通过后，由发布流程合并main，分别核查合并SHA、Pages发布和公开页面。

## 网页表达与证据

Web expression: APPLY_FULL — goal=让读者在论文/进展的演讲与异步阅读之间保持一致的层级和日期理解；relation=内容层级、证据与时间顺序；medium=既有HTML长文与固定演示画布；HTML=保留heading/list/table/dl/figure并用time标识日期；density=保留原有四类产物的信息架构与正文，集中修复其可视规则；evidence=构建清单、全路由双引擎截图、逐张slide/实际消费者扰动、原PDF回归。

工作按既有PR合同规划、单一实施者修改、发布流程复核与exact-SHA运行验证。回退为本PR逆向变更，hosting身份与发布平台保持原状。

当前候选、审查、验收和合并记录见 [PR #17](https://github.com/mykcs/content2html/pull/17)；执行记录与有限保留的截图/PDF见 [deploy.yml Actions](https://github.com/mykcs/content2html/actions/workflows/deploy.yml)。这里保存长期交付合同，不复制易过时的运行状态。
