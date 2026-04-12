import "server-only";
import { createClient } from "@supabase/supabase-js";

export interface Issue {
  id: string;
  slug: string;
  label: string;
  title: string;
  coverImage: string | null;
  isCurrent: boolean;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  publishedAt: string;
  viewCount: number;
  echoCount: number;
  issue: Issue | null;
  customHref?: string;
}

export const CATEGORY_ORDER = [
  "有话慢谈",
  "人间剧场",
  "胡说八道",
  "三行两句",
  "见字如面",
  "画里话外",
] as const;

export const CATEGORY_PATHS: Record<string, string> = {
  有话慢谈: "/slow-talk",
  人间剧场: "/theater",
  胡说八道: "/nonsense",
  三行两句: "/poems",
  见字如面: "/letters",
  画里话外: "/drawing",
};

type RawArticleRow = Record<string, unknown>;
type RawIssueRow = Record<string, unknown>;
type RawEchoRow = Record<string, unknown>;
type DatabaseClient = any;
type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

const ISSUE_SELECT = `
  id,
  slug,
  label,
  title,
  cover_image,
  is_current,
  sort_order,
  published_at,
  created_at
`;

const PUBLIC_ARTICLE_SELECT = `
  *,
  issue:issues!inner(
    ${ISSUE_SELECT}
  )
`;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[articles] 缺少 Supabase 环境变量配置");
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

async function runPublicQuery<T>(
  queryFactory: (db: DatabaseClient) => Promise<QueryResult<T>>
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      data: null as T | null,
      error: new Error("Supabase client is not configured"),
    };
  }

  return queryFactory(supabase);
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeCategory(category: string): string {
  if (category === "有话漫谈") {
    return "有话慢谈";
  }

  return category;
}

interface IssuePageCategoryHeading {
  title: string;
  subtitle?: string;
}

/** 期刊专题页 `/issues/[slug]` 分栏大标题（与导航、栏目独立页、文章内文小标题无关） */
const ISSUE_PAGE_CATEGORY_HEADINGS: Record<string, IssuePageCategoryHeading> = {
  有话慢谈: { title: "有话慢谈", subtitle: "随笔" },
  人间剧场: { title: "人间剧场", subtitle: "小说" },
  胡说八道: { title: "胡说八道", subtitle: "杂谈" },
  三行两句: { title: "三行两句", subtitle: "诗歌" },
  见字如面: { title: "见字如面", subtitle: "书信" },
  画里有话: { title: "画里有话", subtitle: "漫画" },
  画里话外: { title: "画里话外", subtitle: "画作" },
};

export function getIssuePageCategoryHeadingParts(category: string): IssuePageCategoryHeading {
  const key = normalizeCategory(category);
  return ISSUE_PAGE_CATEGORY_HEADINGS[key] ?? { title: key };
}

export function getIssuePageCategoryHeading(category: string): string {
  const { title, subtitle } = getIssuePageCategoryHeadingParts(category);
  return subtitle ? `${title}-${subtitle}` : title;
}

function getCategoryAliases(category: string) {
  if (category === "有话慢谈" || category === "有话漫谈") {
    return ["有话慢谈", "有话漫谈"];
  }

  return [category];
}

export function getCategoryPath(category: string) {
  return CATEGORY_PATHS[normalizeCategory(category)] ?? "/";
}

export function getIssueHref(issue: Pick<Issue, "slug"> | null) {
  return issue ? `/issues/${issue.slug}` : "/issues";
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function createExcerpt(input: string) {
  const text = stripHtml(input);

  if (text.length <= 120) {
    return text;
  }

  return `${text.slice(0, 120).trim()}...`;
}

function mapIssue(row: RawIssueRow | null | undefined): Issue | null {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id ?? ""),
    slug: toText(row.slug),
    label: toText(row.label),
    title: toText(row.title),
    coverImage: toText(row.cover_image) || null,
    isCurrent: Boolean(row.is_current),
    sortOrder: Number(row.sort_order ?? 0),
    publishedAt: toText(row.published_at) || null,
    createdAt: toText(row.created_at) || null,
  };
}

function getPublishCutoffIso() {
  return new Date().toISOString();
}

