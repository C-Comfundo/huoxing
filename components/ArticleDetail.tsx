import Link from "next/link";

import { notFound } from "next/navigation";

import { ArrowLeft, BookOpen } from "lucide-react";

import Navbar from "@/components/Navbar";

import EchoSection from "@/components/EchoSection";

import FavoriteButton from "@/components/FavoriteButton";

import IssueBadge from "@/components/IssueBadge";

import ViewTracker from "@/components/ViewTracker";

import { fetchEchoes } from "@/app/actions/echoes";

import { getFavoriteStatus } from "@/app/actions/favorites";

import { getEchoLikeStatuses } from "@/app/actions/likes";

import { getAuthorArticlesSearchHref } from "@/lib/author-search";
import { getArticleBySlug, getIssueHref } from "@/lib/articles";

import { createClient } from "@/lib/supabase/server";

interface ArticleDetailProps {
  slug: string;
  backHref?: string;
  backLabel?: string;
  fallbackCategory?: string;
  articleId?: string; // 添加 articleId 参数
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

function hasHtmlTags(input: string): boolean {
  return /<[^>]+>/.test(input);
}

function normalizePlainText(input: string): string {
  return input.replace(/\n/g, "\n");
}

export default async function ArticleDetail({
  slug,
  backHref,
  backLabel,
  fallbackCategory = "未分类",
  articleId, // 接收 articleId
}: ArticleDetailProps) {
  const supabase = createClient();
  const [
    article,
    {
      data: { user },
    },
  ] = await Promise.all([getArticleBySlug(slug), supabase.auth.getUser()]);

  if (!article) {
    notFound();
  }

  const echoes = await fetchEchoes(article.id);

  const userId = user?.id ?? null;

  const [{ favorited }, likeStatuses] = await Promise.all([
    user ? getFavoriteStatus(article.id) : Promise.resolve({ favorited: false }),
    getEchoLikeStatuses(echoes.map((e) => e.id), userId),
  ]);

  const category = article.category || fallbackCategory;
  const plainTextContent = normalizePlainText(article.content);
  const shouldUseHtml = hasHtmlTags(article.content);
  const resolvedBackHref = backHref ?? `${getIssueHref(article.issue)}#article-${article.slug}`;
  const resolvedBackLabel = backLabel ?? (article.issue ? "返回本期" : "返回列表");

  const authorArticlesHref = getAuthorArticlesSearchHref(article.author);

  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar articleId={articleId} /> {/* 传递 articleId 给 Navbar */}
      <ViewTracker
        endpoint={`/api/articles/${article.id}/view`}
        storageKey={`viewed:article:${article.id}`}
      />
      <article className="mx-auto max-w-3xl animate-fade-in px-4 pb-24 pt-24 md:pt-32 md:px-8">
        <Link
          href={resolvedBackHref}
          className="group mb-12 inline-flex items-center text-[#9E9E9E] transition-colors hover:text-[#A1887F]"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-serif tracking-widest">{resolvedBackLabel}</span>
        </Link>

        <header className="mb-10 md:mb-16 space-y-6 text-center">
          <div className="flex items-center justify-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-[#A1887F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A1887F] opacity-60" />
            <span>{category}</span>
            <IssueBadge label={article.issue?.label} />
          </div>

          <h1 className="font-youyou text-4xl leading-tight text-[#2C2C2C] md:text-5xl lg:text-6xl">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-sm font-serif italic text-[#9E9E9E]">
            <span className="inline-flex items-center gap-1">
              <span>作者：</span>
              {authorArticlesHref ? (
                <Link
                  href={authorArticlesHref}
                  className="italic text-[#9E9E9E] transition-colors hover:text-[#A1887F] hover:underline underline-offset-4"
                >
                  {article.author}
                </Link>
              ) : (
                <span>{article.author}</span>
              )}
            </span>
            <span className="h-1 w-1 rounded-full bg-[#D7CCC8]" />
            <span>{formatDate(article.publishedAt)}</span>
            <span className="h-1 w-1 rounded-full bg-[#D7CCC8]" />
            <span className="inline-flex items-center gap-2 not-italic">
              <BookOpen className="h-4 w-4 opacity-60" aria-hidden="true" />
              <span>{article.viewCount}</span>
            </span>
            <FavoriteButton articleId={article.id} initialFavorited={favorited} />
          </div>
        </header>

        {shouldUseHtml ? (
          <div
            className="prose prose-stone mx-auto md:prose-lg font-serif leading-loose text-[#3A3A3A]
              prose-p:mb-8 prose-headings:font-youyou prose-headings:text-[#2C2C2C]
              prose-a:text-[#A1887F] prose-a:no-underline hover:prose-a:text-[#8D6E63]
              prose-blockquote:border-l-[#D7CCC8] prose-blockquote:text-[#757575] prose-blockquote:italic
              prose-strong:font-normal prose-strong:text-[#5D5D5D]"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : (
          <div className="mx-auto whitespace-pre-wrap break-words font-serif text-base md:text-lg leading-loose text-[#3A3A3A]">
            {plainTextContent}
          </div>
        )}

        {article.issue ? (
          <div className="mt-12 flex justify-center">
            <Link
              href={`${getIssueHref(article.issue)}#article-${article.slug}`}
              className="inline-flex items-center rounded-full border border-[#D7CCC8] px-5 py-2 text-sm text-[#7C746D] transition-colors hover:border-[#A1887F] hover:text-[#A1887F]"
            >
              返回 {article.issue.label} 专题页
            </Link>
          </div>
        ) : null}

        <EchoSection
          articleId={article.id}
          currentUserId={userId}
          isLoggedIn={Boolean(user)}
          initialEchoes={echoes}
          initialLikeStatuses={likeStatuses}
        />

        <div className="mt-16 border-t border-[#D7CCC8]/30 pt-10 text-center">
          <div className="mx-auto mb-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#EFEBE9]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A1887F]" />
          </div>
          <p className="font-youyou text-lg tracking-widest text-[#A1887F] opacity-80">
            星火 · {article.issue?.label ? `${article.issue.label} · ` : ""}
            {category}
          </p>
        </div>
      </article>
    </main>
  );
}
