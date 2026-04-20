"use client";

import { useState, useTransition } from "react";
import { Heart, MessageSquare, Send } from "lucide-react";
import {
  submitDrawingComment,
  toggleDrawingCommentLike,
  type DrawingComment,
} from "@/app/actions/drawing-comments";

interface DrawingCommentSectionProps {
  issueId: string;
  issueSlug: string;
  drawingId: string;
  isLoggedIn: boolean;
  initialComments: DrawingComment[];
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

export default function DrawingCommentSection({
  issueId,
  issueSlug,
  drawingId,
  isLoggedIn,
  initialComments,
}: DrawingCommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [isPending, startTransition] = useTransition();

  const publish = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setMessage("请写下留言内容后再发布");
      return;
    }

    setMessage("");

    startTransition(async () => {
      const result = await submitDrawingComment({
        issueId,
        issueSlug,
        drawingId,
        content: trimmed,
        isAnonymous: anonymous,
      });

      if (!result.success || !result.comment) {
        setMessage(result.message);
        return;
      }

      setComments((prev) => [...prev, result.comment!]);
      setContent("");
      setAnonymous(false);
      setMessage(result.message);
    });
  };

  const handleLike = (commentId: string) => {
    if (!isLoggedIn) {
      alert("请先登录后再点赞");
      return;
    }

    startTransition(async () => {
      const result = await toggleDrawingCommentLike({
        commentId,
        issueSlug,
      });

      if (!result.success || result.liked === undefined) {
        setMessage(result.message);
        return;
      }

      setComments((prev) =>
        prev.map((item) =>
          item.id === commentId
            ? {
                ...item,
                likeCount: result.liked
                  ? item.likeCount + 1
                  : Math.max(0, item.likeCount - 1),
                likedByViewer: result.liked ?? false,
              }
            : item
        )
      );
      setMessage(result.message);
    });
  };

  return (
    <section className="mt-10 border-t border-[#D7CCC8]/40 pt-10">
      <div className="mb-6 flex items-center gap-3">
        <MessageSquare className="h-4 w-4 text-[#A1887F]" />
        <h2 className="font-youyou text-xl tracking-widest text-[#3A3A3A]">
          留言
        </h2>
        {comments.length > 0 && (
          <span className="text-xs text-[#9E9E9E]">{comments.length}</span>
        )}
      </div>

      <div className="space-y-0 divide-y divide-[#E8E4DF]/60">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#9E9E9E]">
            旷野安静，等待第一条留言。
          </p>
        ) : (
          comments.map((item) => (
            <div
              id={`drawing-comment-${item.id}`}
              key={item.id}
              className="group py-4 first:pt-0"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[13px] font-medium text-[#5D5D5D]">
                  {item.authorLabel}
                </span>
                <span className="shrink-0 text-[11px] text-[#B0B0B0]">
                  {formatDate(item.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap font-serif text-[15px] leading-7 text-[#3A3A3A]">
                {item.content}
              </p>
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleLike(item.id)}
                  disabled={isPending}
                  aria-label={item.likedByViewer ? "取消点赞" : "点赞"}
                  className="inline-flex items-center gap-1 text-[11px] text-[#B0B0B0] transition-colors hover:text-[#A1887F] disabled:opacity-50"
                >
                  <Heart
                    className={`h-3 w-3 transition-all duration-200 ${
                      item.likedByViewer
                        ? "fill-[#A1887F] text-[#A1887F]"
                        : "fill-none"
                    }`}
                  />
                  {item.likeCount > 0 && <span>{item.likeCount}</span>}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isLoggedIn ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            publish();
          }}
          className="mt-6 flex items-center gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="写下你的留言..."
              className="w-full rounded-full border border-[#E0DAD6] bg-white py-2.5 pl-4 pr-12 text-sm text-[#3A3A3A] transition-colors focus:border-[#A1887F] focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isPending}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#A1887F] transition-colors hover:bg-[#F4EFEA] disabled:opacity-50"
              aria-label="发送留言"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAnonymous((v) => !v)}
            disabled={isPending}
            className={`shrink-0 rounded-full border px-3 py-2 text-[11px] transition-colors ${
              anonymous
                ? "border-[#A1887F] bg-[#A1887F] text-white"
                : "border-[#D7CCC8] text-[#9E9E9E] hover:border-[#A1887F] hover:text-[#A1887F]"
            }`}
          >
            匿名
          </button>
        </form>
      ) : (
        <p className="mt-6 text-center text-sm text-[#9E9E9E]">
          请先点亮身份，再留下你的星火。
        </p>
      )}

      {message && (
        <p className="mt-2 text-center text-xs text-[#9E9E9E]">{message}</p>
      )}
    </section>
  );
}
