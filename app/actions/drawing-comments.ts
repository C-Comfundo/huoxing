"use server";

import { revalidatePath } from "next/cache";
import {
  authorDisplayNameFromRow,
  authorLabelFrom,
  resolveCurrentAuthorDisplayName,
} from "@/lib/comment-authors";
import { createClient } from "@/lib/supabase/server";

export interface DrawingComment {
  id: string;
  issueId: string;
  userId: string;
  content: string;
  createdAt: string;
  isAnonymous: boolean;
  authorLabel: string;
  likeCount: number;
  likedByViewer: boolean;
}

interface SubmitDrawingCommentInput {
  issueId: string;
  issueSlug: string;
  content: string;
  isAnonymous?: boolean;
}

interface DrawingCommentActionResult {
  success: boolean;
  message: string;
}

interface SubmitDrawingCommentResult extends DrawingCommentActionResult {
  comment?: DrawingComment;
}

interface ToggleDrawingCommentLikeInput {
  commentId: string;
  issueSlug: string;
}

interface ToggleDrawingCommentLikeResult extends DrawingCommentActionResult {
  commentId?: string;
  likeCount?: number;
  liked?: boolean;
}

type RawRow = Record<string, unknown>;

type MappedDrawingCommentRow = Omit<
  DrawingComment,
  "authorLabel" | "likeCount" | "likedByViewer"
> & {
  authorDisplayName: string | null;
};

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapRowBase(row: RawRow): MappedDrawingCommentRow {
  return {
    id: String(row.id ?? ""),
    issueId: String(row.issue_id ?? ""),
    userId: String(row.user_id ?? ""),
    content: toText(row.content),
    createdAt:
      toText(row.created_at) ||
      toText(row.inserted_at) ||
      new Date(0).toISOString(),
    isAnonymous: Boolean(row.is_anonymous),
    authorDisplayName: authorDisplayNameFromRow(row),
  };
}

function mapComment(
  row: RawRow,
  likeCounts: Map<string, number>,
  viewerLikedCommentIds: Set<string>
): DrawingComment {
  const base = mapRowBase(row);

  return {
    id: base.id,
    issueId: base.issueId,
    userId: base.userId,
    content: base.content,
    createdAt: base.createdAt,
    isAnonymous: base.isAnonymous,
    authorLabel: authorLabelFrom(base.isAnonymous, base.authorDisplayName),
    likeCount: likeCounts.get(base.id) ?? 0,
    likedByViewer: viewerLikedCommentIds.has(base.id),
  };
}

function revalidateDrawingPaths(issueSlug: string) {
  revalidatePath("/profile");

  if (!issueSlug) {
    return;
  }

  revalidatePath(`/issues/${issueSlug}/drawing`);
  revalidatePath(`/issues/${issueSlug}`);
}

async function getDrawingCommentLikeCount(
  supabase: ReturnType<typeof createClient>,
  commentId: string
) {
  if (!commentId) {
    return 0;
  }

  const { count, error } = await supabase
    .from("issue_drawing_comment_likes")
    .select("comment_id", { count: "exact", head: true })
    .eq("comment_id", commentId);

  if (error) {
    console.error(
      "[getDrawingCommentLikeCount] Failed to load drawing comment like count:",
      error
    );
    return 0;
  }

  return count ?? 0;
}

