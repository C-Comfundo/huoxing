import ArticleDetail from "@/components/ArticleDetail";

interface PageProps {
  params: {
    slug: string;
  };
  searchParams?: {
    articleId?: string;
  };
}

export default function ArticlePage({ params, searchParams }: PageProps) {
  const slug = decodeURIComponent(params.slug);
  const articleId = searchParams?.articleId;
  return <ArticleDetail slug={slug} articleId={articleId} />;
}
