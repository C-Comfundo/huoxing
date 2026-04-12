import ArticleDetail from "@/components/ArticleDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export default function PapersArticlePage({ params }: PageProps) {
  const slug = decodeURIComponent(params.id);

  return <ArticleDetail slug={slug} backHref="/papers" fallbackCategory="把话说尽" />;
}
