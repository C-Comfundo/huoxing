"use server";

import { revalidatePath } from "next/cache";
import { resolveCurrentAuthorDisplayName } from "@/lib/comment-authors";
import type { BoardMessage } from "@/lib/board-messages";
import { createClient } from "@/lib/supabase/server";

interface SubmitBoardMessageResult {
  success: boolean;
  message: string;
  boardMessage?: BoardMessage;
}

type RawBoardMessage = Record<string, unknown>;

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapBoardMessage(row: RawBoardMessage): BoardMessage {
  return {
    id: String(row.id ?? ""),
    content: toText(row.content),
    userId: String(row.user_id ?? ""),
    authorLabel: toText(row.author_display_name).trim() || "用户",
    createdAt: toText(row.created_at) || new Date(0).toISOString(),
  };
}

export async function submitBoardMessage(content: string): Promise<SubmitBoardMessageResult> {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return {
      success: false,
      message: "请先写下想留下的话。",
    };
  }

  if (trimmedContent.length > 300) {
    return {
      success: false,
      message: "留言请控制在 300 字以内。",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "请先登录，再留下你的名字和一句话。",
    };
  }

  const authorDisplayName = await resolveCurrentAuthorDisplayName(supabase, user);

  const { data, error } = await supabase
    .from("board_messages")
    .insert({
      content: trimmedContent,
      user_id: user.id,
      author_display_name: authorDisplayName,
    })
    .select("id, content, user_id, author_display_name, created_at")
    .single();

  if (error || !data) {
    console.error("[submitBoardMessage] 发表留言失败:", error);
    return {
      success: false,
      message: "留言发布失败，请稍后再试。",
    };
  }

  revalidatePath("/board");

  return {
    success: true,
    message: "留言已经留下了。",
    boardMessage: mapBoardMessage(data as RawBoardMessage),
  };
}