function applyPublicIssueVisibility(query: DatabaseClient, nowIso: string) {
  return query.not("published_at", "is", null).lte("published_at", nowIso);
}

function applyPublicIssueRelationVisibility(query: DatabaseClient, nowIso: string) {
  return query.not("issue.published_at", "is", null).lte("issue.published_at", nowIso);
}

function mapArticle(row: RawArticleRow): Article {
  const id = String(row.id ?? row.slug ?? "");
  const slug = toText(row.slug) || id;
  const content =
    toText(row.content_html) || toText(row.content) || toText(row.body) || "";
  const excerpt =
    toText(row.excerpt) || toText(row.summary) || createExcerpt(content);

  return {
    id,
    slug,
    title: toText(row.title) || "未命名文章",
    excerpt,
    content,
    author: toText(row.author_name) || toText(row.author) || "匿名",
    category: normalizeCategory(
      toText(row.category_name) || toText(row.category) || toText(row.section) || "未分类"
    ),
    publishedAt: toText(row.published_at) || toText(row.created_at) || new Date(0).toISOString(),
    viewCount: Number(row.view_count ?? 0),
    echoCount: Number(row.echo_count ?? 0),
    issue: mapIssue((row.issue as RawIssueRow | null | undefined) ?? null),
  };
}

async function populateEchoCounts(articles: Article[]): Promise<Article[]> {
  if (articles.length === 0) {
    return articles;
  }

  const articleIds = Array.from(
    new Set(articles.map((article) => article.id).filter(Boolean))
  );

  if (articleIds.length === 0) {
    return articles;
  }

  const { data, error } = await runPublicQuery<RawEchoRow[]>((db) =>
    db.from("echoes").select("article_id").in("article_id", articleIds)
  );

  if (error || !data) {
    console.error("[populateEchoCounts] 获取回响数量失败:", error);
    return articles;
  }

  const counts = new Map<string, number>();

  for (const row of data) {
    const articleId = String(row.article_id ?? "");

    if (!articleId) {
      continue;
    }

    counts.set(articleId, (counts.get(articleId) ?? 0) + 1);
  }

  return articles.map((article) => ({
    ...article,
    echoCount: counts.get(article.id) ?? 0,
  }));
}

