/**
 * URL for the public search page filtered by author display name.
 * Returns null when the name should not be linked (empty / 匿名).
 */
export function getAuthorArticlesSearchHref(displayAuthor: string): string | null {
  const t = displayAuthor.trim();
  if (!t || t === "匿名") {
    return null;
  }
  return `/search?q=${encodeURIComponent(t)}`;
}