export async function fetchDrawingComments(
  issueId: string
): Promise<DrawingComment[]> {
  if (!issueId) {
    return [];
  }

  const supabase = createClient();
  const [
    commentsResult,
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("issue_drawing_comments")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  if (commentsResult.error || !commentsResult.data) {
    console.error(
      "[fetchDrawingComments] Failed to load drawing comments:",
      commentsResult.error
    );
    return [];
  }

  const commentRows = commentsResult.data as RawRow[];
  const commentIds = commentRows
    .map((row) => String(row.id ?? ""))
    .filter(Boolean);
  const likeCounts = new Map<string, number>();
  const viewerLikedCommentIds = new Set<string>();

  if (commentIds.length > 0) {
    const { data: likeRows, error: likeError } = await supabase
      .from("issue_drawing_comment_likes")
      .select("comment_id")
      .in("comment_id", commentIds);

    if (likeError) {
      console.error(
        "[fetchDrawingComments] Failed to load drawing comment like counts:",
        likeError
      );
    } else {
      for (const row of (likeRows as RawRow[] | null) ?? []) {
        const commentId = String(row.comment_id ?? "");
        if (commentId) {
          likeCounts.set(commentId, (likeCounts.get(commentId) ?? 0) + 1);
        }
      }
    }

    if (user?.id) {
      const { data: viewerLikeRows, error: viewerLikeError } = await supabase
        .from("issue_drawing_comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", commentIds);

      if (viewerLikeError) {
        console.error(
          "[fetchDrawingComments] Failed to load viewer drawing comment like state:",
          viewerLikeError
        );
      } else {
        for (const row of (viewerLikeRows as RawRow[] | null) ?? []) {
          const commentId = String(row.comment_id ?? "");
          if (commentId) {
            viewerLikedCommentIds.add(commentId);
          }
        }
      }
    }
  }

  return commentRows.map((row) =>
    mapComment(row, likeCounts, viewerLikedCommentIds)
  );
}

export async function submitDrawingComment(
  input: SubmitDrawingCommentInput
): Promise<SubmitDrawingCommentResult> {
  const issueId = input.issueId?.trim();
  const issueSlug = input.issueSlug?.trim();

  if (!issueId || !issueSlug) {
    return {
      success: false,
      message: "期刊信息无效",
    };
  }

  const content = input.content.trim();

  if (!content) {
    return {
      success: false,
      message: "请写下留言内容",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "请先点亮身份，再留下你的星火。",
    };
  }

  const { data: drawingRow, error: drawingError } = await supabase
    .from("issue_drawings")
    .select("id")
    .eq("issue_id", issueId)
    .maybeSingle();

  if (drawingError || !drawingRow) {
    return {
      success: false,
      message: "画里有话暂未开放",
    };
  }

  const isAnonymous = Boolean(input.isAnonymous);
  const authorDisplayName = await resolveCurrentAuthorDisplayName(supabase, user);

  const { data, error } = await supabase
    .from("issue_drawing_comments")
    .insert({
      issue_id: issueId,
      content,
      user_id: user.id,
      is_anonymous: isAnonymous,
      author_display_name: authorDisplayName,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[submitDrawingComment] Failed to insert drawing comment:", error);
    return {
      success: false,
      message: "发表失败，请稍后重试",
    };
  }

  const comment = mapComment(data as RawRow, new Map(), new Set());

  revalidateDrawingPaths(issueSlug);

  return {
    success: true,
    message: isAnonymous ? "匿名留言已发送" : "留言已发送",
    comment,
  };
}

export async function toggleDrawingCommentLike(
  input: ToggleDrawingCommentLikeInput
): Promise<ToggleDrawingCommentLikeResult> {
  const commentId = input.commentId?.trim();

  if (!commentId) {
    return {
      success: false,
      message: "没有找到要点赞的评论。",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "请先登录后再点赞。",
    };
  }

  const { data: comment, error: commentError } = await supabase
    .from("issue_drawing_comments")
    .select("id")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError) {
    console.error(
      "[toggleDrawingCommentLike] Failed to load drawing comment:",
      commentError
    );
    return {
      success: false,
      message: "暂时无法确认这条评论，请稍后重试。",
    };
  }

  if (!comment) {
    return {
      success: false,
      message: "这条评论已经不存在了。",
    };
  }

  const { data: existingLike, error: existingLikeError } = await supabase
    .from("issue_drawing_comment_likes")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingLikeError) {
    console.error(
      "[toggleDrawingCommentLike] Failed to load existing drawing comment like:",
      existingLikeError
    );
    return {
      success: false,
      message: "暂时无法确认点赞状态，请稍后重试。",
    };
  }

  if (existingLike) {
    const { error: deleteError } = await supabase
      .from("issue_drawing_comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "[toggleDrawingCommentLike] Failed to remove drawing comment like:",
        deleteError
      );
      return {
        success: false,
        message: "取消点赞失败，请稍后重试。",
      };
    }

    const likeCount = await getDrawingCommentLikeCount(supabase, commentId);
    revalidateDrawingPaths(input.issueSlug?.trim() ?? "");

    return {
      success: true,
      message: "已取消点赞。",
      commentId,
      likeCount,
      liked: false,
    };
  }

  const { error: insertError } = await supabase
    .from("issue_drawing_comment_likes")
    .insert({
      comment_id: commentId,
      user_id: user.id,
    });

  if (insertError) {
    console.error(
      "[toggleDrawingCommentLike] Failed to insert drawing comment like:",
      insertError
    );
    return {
      success: false,
      message: "点赞失败，请稍后重试。",
    };
  }

  const likeCount = await getDrawingCommentLikeCount(supabase, commentId);
  revalidateDrawingPaths(input.issueSlug?.trim() ?? "");

  return {
    success: true,
    message: "已点赞这条评论。",
    commentId,
    likeCount,
    liked: true,
  };
}
