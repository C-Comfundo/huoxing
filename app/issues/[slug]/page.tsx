import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/ArticleCard";
import IssueBadge from "@/components/IssueBadge";
import Navbar from "@/components/Navbar";
import type { Article } from "@/lib/articles";
import {
  getArticlesByIssue,
  getIssueBySlug,
  getIssuePageCategoryHeadingParts,
  groupArticlesByCategory,
} from "@/lib/articles";
import { getIssueDrawingsByIssueId } from "@/lib/issue-drawings";
import { getIssueDisplayTitle } from "@/lib/issue-display";
import { getIssueCredits } from "@/lib/issue-credits";
import IssueCredits from "@/components/IssueCredits";

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

interface PageProps {
  params: {
    slug: string;
  };
}

type ArticleCategoryGroup = [string, Article[]];

interface IssueCategoryRow {
  groups: ArticleCategoryGroup[];
}

function buildIssueCategoryRows(groups: ArticleCategoryGroup[]): IssueCategoryRow[] {
  const rows: IssueCategoryRow[] = [];
  let pendingSingleCardGroups: ArticleCategoryGroup[] = [];

  const flushSingleCardGroups = () => {
    if (pendingSingleCardGroups.length === 0) {
      return;
    }

    rows.push({ groups: pendingSingleCardGroups });
    pendingSingleCardGroups = [];
  };

  for (const group of groups) {
    const [, categoryArticles] = group;

    if (categoryArticles.length === 1) {
      pendingSingleCardGroups.push(group);

      if (pendingSingleCardGroups.length === 2) {
        flushSingleCardGroups();
      }

      continue;
    }

    flushSingleCardGroups();
    rows.push({ groups: [group] });
  }

  flushSingleCardGroups();

  return rows;
}

function IssueCategorySection({
  category,
  categoryArticles,
}: {
  category: string;
  categoryArticles: Article[];
}) {
  const categoryHeading = getIssuePageCategoryHeadingParts(category);
  const cardGridClassName =
    categoryArticles.length > 1
      ? "grid grid-cols-1 gap-x-12 gap-y-20 md:grid-cols-2"
      : "grid grid-cols-1 gap-x-12 gap-y-20";

  return (
    <section id={category} className="scroll-mt-28 space-y-8">
      <div className="flex items-center gap-3 border-b border-[#DDD6CE] pb-4">
        <span className="h-1.5 w-1.5 rounded-full bg-[#A1887F] opacity-60" />
        <h2 className="flex flex-wrap items-end gap-x-2 gap-y-1 text-[#2C2C2C]">
          <span className="font-youyou text-3xl">{categoryHeading.title}</span>
          {categoryHeading.subtitle ? (
            <span className="inline-flex items-end gap-2 pb-0.5 text-[#8A7A73]">
              <span aria-hidden="true" className="text-sm font-serif text-[#B8AAA0]">
                -
              </span>
              <span className="font-note text-base tracking-[0.12em] md:text-lg">
                {categoryHeading.subtitle}
              </span>
            </span>
          ) : null}
        </h2>
        <span className="text-sm text-[#8D8D8D]">{categoryArticles.length} 篇</span>
      </div>

      <div className={cardGridClassName}>
        {categoryArticles.map((article) => (
          <div key={article.id} id={`article-${article.slug}`} className="scroll-mt-32">
            <ArticleCard
              article={article}
              showReadMore
              extendedCategoryLabel
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function IssueDetailPage({ params }: PageProps) {
  const slug = decodeURIComponent(params.slug);
  const issue = await getIssueBySlug(slug);

  if (!issue) {
    notFound();
  }

  const [articles, drawings, credits] = await Promise.all([
    getArticlesByIssue(issue.id),
    getIssueDrawingsByIssueId(issue.id),
    getIssueCredits(issue.id),
  ]);

  // Inject drawings as pseudo-article cards at the end of the list.
  const allArticles: Article[] = [...articles];

  for (const drawing of drawings) {
    const drawingCardAuthor =
      drawing.authorName?.trim() ||
      drawing.authorHandle?.trim() ||
      "星火编辑部";

    allArticles.push({
      id: `drawing-${drawing.id}`,
      slug: `drawing-${drawing.id}`,
      title: drawing.title,
      excerpt: drawing.description ?? "画里话外，点击查看画作。",
      content: "",
      author: drawingCardAuthor,
      category: "画里话外",
      publishedAt: drawing.createdAt ?? new Date().toISOString(),
      viewCount: drawing.viewCount,
      echoCount: drawing.commentCount,
      issue,
      customHref: `/issues/${issue.slug}/drawing`,
    });
  }

  const groups = groupArticlesByCategory(allArticles);
  const categoryRows = buildIssueCategoryRows(groups);

  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-32 md:px-8">
        <header className="mb-16 border-b border-[#DDD6CE] pb-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A1887F] opacity-60" />
            <p className="text-xs uppercase tracking-[0.35em] text-[#9E9E9E]">Issue</p>
            <IssueBadge label={issue.label} />
            {issue.isCurrent ? (
              <span className="inline-flex items-center rounded-full border border-[#E7D7CD] px-3 py-1 text-xs text-[#A1887F]">
                当前刊
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div className="space-y-4">
              <h1 className="font-youyou text-5xl text-[#2C2C2C] md:text-6xl">
                {getIssueDisplayTitle(issue)}
              </h1>
            </div>

            <div className="space-y-3 text-sm text-[#7C746D] md:text-right">
              <p>发布时间：{formatDate(issue.publishedAt)}</p>
              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                <Link
                  href={`/issues/${issue.slug}/debate`}
                  className="inline-flex items-center rounded-full border border-[#D7CCC8] px-5 py-2 transition-colors hover:border-[#A1887F] hover:text-[#A1887F]"
                >
                  进入辩论
                </Link>
                <Link
                  href="/issues"
                  className="inline-flex items-center rounded-full border border-[#D7CCC8] px-5 py-2 transition-colors hover:border-[#A1887F] hover:text-[#A1887F]"
                >
                  返回归档
                </Link>
              </div>
            </div>
          </div>
        </header>

        {groups.length === 0 ? (
          <div className="rounded-[2rem] border border-[#E8E4DF] bg-white/70 px-8 py-14 text-center text-[#8D8D8D]">
            这一期还没有已发布文章。
          </div>
        ) : (
          <div className="space-y-16">
            {categoryRows.map((row) => (
              <div
                key={row.groups.map(([category]) => category).join("-")}
                className={
                  row.groups.length === 2
                    ? "grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-12"
                    : undefined
                }
              >
                {row.groups.map(([category, categoryArticles]) => (
                  <IssueCategorySection
                    key={category}
                    category={category}
                    categoryArticles={categoryArticles}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 制作团队 */}
        <IssueCredits data={credits} />
      </div>
    </main>
  );
}
