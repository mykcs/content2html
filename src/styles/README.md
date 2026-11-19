# Content2HTML 样式架构

本目录的实际全站规范见 [排版、间距与日期标准](../../docs/site-standards.md)。四类内容产物、双语目录、跳转、错误页都消费同一套 token；演示与打印保留物理角色。

| 文件 | 职责 |
| --- | --- |
| `tokens.css` | 唯一字体、字号、字重、行距、字距、间距与文字宽度数值 owner；屏幕/打印角色 |
| `global.css` | Tailwind `@theme inline` 适配、base 层、长文、演示、控件；导入其他三个CSS |
| `message.css` | 根跳转与错误页的共享可读回退 |
| `print.css` | 297×167mm 物理布局、分页、可见性与打印控件行为 |

`@utility text-kicker`、`text-caption`、`text-meta-page` 是唯一活动排版定义；旧 raw `.kicker` / `.caption` 调用已迁移。`@custom-variant dark` 仍为预留基础设施，本站当前保持 light-only。

`public/404.html` 由 `scripts/sync-message-styles.mjs` 嵌入完全相同的 tokens 与 message CSS。运行 `npm run styles:sync`，不要手工改生成区域。`npm run dev` 与 `npm run build` 都先同步。

## 扩展页面

先复用现有语义 token，再考虑新增角色。不要加入任意 `font-size`、独立 font stack、line-height、reading padding 或 max-width；不要用默认 `text-sm/2xl` 让页面另建尺寸层级。普通 Tailwind 间距倍数从 `--space-unit` 推导，演示文字宽度使用 `max-w-slide-heading/title/body`。

新增 slide 自动继承打印规则。绝对定位元素须在 `print.css` 补对应物理布局；新增 figure 比例须加入该文件的 figure 规则。保留固定画布1920×1080、打印297×167mm、9.37px rem、每页一个slide、无尾随空白页。纸张 `@page` 声明不能被屏幕运行时 `--slide-scale` 代替。

## 验证

```bash
npm run test:standards
npm run build
npm run test:standards:browser
```

完整浏览器入口按当前构建动态枚举全部页面，在 Chromium/WebKit 的桌面与440px视口检查样式消费、全slide、交互和打印，并逐个调用既有PDF回归。单独定位某套deck时显式指定候选URL与已知页数：

```bash
URL=http://127.0.0.1:4321/content2html/zh/paper/2603.12109/slide/ SLIDE_COUNT=16 node scripts/verify-print-e2e.mjs
```

页面截图、计算样式、实际token扰动恢复、PDF、页数及最后一页文本共同构成证据；文件存在或根节点有token不能证明整页已接入标准。
