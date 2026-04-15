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

function getDrawingTocOverride(row: RawItemRow | null | undefined) {
  if (!row) {
    return null;
  }

  const title = toText(row.title).trim();
  const author = toText(row.author_name).trim() || toText(row.author_handle).trim();

  if (!title) {
    return null;
  }

  return {
    title,
    author,
  };
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

  // 1. Fetch sections for this issue
  const { data: sectionRows, error: secError } = await supabase
    .from("issue_toc_sections")
    .select("id, display_name, sort_order, is_standalone")
    .eq("issue_id", issueId)
    .order("sort_order", { ascending: true });

  const { data: issueRow } = await supabase.from("issues").select("slug").eq("id", issueId).single();
  const issueSlug = issueRow?.slug;

  if (secError || !sectionRows || sectionRows.length === 0) {
    if (secError) {
      console.error("[getIssueTOC] 获取目录栏目失败:", secError);
    }
    return [];
  }

  const hasDrawingSection = (sectionRows as RawSectionRow[]).some((row) =>
    isDrawingSection(toText(row.display_name))
  );

  let drawingOverride: { title: string; author: string } | null = null;

  if (hasDrawingSection) {
    const { data: drawingRow, error: drawingError } = await supabase
      .from("issue_drawings")
      .select("title, author_name, author_handle")
      .eq("issue_id", issueId)
      .maybeSingle();

    if (drawingError) {
      console.error("[getIssueTOC] 获取画里有话内容失败:", drawingError);
    } else {
      drawingOverride = getDrawingTocOverride(
        (drawingRow as RawItemRow | null | undefined) ?? null
      );
    }
  }

  const sectionIds = (sectionRows as RawSectionRow[]).map((row) =>
    String(row.id ?? "")
  );

  // 2. Fetch all items for these sections in one query
  const { data: itemRows, error: itemError } = await supabase
    .from("issue_toc_items")
    .select("id, section_id, title, author, sort_order")
    .in("section_id", sectionIds)
    .order("sort_order", { ascending: true });

  if (itemError) {
    console.error("[getIssueTOC] 获取目录条目失败:", itemError);
  }

  // 2.5 Fetch articles for this issue to map their slugs by title
  const { data: articles } = await supabase
    .from("articles")
    .select("title, slug")
    .eq("issue_id", issueId);

  const articleMap = new Map<string, string>();
  for (const a of (articles as Array<{ title?: string; slug?: string }> | null) ?? []) {
    if (a.title && a.slug) {
      articleMap.set(a.title.trim(), a.slug);
    }
  }

  // 3. Group items by section_id
  const itemsBySectionId = new Map<string, TOCItem[]>();

  for (const row of (itemRows as RawItemRow[] | null) ?? []) {
    const sectionId = String(row.section_id ?? "");

    if (!sectionId) {
      continue;
    }

    let customHref: string | undefined;
    const sectionRow = (sectionRows as RawSectionRow[]).find(s => s.id === sectionId);
    const displayName = sectionRow ? toText(sectionRow.display_name) : "";
    const isDrawingItem = isDrawingSection(displayName);
    
    if (isDrawingSection(displayName)) {
      customHref = issueSlug ? `/issues/${issueSlug}/drawing` : "/drawing";
    } else if (displayName.includes("辩题") || displayName.includes("以辩会友")) {
      customHref = issueSlug ? `/issues/${issueSlug}/debate` : "/debate";
    }

    const title = isDrawingItem && drawingOverride ? drawingOverride.title : toText(row.title);
    const author = isDrawingItem && drawingOverride
      ? drawingOverride.author || "匿名"
      : toText(row.author);

    const item: TOCItem = {
      id: String(row.id ?? ""),
      title,
      author,
      sortOrder: Number(row.sort_order ?? 0),
      articleSlug: articleMap.get(title.trim()),
      customHref,
    };

    const items = itemsBySectionId.get(sectionId) ?? [];
    items.push(item);
    itemsBySectionId.set(sectionId, items);
  }

  // 4. Assemble sections with their items
  return (sectionRows as RawSectionRow[]).map((row) => {
    const id = String(row.id ?? "");
    const displayName = toText(row.display_name);
    
    let customHref: string | undefined;
    if (isDrawingSection(displayName)) {
      customHref = issueSlug ? `/issues/${issueSlug}/drawing` : "/drawing";
    } else if (displayName.includes("辩题") || displayName.includes("以辩会友")) {
      customHref = issueSlug ? `/issues/${issueSlug}/debate` : "/debate";
    }

    let items = itemsBySectionId.get(id) ?? [];

    if (isDrawingSection(displayName) && items.length === 0 && drawingOverride) {
      items = [
        {
          id: `drawing-${issueId}`,
          title: drawingOverride.title,
          author: drawingOverride.author || "匿名",
          sortOrder: 1,
          customHref,
        },
      ];
    }

    return {
      id,
      displayName,
      sortOrder: Number(row.sort_order ?? 0),
      isStandalone: Boolean(row.is_standalone),
      items,
      customHref,
    };
  });
}
