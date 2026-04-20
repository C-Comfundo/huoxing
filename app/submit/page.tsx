import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PenSquare } from "lucide-react";
import Navbar from "@/components/Navbar";
import SubmissionForm from "@/components/submit/submission-form";
import { getEditorialRecipientList } from "@/lib/resend";

export const metadata: Metadata = {
  title: "在线投稿 | 星火",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SubmitPage() {
  const submissionRecipients = getEditorialRecipientList();

  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-32 md:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#5D5D5D] transition-colors hover:text-[#A1887F]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-youyou">返回首页</span>
          </Link>
        </div>

        <div className="rounded-[2rem] border border-[#E8E4DF] bg-white/70 px-6 py-8 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.18)] backdrop-blur-sm md:px-10 md:py-10">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm tracking-[0.25em] text-[#A1887F]">ONLINE SUBMISSION</p>
              <h1 className="font-youyou text-4xl text-[#3A3A3A] md:text-5xl">
                在线投稿
              </h1>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[#E8E4DF] bg-[#F7F5F0] px-4 py-3 text-sm text-[#5D5D5D]">
              <PenSquare className="h-4 w-4 text-[#A1887F]" />
              <span>支持 DOC / DOCX / TXT</span>
            </div>
          </div>

          <SubmissionForm
            submissionEmailHref={submissionRecipients.join(",")}
            submissionEmailLabel={submissionRecipients.join(", ")}
          />
        </div>
      </div>
    </main>
  );
}
