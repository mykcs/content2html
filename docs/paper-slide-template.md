# Paper Slide 模板 (v3.0, 2026-06-22)

> **适用场景:** 任何 arxiv paper / 本地论文要生成横向翻页 slide (paper-reading 演讲用)

通用 paper slide 模板, 解决 3 个核心问题:
1. **重要公式突出显示** — 用 labeled formula 卡片 (KaTeX 渲染)
2. **section ↔ formula 解耦** — `key_formulas` 通过 `section_index` 引用 `sections_zh/en`
3. **渐进增强** — 没 `key_formulas` 时降级回 `extractPaperBullets` (旧行为)

## 适用 paper 列表

| ArXiv ID | 状态 | key_formulas 数 | 备注 |
|----------|------|----------------|------|
| 2603.12109 | ✅ case study | 4 (Q3: AS/BT 批评, L̃ 辅助目标, Ã_t 优势调整) | 首个接入 |
| 2606.18246 | ⏳ 未来接入 | 0 (暂未分析) | Q2 有 3 formula chars, 需分析 |
| 未来 paper | ⏳ 待接入 | - | 流程见下 |

## 模板组件

### 1. 数据模型 (`src/content.config.ts`)

```typescript
// v3.0 新增 schema
key_formulas?: {
  section_index: number;          // 关联到 sections_zh/en[index]
  label: { zh: string, en: string };
  formula: { zh: string, en: string };  // LaTeX 源码
  context?: { zh?: string, en?: string };
}[]
```

### 2. 逻辑层 (`src/lib/paper-slide-template.ts`)

```typescript
getKeyFormulasForSection(keyFormulas, sectionIndex): KeyFormula[]
pickLocalized<T>(obj: T, lang: "zh" | "en"): string
wrapFormulaForKatex(latex: string, displayMode: boolean = false): string
```

### 3. 渲染组件 (`src/components/PaperSlideSection.astro`)

```astro
<PaperSlideSection
  section={paper.sections_zh[2]}
  sectionIndex={2}
  keyFormulas={paper.key_formulas ?? []}   {/* 组件内部按 section_index 过滤 */}
  lang="zh"
/>
```

> v3.1 简化: 不需要 caller 手动 filter, 组件内部 `formulasForThisSection = keyFormulas.filter(f => f.section_index === sectionIndex)`. 1 slide = 1 formula 原则.

## 接入流程 (新 paper 5 步)

### Step 1: 加 paper JSON

`src/content/papers/<arxiv-id>.json` 填基础字段 (title, authors, abstract, sections, key_takeaways)

### Step 2: 选 Q/A sections 要突出的公式

读 paper body, 选 2-5 个核心公式 (一般是 methodology 段), 准备 LaTeX 源码

### Step 3: 加 key_formulas 字段

```json
"key_formulas": [
  {
    "section_index": 2,
    "label": { "zh": "AS 批评信号", "en": "AS critique signal" },
    "formula": { "zh": "z_t^Q \\in \\{-1, 0, +1\\}", "en": "z_t^Q \\in \\{-1, 0, +1\\}" },
    "context": { "zh": "查询是否获取信息性反馈", "en": "Whether query elicits informative feedback" }
  }
]
```

### Step 4: 改 slide.astro

替换 Q3 (或选中的 section) 的 `<section class="slide-page">` 为:
```astro
<PaperSlideSection
  section={paper.sections_zh[2]}
  sectionIndex={2}
  keyFormulas={paper.key_formulas ?? []}
  lang="zh"
/>
```

### Step 5: Build + Playwright 验证

```bash
npm run build
npx astro preview --port 4322
# Playwright: 截图 + 检查 .katex 元素 > 0 + remaining $ markers = 0
```

## 降级路径 (不接入 key_formulas)

如果 paper 没有需要突出的公式, **不写 `key_formulas` 字段**, 自动降级:
- `key_formulas` undefined → `getKeyFormulasForSection()` 返回 `[]` → 公式卡片区域不渲染
- section body 仍走 `extractPaperBullets` 提取 bullets
- 行为 = v2 之前 (Q1, Q2, Q4, Q5, Q6, Q7 都用此模式)

## Case Study: 2603.12109 (Q3 — 论文方法)

### Before (v1, commit f9d09fb)
- Q3 只显示 4 行标题, 7 个核心公式全部丢失
- 根因: `extractBullets()` 只匹配 `^\d.\.` 开头行

### After (v3.3, commit 2035fd6)
- 4 张 sub-slide (Q3.1-3.4), 每张 1 公式卡片 + body 全文
- KaTeX 100% 渲染 (zh 38 元素, en 33 元素), 0 errors, 0 残留 `$` 标记
- Slide 不溢出 (contentBottom ≤ slide 1000px)
- 截图: `/tmp/fill-zh-5.png` (Q3.1), `/tmp/fill-zh-7.png` (Q3.3), `/tmp/fill-zh-8.png` (Q3.4)

### v1 → v3.3 完整迭代 (5 轮反馈闭环)

