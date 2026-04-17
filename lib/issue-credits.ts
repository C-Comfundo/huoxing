import "server-only";
import { createClient } from "@supabase/supabase-js";

export interface CreditMember {
  id: string;
  department: string;
  names: string;
  sortOrder: number;
}

export interface IssueCredit {
  id: string;
  issueId: string;
  title: string;
  message: string;
  members: CreditMember[];
}

type RawRow = Record<string, unknown>;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[issue-credits] 缺少 Supabase 环境变量配置");
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Fetch the production team credits for an issue.
 * RLS ensures only published-issue data is returned.
 */
export async function getIssueCredits(
  issueId: string
): Promise<IssueCredit | null> {
  if (!issueId) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: creditRow, error: creditError } = await supabase
    .from("issue_credits")
    .select("id, issue_id, title, message")
    .eq("issue_id", issueId)
    .maybeSingle();

  if (creditError) {
    console.error("[getIssueCredits] 获取制作团队失败:", creditError);
    return null;
  }

  if (!creditRow) return null;

  const raw = creditRow as RawRow;
  const creditId = String(raw.id ?? "");

  const { data: memberRows, error: memberError } = await supabase
    .from("issue_credit_members")
    .select("id, department, names, sort_order")
    .eq("credit_id", creditId)
    .order("sort_order", { ascending: true });

  if (memberError) {
    console.error("[getIssueCredits] 获取制作团队成员失败:", memberError);
  }

  const members: CreditMember[] = ((memberRows as RawRow[] | null) ?? []).map(
    (row) => ({
      id: String(row.id ?? ""),
      department: toText(row.department),
      names: toText(row.names),
      sortOrder: Number(row.sort_order ?? 0),
    })
  );

  return {
    id: creditId,
    issueId: String(raw.issue_id ?? ""),
    title: toText(raw.title),
    message: toText(raw.message),
    members,
  };
}
