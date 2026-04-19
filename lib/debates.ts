import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type DebateSide = "pro" | "con";

export interface DebateComment {
  id: string;
  topicId: string;
  userId: string;
  side: DebateSide;
  content: string;
  createdAt: string;
  likeCount: number;
  likedByViewer: boolean;
  dislikeCount: number;
  dislikedByViewer: boolean;
}

export interface DebateTopic {
  id: string;
  issueId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  comments: DebateComment[];
}

export type DebateTopicSummary = Omit<DebateTopic, "comments">;

type RawRow = Record<string, unknown>;

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[debates] Missing Supabase env configuration");
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

function toSide(value: unknown): DebateSide {
  return value === "con" ? "con" : "pro";
}

function mapTopic(row: RawRow): Omit<DebateTopic, "comments"> {
  return {
    id: String(row.id ?? ""),
    issueId: String(row.issue_id ?? ""),
    title: toText(row.title),
    description: toText(row.description) || null,
    sortOrder: Number(row.sort_order ?? 0),
    startsAt: toText(row.starts_at) || null,
    endsAt: toText(row.ends_at) || null,
    createdAt: toText(row.created_at) || new Date(0).toISOString(),
  };
}

function mapComment(
  row: RawRow,
  likeCounts: Map<string, number>,
  viewerLikedCommentIds: Set<string>,
  dislikeCounts: Map<string, number>,
  viewerDislikedCommentIds: Set<string>
): DebateComment {
  const id = String(row.id ?? "");

  return {
    id,
    topicId: String(row.topic_id ?? ""),
    userId: String(row.user_id ?? ""),
    side: toSide(row.side),
    content: toText(row.content),
    createdAt: toText(row.created_at) || new Date(0).toISOString(),
    likeCount: likeCounts.get(id) ?? 0,
    likedByViewer: viewerLikedCommentIds.has(id),
    dislikeCount: dislikeCounts.get(id) ?? 0,
    dislikedByViewer: viewerDislikedCommentIds.has(id),
  };
}

async function getDebateTopicSummariesInternal(
  issueId: string
): Promise<DebateTopicSummary[]> {
  const supabase = getPublicClient();

  if (!supabase) {
    return [];
  }

  const nowIso = new Date().toISOString();
  const { data: linkRows, error: linksError } = await supabase
    .from("debate_topic_issue_links")
    .select(
      `
        debate_topic_id,
        issue:issues!inner(
          published_at
        ),
        topic:debate_topics!inner(
          id,
          issue_id,
          title,
          description,
          sort_order,
          starts_at,
          ends_at,
          created_at
        )
      `
    )
    .eq("issue_id", issueId)
    .not("issue.published_at", "is", null)
    .lte("issue.published_at", nowIso);

  if (linksError || !linkRows) {
    console.error("[getDebateTopicSummariesByIssueId] Failed to load topics:", linksError);
    return [];
  }

  const topicMap = new Map<string, DebateTopicSummary>();

  for (const row of linkRows as RawRow[]) {
    const topic = (row.topic as RawRow | null | undefined) ?? null;
    if (!topic) {
      continue;
    }

    const mappedTopic = mapTopic(topic);
    topicMap.set(mappedTopic.id, mappedTopic);
  }

  return Array.from(topicMap.values()).sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export async function getDebateTopicSummariesByIssueId(
  issueId: string
): Promise<DebateTopicSummary[]> {
  if (!issueId) {
    return [];
  }

  return getDebateTopicSummariesInternal(issueId);
}

export async function getDebateTopicsByIssueId(
  issueId: string,
  viewerUserId?: string | null
): Promise<DebateTopic[]> {
  if (!issueId) {
    return [];
  }

  const topics = await getDebateTopicSummariesInternal(issueId);
  if (topics.length === 0) {
    return [];
  }

  const supabase = createServerClient();
  const topicIds = topics.map((topic) => topic.id);
  const { data: commentsData, error: commentsError } = await supabase
    .from("debate_comments")
    .select("*")
    .in("topic_id", topicIds)
    .order("created_at", { ascending: true });

  if (commentsError) {
    console.error("[getDebateTopicsByIssueId] Failed to load comments:", commentsError);
  }

  const commentRows = (commentsData as RawRow[] | null) ?? [];
  const commentIds = commentRows.map((row) => String(row.id ?? "")).filter(Boolean);
  const likeCounts = new Map<string, number>();
  const dislikeCounts = new Map<string, number>();

  if (commentIds.length > 0) {
    const [likesResult, dislikesResult] = await Promise.all([
      supabase.from("debate_comment_likes").select("comment_id").in("comment_id", commentIds),
      supabase
        .from("debate_comment_dislikes")
        .select("comment_id")
        .in("comment_id", commentIds),
    ]);

    if (likesResult.error) {
      console.error("[getDebateTopicsByIssueId] Failed to load like counts:", likesResult.error);
    } else {
      for (const row of (likesResult.data as RawRow[] | null) ?? []) {
        const commentId = String(row.comment_id ?? "");
        if (commentId) {
          likeCounts.set(commentId, (likeCounts.get(commentId) ?? 0) + 1);
        }
      }
    }

    if (dislikesResult.error) {
      console.error(
        "[getDebateTopicsByIssueId] Failed to load dislike counts:",
        dislikesResult.error
      );
    } else {
      for (const row of (dislikesResult.data as RawRow[] | null) ?? []) {
        const commentId = String(row.comment_id ?? "");
        if (commentId) {
          dislikeCounts.set(commentId, (dislikeCounts.get(commentId) ?? 0) + 1);
        }
      }
    }
  }

  const viewerLikedCommentIds = new Set<string>();
  const viewerDislikedCommentIds = new Set<string>();

  if (viewerUserId && commentIds.length > 0) {
    const [viewerLikesResult, viewerDislikesResult] = await Promise.all([
      supabase
        .from("debate_comment_likes")
        .select("comment_id")
        .eq("user_id", viewerUserId)
        .in("comment_id", commentIds),
      supabase
        .from("debate_comment_dislikes")
        .select("comment_id")
        .eq("user_id", viewerUserId)
        .in("comment_id", commentIds),
    ]);

    if (viewerLikesResult.error) {
      console.error(
        "[getDebateTopicsByIssueId] Failed to load viewer like state:",
        viewerLikesResult.error
      );
    } else {
      for (const row of (viewerLikesResult.data as RawRow[] | null) ?? []) {
        const commentId = String(row.comment_id ?? "");
        if (commentId) {
          viewerLikedCommentIds.add(commentId);
        }
      }
    }

    if (viewerDislikesResult.error) {
      console.error(
        "[getDebateTopicsByIssueId] Failed to load viewer dislike state:",
        viewerDislikesResult.error
      );
    } else {
      for (const row of (viewerDislikesResult.data as RawRow[] | null) ?? []) {
        const commentId = String(row.comment_id ?? "");
        if (commentId) {
          viewerDislikedCommentIds.add(commentId);
        }
      }
    }
  }

  const commentsByTopicId = new Map<string, DebateComment[]>();

  for (const row of commentRows) {
    const comment = mapComment(
      row,
      likeCounts,
      viewerLikedCommentIds,
      dislikeCounts,
      viewerDislikedCommentIds
    );
    const items = commentsByTopicId.get(comment.topicId) ?? [];
    items.push(comment);
    commentsByTopicId.set(comment.topicId, items);
  }

  return topics.map((topic) => ({
    ...topic,
    comments: commentsByTopicId.get(topic.id) ?? [],
  }));
}
