# paper-mode 工作流

> `/content2html` 处理 arxiv URL / DOI / PDF 时的完整流程
> 反例: progress-mode 见 `references/mode-progress.md`

## 输入类型 + 强信号

| 类型 | 强信号 | 来源 |
|------|--------|------|
| arxiv | URL 含 `arxiv.org/abs/<id>` 或 `arxiv.org/pdf/<id>` | arxiv API |
| DOI | URL 含 `doi.org/<doi>` | papers.cool / 出版商页面 |
| PDF | 路径以 `.pdf` 结尾, 或 URL 含 `.pdf` | 本地文件 / 直链下载 |

## Step 1: metadata 抓取 (无 auth)

### arxiv 路径

```bash
# arxiv API: 无需 auth, 公开 endpoint
curl -s "http://export.arxiv.org/api/query?id_list=<arxiv-id>" \
  | python3 -c "
import sys, re
text = sys.stdin.read()
# Atom XML 解析, 提取 title / authors / abstract / categories
title = re.search(r'<title>(.+?)</title>', text, re.DOTALL).group(1).strip()
authors = re.findall(r'<name>(.+?)</name>', text)
abstract = re.search(r'<summary>(.+?)</summary>', text, re.DOTALL).group(1).strip()
print({'title': title, 'authors': authors, 'abstract': abstract})
"
```

**arxiv-id 提取规则**:
- `https://arxiv.org/abs/2503.12345` → `2503.12345`
- `https://arxiv.org/pdf/2503.12345v2` → `2503.12345` (去掉 `v2` 版本号)
- 兼容旧式: `cs.CL/0501001` → `cs.CL/0501001`

### DOI 路径

```bash
# Step 1: DOI redirect (获取出版商页面)
curl -sL "https://doi.org/<doi>" -o /tmp/doi-landing.html

# Step 2: papers.cool 反查 (有 arxiv id 的话)
curl -s "https://papers.cool/arxiv/<doi-tail>" | grep -oE 'arxiv\.org/abs/[0-9.]+'

# Step 3: 没有 arxiv id → 走 PDF download (curl landing page 找 .pdf 链接)
```

### PDF 路径

```bash
# 本地 PDF: 直接用, 无下载
ls -la <pdf-path>

# 远程 PDF: 下载到 .omc/cache/
mkdir -p .omc/cache/<id>/
curl -sL "<pdf-url>" -o .omc/cache/<id>/paper.pdf
```

## Step 2: PyMuPDF 提取 (sections + figures)

```bash
# 安装 (一次性)
pip install pymupdf

# Python 提取脚本
python3 << 'EOF'
import fitz  # PyMuPDF
import json, sys, os

pdf_path = sys.argv[1]
out_dir = sys.argv[2]
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)

# 1. 提取 section 标题 (粗体 + 1-2 行)
sections = []
for page_idx, page in enumerate(doc):
    blocks = page.get_text("dict")["blocks"]
    for block in blocks:
        if "lines" not in block:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                if span["size"] > 11 and span["flags"] & 16:  # bold + 大字
                    sections.append({
                        "page": page_idx,
                        "heading": span["text"].strip(),
                        "level": 1 if span["size"] > 14 else 2,
                    })

# 2. 提取 figure (4x DPI = ~288 DPI 适合 retina)
figures = []
for page_idx, page in enumerate(doc):
    images = page.get_images(full=True)
    for img_idx, img in enumerate(images):
        xref = img[0]
        pix = fitz.Pixmap(doc, xref)
        if pix.width < 200 or pix.height < 200:  # 跳过小图 (icon / arrow)
            continue
        fig_path = f"{out_dir}/page{page_idx+1:02d}-fig{img_idx+1}.png"
        pix = fitz.Pixmap(fitz.csRGB, pix)  # 统一 RGB
        pix.save(fig_path)
        figures.append({
            "page": page_idx + 1,
            "path": fig_path,
            "width": pix.width,
            "height": pix.height,
        })

# 3. 提取全文 (用于 LLM 提取 sections / key sentences)
full_text = "\n".join(page.get_text() for page in doc)

# 4. 输出
outline = {
    "pdf": pdf_path,
    "page_count": doc.page_count,
    "sections": sections,
    "figures": figures,
    "full_text": full_text,
}
with open(f"{out_dir}/extracted.json", "w") as f:
    json.dump(outline, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(sections)} sections + {len(figures)} figures from {doc.page_count} pages")
EOF
```

