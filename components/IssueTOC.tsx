"use client";

import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import type { TOCSection } from "@/lib/issue-toc";
import { getAuthorArticlesSearchHref } from "@/lib/author-search";
import {
  getClickedArticleHrefSet,
  recordClickedArticleHref,
} from "@/lib/article-click-history";
import Link from "next/link";

/* ── Visual presets cycled per card ─────────────────────── */

const CARD_STYLES = [
  { color: "bg-[#F9F6F0]", tapeColor: "bg-[#A1887F]/40", rotation: "-rotate-1" },
  { color: "bg-[#FDFBF7]", tapeColor: "bg-[#C5B3A6]/40", rotation: "rotate-1" },
  { color: "bg-[#FAF8F5]", tapeColor: "bg-[#D7CCC8]/50", rotation: "-rotate-[1.5deg]" },
  { color: "bg-[#F7F4EB]", tapeColor: "bg-[#8D6E63]/30", rotation: "rotate-[0.5deg]" },
  { color: "bg-[#F4F0E6]", tapeColor: "bg-[#A1887F]/30", rotation: "-rotate-1" },
  { color: "bg-[#F9F5F0]", tapeColor: "bg-[#D7CCC8]/60", rotation: "rotate-[1.5deg]" },
  { color: "bg-[#FDFBF7]", tapeColor: "bg-[#C5B3A6]/50", rotation: "rotate-0" },
];

const NOISE_BG =
  'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")';

/* ── Section Card ───────────────────────────────────────── */

