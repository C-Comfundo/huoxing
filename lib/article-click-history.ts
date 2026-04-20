const CLICKED_ARTICLE_HREFS_KEY = "clicked-article-hrefs";

function readClickedArticleHrefs(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CLICKED_ARTICLE_HREFS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeClickedArticleHrefs(hrefs: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CLICKED_ARTICLE_HREFS_KEY, JSON.stringify(hrefs));
}

export function getClickedArticleHrefSet(): Set<string> {
  return new Set(readClickedArticleHrefs());
}

export function recordClickedArticleHref(href: string): Set<string> {
  const next = getClickedArticleHrefSet();
  next.add(href);
  writeClickedArticleHrefs(Array.from(next));
  return next;
}
