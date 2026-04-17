"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { MessageSquare, Send } from "lucide-react";
import { submitBoardMessage } from "@/app/actions/board";
import type { BoardMessage } from "@/lib/board-messages";

interface BoardMessageWallProps {
  initialMessages: BoardMessage[];
  isLoggedIn: boolean;
}

function formatDate(input: string) {
  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function BoardMessageWall({
  initialMessages,
  isLoggedIn,
}: BoardMessageWallProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const remaining = useMemo(() => 300 - content.length, [content.length]);

  const handleSubmit = () => {
    const trimmed = content.trim();

    if (!trimmed) {
      setFeedback("请先写一点什么。");
      return;
    }

    setFeedback("");

    startTransition(async () => {
      const result = await submitBoardMessage(trimmed);

      if (!result.success || !result.boardMessage) {
        setFeedback(result.message);
        return;
      }

      setMessages((prev) => [result.boardMessage!, ...prev]);
      setContent("");
      setFeedback(result.message);
    });
  };

  return (
    <section className="mt-10 border-t border-[#D7CCC8]/40 pt-10">
      <div className="mb-6 flex items-center gap-3">
        <MessageSquare className="h-4 w-4 text-[#A1887F]" />
        <h2 className="font-youyou text-xl tracking-widest text-[#3A3A3A]">
          留言
        </h2>
        {messages.length > 0 && (
          <span className="text-xs text-[#9E9E9E]">{messages.length}</span>
        )}
      </div>

      <div className="space-y-0 divide-y divide-[#E8E4DF]/60">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#9E9E9E]">
            还没有人写下第一句话。
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="group py-4 first:pt-0"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[13px] font-medium text-[#5D5D5D]">
                  {message.authorLabel}
                </span>
                <span className="shrink-0 text-[11px] text-[#B0B0B0]">
                  {formatDate(message.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap font-serif text-[15px] leading-7 text-[#3A3A3A]">
                {message.content}
              </p>
            </div>
          ))
        )}
      </div>

      {isLoggedIn ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className="mt-6 flex items-center gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, 300))}
              placeholder="写一句今天想留下的话..."
              className="w-full rounded-full border border-[#E0DAD6] bg-white py-2.5 pl-4 pr-12 text-sm text-[#3A3A3A] transition-colors focus:border-[#A1887F] focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isPending}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#A1887F] transition-colors hover:bg-[#F4EFEA] disabled:opacity-50"
              aria-label="发布留言"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <span className={`shrink-0 text-[11px] ${remaining < 30 ? "text-[#B85C5C]" : "text-[#B0B0B0]"}`}>
            {remaining}
          </span>
        </form>
      ) : (
        <p className="mt-6 text-center text-sm text-[#9E9E9E]">
          请先<Link href="/login" className="text-[#A1887F] hover:text-[#8D6E63]">登录</Link>，再留下你的一句话。
        </p>
      )}

      {feedback && (
        <p className="mt-2 text-center text-xs text-[#9E9E9E]">{feedback}</p>
      )}
    </section>
  );
}
