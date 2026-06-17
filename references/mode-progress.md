# progress-mode 工作流

> `/content2html` 处理本地 path 时的完整流程
> 反例: paper-mode 见 `references/mode-paper.md`

## 输入类型 + 强信号

| 类型 | 强信号 | 来源 |
|------|--------|------|
| git repo | 路径含 `.git/` + 至少有 1 commit | `git log` |
| 笔记目录 | 路径含 `*.md` 文件, 可能有 `TODO` / `DONE` 标记 | `ls *.md` + `grep` |
| mixed | git repo + markdown notes (e.g. `~/Repo/myproj/notes/`) | 双源提取 |

**强信号顺序**: git repo > 笔记目录 > mixed (优先 git 提取, 笔记补充)

## Step 1: 路径验证

```bash
# 1. 验证 path 存在
ls -la <path> || { echo "PATH_NOT_FOUND"; exit 1; }

# 2. 判断类型
if [ -d "<path>/.git" ] || git -C "<path>" rev-parse --git-dir 2>/dev/null; then
  TYPE="git_repo"
elif ls "<path>"/*.md 2>/dev/null | head -1; then
  TYPE="notes_dir"
else
  TYPE="mixed"  # git + notes, 双源
fi
```

## Step 2: Git Log 提取 (主要数据源)

```bash
# 默认: 最近 1 周
git -C <path> log --since='1 week ago' \
  --pretty=format:'%h|%ai|%s|%an' --no-merges > /tmp/commits.txt

# 可调: 用户说"最近一月" / "今天" / "上次组会到现在"
# --since='1 month ago' / --since='today' / --since='2026-06-10'

# 分类 commit (按 message 前缀 feat/fix/refactor/chore/docs/test/perf/ci)
python3 << 'EOF'
import re

commits = []
with open('/tmp/commits.txt') as f:
    for line in f:
        parts = line.strip().split('|', 3)
        if len(parts) != 4: continue
        sha, date, subject, author = parts
        # Conventional commit prefix
        m = re.match(r'^(\w+)(?:\(.+\))?\s*:\s*(.+)$', subject)
        if m:
            category = m.group(1).lower()
            desc = m.group(2)
        else:
            category = 'other'
            desc = subject
        commits.append({
            'sha': sha, 'date': date, 'category': category,
            'desc': desc, 'author': author,
        })

# 分组
done = [c for c in commits if c['category'] in ('feat', 'fix', 'perf', 'refactor')]
docs = [c for c in commits if c['category'] in ('docs', 'chore', 'ci', 'test')]

print(f"DONE ({len(done)}):")
for c in done: print(f"  {c['sha']} {c['date']} [{c['category']}] {c['desc']}")
print(f"\nCHORE/DOCS ({len(docs)}):")
for c in docs: print(f"  {c['sha']} {c['date']} [{c['category']}] {c['desc']}")
EOF
```

## Step 3: Notes 提取 (补充)

```bash
# 扫描 markdown 里的 TODO / DONE / WIP 标记
grep -rE '^#*(TODO|DONE|WIP|DOING|NEXT)\b' <path> --include='*.md' \
  -h | sort -u > /tmp/notes-markers.txt

# 例:
# TODO: 实现 PRM 推理优化
# DONE: 跑通 5 个 benchmark
# WIP: 写论文 intro
```

## Step 4: Outline Schema

```json
{
  "id": "2026-06-17",  // 用 date 作 id (周报)
  "lang": "zh",
  "project_name": "GDKVM",  // git repo 顶层目录名 或 用户指定
  "period": "2026-06-10 ~ 2026-06-17",
  "summary": "本周主要完成 X, Y, Z, 下周计划 A, B",
  "done": [
    {
      "category": "feat",
      "title": "PRM 推理优化 (commit 1a2b3c4)",
      "detail": "实现 speculative decoding, 速度提升 30%",
      "evidence": "benchmark/log-2026-06-15.txt"
    }
  ],
  "doing": [
    {
      "title": "写论文 intro",
      "progress": "60%",
      "blocker": "等导师 review outline"
    }
  ],
  "next": [
    "完成 intro v1, 6/20 前发给导师",
    "跑完 NeurIPS rebuttal 实验"
  ],
  "metrics": {
    "commits": 23,
    "lines_added": 1843,
    "lines_removed": 412,
    "files_changed": 17
  },
  "highlights": [
    "本周 SOTA 提升 5% on HumanEval",
    "完成 1 篇 paper submission"
  ]
}
```

**Metrics 计算**:
```bash
# commits 数量
git -C <path> log --since='1 week ago' --oneline --no-merges | wc -l

# lines added / removed
git -C <path> log --since='1 week ago' --shortstat --no-merges \
  | grep -oE '[0-9]+ insertion|[0-9]+ deletion' \
  | awk '{ if (/insertion/) ins+=$1; else del+=$1 } END { print ins, del }'

# files changed
git -C <path> log --since='1 week ago' --name-only --pretty=format: --no-merges \
  | sort -u | grep -v '^$' | wc -l
```

## Step 5: Bilingual 处理 (zh 默认)

Progress 模式**默认 zh**, 不强制双语:
- git commit message 通常英文 → LLM 翻译为中文
- markdown notes 可能中英混杂 → LLM 统一为中文
- en 版本仅在用户明确要求时生成

**Strategy**:
1. 提取所有 source (git log + notes), 大概率英文为主
2. LLM 读英文, 生成中文 outline
3. 用户说"双语" → LLM 翻译中文 → 英文 (跟 paper-mode 一样)

## Step 6: 4 产物生成

按 `SKILL.md` step 5 表生成 progress-slide.html + progress-report.html, 写入 `src/content/progress/<id>/`。

**页面数 vs 字数**:
- progress-slide: 5-10 页 (短于 paper-slide, 不需要 12-20)
- progress-report: 1000-2000 字 (短于 paper-summary, 不需要 2000-4000)

## 边界 case 处理

| Case | 行为 |
|------|------|
| 无 git repo | Fallback 到 `ls -lt <path> \| head -20` + 扫 `*.md` 的 TODO/DONE 标记 |
| git repo 1 周内无 commit | 提示用户"最近 1 周无 commit, 是否扩大时间范围?" |
| markdown 笔记无 TODO 标记 | 整篇读 LLM, 让 LLM 提取最近完成项 |
| 路径含中文 | 用 `$LANG` 设置 locale, ls 显示正常 |
| 用户给绝对路径含 `~` | 展开 `~` → `$HOME`, 避免 git 误判 |

## 关联

- `SKILL.md` step 1-5 (dispatch + outline + 生成)
- `references/shared-tokens.md` (生成时 design tokens 用法)
- `references/astro-injection.md` (写入 content collection + page)
