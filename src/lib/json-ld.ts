// src/lib/json-ld.ts
// JSON-LD structured data builders per page type (F3 fix).
// Returns schema.org objects ready for BaseLayout's `jsonLd` prop.
//
// Schema choices:
//   - WebSite: index pages (homepage nav)
//   - ScholarlyArticle: paper pages (Google Scholar eligibility, Rich Results)
//   - Article: progress pages (general longform)
//
// Reference: https://schema.org/{WebSite,ScholarlyArticle,Article}

export interface PaperLike {
  id: string;
  arxiv_id?: string;
  title_zh: string;
  title_en: string;
  authors: string[];
  authors_with_affil_en?: { name: string; affil: string[] }[];
  abstract_zh: string;
  abstract_en: string;
  published_date?: string;
  venue?: string;
  venue_url?: string;
}

export interface ProgressLike {
  project_name: string;
  period: string;
  done: string[];
  doing: string[];
  next: string[][];  // [date, item] tuples (length varies per row)
}

const SITE_URL = "https://mykcs.github.io/content2html";

/**
 * Build a ScholarlyArticle schema for paper pages.
 * Google Scholar ingestion requires:
 *   - headline / name (= paper title)
 *   - author[] with Person type + name (+ affiliation if available)
 *   - datePublished (ISO 8601)
 *   - isAccessibleForFree (true for arxiv papers)
 *   - publisher / provider (arxiv)
 *   - sameAs (arxiv URL)
 */
// P1 #1 fix (2026-06-27): pass entry.id (filename slug from glob loader) explicitly.
// Previous code used paper.id, but the JSON files don't have an `id` field —
// the id is auto-generated from filename by `glob()` loader (src/content.config.ts).
// Inline-passing entry.id avoids the "url":...paper/undefined/slide/ bug.
// sameAs still uses arxiv_id (correct); only url was broken.
export function scholarlyArticleLd(paper: PaperLike, lang: "zh" | "en", entryId: string): Record<string, unknown> {
  const isEn = lang === "en";
  const title = isEn ? paper.title_en : paper.title_zh;
  const abstract = isEn ? paper.abstract_en : paper.abstract_zh;
  const arxivId = paper.arxiv_id ?? paper.id ?? entryId;
  const arxivUrl = `https://arxiv.org/abs/${arxivId}`;

  // authors_with_affil_en (English locale) preferred over flat authors array
  const authors = (isEn && paper.authors_with_affil_en && paper.authors_with_affil_en.length > 0)
    ? paper.authors_with_affil_en.map((a) => ({
        "@type": "Person",
        name: a.name,
        affiliation: a.affil.map((name) => ({ "@type": "Organization", name })),
      }))
    : paper.authors.map((name) => ({ "@type": "Person", name }));

  // P1 #1 fix (2026-06-27): destructure entry.id before template literal use.
  // Previous code used paper.id directly inside the template string but the
  // ScholarlyArticle consumer (src/pages/.../paper/*/slide.astro) passed the
  // paper object whose `id` field was undefined for some code paths, producing
  // URLs like /paper/undefined/slide/. Explicit destructure surfaces the issue
  // and removes the ambiguity. entryId is passed by the caller (filename slug).
  const paperId = entryId || paper.id;

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: title,
    name: title,
    abstract,
    datePublished: paper.published_date,
    isAccessibleForFree: true,
    author: authors,
    inLanguage: isEn ? "en" : "zh",
    url: `${SITE_URL}/${lang}/paper/${paperId}/slide/`,
    sameAs: arxivUrl,
    identifier: arxivId,
    provider: { "@type": "Organization", name: "arXiv", url: "https://arxiv.org" },
  };

  if (paper.venue && paper.venue_url) {
    ld.publication = {
      "@type": "PublicationEvent",
      name: paper.venue,
      url: paper.venue_url,
    };
  }

  return ld;
}

/**
 * Build an Article schema for progress pages.
 * Longform progress report → Article (not ScholarlyArticle, no peer review).
 */
export function articleLd(progress: ProgressLike, lang: "zh" | "en"): Record<string, unknown> {
  // ISO 8601 date from period "2026-06-04 ~ 2026-06-17 (最近 2 周)"
  const dateMatch = progress.period.match(/(\d{4}-\d{2}-\d{2})/);
  const datePublished = dateMatch ? dateMatch[1] : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: progress.project_name,
    name: progress.project_name,
    description: `${progress.done.length} done · ${progress.doing.length} doing · ${progress.next.length} next`,
    datePublished,
    inLanguage: lang === "en" ? "en" : "zh",
    url: `${SITE_URL}/${lang}/progress/${dateMatch?.[1] ?? ""}/${lang === "en" ? "report" : "report"}/`,
    author: { "@type": "Person", name: "mykcs" },
    publisher: { "@type": "Organization", name: "content2html", url: SITE_URL },
  };
}

/**
 * Build a WebSite schema for index pages (used by /zh/ and /en/).
 */
export function webSiteLd(lang: "zh" | "en"): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: lang === "en" ? "content2html" : "content2html",
    url: `${SITE_URL}/${lang === "en" ? "en/" : ""}`,
    inLanguage: lang === "en" ? "en" : "zh",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/${lang === "en" ? "en/" : ""}paper/{search_term}/`,
      "query-input": "required name=search_term",
    },
    publisher: { "@type": "Organization", name: "content2html", url: SITE_URL },
  };
}