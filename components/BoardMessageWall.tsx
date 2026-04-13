"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { MessageSquareText } from "lucide-react";
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
    <section className="space-y-10">
      <div className="rounded-[2rem] border border-[#E7DDD4] bg-white/80 p-6 shadow-[0_18px_60px_rgba(82,66,54,0.06)] md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-[#F4ECE4] p-3 text-[#A1887F]">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-youyou text-2xl tracking-[0.16em] text-[#3A3A3A]">
              留一句话
            </h2>
            <p className="mt-1 text-sm text-[#8E8178]">
              留言板对所有人开放阅读，只有注册过的成员可以发言。
            </p>
          </div>
        </div>

        {isLoggedIn ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, 300))}
              rows={5}
              placeholder="写一句今天想留下的话，或者和后来的人打个招呼。"
              className="w-full rounded-[1.5rem] border border-[#E6DDD6] bg-[#FCFBF8] px-5 py-4 font-serif text-base leading-8 text-[#423A35] outline-none transition-colors focus:border-[#B89B8C]"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#93867E]">{feedback || "留言会立刻出现在下方。"}</p>
              <div className="flex items-center gap-4">
                <span className={`text-sm ${remaining < 30 ? "text-[#B85C5C]" : "text-[#93867E]"}`}>
                  还可输入 {remaining} 字
                </span>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center rounded-full bg-[#A1887F] px-6 py-3 text-sm font-youyou tracking-[0.16em] text-white transition-colors hover:bg-[#8C6F64] disabled:cursor-not-allowed disabled:bg-[#C8B7B0]"
                >
                  {isPending ? "发送中..." : "发布留言"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[#E2D6CD] bg-[#FBF8F4] px-5 py-6 text-[#7D7068]">
            <p className="font-serif leading-8">
              你可以先看看别人留下的话。想参与留言的话，需要先注册并登录。
            </p>
            <div className="mt-5">
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-[#CDBBB1] px-5 py-2.5 text-sm font-youyou tracking-[0.16em] text-[#5D5D5D] transition-all hover:border-[#A1887F] hover:bg-[#A1887F] hover:text-white"
              >
                去登录
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="rounded-[2rem] border border-[#E7DDD4] bg-white/70 px-6 py-12 text-center text-[#8F837B]">
            还没有人写下第一句话。
          </div>
        ) : (
          messages.map((message, index) => (
            <article
              key={message.id}
              className={`rounded-[1.75rem] border px-6 py-5 shadow-[0_16px_40px_rgba(82,66,54,0.04)] ${
                index % 3 === 0
                  ? "border-[#E7DDD4] bg-[#FFFDFC]"
                  : index % 3 === 1
                    ? "border-[#E4DED8] bg-[#FBF8F4]"
                    : "border-[#E1D7CF] bg-[#F8F4EF]"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3 text-sm text-[#8E8178]">
                <span className="font-youyou tracking-[0.12em] text-[#645850]">
                  {message.authorLabel}
                </span>
                <span>{formatDate(message.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap font-serif text-[1.02rem] leading-8 text-[#38322E]">
                {message.content}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
