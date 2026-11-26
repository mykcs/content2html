# Faithful presentations and long-form reading

稳定 ID：`faithful-content-reading`；范围：Localized reader and presentation pages。

## 目标与来源

把论文和本地研究进展以清晰、可维护的 HTML 呈现，尽可能减少人工排版；先服务读者理解内容，不让装饰改变原意。

依据：[现有 Wish](../../wish/LATEST.md)、[现有 Design](../../site-standards.md)，2026-11-26 按已有仓库内容整理；不引用私人聊天，不宣称获得新的用户批准。

## 保护的体验与语义

保留原始来源、事实、结论限制与可追溯的内容结构。交互反馈、日期精度、图标比例和留白帮助阅读，不能替代内容；无需鼠标和动画仍能理解，维护已有中英文、跳页、Zoom/Fit 等交互。

允许更优布局、交互和技术实现；保留上述来源明确的目标。新目标或被否定方案应记录来源及时间；不得将暂时做不到的能力从意图中删除。

## 实现与验收

[现有页面](../../../src/pages/zh/index.astro) · [Design](../../site-standards.md) · [Dev / 验收入口](../../dev/README.md)。

按 Site standards 真实构建与 Chromium/WebKit 桌面及手机验收，检查页面和 slide、computed token 消费、溢出、裁切、键盘、图片与日期；区分渲染验收和实际发布。

状态：意图来源已核对；本次只接入文档，不改变网站代码或重新验收当前生产功能。后续改版按既有真实测试和用户反馈更新证据；未验证项保持明确。

**守正出新 / Preserve the purpose, improve the design.** 保留有来源的目标、已确认的必要能力和重要约束；主动审视新的用户意图、更好的技术、智能、表达方式与成熟参考，比较现有方案和更优候选，并用真实验收验证改进。旧布局和实现不是上限；不能把推测冒充确认，或悄悄降低已确认的目标。
