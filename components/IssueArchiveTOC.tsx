'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, ArrowRight, BookOpen, MessageCircle } from 'lucide-react'
import { getAuthorArticlesSearchHref } from '@/lib/author-search'

interface ArchiveArticle {
  id: string
  slug: string
  title: string
  author: string
  viewCount: number
  echoCount: number
  href: string
}

interface ArchiveSection {
  category: string
  title: string
  subtitle?: string
  articles: ArchiveArticle[]
  /** If set, clicking the section header navigates here instead of expanding */
  directHref?: string
}

interface IssueArchiveTOCProps {
  sections: ArchiveSection[]
}

export type { ArchiveArticle, ArchiveSection }

export default function IssueArchiveTOC({ sections }: IssueArchiveTOCProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (category: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedSections(new Set(sections.filter((s) => !s.directHref).map((s) => s.category)))
  }

  const collapseAll = () => {
    setExpandedSections(new Set())
  }

  const allExpanded = sections
    .filter((s) => !s.directHref)
    .every((s) => expandedSections.has(s.category))

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#8D8D8D]">
          {sections.length} 个栏目 · {sections.reduce((sum, s) => sum + s.articles.length, 0)} 篇
        </p>
        <button
          type="button"
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-xs text-[#A1887F] hover:text-[#8D6E63] transition-colors"
        >
          {allExpanded ? '全部收起' : '全部展开'}
        </button>
      </div>

      {/* Sections */}
      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.category)
        const isDirect = Boolean(section.directHref)

        return (
          <div
            key={section.category}
            className="rounded-2xl border border-[#E8E4DF] bg-white/80 overflow-hidden transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            {/* Section header */}
            {isDirect ? (
              <Link
                href={section.directHref!}
                className="flex items-center gap-3 px-5 py-4 group"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#CFAF9D] opacity-70" />
                <div className="flex-1 min-w-0">
                  <span className="font-youyou text-lg text-[#2C2C2C] group-hover:text-[#A1887F] transition-colors">
                    {section.title}
                  </span>
                  {section.subtitle ? (
                    <span className="ml-2 text-sm text-[#8A7A73]">
                      {section.subtitle}
                    </span>
                  ) : null}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#C5B3A6] group-hover:text-[#A1887F] transition-colors" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => toggleSection(section.category)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left group"
              >
                <span className="shrink-0 text-[#A1887F]">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-youyou text-lg text-[#2C2C2C] group-hover:text-[#A1887F] transition-colors">
                    {section.title}
                  </span>
                  {section.subtitle ? (
                    <span className="ml-2 text-sm text-[#8A7A73]">
                      {section.subtitle}
                    </span>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-[#B0B0B0]">
                  {section.articles.length} 篇
                </span>
              </button>
            )}

            {/* Expanded article list */}
            {isExpanded && !isDirect && section.articles.length > 0 && (
              <div className="border-t border-[#E8E4DF]/60">
                {section.articles.map((article, idx) => {
                  const authorHref = getAuthorArticlesSearchHref(article.author)
                  return (
                    <div
                      key={article.id}
                      className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#F7F5F0]/80 group ${
                        idx < section.articles.length - 1 ? 'border-b border-[#F0EDE8]' : ''
                      }`}
                    >
                      <span className="w-6 shrink-0 text-center text-xs text-[#C5B3A6]">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Link href={article.href} className="block">
                          <p className="text-sm text-[#3A3A3A] group-hover:text-[#A1887F] transition-colors truncate">
                            {article.title}
                          </p>
                        </Link>
                        <p className="mt-0.5 text-xs text-[#9E9E9E]">
                          {authorHref ? (
                            <Link
                              href={authorHref}
                              className="transition-colors hover:text-[#A1887F]"
                            >
                              {article.author}
                            </Link>
                          ) : (
                            article.author
                          )}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 shrink-0 text-[10px] text-[#B0B0B0]">
                        {article.viewCount > 0 && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {article.viewCount}
                          </span>
                        )}
                        {article.echoCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {article.echoCount}
                          </span>
                        )}
                      </div>
                      <Link
                        href={article.href}
                        className="shrink-0"
                        aria-label={`阅读：${article.title}`}
                      >
                        <ArrowRight className="h-3.5 w-3.5 text-[#D7CCC8] group-hover:text-[#A1887F] transition-colors" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
