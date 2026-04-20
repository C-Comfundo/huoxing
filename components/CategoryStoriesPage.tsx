import Link from "next/link";
import type { Article, Issue } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";
import IssueBadge from "@/components/IssueBadge";
import Navbar from "@/components/Navbar";

interface CategoryStoriesPageProps {
  title: string;
  englishTitle: string;
  description: string;
  articles: Article[];
  issue: Issue | null;
}

export default function CategoryStoriesPage({
  title,
  englishTitle,
  description,
  articles,
  issue,
}: CategoryStoriesPageProps) {
  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-32 md:px-8">
        <header className="mb-20 border-b border-[#DDD6CE] pb-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#A1887F] opacity-60" />
                <p className="text-xs uppercase tracking-[0.35em] text-[#9E9E9E]">
                  {englishTitle}
                </p>
                <IssueBadge label={issue?.label} />
              </div>

              <h1 className="font-youyou text-5xl text-[#2C2C2C] md:text-6xl">
                {title}
              </h1>

              <p className="max-w-2xl font-serif text-lg leading-loose text-[#6C665F]">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 md:justify-end">
              {issue ? (
                <Link
                  href={`/issues/${issue.slug}`}
                  className="inline-flex items-center rounded-full border border-[#D7CCC8] px-5 py-2 text-sm text-[#7C746D] transition-colors hover:border-[#A1887F] hover:text-[#A1887F]"
                >
                  返回本期
                </Link>
              ) : null}

              <Link
                href="/issues"
                className="inline-flex items-center rounded-full border border-[#D7CCC8] px-5 py-2 text-sm text-[#7C746D] transition-colors hover:border-[#A1887F] hover:text-[#A1887F]"
              >
                阅读往期
              </Link>
            </div>
          </div>
        </header>

        {articles.length === 0 ? (
          <div className="rounded-[2rem] border border-[#E8E4DF] bg-white/70 px-8 py-14 text-center text-[#8D8D8D]">
            当前刊的这个栏目还没有文章。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-16 gap-y-24 md:grid-cols-2">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} showReadMore />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
