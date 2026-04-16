import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import DrawingCommentSection from "@/components/drawing/DrawingCommentSection";
import DrawingImageSwiper from "@/components/drawing/DrawingImageSwiper";
import Navbar from "@/components/Navbar";
import ViewTracker from "@/components/ViewTracker";
import { fetchDrawingComments } from "@/app/actions/drawing-comments";
import { getIssueBySlug } from "@/lib/articles";
import { getIssueDrawingsByIssueId } from "@/lib/issue-drawings";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function IssueDrawingPage({ params }: PageProps) {
  const slug = decodeURIComponent(params.slug);
  const issue = await getIssueBySlug(slug);

  if (!issue) {
    notFound();
  }

  const drawings = await getIssueDrawingsByIssueId(issue.id);

  if (drawings.length === 0) {
    notFound();
  }

  const supabase = createClient();
  const [
    {
      data: { user },
    },
    ...allComments
  ] = await Promise.all([
    supabase.auth.getUser(),
    ...drawings.map((d) => fetchDrawingComments(d.id)),
  ]);

  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar />
      <ViewTracker
        endpoint={`/api/issue-drawings/${drawings[0].id}/view`}
        storageKey={`viewed:drawing:${drawings[0].id}`}
      />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-24 md:px-8 md:pt-32">
        <Link
          href={`/issues/${issue.slug}`}
          className="group mb-10 inline-flex items-center text-[#9E9E9E] transition-colors hover:text-[#A1887F]"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-serif tracking-widest">返回本期</span>
        </Link>

        {drawings.map((drawing, index) => (
          <div key={drawing.id} className={index > 0 ? "mt-16 border-t border-[#D7CCC8]/40 pt-16" : ""}>
            <div className="mb-8 space-y-8">
              <header className="space-y-2">
                <h2 className="font-youyou text-2xl leading-snug text-[#2C2C2C] md:text-3xl lg:text-[2rem]">
                  {drawing.title}
                </h2>
                {drawing.authorName || drawing.authorHandle ? (
                  <div className="space-y-1 text-sm text-[#9E9E9E] md:text-[0.95rem]">
                    {drawing.authorName ? <p>作者：{drawing.authorName}</p> : null}
                    {drawing.authorHandle ? <p>小红书ID：{drawing.authorHandle}</p> : null}
                  </div>
                ) : null}
                {drawing.description ? (
                  <p className="max-w-3xl text-sm leading-7 text-[#6C665F] md:text-base">
                    {drawing.description}
                  </p>
                ) : null}
              </header>
              <DrawingImageSwiper
                images={drawing.images.map((image) => ({
                  src: image.imageUrl,
                  alt: image.altText,
                  caption: image.caption,
                }))}
                altPrefix={drawing.title}
              />
            </div>

            <DrawingCommentSection
              issueId={issue.id}
              issueSlug={issue.slug}
              drawingId={drawing.id}
              isLoggedIn={Boolean(user)}
              initialComments={allComments[index] as import("@/app/actions/drawing-comments").DrawingComment[]}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
