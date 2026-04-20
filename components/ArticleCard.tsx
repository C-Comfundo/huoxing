import Link from "next/link";
import { ArrowRight, BookOpen, MessageCircle } from "lucide-react";
import type { Article } from "@/lib/articles";
import { getAuthorArticlesSearchHref } from "@/lib/author-search";
import { getIssuePageCategoryHeading } from "@/lib/articles";
import IssueBadge from "@/components/IssueBadge";

interface ArticleCardProps {
  article: Article;
  showReadMore?: boolean;
  /** 为 true 时顶栏栏目名与期刊页分栏标题一致（如 有话慢谈-随笔） */
  extendedCategoryLabel?: boolean;
}

function formatDate(input: string): string {
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

export default function ArticleCard({
  article,
  showReadMore = false,
  extendedCategoryLabel = false,
}: ArticleCardProps) {
  const categoryLabel = extendedCategoryLabel
    ? getIssuePageCategoryHeading(article.category)
    : article.category;

  const authorArticlesHref = getAuthorArticlesSearchHref(article.author);

  return (
    <article className="group relative flex flex-col gap-8 rounded-3xl p-6 md:p-8 -mx-6 md:-mx-8 transition-all duration-700 hover:bg-[#FDFCF9] hover:shadow-[0_20px_60px_rgba(0,0,0,0.03)] hover:-translate-y-2 ring-1 ring-transparent hover:ring-[#E3D8D0]/40">
      <div className="flex items-center justify-between border-b border-[#E3D8D0]/40 pb-4 text-xs font-medium uppercase tracking-[0.3em] text-[#9E9E9E]">
        <div className="flex items-center gap-4">
          <span className="h-1.5 w-1.5 rounded-full bg-[#CFAF9D] shadow-sm transform group-hover:scale-150 transition-transform duration-500" />
          <span className="text-[#A58B7E] tracking-[0.4em]">{categoryLabel}</span>
          <IssueBadge label={article.issue?.label} />
        </div>
        <span className="font-serif tracking-[0.1em]">{formatDate(article.publishedAt)}</span>
      </div>

      <div className="space-y-6">
        <h2 className="flex items-start justify-between gap-6 font-youyou text-[1.75rem] md:text-[2.25rem] lg:text-[2.5rem] leading-[1.3] text-[#2C2C2C] transition-colors duration-500 group-hover:text-[#A1887F]">
          <Link href={`${article.customHref ?? `/articles/${article.slug}`}`} className="before:absolute before:inset-0">
            {article.title}
          </Link>
          <span className="inline-flex shrink-0 items-center gap-4 text-sm font-serif text-[#9E9E9E] translate-y-2">
            <span className="inline-flex items-center gap-2">
              <BookOpen className="h-4 w-4 opacity-60" aria-hidden="true" />
              <span className="tracking-wider">{article.viewCount}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="h-4 w-4 opacity-60" aria-hidden="true" />
              <span className="tracking-wider">{article.echoCount}</span>
            </span>
          </span>
        </h2>

        <Link
          href={`/articles/${article.slug}`}
          className="line-clamp-3 block cursor-pointer font-serif text-lg md:text-xl leading-[2] text-[#5A504A] opacity-80 transition-colors duration-500 hover:text-[#A1887F] group-hover:opacity-100"
        >
          {article.excerpt}
        </Link>
      </div>

      <div className="relative z-10 flex items-center justify-between pt-4 mt-auto">
        <span className="text-sm font-serif italic text-[#8A7A73] tracking-[0.1em]">
          作者：
          {authorArticlesHref ? (
            <Link
              href={authorArticlesHref}
              className="font-medium text-[#5A504A] transition-colors hover:text-[#A1887F] hover:underline underline-offset-4"
            >
              {article.author}
            </Link>
          ) : (
            <span className="font-medium text-[#5A504A]">{article.author}</span>
          )}
        </span>

        {showReadMore ? (
          <Link
            href={`${article.customHref ?? `/articles/${article.slug}`}`}
            className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#A1887F] opacity-0 -translate-x-4 transition-all duration-700 group-hover:translate-x-0 group-hover:opacity-100 z-10"
          >
            <span>阅读全文</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
