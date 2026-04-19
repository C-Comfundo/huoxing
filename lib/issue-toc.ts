import "server-only";
import { createClient } from "@supabase/supabase-js";

export interface TOCItem {
  id: string;
  title: string;
  author: string;
  sortOrder: number;
  articleSlug?: string;
  customHref?: string;
}

export interface TOCSection {
  id: string;
  displayName: string;
  sortOrder: number;
  isStandalone: boolean;
  items: TOCItem[];
  customHref?: string;
}

type RawSectionRow = Record<string, unknown>;
type RawItemRow = Record<string, unknown>;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[issue-toc] 缺少 Supabase 环境变量配置");
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isDrawingSection(displayName: string) {
  return displayName.includes("画里有话") || displayName.includes("画里话外");
}

function getSectionCustomHref(displayName: string, issueSlug?: string) {
  if (isDrawingSection(displayName)) {
    return issueSlug ? `/issues/${issueSlug}/drawing` : "/drawing";
  }

  if (displayName.includes("辩题") || displayName.includes("以辩会友")) {
    return issueSlug ? `/issues/${issueSlug}/debate` : "/debate";
  }

  return undefined;
}

/**
 * Fetch the full table of contents for an issue.
 * RLS ensures only published-issue data is returned.
 */
export async function getIssueTOC(issueId: string): Promise<TOCSection[]> {
  if (!issueId) {
    return [];
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  const [{ data: sectionRows, error: secError }, { data: issueRow, error: issueError }] =
    await Promise.all([
      supabase
        .from("issue_toc_sections")
        .select("id, display_name, sort_order, is_standalone")
        .eq("issue_id", issueId)
        .order("sort_order", { ascending: true }),
      supabase.from("issues").select("slug").eq("id", issueId).maybeSingle(),
    ]);

  if (issueError) {
    console.error("[getIssueTOC] 获取刊号 slug 失败:", issueError);
  }

  if (secError || !sectionRows || sectionRows.length === 0) {
    if (secError) {
      console.error("[getIssueTOC] 获取目录栏目失败:", secError);
    }
    return [];
  }

  const normalizedSectionRows = sectionRows as RawSectionRow[];
  const issueSlug = toText(issueRow?.slug);
  const sectionIds = normalizedSectionRows
    .map((row) => String(row.id ?? ""))
    .filter(Boolean);

  if (sectionIds.length === 0) {
    return [];
  }

  const [{ data: itemRows, error: itemError }, { data: articles, error: articlesError }] =
    await Promise.all([
      supabase
        .from("issue_toc_items")
        .select("id, section_id, title, author, sort_order")
        .in("section_id", sectionIds)
        .order("sort_order", { ascending: true }),
      supabase.from("articles").select("title, slug").eq("issue_id", issueId),
    ]);

  if (itemError) {
    console.error("[getIssueTOC] 获取目录条目失败:", itemError);
  }

  if (articlesError) {
    console.error("[getIssueTOC] 获取本期文章 slug 失败:", articlesError);
  }

  const articleMap = new Map<string, string>();
  for (const article of (articles as Array<{ title?: string; slug?: string }> | null) ?? []) {
    if (article.title && article.slug) {
      articleMap.set(article.title.trim(), article.slug);
    }
  }

  const sectionById = new Map<string, RawSectionRow>();
  for (const row of normalizedSectionRows) {
    sectionById.set(String(row.id ?? ""), row);
  }

  const itemsBySectionId = new Map<string, TOCItem[]>();

  for (const row of (itemRows as RawItemRow[] | null) ?? []) {
    const sectionId = String(row.section_id ?? "");

    if (!sectionId) {
      continue;
    }

    const sectionRow = sectionById.get(sectionId);
    const displayName = sectionRow ? toText(sectionRow.display_name) : "";
    const title = toText(row.title);
    const item: TOCItem = {
      id: String(row.id ?? ""),
      title,
      author: toText(row.author),
      sortOrder: Number(row.sort_order ?? 0),
      articleSlug: articleMap.get(title.trim()),
      customHref: getSectionCustomHref(displayName, issueSlug || undefined),
    };

    const items = itemsBySectionId.get(sectionId) ?? [];
    items.push(item);
    itemsBySectionId.set(sectionId, items);
  }

  return normalizedSectionRows.map((row) => {
    const id = String(row.id ?? "");
    const displayName = toText(row.display_name);

    return {
      id,
      displayName,
      sortOrder: Number(row.sort_order ?? 0),
      isStandalone: Boolean(row.is_standalone),
      items: itemsBySectionId.get(id) ?? [],
      customHref: getSectionCustomHref(displayName, issueSlug || undefined),
    };
  });
}
