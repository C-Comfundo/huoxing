import ArticleDetail from "@/components/ArticleDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export default function SlowTalkArticlePage({ params }: PageProps) {
  const slug = decodeURIComponent(params.id);

  return <ArticleDetail slug={slug} backHref="/slow-talk" fallbackCategory="有话慢谈" />;
}
