"use client";

import { useState, useTransition } from "react";

import { Heart, MessageSquare } from "lucide-react";

import { submitEcho, type Echo } from "@/app/actions/echoes";

import { toggleEchoLike } from "@/app/actions/likes";

interface EchoSectionProps {
  articleId: string;
  isLoggedIn: boolean;
  initialEchoes: Echo[];
  initialLikeStatuses: Record<string, { count: number; liked: boolean }>;
}

function formatDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function EchoSection({
  articleId,
  isLoggedIn,
  initialEchoes,
  initialLikeStatuses,
}: EchoSectionProps) {
  const [echoes, setEchoes] = useState(initialEchoes);
  const [likeStatuses, setLikeStatuses] = useState(initialLikeStatuses);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [isPending, startTransition] = useTransition();

  const publish = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setMessage("请写下回音内容后再发布");
      return;
    }
    setMessage("");
    startTransition(async () => {
      const result = await submitEcho({
        articleId,
        content: trimmed,
        isAnonymous: anonymous,
      });
      if (!result.success || !result.echo) {
        setMessage(result.message);
        return;
      }
      setEchoes((prev) => [...prev, result.echo!]);
      setContent("");
      setAnonymous(false);
      setMessage(result.message);
    });
  };

  const handleLike = (echoId: string) => {
    if (!isLoggedIn) {
      alert("请先登录后再点赞");
      return;
    }
    startTransition(async () => {
      const result = await toggleEchoLike(echoId);
      if (result.success && result.liked !== undefined) {
        setLikeStatuses((prev) => ({
          ...prev,
          [echoId]: {
            count: result.liked
              ? (prev[echoId]?.count ?? 0) + 1
              : (prev[echoId]?.count ?? 1) - 1,
            liked: result.liked!,
          },
        }));
      }
    });
  };

  return (
    <section className="mt-20 border-t border-[#D7CCC8]/40 pt-12">
      <div className="mb-8 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-[#A1887F]" />
        <h2 className="font-youyou text-2xl tracking-widest text-[#3A3A3A]">
          Echoes 回响
        </h2>
      </div>

      {isLoggedIn ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            publish();
          }}
          className="space-y-4 rounded-sm border border-[#EFEBE9] bg-[#FAF9F6] p-5"
        >
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="写下你的回音..."
            rows={4}
            className="w-full resize-y border border-[#E0DAD6] bg-white px-3 py-2 text-sm leading-7 focus:border-[#A1887F] focus:outline-none"
            required
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#9E9E9E]">{message}</p>
            <div className="ml-auto flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-[#6A6A6A]">匿名发布</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={anonymous}
                  aria-label="匿名发布"
                  disabled={isPending}
                  onClick={() => setAnonymous((v) => !v)}
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A1887F]/50 disabled:opacity-50 ${anonymous
                      ? "border-[#A1887F] bg-[#A1887F]"
                      : "border-[#D7CCC8] bg-white"
                    }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200 ${anonymous ? "left-5" : "left-0.5"
                      }`}
                  />
                </button>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="border border-[#A1887F] px-4 py-2 text-xs tracking-widest text-[#A1887F] transition-colors hover:bg-[#A1887F] hover:text-white disabled:opacity-60"
              >
                {isPending ? "发送中..." : "发送回音"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="rounded-sm border border-[#EFEBE9] bg-[#FAF9F6] p-5 text-sm text-[#8D8D8D]">
          请先点亮身份，再留下你的星火。
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {echoes.length === 0 ? (
          <p className="text-sm text-[#9E9E9E] md:col-span-2">
            旷野安静，等待第一声回响。
          </p>
        ) : (
          echoes.map((echo, index) => (
            <article
              id={`echo-${echo.id}`}
              key={echo.id}
              className={`rounded-sm border p-5 ${index % 3 === 0
                  ? "border-[#E8E0D8] bg-[#FDFCF9]"
                  : index % 3 === 1
                    ? "border-[#E3DDD8] bg-[#FAF8F5]"
                    : "border-[#DDD6CE] bg-[#F7F5F0]"
                }`}
            >
              <div className="mb-3 flex items-center justify-between text-xs text-[#9E9E9E]">
                <span className="text-[#6A6A6A]">{echo.authorLabel}</span>
                <span>{formatDate(echo.createdAt)}</span>
              </div>

              <p className="whitespace-pre-wrap font-serif text-[15px] leading-7 text-[#3A3A3A]">
                {echo.content}
              </p>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleLike(echo.id)}
                  disabled={isPending}
                  aria-label={
                    likeStatuses[echo.id]?.liked ? "取消点赞" : "点赞"
                  }
                  className="inline-flex items-center gap-1.5 text-xs text-[#9E9E9E] transition-colors hover:text-[#A1887F] disabled:opacity-50"
                >
                  <Heart
                    className={`h-3.5 w-3.5 transition-all duration-200 ${likeStatuses[echo.id]?.liked
                        ? "fill-[#A1887F] text-[#A1887F]"
                        : "fill-none"
                      }`}
                  />
                  <span>{likeStatuses[echo.id]?.count ?? 0}</span>
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
