"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface DeleteEchoInput {
  echoId: string;
}

interface DeleteEchoResult {
  success: boolean;
  message: string;
  echoId?: string;
}

export async function deleteEcho(input: DeleteEchoInput): Promise<DeleteEchoResult> {
  const echoId = input.echoId?.trim();

  if (!echoId) {
    return {
      success: false,
      message: "没有找到要删除的回响。",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "请先登录后再删除。",
    };
  }

  const { data: existingEcho, error: fetchError } = await supabase
    .from("echoes")
    .select("id, user_id")
    .eq("id", echoId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deleteEcho] Failed to load echo:", fetchError);
    return {
      success: false,
      message: "暂时无法确认这条回响，请稍后重试。",
    };
  }

  if (!existingEcho) {
    return {
      success: false,
      message: "这条回响已经不存在了。",
    };
  }

  if (String(existingEcho.user_id ?? "") !== user.id) {
    return {
      success: false,
      message: "只能删除自己的回响。",
    };
  }

  const { error: deleteError } = await supabase
    .from("echoes")
    .delete()
    .eq("id", echoId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[deleteEcho] Failed to delete echo:", deleteError);
    return {
      success: false,
      message: "删除失败，请稍后重试。",
    };
  }

  revalidatePath("/", "layout");

  return {
    success: true,
    message: "这条回响已删除。",
    echoId,
  };
}
