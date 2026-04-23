"use client";

import { useState, useTransition } from "react";

import {
  CornerDownRight,
  Heart,
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";

import { submitEcho, type Echo } from "@/app/actions/echoes";
import { deleteEcho } from "@/app/actions/echo-delete";
import { toggleEchoLike } from "@/app/actions/likes";

interface EchoSectionProps {
  articleId: string;
  currentUserId: string | null;
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
  currentUserId,
  isLoggedIn,
  initialEchoes,
  initialLikeStatuses,
}: EchoSectionProps) {
  const [echoes, setEchoes] = useState(initialEchoes);
  const [likeStatuses, setLikeStatuses] = useState(initialLikeStatuses);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [likeToastId, setLikeToastId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const topEchoes = echoes.filter((echo) => !echo.rootId);
  const replyMap = new Map<string, Echo[]>();

  for (const echo of echoes) {
    if (!echo.rootId) {
      continue;
    }

    const replies = replyMap.get(echo.rootId) ?? [];
    replies.push(echo);
    replyMap.set(echo.rootId, replies);
  }

  const publishTop = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setMessage("请写下回响内容后再发布");
      return;
    }

    setMessage("");

    startTransition(async () => {
      const result = await submitEcho({
        articleId,
        content: trimmed,
        isAnonymous: anonymous,
      });
      const echo = result.echo;

      if (!result.success || !echo) {
        setMessage(result.message);
        return;
      }

      setEchoes((prev) => [...prev, echo]);
      setContent("");
      setAnonymous(false);
      setMessage(result.message);
    });
  };

  const publishReply = (parentId: string) => {
    const trimmed = replyContent.trim();
    if (!trimmed) {
      setReplyMessage("请写下回复内容后再发布");
      return;
    }

    setReplyMessage("");

    startTransition(async () => {
      const result = await submitEcho({
        articleId,
        content: trimmed,
        isAnonymous: replyAnonymous,
        parentId,
      });
      const echo = result.echo;

      if (!result.success || !echo) {
        setReplyMessage(result.message);
        return;
      }

      setEchoes((prev) => [...prev, echo]);
      setReplyContent("");
      setReplyAnonymous(false);
      setReplyingTo(null);
      setReplyMessage(result.message);
    });
  };

  const handleLike = (echoId: string) => {
    if (!isLoggedIn) {
      alert("请先登录后再点赞");
      return;
    }

    startTransition(async () => {
      const result = await toggleEchoLike(echoId);
      const liked = result.liked;

      if (result.success && liked !== undefined) {
        setLikeStatuses((prev) => ({
          ...prev,
          [echoId]: {
            count: liked
              ? (prev[echoId]?.count ?? 0) + 1
              : (prev[echoId]?.count ?? 1) - 1,
            liked,
          },
        }));

        if (liked) {
          setLikeToastId(echoId);
          setTimeout(() => {
            setLikeToastId((current) => (current === echoId ? null : current));
          }, 1800);
        }
      }
    });
  };

  const openReply = (echoId: string) => {
    if (!isLoggedIn) {
      alert("请先登录后再回复");
      return;
    }

    setReplyingTo(echoId);
    setReplyContent("");
    setReplyAnonymous(false);
    setReplyMessage("");
  };

  const handleDelete = (echoId: string) => {
    if (!currentUserId) {
      setMessage("请先登录后再删除。");
      return;
    }

    if (!window.confirm("确定删除这条回响吗？")) {
      return;
    }

    const target = echoes.find((echo) => echo.id === echoId);
    if (!target) {
      return;
    }

    const removedIds = new Set<string>([echoId]);
    if (!target.rootId) {
      for (const echo of echoes) {
        if (echo.rootId === echoId) {
          removedIds.add(echo.id);
        }
      }
    }

    startTransition(async () => {
      const result = await deleteEcho({ echoId });

      if (!result.success) {
        setMessage(result.message);
        return;
      }

      setEchoes((prev) =>
        prev
          .filter((echo) => !removedIds.has(echo.id))
          .map((echo) =>
            target.rootId && echo.parentId === echoId
              ? { ...echo, parentId: null }
              : echo
          )
      );

      setLikeStatuses((prev) => {
        const next = { ...prev };
        for (const removedId of Array.from(removedIds)) {
          delete next[removedId];
        }
        return next;
      });

      setReplyingTo((prev) => (prev && removedIds.has(prev) ? null : prev));
      setReplyContent("");
      setReplyAnonymous(false);
      setReplyMessage("");
      setMessage(result.message);
    });
  };

  const renderEchoItem = (echo: Echo, isReply: boolean) => (
    <div
      id={`echo-${echo.id}`}
      key={echo.id}
      className={isReply ? "border-l-2 border-[#E8E4DF] pl-6" : undefined}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] font-medium text-[#5D5D5D]">
          {isReply ? (
            <CornerDownRight className="mr-1 inline h-3 w-3 text-[#B0B0B0]" />
          ) : null}
          {echo.authorLabel}
        </span>
        <span className="shrink-0 text-[11px] text-[#B0B0B0]">
          {formatDate(echo.createdAt)}
        </span>
      </div>

      <p className="mt-1.5 whitespace-pre-wrap font-serif text-[15px] leading-7 text-[#3A3A3A]">
        {echo.content}
      </p>

      <div className="mt-1.5 flex justify-end gap-3">
        <span className="relative inline-flex items-center">
          <button
            type="button"
            onClick={() => handleLike(echo.id)}
            disabled={isPending}
            aria-label={likeStatuses[echo.id]?.liked ? "取消点赞" : "点赞"}
            className="inline-flex items-center gap-1 text-[11px] text-[#B0B0B0] transition-colors hover:text-[#A1887F] disabled:opacity-50"
          >
            <Heart
              className={`h-3 w-3 transition-all duration-200 ${
                likeStatuses[echo.id]?.liked
                  ? "fill-[#A1887F] text-[#A1887F]"
                  : "fill-none"
              }`}
            />
            {(likeStatuses[echo.id]?.count ?? 0) > 0 ? (
              <span>{likeStatuses[echo.id]?.count}</span>
            ) : null}
          </button>

          {likeToastId === echo.id ? (
            <span className="animate-fade-out absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-[#A1887F] px-2 py-0.5 text-[11px] text-white shadow-sm">
              不错呦
            </span>
          ) : null}
        </span>

        <button
          type="button"
          onClick={() => openReply(echo.id)}
          disabled={isPending}
          className="inline-flex items-center gap-1 text-[11px] text-[#B0B0B0] transition-colors hover:text-[#A1887F] disabled:opacity-50"
        >
          <CornerDownRight className="h-3 w-3" />
          <span>回复</span>
        </button>

        {currentUserId === echo.userId ? (
          <button
            type="button"
            onClick={() => handleDelete(echo.id)}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-[11px] text-[#B0B0B0] transition-colors hover:text-red-500 disabled:opacity-50"
            aria-label="删除"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {replyingTo === echo.id && isLoggedIn ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            publishReply(echo.id);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={replyContent}
              onChange={(event) => setReplyContent(event.target.value)}
              placeholder="写下你的回复..."
              className="w-full rounded-full border border-[#E0DAD6] bg-white py-2 pl-4 pr-12 text-sm text-[#3A3A3A] transition-colors focus:border-[#A1887F] focus:outline-none"
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={isPending}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#A1887F] transition-colors hover:bg-[#F4EFEA] disabled:opacity-50"
              aria-label="发送回复"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setReplyAnonymous((value) => !value)}
            disabled={isPending}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
              replyAnonymous
                ? "border-[#A1887F] bg-[#A1887F] text-white"
                : "border-[#D7CCC8] text-[#9E9E9E] hover:border-[#A1887F] hover:text-[#A1887F]"
            }`}
          >
            匿名
          </button>

          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="shrink-0 text-[11px] text-[#9E9E9E] hover:text-[#5D5D5D]"
          >
            取消
          </button>
        </form>
      ) : null}

      {replyingTo === echo.id && replyMessage ? (
        <p className="mt-1 text-xs text-[#9E9E9E]">{replyMessage}</p>
      ) : null}
    </div>
  );

  return (
    <section className="mt-20 border-t border-[#D7CCC8]/40 pt-12">
      <div className="mb-8 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-[#A1887F]" />
        <h2 className="font-youyou text-2xl tracking-widest text-[#3A3A3A]">
          Echoes 回响
        </h2>
      </div>

      <div className="space-y-0 divide-y divide-[#E8E4DF]/60">
        {echoes.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#9E9E9E]">
            旷野安静，等待第一声回响。
          </p>
        ) : (
          topEchoes.map((top) => {
            const replies = replyMap.get(top.id) ?? [];
            return (
              <div key={top.id} className="space-y-4 py-4 first:pt-0">
                {renderEchoItem(top, false)}
                {replies.map((reply) => renderEchoItem(reply, true))}
              </div>
            );
          })
        )}
      </div>

      {isLoggedIn ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            publishTop();
          }}
          className="mt-6 flex items-center gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="写下你的回响..."
              className="w-full rounded-full border border-[#E0DAD6] bg-white py-2.5 pl-4 pr-12 text-sm text-[#3A3A3A] transition-colors focus:border-[#A1887F] focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isPending}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#A1887F] transition-colors hover:bg-[#F4EFEA] disabled:opacity-50"
              aria-label="发送回响"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAnonymous((value) => !value)}
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

      {message ? (
        <p className="mt-2 text-center text-xs text-[#9E9E9E]">{message}</p>
      ) : null}
    </section>
  );
}
