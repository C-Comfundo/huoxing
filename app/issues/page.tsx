import Link from "next/link";
import Navbar from "@/components/Navbar";
import IssueBadge from "@/components/IssueBadge";
import { getAllIssues } from "@/lib/articles";
import { getIssueDisplayTitle } from "@/lib/issue-display";

export const revalidate = 60;

function formatDate(input: string | null) {
  if (!input) {
    return "待发布";
  }

  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function IssuesPage() {
  const issues = await getAllIssues();
  const currentIssue = issues.find((issue) => issue.isCurrent) ?? null;
  const archivedIssues = issues.filter((issue) => issue.id !== currentIssue?.id);

  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-32 md:px-8">
        <header className="mb-16 border-b border-[#DDD6CE] pb-10">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A1887F] opacity-60" />
              <p className="text-xs uppercase tracking-[0.35em] text-[#9E9E9E]">
                Issue Archive
              </p>
            </div>

            <h1 className="font-youyou text-5xl text-[#2C2C2C] md:text-6xl">
              往期归档
            </h1>

            <p className="max-w-3xl font-serif text-lg leading-loose text-[#6C665F]">
              首页只展示当前刊。旧刊在这里进入归档。
            </p>
          </div>
        </header>

        {currentIssue ? (
          <section className="mb-16 rounded-[2rem] border border-[#E8E4DF] bg-white/80 p-8">
            <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.35em] text-[#9E9E9E]">
                    Current Issue
                  </p>
                  <IssueBadge label={currentIssue.label} />
                </div>

                <h2 className="font-youyou text-4xl text-[#2C2C2C]">
                  {getIssueDisplayTitle(currentIssue)}
                </h2>
              </div>

              <div className="space-y-3 text-sm text-[#7C746D] md:text-right">
                <p>发布时间：{formatDate(currentIssue.publishedAt)}</p>
                <Link
                  href={`/issues/${currentIssue.slug}`}
                  className="inline-flex items-center rounded-full border border-[#D7CCC8] px-5 py-2 transition-all duration-300 hover:bg-[#A1887F] hover:text-white hover:border-[#A1887F] hover:shadow-md hover:-translate-y-[2px]"
                >
                  进入本期
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-youyou text-3xl text-[#2C2C2C]">历史期刊</h2>
            <p className="text-sm text-[#8D8D8D]">{archivedIssues.length} 期已归档</p>
          </div>

          {archivedIssues.length === 0 ? (
            <div className="rounded-[2rem] border border-[#E8E4DF] bg-white/70 px-8 py-14 text-center text-[#8D8D8D]">
              当前还没有旧刊。第二看上线后，第一看会自动进入这里。
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {archivedIssues.map((issue) => (
                <article
                  key={issue.id}
                  className="rounded-[2rem] border border-[#E8E4DF] bg-white/80 p-6"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#A1887F] opacity-60" />
                    <IssueBadge label={issue.label} />
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-youyou text-3xl text-[#2C2C2C]">
                      {getIssueDisplayTitle(issue)}
                    </h3>
                    <p className="text-sm text-[#8D8D8D]">
                      发布时间：{formatDate(issue.publishedAt)}
                    </p>
                  </div>

                  <div className="mt-6">
                    <Link
                      href={`/issues/${issue.slug}`}
                      className="inline-flex items-center rounded-full border border-[#D7CCC8] px-5 py-2 text-sm text-[#7C746D] transition-all duration-300 hover:bg-[#A1887F] hover:text-white hover:border-[#A1887F] hover:shadow-md hover:-translate-y-[2px]"
                    >
                      查看这一期
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
