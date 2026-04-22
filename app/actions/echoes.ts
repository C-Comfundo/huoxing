"use server";

import { revalidatePath } from "next/cache";
import {
  authorDisplayNameFromRow,
  authorLabelFrom,
  resolveCurrentAuthorDisplayName,
} from "@/lib/comment-authors";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface Echo {
  id: string;
  articleId: string;
  content: string;
  userId: string;
  createdAt: string;
  isAnonymous: boolean;
  /** 展示用：匿名 或 用户昵称 */
  authorLabel: string;
  parentId?: string | null;
  rootId?: string | null;
}

interface SubmitEchoInput {
  articleId: string;
  content: string;
  /** 为 true 时前台显示匿名，不展示昵称 */
  isAnonymous?: boolean;
  /** 回复目标评论 ID；为空表示顶层评论 */
  parentId?: string;
  /** 所属顶层评论 ID；前端传入，避免后端再查 */
  rootId?: string;
}

interface SubmitEchoResult {
  success: boolean;
  message: string;
  echo?: Echo;
}

type RawEcho = Record<string, unknown>;

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

type MappedEchoRow = Omit<Echo, "authorLabel"> & {
  authorDisplayName: string | null;
};

function mapEchoRow(row: RawEcho): MappedEchoRow {
  return {
    id: String(row.id ?? ""),
    articleId: String(row.article_id ?? ""),
    content: toText(row.content),
    userId: String(row.user_id ?? ""),
    createdAt:
      toText(row.created_at) ||
      toText(row.inserted_at) ||
      new Date(0).toISOString(),
    isAnonymous: Boolean(row.is_anonymous),
    authorDisplayName: authorDisplayNameFromRow(row),
    parentId: row.parent_id ? String(row.parent_id) : null,
    rootId: row.root_id ? String(row.root_id) : null,
  };
}

export async function fetchEchoes(articleId: string): Promise<Echo[]> {
  if (!articleId) {
    return [];
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("echoes")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[fetchEchoes] 获取回响失败:", error);
    return [];
  }

  return (data as RawEcho[]).map((row) => {
    const base = mapEchoRow(row);

    return {
      id: base.id,
      articleId: base.articleId,
      content: base.content,
      userId: base.userId,
      createdAt: base.createdAt,
      isAnonymous: base.isAnonymous,
      authorLabel: authorLabelFrom(base.isAnonymous, base.authorDisplayName),
      parentId: base.parentId,
      rootId: base.rootId,
    };
  });
}

export async function submitEcho(input: SubmitEchoInput): Promise<SubmitEchoResult> {
  if (!input.articleId) {
    return {
      success: false,
      message: "文章不存在，无法发送回音",
    };
  }

  const content = input.content.trim();

  if (!content) {
    return {
      success: false,
      message: "请写下回音内容",
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

  const isAnonymous = Boolean(input.isAnonymous);
  const authorDisplayName = await resolveCurrentAuthorDisplayName(supabase, user);

  const insertPayload: Record<string, unknown> = {
    article_id: input.articleId,
    content,
    user_id: user.id,
    is_anonymous: isAnonymous,
    author_display_name: authorDisplayName,
  };

  if (input.parentId) {
    insertPayload.parent_id = input.parentId;
    // 如果被回复的是顶层评论，root_id 就是该评论本身；否则继承前端传入的 rootId
    insertPayload.root_id = input.rootId || input.parentId;
  }

  const { data, error } = await supabase
    .from("echoes")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[submitEcho] 发表回响失败:", error);
    return {
      success: false,
      message: "发表失败，请稍后重试",
    };
  }

  const base = mapEchoRow(data as RawEcho);

  const echo: Echo = {
    id: base.id,
    articleId: base.articleId,
    content: base.content,
    userId: base.userId,
    createdAt: base.createdAt,
    isAnonymous: base.isAnonymous,
    authorLabel: authorLabelFrom(base.isAnonymous, base.authorDisplayName),
    parentId: base.parentId,
    rootId: base.rootId,
  };

  revalidatePath("/", "layout");

  return {
    success: true,
    message: isAnonymous ? "匿名回响已发布" : "回响已发布",
    echo,
  };
}

export async function deleteEcho(echoId: string): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, message: "请先登录" };
  }

  const adminClient = createAdminClient();
  const { data: echo } = await adminClient
    .from("echoes")
    .select("user_id")
    .eq("id", echoId)
    .maybeSingle();

  if (!echo) {
    return { success: false, message: "评论不存在" };
  }

  if (echo.user_id !== user.id) {
    return { success: false, message: "无权删除该评论" };
  }

  const { error } = await supabase.from("echoes").delete().eq("id", echoId);

  if (error) {
    console.error("[deleteEcho] 删除失败:", error);
    return { success: false, message: error.message || "删除失败，请稍后重试" };
  }

  revalidatePath("/", "layout");
  return { success: true, message: "删除成功" };
}
