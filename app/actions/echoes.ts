"use server";

import { revalidatePath } from "next/cache";

import {
  authorDisplayNameFromRow,
  authorLabelFrom,
  resolveCurrentAuthorDisplayName,
} from "@/lib/comment-authors";
import { createClient } from "@/lib/supabase/server";

export interface Echo {
  id: string;
  articleId: string;
  content: string;
  userId: string;
  createdAt: string;
  isAnonymous: boolean;
  authorLabel: string;
  parentId?: string | null;
  rootId?: string | null;
}

interface SubmitEchoInput {
  articleId: string;
  content: string;
  isAnonymous?: boolean;
  parentId?: string;
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

export async function submitEcho(
  input: SubmitEchoInput
): Promise<SubmitEchoResult> {
  if (!input.articleId) {
    return {
      success: false,
      message: "文章不存在，无法发送回响。",
    };
  }

  const content = input.content.trim();

  if (!content) {
    return {
      success: false,
      message: "请写下回响内容。",
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
  const authorDisplayName = await resolveCurrentAuthorDisplayName(
    supabase,
    user
  );

  const insertPayload: Record<string, unknown> = {
    article_id: input.articleId,
    content,
    user_id: user.id,
    is_anonymous: isAnonymous,
    author_display_name: authorDisplayName,
  };

  if (input.parentId) {
    const { data: parentEcho, error: parentError } = await supabase
      .from("echoes")
      .select("id, article_id, root_id")
      .eq("id", input.parentId)
      .maybeSingle();

    if (parentError) {
      console.error("[submitEcho] Failed to load parent echo:", parentError);
      return {
        success: false,
        message: "暂时无法确认回复目标，请稍后重试。",
      };
    }

    if (!parentEcho) {
      return {
        success: false,
        message: "你要回复的这条回响已经不存在了。",
      };
    }

    if (String(parentEcho.article_id ?? "") !== input.articleId) {
      return {
        success: false,
        message: "回复目标与当前文章不匹配。",
      };
    }

    insertPayload.parent_id = input.parentId;
    insertPayload.root_id = parentEcho.root_id
      ? String(parentEcho.root_id)
      : input.parentId;
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
