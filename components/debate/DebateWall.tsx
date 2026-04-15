"use client";

import type { MutableRefObject, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, X, ThumbsDown } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createDebateComment,
  deleteDebateComment,
  toggleDebateCommentLike,
  toggleDebateCommentDislike,
} from "@/app/actions/debates";
import { getDebateTopicTiming, selectDefaultDebateTopicId } from "@/lib/debate-schedule";
import type { DebateComment, DebateSide, DebateTopic } from "@/lib/debates";

type Stance = DebateSide;
type StatusTone = "error" | "success" | "info";
type SortMode = "latest" | "hot";
type BringToFrontOptions = {
  toggleActions?: boolean;
};

interface DebateWallProps {
  currentUserId: string | null;
  initialTopics: DebateTopic[];
  isLoggedIn: boolean;
  issueSlug: string;
  initialTopicId?: string | null;
  initialNowMs?: number;
}

interface AreaMetrics {
  width: number;
  height: number;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PositionedComment extends DebateComment {
  color: string;
  rotate: number;
  x: number;
  y: number;
  entryOffsetX: number;
  entryOffsetY: number;
}

const NOTE_COLORS = ["#F5C9CC", "#BFD9EE", "#F3E58F", "#C9E4A9", "#F4D7A7", "#E5CCF2"];
const HOT_LIKE_THRESHOLD = 5;
const MAX_CHAR_LIMIT = 100;
const MIN_BOARD_HEIGHT = 860;
const MOBILE_MIN_AREA_HEIGHT = 360;
const OVERLAP_RATIO_LIMIT = 0.15;
const MOBILE_OVERLAP_RATIO_LIMIT = 0.12;
const NOTE_SAFE_PADDING = 24;
const MOBILE_NOTE_SAFE_PADDING = 10;
const MOBILE_ROTATION_MARGIN = 8;
const INITIAL_VISIBLE_COUNT = 6;
const VISIBLE_COUNT_STEP = 6;

function getNoteSize(text: string, compact = false) {
  const len = text.length;

  if (compact) {
    const width = len >= 72 ? 232 : len >= 40 ? 220 : 208;
    const fontSize = 14;
    const lineHeight = Math.round(fontSize * 1.72);
    const approxCharsPerLine = width >= 232 ? 13 : width >= 220 ? 12 : 11;
    const paragraphs = text.split("\n");
    const lines = Math.max(
      1,
      paragraphs.reduce((total, paragraph) => {
        const contentLength = paragraph.trim().length || 1;
        return total + Math.ceil(contentLength / approxCharsPerLine);
      }, 0)
    );
    const minHeight = Math.max(118, lines * lineHeight + 54);

    return { width, minHeight, fontSize };
  }

  if (len >= 80) return { width: 272, minHeight: 306, fontSize: 17 };
  if (len >= 56) return { width: 246, minHeight: 258, fontSize: 16 };
  if (len >= 36) return { width: 220, minHeight: 214, fontSize: 15 };
  return { width: 188, minHeight: 170, fontSize: 15 };
}

function overlapArea(a: Rect, b: Rect) {
  const overlapWidth = Math.max(
    0,
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)
  );
  const overlapHeight = Math.max(
    0,
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top)
  );

  return overlapWidth * overlapHeight;
}

