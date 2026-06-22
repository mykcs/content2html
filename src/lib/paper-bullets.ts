// src/lib/paper-bullets.ts
// 通用 paper slide 工具: 从 paper body 抽取 bullets (titles + definitions + formulas)
//
// 输出: SlideBullet[] 三种 kind
//   - title:     编号段标题 (e.g. "1. 构建步骤级方向性批评")
//   - definition: 定义段 (e.g. "AS通道批评...") — 长段, 含 CJK + 内联公式
//   - formula:   独立公式行 (含数学符号如 ∈ := ∇ ∝ ⪯ ← ∑ 等)
//
// 设计: 替代各 slide.astro 内联的 extractBullets(), 保证多 paper 一致。
//   当前被调用: src/pages/{zh,en}/paper/2603.12109/slide.astro
//   计划接入: src/pages/{zh,en}/paper/2606.18246/slide.astro (等需要时)

export type SlideBullet =
  | { kind: "title"; text: string }
  | { kind: "definition"; text: string }
  | { kind: "formula"; text: string };

/**
 * 检测一行是否为独立公式行 (math-only, no leading CJK)
 * 判据: 包含 math operator 之一, 且不以 CJK 字符开头
 */
const MATH_OPS = /[∈∇∝⪯←∑∫∂]|:=|\\geq|\\leq|\\rightarrow|\\leftarrow|\\propto/;
const CJK_LEAD = /^[一-鿿]/;
// 公式行的长度上限 (v2 收紧, 防止 EN 长段被误判为公式)
//   例: "Design intra-trajectory likelihood-margin objective to inject critiques into policy gradient..."
//   含 math token 但 200+ chars, 应该是 definition 不是 formula
const FORMULA_MAX_CHARS = 150;

function isFormulaLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (CJK_LEAD.test(trimmed)) return false;
  if (trimmed.length > FORMULA_MAX_CHARS) return false;  // v2 加
  return MATH_OPS.test(trimmed);
}

// (isDefinitionParagraph removed in 2026-06-22 refactor; line-based 解析不再需要)

/**
 * 主入口: 从 paper body 抽取结构化 bullets
 *
 * 策略: line-based 解析 (paper body 用单 \n 分行 + 空行分段)
 *   - 行匹配 `^\d+\.\s+` → title
 *   - 行匹配 `^AS通道批评|^BT通道批评|^Step-level|^Constructing` → definition header
 *   - 行是短 math-only (无 CJK 开头, 含 math op) → formula
 *   - 其他长行 → 当前 group 的 content
 */
export function extractPaperBullets(body: string): SlideBullet[] {
  const out: SlideBullet[] = [];
  const lines = body.split(/\n/).map((l) => l.trim()).filter(Boolean);

  let cur: SlideBullet | null = null;
  const pushCur = () => {
    if (cur) out.push(cur);
    cur = null;
  };

  const TITLE_RE = /^\d+\.\s+/;
  const DEFN_HEADER_RE = /^(AS通道批评|BT通道批评|AS channel|BT channel|Step-level|Constructing)/;

  for (const line of lines) {
    // 1) 编号段标题 — close cur, 但不 append 后续行 (后续非标题行变 definition)
    if (TITLE_RE.test(line)) {
      pushCur();
      out.push({ kind: "title", text: line });
      continue;
    }

    // 2) definition header (AS/BT 通道批评 等)
    if (DEFN_HEADER_RE.test(line)) {
      pushCur();
      cur = { kind: "definition", text: line };
      continue;
    }

    // 3) formula 行 (短, 无 CJK 开头, 含 math op)
    if (isFormulaLine(line)) {
      // 公式独立成 bullet, 不 append 到当前 group
      pushCur();
      out.push({ kind: "formula", text: line });
      continue;
    }

    // 4) 其他行 → 追加到当前 bullet 的 text
    if (cur) {
      cur.text += " " + line;
    } else {
      // 没有 current group (开头), 创建一个 definition
      cur = { kind: "definition", text: line };
    }
  }
  pushCur();
  return out;
}

/**
 * 把文本里的 math token 自动包装成 $...$ (KaTeX inline math)
 * 启发式: 匹配 \w_t 形式 (var_sub), Ψ/π/λ/ω 等 greek + sub, := ← ∇ ∝ ⪯ 等 op
 *
 * 策略: 一次 alternation regex, 匹配 → 查表替换。alternation 中**长模式在前**避免
 *   `z_t^Q` 被 `z_t` 抢先匹配。
 */
export function markMath(text: string): string {
  // alternation 顺序很重要: 长 token 必须在短 prefix 之前
  const TOKEN_RE =
    /z_t\^[A-Z]|z_t\b|A_t|Ã_t|P_τ|N_τ|I_th|C_BT|Acc_Q|Ψ_t|Ψ(?!t)|ω|τ|π_ω|L̃/g;

  const map: Record<string, string> = {
    "z_t^Q": "$z_t^Q$",
    "z_t^U": "$z_t^U$",
    "z_t": "$z_t$",
    "A_t": "$A_t$",
    "Ã_t": "$\\tilde{A}_t$",
    "P_τ": "$P_\\tau$",
    "N_τ": "$N_\\tau$",
    "I_th": "$I_{th}$",
    "C_BT": "$C_{BT}$",
    "Acc_Q": "$Acc_Q$",
    "Ψ_t": "$\\Psi_t$",
    "Ψ": "$\\Psi$",
    "ω": "$\\omega$",
    "τ": "$\\tau$",
    "π_ω": "$\\pi_\\omega$",
    "L̃": "$\\tilde{L}$",
  };

  return text.replace(TOKEN_RE, (m) => map[m] ?? m);
}