export function groupArticlesByCategory(articles: Article[]): [string, Article[]][] {
  const groups = new Map<string, Article[]>();

  for (const article of articles) {
    const key = normalizeCategory(article.category);
    const items = groups.get(key) ?? [];
    items.push(article);
    groups.set(key, items);
  }

  return Array.from(groups.entries()).sort(([left], [right]) => {
    const leftIndex = CATEGORY_ORDER.indexOf(left as (typeof CATEGORY_ORDER)[number]);
    const rightIndex = CATEGORY_ORDER.indexOf(right as (typeof CATEGORY_ORDER)[number]);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right, "zh-CN");
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

export async function getAllIssues(): Promise<Issue[]> {
  const nowIso = getPublishCutoffIso();
  const { data, error } = await runPublicQuery<RawIssueRow[]>((db) =>
    applyPublicIssueVisibility(db.from("issues").select(ISSUE_SELECT), nowIso)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
  );

  if (error || !data) {
    console.error("[getAllIssues] 获取刊号列表失败:", error);
    return [];
  }

  return data.map((row) => mapIssue(row)).filter((issue): issue is Issue => Boolean(issue));
}

export async function getArchivedIssues() {
  const issues = await getAllIssues();
  return issues.filter((issue) => !issue.isCurrent);
}

export async function getCurrentIssue(): Promise<Issue | null> {
  const nowIso = getPublishCutoffIso();
  const { data, error } = await runPublicQuery<RawIssueRow>((db) =>
    applyPublicIssueVisibility(db.from("issues").select(ISSUE_SELECT), nowIso)
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  );

  if (error) {
    console.error("[getCurrentIssue] 获取当前刊失败:", error);
    return null;
  }

  return mapIssue(data);
}

export async function getIssueBySlug(slug: string): Promise<Issue | null> {
  const nowIso = getPublishCutoffIso();
  const { data, error } = await runPublicQuery<RawIssueRow>((db) =>
    applyPublicIssueVisibility(db.from("issues").select(ISSUE_SELECT).eq("slug", slug), nowIso)
      .maybeSingle()
  );

  if (error) {
    console.error("[getIssueBySlug] 获取刊号失败:", error);
    return null;
  }

  return mapIssue(data);
}

function resolveIssueIdOption(options?: { issueId?: string | null }) {
  if (!options || options.issueId === undefined) {
    return undefined;
  }

  return options.issueId;
}

export async function getLatestArticles(
  limit = 8,
  options?: { issueId?: string | null }
): Promise<Article[]> {
  const explicitIssueId = resolveIssueIdOption(options);
  const issueId = explicitIssueId === undefined ? (await getCurrentIssue())?.id ?? null : explicitIssueId;
  const nowIso = getPublishCutoffIso();

  const { data, error } = await runPublicQuery<RawArticleRow[]>((db) => {
    let query = applyPublicIssueRelationVisibility(
      db
      .from("articles")
      .select(PUBLIC_ARTICLE_SELECT)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
      nowIso
    );

    if (issueId) {
      query = query.eq("issue_id", issueId);
    }

    return query;
  });

  if (error || !data) {
    console.error("[getLatestArticles] 获取文章失败:", error);
    return [];
  }

  return populateEchoCounts(data.map(mapArticle));
}

export async function getArticlesByCategory(
  category: string,
  limit = 20,
  options?: { issueId?: string | null }
): Promise<Article[]> {
  const explicitIssueId = resolveIssueIdOption(options);
  const issueId = explicitIssueId === undefined ? (await getCurrentIssue())?.id ?? null : explicitIssueId;
  const nowIso = getPublishCutoffIso();
  const aliases = getCategoryAliases(normalizeCategory(category));
  const orFilter = aliases
    .map((value) => `category.eq.${value.replaceAll(",", "\\,")}`)
    .join(",");

  const { data, error } = await runPublicQuery<RawArticleRow[]>((db) => {
    let query = applyPublicIssueRelationVisibility(
      db
      .from("articles")
      .select(PUBLIC_ARTICLE_SELECT)
      .eq("is_published", true)
      .or(orFilter)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
      nowIso
    );

    if (issueId) {
      query = query.eq("issue_id", issueId);
    }

    return query;
  });

  if (error) {
    console.error("[getArticlesByCategory] 按栏目获取文章失败:", error);
    return [];
  }

  return populateEchoCounts((data ?? []).map(mapArticle));
}

export async function getArticlesByIssue(issueId: string, limit = 100): Promise<Article[]> {
  if (!issueId) {
    return [];
  }

  const nowIso = getPublishCutoffIso();
  const { data, error } = await runPublicQuery<RawArticleRow[]>((db) =>
    applyPublicIssueRelationVisibility(
      db
      .from("articles")
      .select(PUBLIC_ARTICLE_SELECT)
      .eq("is_published", true)
      .eq("issue_id", issueId)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
      nowIso
    )
  );

  if (error || !data) {
    console.error("[getArticlesByIssue] 获取本期文章失败:", error);
    return [];
  }

  return populateEchoCounts(data.map(mapArticle));
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const nowIso = getPublishCutoffIso();
  const { data, error } = await runPublicQuery<RawArticleRow>((db) =>
    applyPublicIssueRelationVisibility(
      db
      .from("articles")
      .select(PUBLIC_ARTICLE_SELECT)
      .eq("is_published", true)
      .eq("slug", slug)
      .maybeSingle(),
      nowIso
    )
  );

  if (error) {
    console.error("[getArticleBySlug] 获取文章失败:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const [article] = await populateEchoCounts([mapArticle(data)]);
  return article ?? null;
}


export async function searchArticles(query: string): Promise<Article[]> {
  const nowIso = getPublishCutoffIso();
  const { data, error } = await runPublicQuery<RawArticleRow[]>((db) =>
    applyPublicIssueRelationVisibility(
      db
      .from("articles")
      .select(PUBLIC_ARTICLE_SELECT)
      .eq("is_published", true)
      .or(`title.ilike.%${query}%,author_name.ilike.%${query}%`)
      .order("published_at", { ascending: false }),
      nowIso
    )
  );
  
  if (error || !data) {
    console.error('搜索文章失败:', error);
    return [];
  }
  
  return populateEchoCounts(data.map(mapArticle));
}
