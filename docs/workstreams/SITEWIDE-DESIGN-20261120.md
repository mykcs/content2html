# Content2HTML 全站排版与年月日统一

> Draft · TASK SPEC ONLY · Implementation: NOT DONE
> Size: M · Confidence: medium

## 目标与来源

2026年11月20日维护者要求本站所有网页实际消费统一字体、字号、字重、行距、间距与年月日标准；各网站独立保留风格。实现、验收和合并 main 全部完成才交付。

## 事实与唯一归属

当前 Dev 明确 main 构建发布 Astro GitHub Pages；开放 #16 是 Current 文档，与本工作不重复。

既有 src/layouts/BaseLayout.astro、src/styles/global.css、print.css 和实际双语 slides/long-form 消费者。

## 实施和验收

- [ ] 全站共用一个语义 typography/spacing owner；重复活动定义真正迁移，必要例外按正文/图表/代码/演示/打印等角色记录。
- [ ] 真实 build 或路由清单覆盖每个页面/视图；不仅查链接存在，还检查生效字体、字号和间距。新增漏接页面必须使检查失败。
- [ ] 完整日期按年月日：中文 YYYY年M月D日，英文 YYYY-MM-DD；仅年/月精度不得补造；timestamp 带明确时区。机器字段/URL/代码/证据保持原样。
- [ ] 保持 /content2html base、双语导航、演示/打印角色与原始内容；演示画布及打印必须是本站集中管理的角色变体，不强制普通正文尺寸。
- [ ] npm run build（astro check + build）；全部生成路由桌面与440×956渲染，必要打印和slides检查；GitHub Pages工作流与已发布 main 身份核对。
- [ ] 现有功能/隐私/科学门禁保持有效；加入漏接样式/非标准日期负例；当前候选证据通过后 Ready 并合并 main，读回 SHA。
- [ ] 发布状态和源码合并分别核实，不拿 PR 创建或 provider READY 代替页面验收。

## 执行与恢复

单一写入者，按总优先级逐站推进；已获实现、验证和合并授权。保留本站 provider 与访问保护。下一步读取真实 source owner、依赖和生成输出。回退为本 PR 的逆向变更。

## 证据

仅合同已创建；实现 NOT DONE；构建/浏览器 NOT RUN。实施完成后补命令、结果、覆盖数及真实证据链接。