## Step 3: Outline Schema (结构化 JSON)

```json
{
  "id": "2503.12345",
  "lang": "zh",
  "title": "论文标题 (中文翻译 或 原英文)",
  "authors": ["Author A", "Author B"],
  "abstract": "摘要 (中文翻译 或 原文)",
  "arxiv_id": "2503.12345",
  "doi": "10.xxxx/xxx (可选)",
  "categories": ["cs.CL", "cs.AI"],
  "sections": [
    {
      "heading": "1. Introduction",
      "heading_zh": "1. 引言",
      "level": 1,
      "paragraphs": ["段落 1 (zh 翻译或原文)", "段落 2"],
      "figures": ["page03-fig1.png"]
    }
  ],
  "key_takeaways": [
    "本文贡献 1 (zh 翻译)",
    "本文贡献 2",
    "实验 SOTA 提升 X% on dataset Y"
  ],
  "figures_index": [
    {
      "id": "fig1",
      "caption": "图 1 说明 (zh 翻译)",
      "path": "page03-fig1.png"
    }
  ]
}
```

## Step 4: Bilingual 处理 (zh 默认 + en)

**Strategy A (推荐, time-pressed)**: 先 zh, LLM 翻译 zh → en
1. PyMuPDF 提取全文 (英文)
2. LLM 读英文, **直接生成中文 outline** (GPT-4o 读英文 paper 准确率 > 读中文)
3. LLM 翻译中文 outline → 英文 outline (增量, 不重读 PDF)

**Strategy B (time-rich, 高质量)**: parallel extraction
1. LLM 同步生成 zh outline + en outline (2 次 API call)
2. 适用于: paper 内容复杂 / 用户明确要求双语

**Selection 原则**:
- 4 产物都要双语 → 走 Strategy A (省钱 + 95% 准确率)
- 用户明确要 en → 跳过 zh, 直接 en
- 用户明确要 zh → 跳过 en (zh 已是默认)

## Step 5: 4 产物生成

按 `SKILL.md` step 5 表生成 paper-slide.html + paper-summary.html, 写入 `src/content/papers/<id>/`。

**Key data flow**:
```
arxiv-id
  → .omc/cache/<id>/{paper.pdf, extracted.json, figures/}
  → outline.json (zh + en)
  → src/content/papers/<id>/{slide.html, summary.html}
  → src/pages/[lang]/paper/<id>/{slide,summary}.astro
  → npm run build → dist/...
```

## 已知陷阱 (claudecode 必知)

1. **arxiv LLM-extracted sections 可能不完整** — 论文里的 3.2 / 4.1 子标题, LLM 可能合并/跳过
   - **验证**: LLM 输出后, prompt "请用 1 句话总结第 3.2 节" — 答非所问 = 漏抓
   - **修复**: 重读 PDF section blocks, 手动补漏
2. **DOI 反查到 arxiv 失败** — 部分会议论文 (NeurIPS / ICML) DOI 不带 arxiv
   - **Fallback**: 直接 PDF download from 出版商页面
3. **PyMuPDF `get_text()` 顺序乱** — 双栏 paper 文字可能跨栏混杂
   - **Fix**: 用 `page.get_text("dict")` 拿 blocks, 按 y 坐标排序后重组
4. **figures 重复** — 同一图被多页引用 (e.g. architecture 在 page 1 + page 5)
   - **Dedupe**: MD5 hash 图内容, 重复图只保留第一个

## 关联

- `SKILL.md` step 1-5 (dispatch + outline + 生成)
- `references/shared-tokens.md` (生成时 design tokens 用法)
- `references/astro-injection.md` (写入 content collection + page)
