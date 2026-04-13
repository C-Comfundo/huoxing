import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface BoardMessage {
  id: string;
  content: string;
  userId: string;
  authorLabel: string;
  createdAt: string;
}

type RawBoardMessage = Record<string, unknown>;

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapBoardMessage(row: RawBoardMessage): BoardMessage {
  const authorLabel = toText(row.author_display_name).trim() || "用户";

  return {
    id: String(row.id ?? ""),
    content: toText(row.content),
    userId: String(row.user_id ?? ""),
    authorLabel,
    createdAt: toText(row.created_at) || new Date(0).toISOString(),
  };
}

export async function fetchBoardMessages(limit = 80): Promise<BoardMessage[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("board_messages")
    .select("id, content, user_id, author_display_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("[fetchBoardMessages] 获取留言失败:", error);
    return [];
  }

  return (data as RawBoardMessage[]).map(mapBoardMessage);
}
