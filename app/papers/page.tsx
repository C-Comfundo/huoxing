import { redirect } from "next/navigation";
import CategoryStoriesPage from "@/components/CategoryStoriesPage";
import { getArticlesByCategory, getCurrentIssue } from "@/lib/articles";

export const revalidate = 60;

export default async function PapersPage() {
  const currentIssue = await getCurrentIssue();
  const articles = await getArticlesByCategory("把话说尽", 30, {
    issueId: currentIssue?.id ?? null,
  });

  if (articles.length === 1) {
    redirect(`/articles/${encodeURIComponent(articles[0].slug)}`);
  }

  return (
    <CategoryStoriesPage
      title="把话说尽"
      englishTitle="Stated in Full"
      description="适合把论证、推演与来龙去脉都说尽的长文。"
      articles={articles}
      issue={currentIssue}
    />
  );
}
