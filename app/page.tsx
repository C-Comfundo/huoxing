import Feed from "@/components/Feed";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import { getCurrentIssue } from "@/lib/articles";
import { getDebateTopicTiming, type DebateTopicStatus } from "@/lib/debate-schedule";
import { getDebateTopicSummariesByIssueId } from "@/lib/debates";
import { getIssueTOC } from "@/lib/issue-toc";
import { getPreferredPublicImagePath } from "@/lib/public-assets";

export const revalidate = 60;

export default async function Home() {
  const currentIssue = await getCurrentIssue();
  const nowMs = Date.now();
  const debateTopics = currentIssue
    ? await getDebateTopicSummariesByIssueId(currentIssue.id)
    : [];
  const debateEntries =
    currentIssue && debateTopics.length > 0
      ? debateTopics
          .map((topic) => ({
            href: `/issues/${currentIssue.slug}/debate?topic=${topic.id}`,
            issueLabel: currentIssue.label,
            title: topic.title,
            description: topic.description,
            startsAt: topic.startsAt,
            endsAt: topic.endsAt,
            status:
              topic.startsAt && topic.endsAt
                ? getDebateTopicTiming(topic.startsAt, topic.endsAt, nowMs).status
                : "not_started",
          }))
          .sort((a, b) => {
            const priority: Record<DebateTopicStatus, number> = {
              ongoing: 0,
              not_started: 1,
              ended: 2,
            };
            return priority[a.status] - priority[b.status];
          })
      : [];
  const tocSections = currentIssue
    ? await getIssueTOC(currentIssue.id)
    : [];
  const heroCoverImage = getPreferredPublicImagePath(currentIssue?.coverImage) ?? "/poster.webp";

  return (
    <main className="relative min-h-screen bg-[#F7F5F0]">
      <Navbar />

      <div className="relative z-0 animate-fade-in">
        <div className="relative top-0 flex w-full flex-col justify-start overflow-visible md:sticky md:h-[100svh] md:-z-10 md:overflow-hidden">
          <Hero coverImage={heroCoverImage} />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col rounded-t-[2.5rem] bg-white pb-0 pt-4 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.15)] md:rounded-t-[3rem] md:pt-8">
          <Feed issue={currentIssue} debateEntries={debateEntries} tocSections={tocSections} />

          <footer className="mt-2 border-t border-[#EFEBE9] bg-transparent py-6 text-center text-sm font-light tracking-widest text-[#9E9E9E] md:py-7">
            <p>
              &copy; 2026 {"\u661f\u706b\u3002 \u62d2\u7edd\u51dd\u89c6\uff0c\u70b9\u4eae\u65f7\u91ce\u3002"}
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
