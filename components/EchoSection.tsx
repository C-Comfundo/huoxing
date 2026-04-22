"use client";

import { useState, useTransition } from "react";

import { CornerDownRight, Heart, MessageSquare, Send, Trash2 } from "lucide-react";

import { submitEcho, deleteEcho, type Echo } from "@/app/actions/echoes";

import { toggleEchoLike } from "@/app/actions/likes";

interface EchoSectionProps {
  articleId: string;
  isLoggedIn: boolean;
  currentUserId?: string;
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
  currentUserId,
  initialEchoes,
  initialLikeStatuses,
}: EchoSectionProps) {
  const [echoes, setEchoes] = useState(initialEchoes);
  const [likeStatuses, setLikeStatuses] = useState(initialLikeStatuses);

  // 顶层评论输入
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  // 回复输入
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");

  // 点赞提示
  const [likeToastId, setLikeToastId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // 按 rootId 分组：rootId = null 为真正顶层；其余为回复（无论 parentId 是否为 null）
  const topEchoes = echoes.filter((e) => !e.rootId);
  const replyMap = new Map<string, Echo[]>();
  for (const e of echoes) {
    if (e.rootId) {
      if (!replyMap.has(e.rootId)) replyMap.set(e.rootId, []);
      replyMap.get(e.rootId)!.push(e);
    }
  }

  const publishTop = () => {
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

  const publishReply = (parentId: string) => {
    const trimmed = replyContent.trim();
    if (!trimmed) {
      setReplyMessage("请写下回复内容后再发布");
      return;
    }
    const parentEcho = echoes.find((e) => e.id === parentId);
    const rootId = parentEcho?.rootId || parentId;
    setReplyMessage("");
    startTransition(async () => {
      const result = await submitEcho({
        articleId,
        content: trimmed,
        isAnonymous: replyAnonymous,
        parentId,
        rootId,
      });
      if (!result.success || !result.echo) {
        setReplyMessage(result.message);
        return;
      }
      setEchoes((prev) => [...prev, result.echo!]);
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
        if (result.liked) {
          setLikeToastId(echoId);
          setTimeout(() => setLikeToastId((id) => (id === echoId ? null : id)), 1800);
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
    if (!confirm("确定要删除这条评论吗？")) return;
    startTransition(async () => {
      const result = await deleteEcho(echoId);
      if (!result.success) {
        alert(result.message);
        return;
      }
      setEchoes((prev) => {
        const target = prev.find((e) => e.id === echoId);
        if (!target) return prev;
        if (!target.rootId) {
          // 顶层评论：过滤掉自身及所有下属评论
          return prev.filter((e) => e.id !== echoId && e.rootId !== echoId);
        }
        // 次级评论：删除自身；将其子评论的 parentId 提升为 NULL
        return prev
          .filter((e) => e.id !== echoId)
          .map((e) =>
            e.parentId === echoId ? { ...e, parentId: null } : e
          );
      });
    });
  };

  const renderEchoItem = (echo: Echo, isReply: boolean) => (
    <div
      id={`echo-${echo.id}`}
      key={echo.id}
      className={`${isReply ? "pl-6 border-l-2 border-[#E8E4DF]" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] font-medium text-[#5D5D5D]">
          {isReply && (
            <CornerDownRight className="inline h-3 w-3 mr-1 text-[#B0B0B0]" />
          )}
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
            aria-label={
              likeStatuses[echo.id]?.liked ? "取消点赞" : "点赞"
            }
            className="inline-flex items-center gap-1 text-[11px] text-[#B0B0B0] transition-colors hover:text-[#A1887F] disabled:opacity-50"
          >
            <Heart
              className={`h-3 w-3 transition-all duration-200 ${
                likeStatuses[echo.id]?.liked
                  ? "fill-[#A1887F] text-[#A1887F]"
                  : "fill-none"
              }`}
            />
            {(likeStatuses[echo.id]?.count ?? 0) > 0 && (
              <span>{likeStatuses[echo.id]?.count}</span>
            )}
          </button>
          {likeToastId === echo.id && (
            <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-[#A1887F] px-2 py-0.5 text-[11px] text-white shadow-sm animate-fade-out">
              不错呦
            </span>
          )}
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
        {currentUserId === echo.userId && (
          <button
            type="button"
            onClick={() => handleDelete(echo.id)}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-[11px] text-[#B0B0B0] transition-colors hover:text-red-500 disabled:opacity-50"
            aria-label="删除"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {replyingTo === echo.id && isLoggedIn && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
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
            onClick={() => setReplyAnonymous((v) => !v)}
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
      )}
      {replyingTo === echo.id && replyMessage && (
        <p className="mt-1 text-xs text-[#9E9E9E]">{replyMessage}</p>
      )}
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
              <div key={top.id} className="py-4 first:pt-0 space-y-4">
                {renderEchoItem(top, false)}
                {replies.map((reply) => renderEchoItem(reply, true))}
              </div>
            );
          })
        )}
      </div>

      {isLoggedIn ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            publishTop();
          }}
          className="mt-6 flex items-center gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="写下你的回音..."
              className="w-full rounded-full border border-[#E0DAD6] bg-white py-2.5 pl-4 pr-12 text-sm text-[#3A3A3A] transition-colors focus:border-[#A1887F] focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isPending}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#A1887F] transition-colors hover:bg-[#F4EFEA] disabled:opacity-50"
              aria-label="发送回音"
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