| Version | 反馈 | 改动 | Commit |
|---------|------|------|--------|
| v1 | "Q3 缺公式" (7 公式丢失) | extractPaperBullets + KaTeX | f9d09fb |
| v2 | "效果并不好" (slide 溢出 + (5)- 角标) | 0.85rem + 2-line clamp + 卡片化 | a58a199 |
| v3 | "再检查一遍" (content 真超出 frame) | `.slide-page { overflow: hidden }` | 06ed47e |
| v3.1 | "布局太满" (4 公式塞 1 页太多) | 拆 Q3 为 Q3.1-3.4 (4 sub-slides) | 8485730 |
| v3.2 | "页面太空" (1 公式 1 slide 单薄) | body 全文 + 公式大化 (1.8rem) | dabe6cf |
| **v3.3** | ✅ 接受 | display mode + 0.7rem body + clamp | fc86a94 |
- 4 个 numbered title + 4 formula 卡片 (AS 批评 / BT 批评 / L̃ 辅助目标 / Ã_t 优势调整)
- KaTeX 渲染 16+ math tokens
- 截图: `/tmp/q3-v4-zh.png`, `/tmp/q3-v4-en.png`

## 已知约束

- `key_formulas` 关联到 `sections_zh/en` index, 修改 sections 顺序时要同步更新
- 公式源码 = LaTeX, KaTeX 不支持的需要换 (e.g. `align*` → `aligned`)
- 公式超长 (>200 chars) 卡片可能溢出, 需要简化或拆

## 未来扩展 (Roadmap)

- [ ] 支持 `figure_refs`: 公式旁附 paper 图引用 (Fig 1, Fig 4)
- [ ] 支持 `theorem_refs`: 公式旁附论文 Proposition 引用
- [ ] `extractKeyFormulas` 反向工具: 从 body 自动提议 key_formulas (人工审核)
- [ ] 公式复杂度检测: 自动判断 display vs inline mode

## 已知陷阱 (跨项目硬规则)

### 1. KaTeX auto-render `ignoredTags` vs `ignoredElements`

**陷阱**: KaTeX auto-render 默认忽略列表含 `<code>`. 公式包在 `<code class="formula-code">` 里会被**静默跳过**.

**错误调用** (option 名错, 静默忽略):
```ts
renderMathInElement(slide, { ignoredElements: [...] });  // ❌ 错名, 没用
```

**正确调用**:
```ts
renderMathInElement(slide, {
  delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }],
  ignoredTags: ["script", "noscript", "style", "textarea", "pre", "option"],  // 排除 code
  throwOnError: false,
  strict: false,
});
```

### 2. `.slide-page { overflow: hidden }` 必须有

**原因**: slide 1000px 高度限制, 内容超出后撑大 body 但视觉仍 OK (contentBottom > slideBottom).
`overflow: hidden` 是最后兜底 — clamp + 字号是治本.

### 3. 链式替换 bug

**陷阱**: `6→9` 后再 `9→12` 链式执行 → 6 变 12.

**修复**: placeholder 2-pass
```python
# Pass 1: 占位
for old in mapping: content.replace(f'pattern{old}', f'__PH_{old}__')
# Pass 2: 替换
for old, new in mapping.items(): content.replace(f'__PH_{old}__', f'pattern{new}')
```

### 4. Worktree git workflow

- `git reset --hard <commit>` 在 worktree 有时不真正 checkout 文件 → 后续需 `git checkout HEAD -- .` 强制 checkout
- `git add -A` 在 worktree 会把 `.claude/worktrees/<other>/` 误加 (嵌套 git repo) → 必须 `.gitignore` + `git rm --cached`

## 反哺: skill / case 沉淀

| 沉淀位置 | 内容 |
|---------|------|
| `~/.claude/knowledge/cases/wiki/CASE-PAPER-SLIDE-TEMPLATE-EVOLUTION-20260623.md` | 完整 v1→v3.3 演化 + 5 个核心教训 + 跨 paper 接入 5 步流程 + Roadmap |
| `src/lib/paper-bullets.ts` `markMath()` | 16 token LaTeX wrapping 启发式 |
| `src/lib/paper-slide-template.ts` | `KeyFormula` interface + helpers |
| `src/components/PaperSlideSection.astro` | 1 formula 1 slide 渲染组件 (display mode + body) |
| `docs/paper-slide-template.md` (本文件) | 5 步接入流程 + case study + 已知陷阱 |

## 关联文件

| 路径 | 用途 |
|------|------|
| `src/content.config.ts` | key_formulas schema |
| `src/lib/paper-slide-template.ts` | 逻辑层 |
| `src/lib/paper-bullets.ts` | bullets 抽取 (降级路径) |
| `src/components/PaperSlideSection.astro` | 渲染组件 |
| `src/components/PaperSlideBullet.astro` | bullets 渲染 (复用) |
| `src/styles/global.css` | `.formula-card*` 样式 |
| `src/layouts/BaseLayout.astro` | KaTeX 加载 (BaseLayout 处理) |
| `src/content/papers/2603.12109.json` | case study 实例 |
| `src/pages/{zh,en}/paper/2603.12109/slide.astro` | Q3 接入示例 |
