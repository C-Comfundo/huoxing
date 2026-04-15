import Link from "next/link";
import type { Issue } from "@/lib/articles";
import type { DebateTopicStatus } from "@/lib/debate-schedule";
import type { TOCSection } from "@/lib/issue-toc";
import HomeDebateEntryRail from "@/components/debate/HomeDebateEntryRail";
import IssueBadge from "@/components/IssueBadge";
import IssueTOC from "@/components/IssueTOC";
import IssueCredits from "@/components/IssueCredits";
import { getIssueDisplayTitle } from "@/lib/issue-display";

interface FeedProps {
  issue?: Issue | null;
  debateEntries?: Array<{
    href: string;
    issueLabel?: string | null;
    title: string;
    description?: string | null;
    startsAt: string | null;
    endsAt: string | null;
    status: DebateTopicStatus;
  }>;
  tocSections?: TOCSection[];
}


export default function Feed({ issue = null, debateEntries = [], tocSections = [] }: FeedProps) {
  return (
    <section className="bg-white/0 px-6 pb-4 pt-6 md:px-12 md:pb-8 md:pt-10 lg:px-24 lg:pb-10 lg:pt-12">
      <div className="mx-auto max-w-7xl">
        <div className="border-b border-[#E3D8D0]/60 pb-10 md:pb-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-5 md:space-y-6">
              <div className="flex items-center gap-4 opacity-0 animate-[fadeInUp_0.8s_ease-out_forwards]">
                <span className="h-2 w-2 rounded-full bg-[#CFAF9D] shadow-[0_0_10px_rgba(207,175,157,0.5)]" />
                <p className="text-xs font-medium uppercase tracking-[0.4em] text-[#9C7D71]">
                  Current Issue
                </p>
                <IssueBadge label={issue?.label} />
              </div>

              <h2 className="font-youyou text-4xl font-bold leading-none text-[#26211E] opacity-0 animate-[fadeInUp_0.8s_ease-out_0.2s_forwards] md:text-5xl xl:text-[3.5rem]">
                {getIssueDisplayTitle(issue)}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-4 pb-2 text-sm text-[#7C746D] opacity-0 animate-[fadeInUp_0.8s_ease-out_0.4s_forwards] md:justify-end">
              {issue ? (
                <Link
                  href={`/issues/${issue.slug}`}
                  className="inline-flex items-center rounded-full border border-[#D7CCC8] px-6 py-2.5 transition-all duration-300 hover:-translate-y-[2px] hover:border-[#A1887F] hover:bg-[#A1887F] hover:text-white hover:shadow-[0_8px_20px_rgba(161,136,127,0.3)]"
                >
                  {"\u67e5\u770b\u672c\u671f"}
                </Link>
              ) : null}

              <Link
                href="/issues"
                className="inline-flex items-center rounded-full border border-[#D7CCC8] px-6 py-2.5 transition-all duration-300 hover:-translate-y-[2px] hover:border-[#A1887F] hover:bg-[#A1887F] hover:text-white hover:shadow-[0_8px_20px_rgba(161,136,127,0.3)]"
              >
                {"\u5f80\u671f\u5f52\u6863"}
              </Link>
            </div>
          </div>
        </div>

        {debateEntries.length > 0 ? (
          <div className="pt-8 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.55s_forwards] md:pt-10">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#CFAF9D] shadow-[0_0_10px_rgba(207,175,157,0.45)]" />
              <p className="text-xs font-medium uppercase tracking-[0.36em] text-[#9C7D71]">
                Recent Events
              </p>
              <span className="text-xs tracking-[0.18em] text-[#B49B8C]">
                {"\u8fd1\u671f\u6d3b\u52a8"}
              </span>
            </div>

            <HomeDebateEntryRail entries={debateEntries} />
          </div>
        ) : null}

        {tocSections.length > 0 ? (
          <div className="border-t border-[#EEE4D8] pt-10 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.7s_forwards] md:pt-12 pb-8">
            <IssueTOC sections={tocSections} issueLabel={issue?.label} />
            {issue?.slug && <IssueCredits issueSlug={issue.slug} />}
          </div>
        ) : null}
      </div>
    </section>
  );
}
