import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getAuthorArticlesSearchHref } from '@/lib/author-search';
import { searchArticles } from '@/lib/articles';

interface PageProps {
  searchParams: {
    q: string;
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const query = searchParams.q;
  
  if (!query) {
    notFound();
  }
  
  const results = await searchArticles(query);
  
  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar />
      
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-32 md:px-8">
        <Link
          href="/"
          className="group mb-10 inline-flex items-center text-[#9E9E9E] transition-colors hover:text-[#A1887F]"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-serif tracking-widest">返回首页</span>
        </Link>
        
        <header className="mb-16 border-b border-[#DDD6CE] pb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A1887F] opacity-60" />
            <p className="text-xs uppercase tracking-[0.35em] text-[#9E9E9E]">Search Results</p>
          </div>
          
          <h1 className="font-youyou text-4xl text-[#2C2C2C] md:text-5xl">
            搜索结果：&quot;{query}&quot;

          </h1>
          
          <p className="mt-4 text-lg text-[#6C665F]">
            找到 {results.length} 篇相关文章
          </p>
        </header>
        
        {results.length === 0 ? (
  <div className="rounded-[2rem] border border-[#E8E4DF] bg-white/70 px-8 py-14 text-center text-[#8D8D8D]">
    没有找到与 &quot;{query}&quot; 相关的文章
  </div>
) : (
          <div className="space-y-8">
            {results.map((article) => {
              const authorHref = getAuthorArticlesSearchHref(article.author);
              return (
                <div
                  key={article.id}
                  className="rounded-3xl border border-[#E8E4DF] bg-white/80 p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-sm font-medium text-[#A1887F]">{article.category}</span>
                        {article.issue && (
                          <span className="text-xs px-2 py-1 rounded-full bg-[#F7F5F0] text-[#8D8D8D]">
                            {article.issue.label}
                          </span>
                        )}
                      </div>

                      <Link href={`/articles/${article.slug}`} className="group/title block">
                        <h2 className="font-youyou text-2xl text-[#2C2C2C] mb-3 group-hover/title:text-[#A1887F] transition-colors">
                          {article.title}
                        </h2>
                        <p className="text-[#6C665F] mb-4 line-clamp-2">
                          {article.excerpt}
                        </p>
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-2 text-sm text-[#8D8D8D]">
                        <span>
                          作者：
                          {authorHref ? (
                            <Link href={authorHref} className="text-[#8D8D8D] hover:text-[#A1887F] hover:underline underline-offset-4">
                              {article.author}
                            </Link>
                          ) : (
                            article.author
                          )}
                        </span>
                        <span className="mx-1">·</span>
                        <span>{new Date(article.publishedAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