function isPlacementValid(candidate: Rect, existing: Rect[], ratioLimit = OVERLAP_RATIO_LIMIT) {
  return existing.every((item) => {
    const overlap = overlapArea(candidate, item);
    if (overlap <= 0) {
      return true;
    }

    const ratio =
      overlap / Math.min(candidate.width * candidate.height, item.width * item.height);
    return ratio <= ratioLimit;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let state = seed || 1;

  return () => {
    state += 0x6d2b79f5;
    let next = Math.imul(state ^ (state >>> 15), state | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function getBoundedNotePosition(
  note: Pick<PositionedComment, "x" | "y" | "content">,
  areaWidth: number,
  areaHeight: number,
  compact = false
) {
  const size = getNoteSize(note.content, compact);
  const edgePadding = compact ? MOBILE_NOTE_SAFE_PADDING + MOBILE_ROTATION_MARGIN : NOTE_SAFE_PADDING;
  const safeWidth = Math.max(areaWidth, size.width + edgePadding * 2);
  const safeHeight = Math.max(areaHeight, size.minHeight + edgePadding * 2);
  const maxLeft = Math.max(edgePadding, safeWidth - size.width - edgePadding);
  const maxTop = Math.max(edgePadding, safeHeight - size.minHeight - edgePadding);
  const leftPx = clamp((note.x / 100) * safeWidth, edgePadding, maxLeft);
  const topPx = clamp(note.y, edgePadding, maxTop);

  return {
    leftPercent: (leftPx / safeWidth) * 100,
    topPx,
  };
}

function getPlacementRect(
  x: number,
  y: number,
  text: string,
  areaWidth: number,
  areaHeight: number,
  compact = false
): Rect {
  const bounded = getBoundedNotePosition(
    {
      x,
      y,
      content: text,
    },
    areaWidth,
    areaHeight,
    compact
  );
  const size = getNoteSize(text, compact);

  return {
    left: (bounded.leftPercent / 100) * areaWidth,
    top: bounded.topPx,
    width: size.width,
    height: size.minHeight,
  };
}

function estimateSideHeight(comments: DebateComment[], areaWidth: number) {
  const safeWidth = Math.max(areaWidth, 520);
  const laneWidth = 220;
  const laneCount = Math.max(
    1,
    Math.floor((safeWidth - NOTE_SAFE_PADDING * 2) / laneWidth)
  );
  const laneHeights = Array.from({ length: laneCount }, () => NOTE_SAFE_PADDING + 24);

  for (const comment of comments) {
    const size = getNoteSize(comment.content);
    let shortestLaneIndex = 0;

    for (let laneIndex = 1; laneIndex < laneHeights.length; laneIndex += 1) {
      if (laneHeights[laneIndex] < laneHeights[shortestLaneIndex]) {
        shortestLaneIndex = laneIndex;
      }
    }

    laneHeights[shortestLaneIndex] += Math.floor(size.minHeight * 0.78) + 20;
  }

  return Math.max(...laneHeights) + NOTE_SAFE_PADDING + 48;
}

function sortComments(comments: DebateComment[], sortMode: SortMode) {
  const sortedComments = [...comments];

  sortedComments.sort((left, right) => {
    if (sortMode === "hot") {
      if (right.likeCount !== left.likeCount) {
        return right.likeCount - left.likeCount;
      }
    }

    if (right.createdAt !== left.createdAt) {
      return right.createdAt.localeCompare(left.createdAt);
    }

    return right.id.localeCompare(left.id);
  });

  return sortedComments;
}

function buildDesktopNoteLayout(
  comments: DebateComment[],
  areaWidth: number,
  areaHeight: number
): PositionedComment[] {
  const safeWidth = Math.max(areaWidth, 320);
  const safeHeight = Math.max(areaHeight, MIN_BOARD_HEIGHT);
  const placedRects: Rect[] = [];

  return comments.map((comment) => {
    const placementRandom = createSeededRandom(hashString(comment.id));
    const styleRandom = createSeededRandom(hashString(`${comment.id}:style`));
    const size = getNoteSize(comment.content);
    const minX = (NOTE_SAFE_PADDING / safeWidth) * 100;
    const maxX = Math.max(
      minX,
      ((safeWidth - size.width - NOTE_SAFE_PADDING) / safeWidth) * 100
    );
    const minY = 28;
    const maxY = Math.max(minY, safeHeight - size.minHeight - NOTE_SAFE_PADDING);

    let x = minX;
    let y = minY;
    let foundPlacement = false;

    for (let attempt = 0; attempt < 120; attempt += 1) {
      const nextX = minX + placementRandom() * (maxX - minX);
      const nextY = minY + placementRandom() * (maxY - minY);
      const candidate = getPlacementRect(nextX, nextY, comment.content, safeWidth, safeHeight);

      if (isPlacementValid(candidate, placedRects)) {
        x = nextX;
        y = nextY;
        placedRects.push(candidate);
        foundPlacement = true;
        break;
      }
    }

    if (!foundPlacement) {
      const bottom = placedRects.reduce(
        (currentMax, rect) => Math.max(currentMax, rect.top + rect.height),
        24
      );
      const laneCount = Math.max(
        1,
        Math.floor((safeWidth - NOTE_SAFE_PADDING * 2) / Math.max(size.width * 0.82, 150))
      );
      const laneIndex = placedRects.length % laneCount;
      const laneGap = laneCount > 1 ? (maxX - minX) / (laneCount - 1) : 0;

      x = clamp(minX + laneIndex * laneGap, minX, maxX);
      y = bottom + 24 + placementRandom() * 24;
      placedRects.push(getPlacementRect(x, y, comment.content, safeWidth, safeHeight));
    }

    return {
      ...comment,
      color: NOTE_COLORS[Math.floor(styleRandom() * NOTE_COLORS.length)],
      rotate: styleRandom() * 12 - 6,
      x,
      y,
      entryOffsetX: (styleRandom() - 0.5) * safeWidth * 0.64,
      entryOffsetY: 120 + styleRandom() * 180,
    };
  });
}

function buildMobileNoteLayout(notes: PositionedComment[], areaWidth: number) {
  const safeWidth = Math.max(areaWidth, 300);
  const sortedNotes = [...notes].sort((left, right) => {
    if (left.y !== right.y) {
      return left.y - right.y;
    }

    return left.id.localeCompare(right.id);
  });

  let currentY = NOTE_SAFE_PADDING;
  let previousRect: Rect | null = null;

  const positionedNotes = sortedNotes.map((note, index) => {
    const size = getNoteSize(note.content, true);
    const edgePadding = MOBILE_NOTE_SAFE_PADDING + MOBILE_ROTATION_MARGIN;
    const maxLeft = Math.max(edgePadding, safeWidth - size.width - edgePadding);
    const centerLeft = (safeWidth - size.width) / 2;
    const jitter = index % 3 === 0 ? -14 : index % 3 === 1 ? 10 : -4;
    const leftPx = clamp(centerLeft + jitter, edgePadding, maxLeft);
    let topY = Math.max(currentY, edgePadding);

    if (previousRect) {
      const maxOverlapHeight = Math.floor(
        Math.min(previousRect.height, size.minHeight) * MOBILE_OVERLAP_RATIO_LIMIT
      );
      const desiredTop = previousRect.top + previousRect.height - maxOverlapHeight;
      topY = Math.max(currentY, desiredTop);
    }

    const nextNote = {
      ...note,
      x: (leftPx / safeWidth) * 100,
      y: topY,
    };

    previousRect = {
      left: leftPx,
      top: topY,
      width: size.width,
      height: size.minHeight,
    };
    currentY =
      topY + Math.floor(size.minHeight * (1 - MOBILE_OVERLAP_RATIO_LIMIT)) + 12;

    return nextNote;
  });

  return {
    notes: positionedNotes,
    height: Math.max(MOBILE_MIN_AREA_HEIGHT, currentY + NOTE_SAFE_PADDING),
  };
}

function updateCommentInTopics(
  topics: DebateTopic[],
  commentId: string,
  updater: (comment: DebateComment) => DebateComment | null
) {
  return topics.map((topic) => ({
    ...topic,
    comments: topic.comments.flatMap((comment) => {
      if (comment.id !== commentId) {
        return [comment];
      }

      const nextComment = updater(comment);
      return nextComment ? [nextComment] : [];
    }),
  }));
}

export default function DebateWall({
  currentUserId,
  initialTopics,
  isLoggedIn,
  issueSlug,
  initialTopicId = null,
  initialNowMs = Date.now(),
}: DebateWallProps) {
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

  const [topics, setTopics] = useState(initialTopics);
  const [activeTopicId, setActiveTopicId] = useState(
    initialTopicId ?? selectDefaultDebateTopicId(initialTopics, null, initialNowMs)
  );
  const [isModalOpen, setModalOpen] = useState(false);
  const [stance, setStance] = useState<Stance>("pro");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [draft, setDraft] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const [isPending, startTransition] = useTransition();
  const [liftedOrder, setLiftedOrder] = useState<Record<string, number>>({});
  const [nowMs, setNowMs] = useState(initialNowMs);

  const proRef = useRef<HTMLDivElement | null>(null);
  const conRef = useRef<HTMLDivElement | null>(null);
  const sourceButtonRef = useRef<HTMLButtonElement | null>(null);
  const liftCounterRef = useRef(0);
  const [metrics, setMetrics] = useState<Record<Stance, AreaMetrics>>({
    pro: { width: 0, height: 0 },
    con: { width: 0, height: 0 },
  });
  const [visibleCounts, setVisibleCounts] = useState<Record<Stance, number>>({
    pro: INITIAL_VISIBLE_COUNT,
    con: INITIAL_VISIBLE_COUNT,
  });

  useEffect(() => {
    setTopics(initialTopics);
  }, [initialTopics]);

  useEffect(() => {
    if (!topics.some((topic) => topic.id === activeTopicId)) {
      setActiveTopicId(selectDefaultDebateTopicId(topics, initialTopicId, nowMs));
    }
  }, [activeTopicId, initialTopicId, nowMs, topics]);

  useEffect(() => {
    if (initialTopicId && topics.some((topic) => topic.id === initialTopicId)) {
      setActiveTopicId(initialTopicId);
    }
  }, [initialTopicId, topics]);

  useEffect(() => {
    setNowMs(initialNowMs);
  }, [initialNowMs]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    const refreshMetrics = () => {
      setMetrics({
        pro: {
          width: proRef.current?.getBoundingClientRect().width ?? 0,
          height: proRef.current?.getBoundingClientRect().height ?? 0,
        },
        con: {
          width: conRef.current?.getBoundingClientRect().width ?? 0,
          height: conRef.current?.getBoundingClientRect().height ?? 0,
        },
      });
    };

    const updateViewport = () => {
      setIsMobile(window.innerWidth < 768);
      refreshMetrics();
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStatusMessage(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  const activeTopic = useMemo(
    () => topics.find((topic) => topic.id === activeTopicId) ?? topics[0] ?? null,
    [activeTopicId, topics]
  );

  const activeTopicTiming = useMemo(() => {
    if (!activeTopic?.startsAt || !activeTopic?.endsAt) {
      return null;
    }

    return getDebateTopicTiming(activeTopic.startsAt, activeTopic.endsAt, nowMs);
  }, [activeTopic?.endsAt, activeTopic?.startsAt, nowMs]);

  const debateStatus = activeTopicTiming?.status ?? "not_started";
  const localTimeLeft = activeTopicTiming
    ? Math.max(0, Math.ceil(activeTopicTiming.timeLeftMs / 1000))
    : 0;

  useEffect(() => {
    setVisibleCounts({
      pro: INITIAL_VISIBLE_COUNT,
      con: INITIAL_VISIBLE_COUNT,
    });
    setActiveId(null);
    setFocusedId(null);
    setLiftedOrder({});
    liftCounterRef.current = 0;
  }, [activeTopicId]);

  const { allProComments, allConComments } = useMemo(() => {
    const comments = activeTopic?.comments ?? [];

    return {
      allProComments: comments.filter((comment) => comment.side === "pro"),
      allConComments: comments.filter((comment) => comment.side === "con"),
    };
  }, [activeTopic]);

  const sortedProComments = useMemo(
    () => sortComments(allProComments, sortMode),
    [allProComments, sortMode]
  );
  const sortedConComments = useMemo(
    () => sortComments(allConComments, sortMode),
    [allConComments, sortMode]
  );

  const proComments = useMemo(
    () => sortedProComments.slice(0, visibleCounts.pro),
    [sortedProComments, visibleCounts.pro]
  );
  const conComments = useMemo(
    () => sortedConComments.slice(0, visibleCounts.con),
    [sortedConComments, visibleCounts.con]
  );

  const viewerStance = useMemo(() => {
    if (!currentUserId || !activeTopic) return null;
    const isPro = activeTopic.comments.some((c) => c.userId === currentUserId && c.side === "pro");
    if (isPro) return "pro";
    const isCon = activeTopic.comments.some((c) => c.userId === currentUserId && c.side === "con");
    if (isCon) return "con";
    return null;
  }, [currentUserId, activeTopic]);

  const remainingCountBySide = useMemo(
    () => ({
      pro: Math.max(0, sortedProComments.length - proComments.length),
      con: Math.max(0, sortedConComments.length - conComments.length),
    }),
    [conComments.length, proComments.length, sortedConComments.length, sortedProComments.length]
  );

  const boardHeight = useMemo(() => {
    const proHeight = estimateSideHeight(proComments, metrics.pro.width || 520);
    const conHeight = estimateSideHeight(conComments, metrics.con.width || 520);
    return Math.max(MIN_BOARD_HEIGHT, proHeight, conHeight);
  }, [conComments, metrics.con.width, metrics.pro.width, proComments]);

  const desktopLayouts = useMemo(
    () => ({
      pro: buildDesktopNoteLayout(proComments, metrics.pro.width || 520, boardHeight),
      con: buildDesktopNoteLayout(conComments, metrics.con.width || 520, boardHeight),
    }),
    [boardHeight, conComments, metrics.con.width, metrics.pro.width, proComments]
  );

  const mobileLayouts = useMemo(
    () => ({
      pro: buildMobileNoteLayout(desktopLayouts.pro, metrics.pro.width || 320),
      con: buildMobileNoteLayout(desktopLayouts.con, metrics.con.width || 320),
    }),
    [desktopLayouts.con, desktopLayouts.pro, metrics.con.width, metrics.pro.width]
  );

  const showStatus = (message: string, tone: StatusTone) => {
    setStatusTone(tone);
    setStatusMessage(message);
  };

  const pathname = usePathname();
  const redirectToLogin = () => {
    window.location.href = `/login?redirectTo=${encodeURIComponent(pathname)}`;
  };

  const handleShowMore = (side: Stance) => {
    setVisibleCounts((currentCounts) => ({
      ...currentCounts,
      [side]: currentCounts[side] + VISIBLE_COUNT_STEP,
    }));
  };

  const bringToFront = (
    commentId: string,
    options: BringToFrontOptions = {}
  ) => {
    const { toggleActions = true } = options;

    liftCounterRef.current += 1;
    const nextOrder = liftCounterRef.current;
    setLiftedOrder((current) => ({
      ...current,
      [commentId]: nextOrder,
    }));
    setFocusedId(commentId);
    if (toggleActions) {
      setActiveId((current) => (current === commentId ? null : commentId));
    }
    window.setTimeout(() => {
      setFocusedId((current) => (current === commentId ? null : current));
    }, 420);
  };

  const handleOpenComposer = () => {
  if (activeTopic && !activeTopicTiming) {
    showStatus("当前辩题尚未配置完整的开始和结束时间。", "error");
    return;
  }
  if (!activeTopic) {
    showStatus("当前还没有可参与的辩题。", "error");
    return;
  }

  if (!isLoggedIn) {
    redirectToLogin();
    return;
  }

  if (debateStatus === "not_started") {
    showStatus("辩论尚未开始，暂时不能发言。", "info");
    return;
  }

  if (debateStatus === "ended") {
    showStatus("辩论已结束，无法继续发言。", "info");
    return;
  }

  setModalOpen(true);
};

  const handleCreateComment = () => {
  if (activeTopic && !activeTopicTiming) {
    showStatus("当前辩题尚未配置完整的开始和结束时间。", "error");
    return;
  }
  if (!activeTopic) {
    showStatus("当前还没有可参与的辩题。", "error");
    return;
  }

  if (!isLoggedIn) {
    redirectToLogin();
    return;
  }

  // ✅ 阶段限制（新增）
  if (debateStatus === "not_started") {
    showStatus("辩论尚未开始，不能提交发言。", "info");
    return;
  }

  if (debateStatus === "ended") {
    showStatus("辩论已结束，无法提交发言。", "info");
    return;
  }

  const content = draft.trim();
  if (!content) {
    showStatus("先写下你的观点，再把纸条贴上去。", "error");
    return;
  }

  startTransition(() => {
    void (async () => {
      const result = await createDebateComment({
        content,
        issueSlug,
        side: stance,
        topicId: activeTopic.id,
      });

      if (!result.success || !result.comment) {
        showStatus(result.message, "error");
        return;
      }

      setTopics((currentTopics) =>
        currentTopics.map((topic) =>
          topic.id === activeTopic.id
            ? { ...topic, comments: [...topic.comments, result.comment!] }
            : topic
        )
      );

      setSortMode("latest");
      setDraft("");
      setModalOpen(false);
      setActiveId(result.comment.id);
      bringToFront(result.comment.id, { toggleActions: false });

      showStatus(result.message, "success");
    })();
  });
};


  const handleDeleteComment = (commentId: string) => {
    if (!currentUserId) {
      showStatus("请先登录。", "error");
      return;
    }

    setBusyIds((current) => new Set(current).add(commentId));
    
    void (async () => {
      const result = await deleteDebateComment({
        commentId,
        issueSlug,
      });

      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(commentId);
        return next;
      });

      if (!result.success) {
        showStatus(result.message, "error");
        return;
      }

      setTopics((currentTopics) =>
        updateCommentInTopics(currentTopics, commentId, () => null)
      );
      setActiveId((current) => (current === commentId ? null : current));
      showStatus(result.message, "success");
    })();
  };

  const handleToggleLike = (comment: DebateComment) => {
    if (!isLoggedIn) {
      redirectToLogin();
      return;
    }

    if (comment.userId === currentUserId) {
      showStatus("不能给自己的纸条点赞。", "error");
      return;
    }

    setBusyIds((current) => new Set(current).add(comment.id));
    
    void (async () => {
      const result = await toggleDebateCommentLike({
        commentId: comment.id,
        issueSlug,
      });

      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(comment.id);
        return next;
      });

      if (!result.success || typeof result.liked !== "boolean") {
        showStatus(result.message, "error");
        return;
      }

      setTopics((currentTopics) =>
        updateCommentInTopics(currentTopics, comment.id, (currentComment) => ({
          ...currentComment,
          likeCount: result.likeCount ?? currentComment.likeCount,
          likedByViewer: result.liked!,
        }))
      );
      showStatus(result.message, "success");
    })();
  };

  const handleToggleDislike = (comment: DebateComment) => {
    if (!isLoggedIn) {
      redirectToLogin();
      return;
    }

    if (viewerStance === null) {
      showStatus("贴上你的第一张纸条，亮明阵营后就可以踩对方啦！", "info");
      return;
    }

    if (viewerStance === comment.side) {
      showStatus("只能踩对方阵营的纸条，不能背刺队友哦！", "info");
      return;
    }

    setBusyIds((current) => new Set(current).add(comment.id));
    
    void (async () => {
      const result = await toggleDebateCommentDislike({
        commentId: comment.id,
        issueSlug,
      });

      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(comment.id);
        return next;
      });

      if (!result.success || typeof result.disliked !== "boolean") {
        showStatus(result.message, "error");
        return;
      }

      setTopics((currentTopics) =>
        updateCommentInTopics(currentTopics, comment.id, (currentComment) => ({
          ...currentComment,
          dislikeCount: result.dislikeCount ?? currentComment.dislikeCount,
          dislikedByViewer: result.disliked!,
        }))
      );
      showStatus(result.message, "success");
    })();
  };

  if (!activeTopic) {
    return (
      <section className="rounded-[2rem] border border-[#E8E4DF] bg-[#FFFDF9] px-6 py-12 text-center text-[#6C665F] shadow-[0_24px_60px_-48px_rgba(56,39,24,0.45)]">
        <h2 className="font-youyou text-3xl text-[#2F241A]">本期辩论正在准备中</h2>
        <p className="mt-3 text-sm leading-7 text-[#8A715B]">
          当前还没有发布辩题，等你们把第一道题放上来，这里就会亮起来。
        </p>
      </section>
    );
  }
  

  return (
    <main
      className="min-h-screen bg-[#FDFBF7] pb-24 pt-6 text-[#3F352C]"
      onClick={() => setActiveId(null)}
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#9A8069]">Debate Wall</p>
          <h1 className="mt-2 font-youyou text-3xl leading-tight md:text-5xl">
            {activeTopic.title}
          </h1>
          

          {topics.length > 1 ? (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {topics.map((topic, index) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setActiveTopicId(topic.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    activeTopic.id === topic.id
                      ? "border-[#D98A35] bg-[#E58E3A] text-white"
                      : "border-[#E4D7C6] bg-[#FFF9F0] text-[#7B6650] hover:border-[#D6B48D]"
                  }`}
                >
                  第 {index + 1} 题
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="inline-flex rounded-full border border-[#E4D7C6] bg-[#FFF9F0] p-1 shadow-[0_10px_24px_-20px_rgba(56,39,24,0.45)]">
              {([
                { key: "latest", label: "最新" },
                { key: "hot", label: "最热" },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSortMode(option.key)}
                  className={`rounded-full px-4 py-2 text-sm transition md:px-5 ${
                    sortMode === option.key
                      ? "bg-[#E58E3A] text-white"
                      : "text-[#7B6650] hover:text-[#584636]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
<p className="mx-auto mt-4 max-w-3xl text-center">
  {debateStatus !== "ended" ? (
    <>
      <span className="text-3xl md:text-4xl tracking-[0.2em] text-[#9A8069] font-youyou">
        距辩论
        <span className="text-red-500 mx-2 font-bold">
          {debateStatus === "not_started" ? "开始" : "结束"}
        </span>
        还有：
      </span>

      <span
        className={`ml-4 font-youyou text-5xl md:text-6xl font-extrabold tracking-widest ${
          localTimeLeft < 60 ? "text-red-500" : "text-[#E58E3A]"
        }`}
      >
        {formatTime(localTimeLeft)}
      </span>
    </>
  ) : (
    <span className="text-2xl text-[#9A8069]">
      本场辩论已结束
    </span>
  )}
</p>
          </div>
        </header>

        <section
          className="isolate relative mt-8 overflow-hidden rounded-[2rem] border border-[#EFE4D3] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(250,244,235,0.96))] px-3 py-6 shadow-[0_24px_60px_-48px_rgba(56,39,24,0.45)] md:mt-10 md:px-6 md:py-8"
          style={{ minHeight: isMobile ? undefined : `${boardHeight + 80}px` }}
        >
        
          <div className="pointer-events-none absolute left-0 right-0 top-5 hidden grid-cols-2 text-center md:grid">
                <div>
               <h3 className="font-youyou text-xl text-[#2F241A] md:text-3xl">正方</h3>
              <p className="mt-2 text-xs tracking-[0.2em] text-[#9A8069]">
               支持这个观点的纸条
               </p>
          </div>

          <div>
             <h3 className="font-youyou text-xl text-[#2F241A] md:text-3xl">反方</h3>
               <p className="mt-2 text-xs tracking-[0.2em] text-[#9A8069]">
          反对或质疑这个观点的纸条
               </p>
          </div>
      </div>
<div className="pointer-events-none absolute bottom-6 left-1/2 top-20 hidden w-px -translate-x-1/2 bg-[#D7D3CC] md:block" />


{debateStatus === "not_started" && (
<motion.div
  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 1 }}
>
  <div
    className="relative w-[92%] h-[72%] max-w-[1100px]
               rounded-3xl border border-[#D6BFA4]/40
               bg-gradient-to-b from-[#FFF8EE]/90 to-[#FDF6EC]/80
               shadow-[0_40px_120px_-40px_rgba(80,60,30,0.35)]
               flex flex-col items-center justify-center text-center
               px-10 py-12"
    style={{
      backdropFilter: "blur(10px)",
    }}
  >

    <div className="font-youyou text-6xl md:text-8xl tracking-[0.15em] text-[#3F352C]">
      等你来辩
    </div>


    <div className="mt-6 text-lg md:text-2xl tracking-[0.25em] text-[#9A8069] font-light">
      立场未定 · 辩席虚位
    </div>


    <div className="mt-10 h-px w-24 bg-[#D6BFA4]/60" />

    <div className="mt-4 text-sm tracking-[0.3em] text-[#B8A999]">
      等你落子
    </div>
  </div>
</motion.div>
)}
          <div className="pointer-events-none absolute bottom-6 left-1/2 top-20 hidden w-px -translate-x-1/2 bg-[#D7D3CC] md:block" />

          <div className="relative mt-20 hidden md:block" style={{ height: `${boardHeight}px` }}>
            <div ref={proRef} className="absolute inset-y-0 left-0 w-1/2 overflow-visible" />
            <div ref={conRef} className="absolute inset-y-0 right-0 w-1/2 overflow-visible" />

            <NotesLayer
              notes={desktopLayouts.pro}
              focusedId={focusedId}
              activeId={activeId}
              liftedOrder={liftedOrder}
              currentUserId={currentUserId}
              busyIds={busyIds}
              onToggleLike={handleToggleLike}
              onToggleDislike={handleToggleDislike}
              viewerStance={viewerStance}
              onDelete={handleDeleteComment}
              onBringFront={bringToFront}
              side="left"
              areaWidth={metrics.pro.width}
              areaHeight={boardHeight}
              isPending={isPending}
            />
            <NotesLayer
              notes={desktopLayouts.con}
              focusedId={focusedId}
              activeId={activeId}
              liftedOrder={liftedOrder}
              currentUserId={currentUserId}
              busyIds={busyIds}
              onToggleLike={handleToggleLike}
              onToggleDislike={handleToggleDislike}
              viewerStance={viewerStance}
              onDelete={handleDeleteComment}
              onBringFront={bringToFront}
              side="right"
              areaWidth={metrics.con.width}
              areaHeight={boardHeight}
              isPending={isPending}
            />
          </div>

          <div className="space-y-6 md:hidden">
            <MobileNotesSection
              title="正方"
              subtitle="支持这个观点的纸条"
              areaHeight={mobileLayouts.pro.height}
              areaRef={proRef}
              shownCount={proComments.length}
              totalCount={sortedProComments.length}
            >
              <NotesLayer
                notes={mobileLayouts.pro.notes}
                focusedId={focusedId}
                activeId={activeId}
                liftedOrder={liftedOrder}
                currentUserId={currentUserId}
                busyIds={busyIds}
                onToggleLike={handleToggleLike}
                onToggleDislike={handleToggleDislike}
                viewerStance={viewerStance}
                onDelete={handleDeleteComment}
                onBringFront={bringToFront}
                side="left"
                compact
                stacked
                areaWidth={metrics.pro.width}
                areaHeight={mobileLayouts.pro.height}
                isPending={isPending}
              />
            </MobileNotesSection>
            <MobileNotesSection
              title="反方"
              subtitle="反对或质疑这个观点的纸条"
              areaHeight={mobileLayouts.con.height}
              areaRef={conRef}
              shownCount={conComments.length}
              totalCount={sortedConComments.length}
            >
              <NotesLayer
                notes={mobileLayouts.con.notes}
                focusedId={focusedId}
                activeId={activeId}
                liftedOrder={liftedOrder}
                currentUserId={currentUserId}
                busyIds={busyIds}
                onToggleLike={handleToggleLike}
                onToggleDislike={handleToggleDislike}
                viewerStance={viewerStance}
                onDelete={handleDeleteComment}
                onBringFront={bringToFront}
                side="right"
                compact
                stacked
                areaWidth={metrics.con.width}
                areaHeight={mobileLayouts.con.height}
                isPending={isPending}
              />
            </MobileNotesSection>
          </div>

          <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2">
            <SideShelfControls
              title="正方纸条"
              shownCount={proComments.length}
              totalCount={sortedProComments.length}
              remainingCount={remainingCountBySide.pro}
              onShowMore={() => handleShowMore("pro")}
            />
            <SideShelfControls
              title="反方纸条"
              shownCount={conComments.length}
              totalCount={sortedConComments.length}
              remainingCount={remainingCountBySide.con}
              onShowMore={() => handleShowMore("con")}
            />
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-4 z-[9900] mx-auto flex w-[calc(100%-1.5rem)] max-w-fit flex-col items-center gap-2 md:bottom-7">
        <AnimatePresence>
          {statusMessage ? (
            <motion.div
              key={statusMessage}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className={`rounded-full px-4 py-2 text-sm shadow-lg ${
                statusTone === "error"
                  ? "bg-[#5F4A3A] text-[#FFF7EF]"
                  : statusTone === "success"
                    ? "bg-[#FFF4E4] text-[#6A4B2A]"
                    : "bg-[#EDF2F7] text-[#445066]"
              }`}
            >
              {statusMessage}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {debateStatus === "ongoing" && (
  <div className="flex items-center justify-center rounded-full border border-[#9FB8D5] bg-[#83A9D0]/95 px-2 py-2 shadow-[0_16px_36px_-20px_rgba(0,0,0,0.5)] backdrop-blur md:px-3">
    <button
      ref={sourceButtonRef}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        handleOpenComposer();
      }}
      className="w-full rounded-full px-6 py-2 text-lg font-youyou text-white transition hover:bg-[#6E96C0] disabled:cursor-not-allowed disabled:opacity-70 md:w-auto md:px-8 md:text-xl"
      disabled={isPending}
    >
      {isLoggedIn ? "我要发言" : "登录后发言"}
    </button>
  </div>
)}

      </div>

      <AnimatePresence>
        {isModalOpen ? (
          <motion.div
            className="fixed inset-0 z-[9999] grid place-items-center bg-black/30 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ y: 26, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-[#E6DAC6] bg-[#FFFDF9] p-4 shadow-2xl md:p-5"
            >
              <h2 className="font-youyou text-xl text-[#43372C] md:text-2xl">发布一张纸条</h2>
              <p className="mt-2 text-sm leading-6 text-[#8A715B]">{activeTopic.title}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(["pro", "con"] as Stance[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStance(item)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      stance === item
                        ? "bg-[#E58E3A] text-white"
                        : "bg-[#F4ECE1] text-[#7B6650] hover:bg-[#ECDDCA]"
                    }`}
                  >
                    {item === "pro" ? "正方" : "反方"}
                  </button>
                ))}
              </div>

              <textarea
                value={draft}
                onChange={(event) =>
                  setDraft(event.target.value.slice(0, MAX_CHAR_LIMIT))
                }
                placeholder="写下你的观点，最多 100 字。"
                className="mt-4 h-32 w-full resize-none rounded-xl border border-[#E7DCCB] bg-[#FFFDF8] p-3 text-sm text-[#4D4136] outline-none focus:border-[#E58E3A]"
              />
              <div className="mt-2 text-right text-xs text-[#9E856E]">{draft.length}/100</div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full px-4 py-2 text-sm text-[#7F6A53] transition hover:bg-[#F4ECE0]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleCreateComment}
                  disabled={isPending}
                  className="rounded-full bg-[#E58E3A] px-5 py-2 text-sm text-white transition hover:bg-[#D4761D] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? "发送中..." : "发送"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

interface MobileNotesSectionProps {
  title: string;
  subtitle: string;
  areaHeight: number;
  areaRef: MutableRefObject<HTMLDivElement | null>;
  children: ReactNode;
  shownCount: number;
  totalCount: number;
}

function MobileNotesSection({
  title,
  subtitle,
  areaHeight,
  areaRef,
  children,
  shownCount,
  totalCount,
}: MobileNotesSectionProps) {
  const countLabel = `${shownCount}/${totalCount}`;
  const noteCount = countLabel;

  return (
    <section className="isolate overflow-hidden rounded-[1.45rem] border border-[#E8DCC9] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(249,242,233,0.96))] p-2.5 shadow-[0_18px_40px_-32px_rgba(56,39,24,0.45)]">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="font-youyou text-2xl text-[#2F241A]">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#8A715B]">{subtitle}</p>
        </div>
        <span
          data-count={countLabel}
          aria-label={countLabel}
          className="relative rounded-full bg-[#F5EBDD] px-3 py-1 text-xs text-transparent after:absolute after:inset-0 after:grid after:place-items-center after:text-xs after:text-[#7A644D] after:content-[attr(data-count)]"
        >
          {noteCount} 张
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[1.05rem] border border-[#E9DDCC] bg-[#FFFDF8]/85 px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
        <div ref={areaRef} className="relative w-full overflow-hidden" style={{ height: `${areaHeight}px` }}>
          {children}
        </div>
      </div>
    </section>
  );
}

interface SideShelfControlsProps {
  title: string;
  shownCount: number;
  totalCount: number;
  remainingCount: number;
  onShowMore: () => void;
}

function SideShelfControls({
  title,
  shownCount,
  totalCount,
  remainingCount,
  onShowMore,
}: SideShelfControlsProps) {
  return (
    <div className="rounded-[1.4rem] border border-[#E8DCC9] bg-[#FFF9F1]/90 px-4 py-3 shadow-[0_18px_32px_-30px_rgba(56,39,24,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[#6E5845]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[#9A8069]">
            已显示 {shownCount} / {totalCount}
          </p>
        </div>

        {remainingCount > 0 ? (
          <button
            type="button"
            onClick={onShowMore}
            className="rounded-full border border-[#D9C6AA] bg-white px-4 py-2 text-sm text-[#6B5846] transition hover:border-[#C9A87D] hover:text-[#4E3C2A]"
          >
            查看更多
          </button>
        ) : (
          <span className="rounded-full bg-[#F5EBDD] px-3 py-1 text-xs text-[#8B725C]">
            已全部展开
          </span>
        )}
      </div>
    </div>
  );
}

interface NotesLayerProps {
  notes: PositionedComment[];
  focusedId: string | null;
  activeId: string | null;
  liftedOrder: Record<string, number>;
  currentUserId: string | null;
  busyIds: Set<string>;
  onToggleLike: (comment: DebateComment) => void;
  onToggleDislike: (comment: DebateComment) => void;
  viewerStance: DebateSide | null;
  onDelete: (commentId: string) => void;
  onBringFront: (commentId: string, options?: BringToFrontOptions) => void;
  side: "left" | "right";
  compact?: boolean;
  stacked?: boolean;
  areaWidth?: number;
  areaHeight?: number;
  isPending?: boolean;
}

function NotesLayer({
  notes,
  focusedId,
  activeId,
  liftedOrder,
  currentUserId,
  busyIds,
  onToggleLike,
  onToggleDislike,
  viewerStance,
  onDelete,
  onBringFront,
  side,
  compact = false,
  stacked = false,
  areaWidth,
  areaHeight,
  isPending = false,
}: NotesLayerProps) {
  const fallbackWidth = compact ? 320 : 520;
  const resolvedWidth = areaWidth && areaWidth > 0 ? areaWidth : fallbackWidth;
  const resolvedHeight =
    areaHeight && areaHeight > 0
      ? areaHeight
      : compact
        ? MOBILE_MIN_AREA_HEIGHT
        : MIN_BOARD_HEIGHT;

  return (
    <div
      className={
        stacked
          ? "absolute inset-0"
          : `absolute inset-y-0 w-1/2 ${side === "left" ? "left-0" : "right-0"}`
      }
    >
      {notes.length === 0 ? (
        <div className="grid h-full place-items-center px-6 text-center text-sm leading-7 text-[#9A8069]">
          第一张纸条，等你贴上来。
        </div>
      ) : null}

      <AnimatePresence>
        {notes.map((note, index) => {
          const isHot = note.likeCount > HOT_LIKE_THRESHOLD;
          const isFocused = focusedId === note.id;
          const liftOrder = liftedOrder[note.id] ?? 0;
          const noteSize = getNoteSize(note.content, compact);
          const boundedPosition = getBoundedNotePosition(
            note,
            resolvedWidth,
            resolvedHeight,
            compact
          );
          const displayRotate = compact ? clamp(note.rotate, -3, 3) : note.rotate;
          const isOwner = currentUserId === note.userId;
          const isBusy = busyIds.has(note.id);
          const zIndex = liftOrder > 0 ? notes.length + liftOrder : notes.length - index;

          return (
            <motion.article
              key={note.id}
              onMouseEnter={() => {
                if (!compact) {
                  onBringFront(note.id, { toggleActions: false });
                }
              }}
              onClick={(event) => {
                event.stopPropagation();
                onBringFront(note.id);
              }}
              initial={{
                opacity: 0,
                x: note.entryOffsetX,
                y: note.entryOffsetY,
                scale: 0.3,
                rotate: displayRotate * 0.25,
              }}
              animate={{
                opacity: 1,
                x: 0,
                y: isFocused ? -8 : 0,
                scale: isHot ? 1.1 : 1,
                rotate: displayRotate,
              }}
              exit={{
                opacity: 0,
                y: 20,
                scale: 0.85,
                rotate: displayRotate + 8,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
                mass: 0.75,
              }}
              className={`absolute cursor-pointer rounded-sm border border-black/10 ${
                compact ? "p-3" : "p-4"
              }`}
              style={{
                backgroundColor: note.color,
                left: `${boundedPosition.leftPercent}%`,
                top: `${boundedPosition.topPx}px`,
                width: `${noteSize.width}px`,
                minHeight: `${noteSize.minHeight}px`,
                zIndex,
                boxShadow: "0 10px 20px -10px rgba(0,0,0,0.48)",
                transformOrigin: "center",
              }}
            >
              {isHot ? (
                <motion.span
                  className="pointer-events-none absolute inset-[-10px] -z-10 rounded-xl"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,209,145,0.5) 0%, rgba(255,209,145,0) 72%)",
                  }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.75, 0.45] }}
                  transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}

              {isOwner ? (
                <>
                  <span className="absolute left-3 top-3 rounded-full bg-white/65 px-2 py-0.5 text-[10px] tracking-[0.16em] text-[#6B5846]">
                    我的纸条
                  </span>
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onDelete(note.id);
                    }}
                    disabled={isBusy}
                    title="删除纸条"
                    className="absolute right-3 top-3 rounded-full p-[2px] text-[#A69785] transition hover:bg-[#E8DCC9] hover:text-[#584C42] disabled:opacity-60"
                  >
                    <X className={compact ? "h-[14px] w-[14px]" : "h-4 w-4"} strokeWidth={2.5} />
                  </button>
                </>
              ) : null}

              <p
                className={`font-note break-words whitespace-pre-wrap text-[#2F2A25] ${
                  isOwner ? "pt-6" : ""
                }`}
                style={{ fontSize: `${noteSize.fontSize}px`, lineHeight: compact ? 1.65 : 1.72 }}
              >
                {note.content}
              </p>

              {isOwner ? (
                <div
                  className={`pointer-events-none absolute flex items-center gap-2.5 text-[#6E6254] ${
                    compact ? "bottom-2.5 right-2.5" : "bottom-3 right-3"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Heart className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={1.8} />
                    <span className={compact ? "text-[11px]" : "text-xs"}>{note.likeCount}</span>
                  </div>
                  {note.dislikeCount > 0 && (
                    <div className="flex items-center gap-1">
                      <ThumbsDown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={1.8} />
                      <span className={compact ? "text-[11px]" : "text-xs"}>{note.dislikeCount}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`absolute flex items-center gap-3 text-[#6E6254] transition ${
                    compact ? "bottom-2.5 right-2.5" : "bottom-3 right-3"
                  }`}
                >
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onToggleLike(note);
                    }}
                    disabled={isBusy}
                    aria-label={note.likedByViewer ? "取消点赞" : "点赞"}
                    className="flex items-center gap-1 hover:text-[#B85D61] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Heart
                      className={compact ? "h-3 w-3" : "h-3.5 w-3.5"}
                      strokeWidth={1.8}
                      fill={note.likedByViewer ? "currentColor" : "none"}
                    />
                    <span className={compact ? "text-[11px]" : "text-xs"}>{note.likeCount}</span>
                  </button>

                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onToggleDislike(note);
                    }}
                    disabled={isBusy || viewerStance === note.side}
                    title={viewerStance === note.side ? "不能踩队友哦" : "踩"}
                    aria-label={note.dislikedByViewer ? "取消踩" : "踩"}
                    className="flex items-center gap-1 hover:text-[#42506B] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ThumbsDown
                      className={compact ? "h-3 w-3" : "h-3.5 w-3.5"}
                      strokeWidth={1.8}
                      fill={note.dislikedByViewer ? "currentColor" : "none"}
                    />
                    {note.dislikeCount > 0 && (
                      <span className={compact ? "text-[11px]" : "text-xs"}>{note.dislikeCount}</span>
                    )}
                  </button>
                </div>
              )}

            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