function SectionCard({
  section,
  index,
  clickedArticleHrefs,
  onTrackArticleClick,
}: {
  section: TOCSection;
  index: number;
  clickedArticleHrefs: Set<string>;
  onTrackArticleClick: (href: string) => void;
}) {
  const style = CARD_STYLES[index % CARD_STYLES.length];
  const tapePos =
    index % 2 === 0
      ? "-top-3 left-10 -rotate-3"
      : "-top-3 right-10 rotate-3";
  
  // 检查是否为辩题相关的section
  const isDebateSection = section.displayName.includes("辩题") || section.displayName.includes("以辩会友");

  if (section.isStandalone) {
    const cardContent = (
      <div
        id={isDebateSection ? "debate-end" : undefined} // 添加id
        className={`relative rounded-sm p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:-translate-y-1 sm:col-span-2 max-w-lg mx-auto w-full flex justify-center items-center ${style.color} ${style.rotation}`}
      >
        {/* Washi Tape */}
        <div
          className={`absolute w-32 h-7 ${style.tapeColor} z-20 backdrop-blur-sm shadow-sm opacity-90 -top-3 left-1/2 -translate-x-1/2 rotate-1`}
          style={{
            clipPath:
              "polygon(5% 0, 95% 5%, 100% 90%, 5% 100%, 0 45%)",
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.4) 5px, rgba(255,255,255,0.4) 10px)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-sm"
          style={{ backgroundImage: NOISE_BG }}
        />

        <div className="relative z-10 flex items-center justify-center border-2 border-dashed border-[#A1887F]/40 p-4 w-full rounded-sm">
          <h3 className="text-xl font-bold tracking-widest text-[#4A3B32] md:text-2xl font-serif text-center">
            {section.displayName}
          </h3>
        </div>
      </div>
    );

    if (section.customHref) {
      return (
        <Link href={section.customHref} className="block sm:col-span-2 max-w-lg mx-auto w-full">
          {/* We replace the card's external positioning classes with the wrapper ones, but keep inner styles */}
          <div
            id={isDebateSection ? "debate-end" : undefined} // 添加id
            className={`relative rounded-sm p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:-translate-y-1 w-full flex justify-center items-center ${style.color} ${style.rotation}`}
          >
            {/* Washi Tape */}
            <div
              className={`absolute w-32 h-7 ${style.tapeColor} z-20 backdrop-blur-sm shadow-sm opacity-90 -top-3 left-1/2 -translate-x-1/2 rotate-1`}
              style={{
                clipPath:
                  "polygon(5% 0, 95% 5%, 100% 90%, 5% 100%, 0 45%)",
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.4) 5px, rgba(255,255,255,0.4) 10px)",
              }}
            />

            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-sm"
              style={{ backgroundImage: NOISE_BG }}
            />

            <div className="relative z-10 flex items-center justify-center border-2 border-dashed border-[#A1887F]/40 p-4 w-full rounded-sm">
              <h3 className="text-xl font-bold tracking-widest text-[#4A3B32] md:text-2xl font-serif text-center">
                {section.displayName}
              </h3>
            </div>
          </div>
        </Link>
      );
    }

    return cardContent;
  }

  return (
    <div
      id={isDebateSection ? "debate-end" : undefined} // 添加id
      className={`relative rounded-sm p-5 sm:p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05),_0_1px_3px_rgba(0,0,0,0.02)] transition-transform duration-300 hover:-translate-y-1 ${style.color} ${style.rotation}`}
    >
      {/* Paper texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-sm"
        style={{ backgroundImage: NOISE_BG }}
      />

      {/* Washi Tape */}
      <div
        className={`absolute w-24 h-6 ${style.tapeColor} z-20 backdrop-blur-sm shadow-sm opacity-90 ${tapePos}`}
        style={{
          clipPath: "polygon(2% 0, 98% 2%, 100% 100%, 0 98%)",
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)",
          backgroundSize: "6px 6px",
        }}
      />

      {/* Section Header */}
      <div className="relative z-10 flex w-full items-center gap-3 pb-3 text-left">
        <Paperclip
          className="h-5 w-5 text-[#8D6E63]/60 -rotate-45"
          strokeWidth={1.5}
        />
        <h3 className="text-xl font-bold tracking-wider text-[#4A3B32] md:text-2xl font-serif">
          {section.displayName}
        </h3>
      </div>

      {/* Article list */}
      <div className="relative z-10 mt-2">
        <ul className="space-y-0 pl-1">
          {section.items.map((item) => {
            const itemHref = item.customHref
              ? item.customHref
              : item.articleSlug
                ? `/articles/${item.articleSlug}?articleId=${item.id}`
                : null;
            const isArticleHref = Boolean(item.articleSlug && itemHref);
            const isClicked = isArticleHref && itemHref ? clickedArticleHrefs.has(itemHref) : false;
            const authorHref = getAuthorArticlesSearchHref(item.author);

            const titleClass =
              `text-[1rem] leading-relaxed transition-colors duration-200 ${
                isClicked
                  ? "text-[#B8B8B8] hover:text-[#A5A5A5]"
                  : "text-[#5C4D43] group-hover/item:text-[#241A14]"
              }`;
            const titleClassMobile =
              `text-[0.95rem] leading-relaxed transition-colors duration-200 block ${
                isClicked
                  ? "text-[#B8B8B8] hover:text-[#A5A5A5]"
                  : "text-[#5C4D43] group-hover/item:text-[#241A14]"
              }`;

            return (
              <li
                key={item.id}
                id={item.id} // 添加 ID 属性
                className="group/item py-1.5 min-h-[32px]"
              >
                {/* Desktop: title → article, author → search */}
                <div className="hidden md:flex items-end justify-between gap-3">
                  {itemHref ? (
                    <Link
                      href={itemHref}
                      className={titleClass}
                      onClick={() => {
                        if (isArticleHref) {
                          onTrackArticleClick(itemHref);
                        }
                      }}
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span className={titleClass}>{item.title}</span>
                  )}
                  <span className="flex-1 border-b-2 border-dotted border-[#D7CCC8]/60 mb-[6px] mx-2 min-w-[2rem] group-hover/item:border-[#8D6E63]/40 transition-colors duration-200" />
                  {authorHref ? (
                    <Link
                      href={authorHref}
                      className="flex-shrink-0 text-[0.9rem] tracking-wide text-[#A08979] italic transition-colors hover:text-[#8D6E63]"
                    >
                      {item.author}
                    </Link>
                  ) : (
                    <span className="flex-shrink-0 text-[0.9rem] tracking-wide text-[#A08979] italic">
                      {item.author}
                    </span>
                  )}
                </div>
                {/* Mobile */}
                <div className="md:hidden">
                  {itemHref ? (
                    <Link
                      href={itemHref}
                      className={titleClassMobile}
                      onClick={() => {
                        if (isArticleHref) {
                          onTrackArticleClick(itemHref);
                        }
                      }}
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span className={titleClassMobile}>{item.title}</span>
                  )}
                  <div className="text-[0.8rem] tracking-wide text-[#A08979] italic block text-right mt-0.5">
                    ——{" "}
                    {authorHref ? (
                      <Link href={authorHref} className="transition-colors hover:text-[#8D6E63]">
                        {item.author}
                      </Link>
                    ) : (
                      item.author
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

interface IssueTOCProps {
  sections: TOCSection[];
  issueLabel?: string | null;
}

export default function IssueTOC({ sections, issueLabel }: IssueTOCProps) {
  const [clickedArticleHrefs, setClickedArticleHrefs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setClickedArticleHrefs(getClickedArticleHrefSet());
  }, []);

  const handleTrackArticleClick = (href: string) => {
    setClickedArticleHrefs(recordClickedArticleHref(href));
  };

  if (sections.length === 0) {
    return null;
  }

  // Derive a display title from the issue label, e.g. "V3" → "第三看目录"
  const issueNumber = issueLabel?.replace(/\D/g, "") ?? "";
  const displayTitle = issueNumber
    ? `第${numberToChinese(issueNumber)}看目录`
    : "本期目录";

  return (
    <section className="relative overflow-hidden rounded-[2.2rem] bg-[#F4F0E6] p-6 shadow-[0_24px_60px_-44px_rgba(56,39,24,0.5)] md:p-12 lg:p-16">
      {/* Journal Canvas Background */}
      <div
        className="pointer-events-none absolute inset-0 bg-[#F4F0E6]"
        style={{
          backgroundImage:
            "radial-gradient(#D7CCC8 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: NOISE_BG }}
      />

      {/* Postmark Stamp */}
      <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full border-[4px] border-dashed border-[#A1887F]/30 flex flex-col items-center justify-center rotate-[-15deg] pointer-events-none opacity-60">
        <div className="text-[12px] text-[#A1887F]/80 font-sans tracking-[0.2em]">
          TABLE OF
        </div>
        <div className="text-[20px] text-[#A1887F] font-bold border-y-2 border-[#A1887F]/40 my-1 px-4 tracking-[0.3em]">
          CONTENTS
        </div>
        <div className="text-[12px] text-[#A1887F]/80 font-sans tracking-wide">
          {issueLabel ? `ISSUE ${issueNumber || issueLabel}` : "INDEX"}
        </div>
      </div>

      {/* Corner Paper Pieces */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-[#E8E4DF] z-0 transform -translate-x-12 -translate-y-12 rotate-45 shadow-sm" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#E8E4DF] z-0 transform -translate-x-10 translate-y-10 rotate-12 shadow-sm" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-6 md:gap-10">
            <div className="hidden md:block h-[2px] w-12 border-t-2 border-dotted border-[#A1887F]/40" />
            <div className="flex flex-col items-center">
              <p className="text-xs font-semibold tracking-[0.4em] text-[#A1887F] mb-4 uppercase font-sans">
                Table of Contents
              </p>
              <h2 className="font-youyou text-[2.4rem] tracking-[0.18em] text-[#3A2C24] md:text-[3.2rem] leading-none drop-shadow-sm ml-[0.18em]">
                {displayTitle}
              </h2>
            </div>
            <div className="hidden md:block h-[2px] w-12 border-t-2 border-dotted border-[#A1887F]/40" />
          </div>
        </div>

        {/* Section Cards */}
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          {sections.map((section, i) => (
            <SectionCard
              key={section.id}
              section={section}
              index={i}
              clickedArticleHrefs={clickedArticleHrefs}
              onTrackArticleClick={handleTrackArticleClick}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Helpers ─────────────────────────────────────────────── */

const CHINESE_NUMBERS = [
  "零",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
];

function numberToChinese(numStr: string): string {
  const n = parseInt(numStr, 10);

  if (Number.isNaN(n) || n < 0) {
    return numStr;
  }

  if (n <= 10) {
    return CHINESE_NUMBERS[n];
  }

  if (n < 20) {
    return `十${n === 10 ? "" : CHINESE_NUMBERS[n - 10]}`;
  }

  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${CHINESE_NUMBERS[tens]}十${ones === 0 ? "" : CHINESE_NUMBERS[ones]}`;
  }

  return numStr;
}
