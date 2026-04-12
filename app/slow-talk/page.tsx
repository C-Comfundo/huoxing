import { redirect } from "next/navigation";
import CategoryStoriesPage from "@/components/CategoryStoriesPage";
import { getArticlesByCategory, getCurrentIssue } from "@/lib/articles";

export const revalidate = 60;

export default async function SlowTalkPage() {
  const currentIssue = await getCurrentIssue();
  const articles = await getArticlesByCategory("有话慢谈", 30, {
    issueId: currentIssue?.id ?? null,
  });

  if (articles.length === 1) {
    redirect(`/articles/${encodeURIComponent(articles[0].slug)}`);
  }

  return (
    <CategoryStoriesPage
      title="有话慢谈"
      englishTitle="Slow Talks"
      description="那些需要缓慢展开、被认真倾听的表达。"
      articles={articles}
      issue={currentIssue}
    />
  );
}
