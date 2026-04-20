import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";
import DebateWall from "@/components/debate/DebateWall";
import IssueBadge from "@/components/IssueBadge";
import Navbar from "@/components/Navbar";
import { getIssueBySlug } from "@/lib/articles";
import { getDebateTopicTiming, selectDefaultDebateTopicId, type DebateTopicStatus } from "@/lib/debate-schedule";
import { getDebateTopicsByIssueId } from "@/lib/debates";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

interface PageProps {
  params: {
    slug: string;
  };
  searchParams?: {
    topic?: string | string[];
    from?: string;
  };
}

export default async function IssueDebatePage({ params, searchParams }: PageProps) {
  const slug = decodeURIComponent(params.slug);
  const issue = await getIssueBySlug(slug);
  const from = searchParams?.from as string;

  if (!issue) {
    notFound();
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const topics = (await getDebateTopicsByIssueId(issue.id, user?.id ?? null)).sort((a, b) => {
    const nowMs = Date.now();
    const aStatus =
      a.startsAt && a.endsAt
        ? getDebateTopicTiming(a.startsAt, a.endsAt, nowMs).status
        : "not_started";
    const bStatus =
      b.startsAt && b.endsAt
        ? getDebateTopicTiming(b.startsAt, b.endsAt, nowMs).status
        : "not_started";

    const priority: Record<DebateTopicStatus, number> = {
      ongoing: 0,
      not_started: 1,
      ended: 2,
    };

    return priority[aStatus] - priority[bStatus];
  });
  const requestedTopicId = typeof searchParams?.topic === "string" ? searchParams.topic : null;
  const initialNowMs = Date.now();
  const initialTopicId = selectDefaultDebateTopicId(topics, requestedTopicId, initialNowMs);

  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar articleId={from} />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-24 md:px-8 md:pt-32">
        <Link
          href={`/issues/${issue.slug}`}
          className="group mb-10 inline-flex items-center text-[#9E9E9E] transition-colors hover:text-[#A1887F]"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-serif tracking-widest">{"\u8fd4\u56de\u672c\u671f"}</span>
        </Link>

        <header className="rounded-[2rem] border border-[#E8E4DF] bg-white/80 px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[#9E9E9E]">
            <Scale className="h-4 w-4 text-[#A1887F]" />
            <span>Debate Room</span>
            <IssueBadge label={issue.label} />
          </div>

          <h1 className="mt-5 font-youyou text-4xl text-[#2C2C2C] md:text-5xl">
            {"\u672c\u671f\u8fa9\u8bba"}
          </h1>

          <p className="mt-4 max-w-3xl font-serif text-base leading-loose text-[#6C665F] md:text-lg">
            {
              "\u6e38\u620f\u89c4\u5219\uff1a\u53ef\u4ee5\u7c98\u8d34/\u5220\u9664\u81ea\u5df1\u7684\u7eb8\u6761\u3002\u53ef\u4ee5\u70b9\u8d5e\u4ed6\u4eba\u7eb8\u6761\uff0c\u4e0d\u80fd\u70b9\u8d5e\u81ea\u5df1\u7eb8\u6761\u3002\u9700\u8981\u6ce8\u518c\u767b\u5f55\u540e\u5409\u67b6\u3002"
            }
          </p>
        </header>

        <div className="mt-10">
          <DebateWall
            currentUserId={user?.id ?? null}
            initialTopics={topics}
            isLoggedIn={Boolean(user)}
            issueSlug={issue.slug}
            initialTopicId={initialTopicId}
            initialNowMs={initialNowMs}
          />
        </div>
      </div>
    </main>
  );
}
