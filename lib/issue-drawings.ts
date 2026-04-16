import "server-only";
import { createClient } from "@supabase/supabase-js";

interface IssueDrawingIssue {
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

export interface IssueDrawingImage {
  id: string;
  drawingId: string;
  imageUrl: string;
  altText: string | null;
  caption: string | null;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface IssueDrawing {
  id: string;
  issueId: string;
  title: string;
  authorName: string | null;
  authorHandle: string | null;
  description: string | null;
  viewCount: number;
  commentCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  images: IssueDrawingImage[];
}

type RawRow = Record<string, unknown>;
type DatabaseClient = any;
type QueryResult<T> = {
  data: T | null;
  error: unknown;
  count?: number | null;
};

const ISSUE_DRAWING_SELECT = "*";

const ISSUE_DRAWING_IMAGE_SELECT = `
  id,
  drawing_id,
  image_url,
  alt_text,
  caption,
  sort_order,
  created_at,
  updated_at
`;

const ISSUE_DRAWING_WITH_ISSUE_SELECT = `
  ${ISSUE_DRAWING_SELECT},
  issue:issues!inner(
    id,
    slug,
    label,
    title,
    cover_image,
    is_current,
    sort_order,
    published_at,
    created_at
  )
`;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[issue-drawings] Missing Supabase env configuration");
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

function mapIssue(row: RawRow | null | undefined): IssueDrawingIssue | null {
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

function mapIssueDrawingImage(row: RawRow): IssueDrawingImage {
  return {
    id: String(row.id ?? ""),
    drawingId: String(row.drawing_id ?? ""),
    imageUrl: toText(row.image_url),
    altText: toText(row.alt_text) || null,
    caption: toText(row.caption) || null,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: toText(row.created_at) || null,
    updatedAt: toText(row.updated_at) || null,
  };
}

function mapIssueDrawing(
  row: RawRow,
  images: IssueDrawingImage[],
  commentCount: number
): IssueDrawing {
  return {
    id: String(row.id ?? ""),
    issueId: String(row.issue_id ?? ""),
    title: toText(row.title),
    authorName: toText(row.author_name) || null,
    authorHandle: toText(row.author_handle) || null,
    description: toText(row.description) || null,
    viewCount: Number(row.view_count ?? 0),
    commentCount,
    createdAt: toText(row.created_at) || null,
    updatedAt: toText(row.updated_at) || null,
    images,
  };
}

function sortIssuesDescending(left: IssueDrawingIssue, right: IssueDrawingIssue) {
  if (left.sortOrder !== right.sortOrder) {
    return right.sortOrder - left.sortOrder;
  }

  const leftTime = Date.parse(left.publishedAt || left.createdAt || "");
  const rightTime = Date.parse(right.publishedAt || right.createdAt || "");

  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
    return right.createdAt?.localeCompare(left.createdAt || "") || 0;
  }

  if (Number.isNaN(leftTime)) {
    return 1;
  }

  if (Number.isNaN(rightTime)) {
    return -1;
  }

  return rightTime - leftTime;
}

export async function getIssueDrawingsByIssueId(issueId: string): Promise<IssueDrawing[]> {
  if (!issueId) {
    return [];
  }

  const { data: drawingRows, error: drawingError } = await runPublicQuery<RawRow[]>((db) =>
    db
      .from("issue_drawings")
      .select(ISSUE_DRAWING_SELECT)
      .eq("issue_id", issueId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
  );

  if (drawingError) {
    console.error("[getIssueDrawingsByIssueId] Failed to load drawings:", drawingError);
    return [];
  }

  if (!drawingRows || drawingRows.length === 0) {
    return [];
  }

  const drawings: IssueDrawing[] = [];

  for (const drawingRow of drawingRows) {
    const drawingId = String(drawingRow.id ?? "");

    const [{ data: imageRows, error: imageError }, { count: commentCount, error: commentError }] =
      await Promise.all([
        runPublicQuery<RawRow[]>((db) =>
          db
            .from("issue_drawing_images")
            .select(ISSUE_DRAWING_IMAGE_SELECT)
            .eq("drawing_id", drawingId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true })
        ),
        runPublicQuery<null>((db) =>
          db
            .from("issue_drawing_comments")
            .select("id", { count: "exact", head: true })
            .eq("drawing_id", drawingId)
        ),
      ]);

    if (imageError) {
      console.error("[getIssueDrawingsByIssueId] Failed to load drawing images:", imageError);
      continue;
    }

    if (commentError) {
      console.error("[getIssueDrawingsByIssueId] Failed to load drawing comment count:", commentError);
    }

    drawings.push(
      mapIssueDrawing(
        drawingRow,
        (imageRows ?? []).map(mapIssueDrawingImage),
        Number(commentCount ?? 0)
      )
    );
  }

  return drawings;
}

export async function hasIssueDrawing(issueId: string): Promise<boolean> {
  if (!issueId) {
    return false;
  }

  const { data, error } = await runPublicQuery<RawRow[]>((db) =>
    db.from("issue_drawings").select("id").eq("issue_id", issueId).limit(1)
  );

  if (error) {
    console.error("[hasIssueDrawing] Failed to load drawing availability:", error);
    return false;
  }

  return Boolean(data && data.length > 0);
}

export async function getLatestIssueWithDrawing(): Promise<IssueDrawingIssue | null> {
  const { data, error } = await runPublicQuery<RawRow[]>((db) =>
    db.from("issue_drawings").select(ISSUE_DRAWING_WITH_ISSUE_SELECT)
  );

  if (error || !data) {
    console.error("[getLatestIssueWithDrawing] Failed to load drawing issues:", error);
    return null;
  }

  const issues = data
    .map((row) => mapIssue((row.issue as RawRow | null | undefined) ?? null))
    .filter((issue): issue is IssueDrawingIssue => Boolean(issue))
    .sort(sortIssuesDescending);

  return issues[0] ?? null;
}
