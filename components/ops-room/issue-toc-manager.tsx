'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  List,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import {
  createAdminTocItem,
  createAdminTocSection,
  deleteAdminTocItem,
  deleteAdminTocSection,
  generateAdminTocFromArticles,
  getAdminTocSections,
  reorderAdminTocItems,
  reorderAdminTocSections,
  updateAdminTocItem,
  updateAdminTocSection,
  type AdminTocItem,
  type AdminTocSection,
} from '@/app/actions/toc-admin'
import { getIssueDisplayTitle } from '@/lib/issue-display'

interface TocManagerIssue {
  id: string
  isCurrent: boolean
  label: string
  publishedAt: string | null
  slug: string
  sortOrder: number
  title: string
}

interface IssueTocManagerProps {
  issues: TocManagerIssue[]
  loginPath: string
}

function getDefaultIssueId(issues: TocManagerIssue[]) {
  const currentIssue = issues.find((issue) => issue.isCurrent)
  if (currentIssue) return currentIssue.id
  return [...issues].sort((l, r) => r.sortOrder - l.sortOrder)[0]?.id ?? ''
}

function getIssueStatusLabel(issue: TocManagerIssue | null) {
  if (!issue?.publishedAt) return '未排期'
  const t = new Date(issue.publishedAt).getTime()
  if (Number.isNaN(t)) return '未排期'
  return t <= Date.now() ? '已上线' : '定时中'
}

function isAutoSyncSection(displayName: string) {
  return (
    displayName.includes('画里有话') ||
    displayName.includes('画里话外') ||
    displayName.includes('辩题') ||
    displayName.includes('以辩会友')
  )
}

export default function IssueTocManager({ issues, loginPath }: IssueTocManagerProps) {
  const router = useRouter()
  const [selectedIssueId, setSelectedIssueId] = useState('')
  const [sections, setSections] = useState<AdminTocSection[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // New section form
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionStandalone, setNewSectionStandalone] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [confirmGenerate, setConfirmGenerate] = useState(false)

  // New item form per section
  const [addingItemSectionId, setAddingItemSectionId] = useState('')
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemAuthor, setNewItemAuthor] = useState('')

  // Inline editing
  const [editingSectionId, setEditingSectionId] = useState('')
  const [editingSectionName, setEditingSectionName] = useState('')
  const [editingItemId, setEditingItemId] = useState('')
  const [editingItemTitle, setEditingItemTitle] = useState('')
  const [editingItemAuthor, setEditingItemAuthor] = useState('')

  // Delete confirmation
  const [confirmDeleteSectionId, setConfirmDeleteSectionId] = useState('')
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState('')

  // Debounced reorder refs
  const sectionReorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemReorderTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const selectedIssue = issues.find((i) => i.id === selectedIssueId) ?? null

  const handleGuardFailure = useCallback(
    (error?: string, fallbackMessage?: string) => {
      if (error === 'NOT_AUTHENTICATED') {
        router.replace(loginPath)
        return true
      }
      if (fallbackMessage) {
        setMessage(fallbackMessage)
        setIsError(true)
      }
      return false
    },
    [loginPath, router]
  )

  const applySections = useCallback(
    (result: { success: boolean; message: string; data?: AdminTocSection[]; error?: string }) => {
      if (!result.success) {
        handleGuardFailure(result.error, result.message)
        return
      }
      setSections(result.data ?? [])
      if (result.message) {
        setMessage(result.message)
        setIsError(false)
      }
    },
    [handleGuardFailure]
  )

  const loadSections = useCallback(
    async (issueId: string) => {
      if (!issueId) {
        setSections([])
        setLoading(false)
        return
      }
      setLoading(true)
      const result = await getAdminTocSections(issueId)
      applySections(result)
      // expand all sections on load
      if (result.data) {
        setExpandedSections(new Set(result.data.map((s) => s.id)))
      }
      setLoading(false)
    },
    [applySections]
  )

  useEffect(() => {
    if (issues.length > 0 && !selectedIssueId) {
      setSelectedIssueId(getDefaultIssueId(issues))
    }
  }, [issues, selectedIssueId])

  useEffect(() => {
    if (selectedIssueId) {
      void loadSections(selectedIssueId)
    }
  }, [selectedIssueId, loadSections])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  // ── Generate from articles ─────────────────────────────

  const handleGenerate = async () => {
    if (!selectedIssueId) return
    setGenerating(true)
    setConfirmGenerate(false)
    setMessage('')
    setIsError(false)
    const result = await generateAdminTocFromArticles(selectedIssueId)
    applySections(result)
    if (result.data) {
      setExpandedSections(new Set(result.data.map((s) => s.id)))
    }
    setGenerating(false)
  }

  // ── Section CRUD ─────────────────────────────────────────

  const handleCreateSection = async () => {
    if (!newSectionName.trim() || !selectedIssueId) return
    setBusy(true)
    setMessage('')
    const result = await createAdminTocSection({
      issueId: selectedIssueId,
      displayName: newSectionName,
      isStandalone: newSectionStandalone,
    })
    applySections(result)
    if (result.success) {
      setNewSectionName('')
      setNewSectionStandalone(false)
      // expand new section
      if (result.data) {
        setExpandedSections(new Set(result.data.map((s) => s.id)))
      }
    }
    setBusy(false)
  }

  const handleUpdateSection = async (sectionId: string) => {
    if (!editingSectionName.trim()) return
    setBusy(true)
    setMessage('')
    const result = await updateAdminTocSection(sectionId, {
      displayName: editingSectionName,
    })
    applySections(result)
    setEditingSectionId('')
    setBusy(false)
  }

  const handleToggleStandalone = async (section: AdminTocSection) => {
    setBusy(true)
    setMessage('')
    const result = await updateAdminTocSection(section.id, {
      isStandalone: !section.isStandalone,
    })
    applySections(result)
    setBusy(false)
  }

  const handleDeleteSection = async (sectionId: string) => {
    setBusy(true)
    setMessage('')
    const result = await deleteAdminTocSection(sectionId)
    applySections(result)
    setConfirmDeleteSectionId('')
    setBusy(false)
  }

  const handleMoveSection = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sections.length) return

    const reordered = [...sections]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    // Optimistic update – instant
    setSections(reordered)
    setMessage('')

    // Debounce: only send the final order to server after 400ms of inactivity
    if (sectionReorderTimer.current) clearTimeout(sectionReorderTimer.current)
    const issueId = selectedIssueId
    const orderedIds = reordered.map((s) => s.id)
    sectionReorderTimer.current = setTimeout(async () => {
      const result = await reorderAdminTocSections(issueId, orderedIds)
      if (!result.success) {
        handleGuardFailure(result.error, result.message)
        // Reload to get the true server state
        loadSections(issueId)
      }
    }, 400)
  }

  // ── Item CRUD ────────────────────────────────────────────

  const handleCreateItem = async (sectionId: string) => {
    if (!newItemTitle.trim()) return
    setBusy(true)
    setMessage('')
    const result = await createAdminTocItem({
      sectionId,
      title: newItemTitle,
      author: newItemAuthor,
    })
    applySections(result)
    if (result.success) {
      setNewItemTitle('')
      setNewItemAuthor('')
      setAddingItemSectionId('')
    }
    setBusy(false)
  }

  const handleUpdateItem = async (itemId: string) => {
    setBusy(true)
    setMessage('')
    const result = await updateAdminTocItem(itemId, {
      title: editingItemTitle,
      author: editingItemAuthor,
    })
    applySections(result)
    setEditingItemId('')
    setBusy(false)
  }

  const handleDeleteItem = async (itemId: string) => {
    setBusy(true)
    setMessage('')
    const result = await deleteAdminTocItem(itemId)
    applySections(result)
    setConfirmDeleteItemId('')
    setBusy(false)
  }

  const handleMoveItem = (section: AdminTocSection, itemIndex: number, direction: -1 | 1) => {
    const newIndex = itemIndex + direction
    if (newIndex < 0 || newIndex >= section.items.length) return

    const reorderedItems = [...section.items]
    const [moved] = reorderedItems.splice(itemIndex, 1)
    reorderedItems.splice(newIndex, 0, moved)

    // Optimistic update – instant
    setSections((prev) =>
      prev.map((s) => (s.id === section.id ? { ...s, items: reorderedItems } : s))
    )
    setMessage('')

    // Debounce: only send the final order to server after 400ms of inactivity
    const timers = itemReorderTimers.current
    const existing = timers.get(section.id)
    if (existing) clearTimeout(existing)
    const sectionId = section.id
    const orderedIds = reorderedItems.map((i) => i.id)
    const issueId = selectedIssueId
    timers.set(
      sectionId,
      setTimeout(async () => {
        timers.delete(sectionId)
        const result = await reorderAdminTocItems(sectionId, orderedIds)
        if (!result.success) {
          handleGuardFailure(result.error, result.message)
          loadSections(issueId)
        }
      }, 400)
    )
  }

  return (
    <section className="rounded-3xl border border-[#E8E4DF] bg-white/70 p-6 backdrop-blur-sm lg:col-span-2">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-[#F7F5F0] p-3">
          <List className="h-5 w-5 text-[#A1887F]" />
        </div>
        <div>
          <h2 className="font-youyou text-2xl text-[#3A3A3A]">目录管理</h2>
          <p className="mt-1 text-sm text-[#8D8D8D]">
            一键从文章数据生成目录，可自定义栏目排列顺序。
          </p>
        </div>
      </div>

      {/* Issue selector */}
      <div className="mb-5 rounded-2xl border border-[#E8E4DF] bg-[#F7F5F0] p-4">
        <label className="mb-2 block text-xs font-youyou uppercase tracking-[0.2em] text-[#8D8D8D]">
          选择期刊
        </label>
        <select
          value={selectedIssueId}
          onChange={(e) => setSelectedIssueId(e.target.value)}
          disabled={issues.length === 0}
          className="w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2.5 text-sm text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F] disabled:bg-[#F1EEEA] disabled:text-[#A8A19A]"
        >
          {issues.map((issue) => (
            <option key={issue.id} value={issue.id}>
              {issue.label} · {getIssueDisplayTitle(issue)} ({getIssueStatusLabel(issue)})
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            isError
              ? 'border-red-100 bg-red-50 text-red-600'
              : 'border-green-100 bg-green-50 text-green-600'
          }`}
        >
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-[#8D8D8D]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          正在读取目录...
        </div>
      ) : !selectedIssue ? (
        <div className="py-10 text-center text-sm text-[#8D8D8D]">
          请先选择一期期刊。
        </div>
      ) : (
        <>
          {/* Generate button */}
          <div className="mb-4 flex items-center gap-3">
            {confirmGenerate ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                <span className="text-sm text-amber-700">
                  {sections.length > 0
                    ? '将清除当前目录并从文章重新生成，确认？'
                    : '确认从文章生成目录？'}
                </span>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#3A3A3A] px-3 py-1.5 text-xs text-white hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
                >
                  {generating && <Loader2 className="h-3 w-3 animate-spin" />}
                  确认生成
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmGenerate(false)}
                  className="rounded-lg border border-[#D7CCC8] px-3 py-1.5 text-xs text-[#7C746D] hover:border-[#A1887F]"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmGenerate(true)}
                disabled={generating || busy || !selectedIssueId}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3A3A3A] px-5 py-2.5 text-sm text-white transition-colors hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <List className="h-4 w-4" />
                )}
                <span className="font-youyou">
                  {sections.length > 0 ? '重新生成目录' : '一键生成目录'}
                </span>
              </button>
            )}
          </div>

          {/* Section list */}
          <div className="space-y-3">
            {sections.map((section, sectionIndex) => {
              const isExpanded = expandedSections.has(section.id)
              const autoSync = isAutoSyncSection(section.displayName)
              const isEditingThis = editingSectionId === section.id
              const isConfirmingDelete = confirmDeleteSectionId === section.id

              return (
                <div
                  key={section.id}
                  className="rounded-2xl border border-[#E8E4DF] bg-[#FDFCFB] overflow-hidden"
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#F7F5F0]/60">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="shrink-0 rounded p-0.5 text-[#8D8D8D] hover:text-[#3A3A3A]"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-[#D7CCC8]" />

                    {isEditingThis ? (
                      <input
                        type="text"
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleUpdateSection(section.id)
                          if (e.key === 'Escape') setEditingSectionId('')
                        }}
                        autoFocus
                        className="flex-1 rounded-lg border border-[#A1887F] bg-white px-2 py-1 text-sm text-[#3A3A3A] outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionId(section.id)
                          setEditingSectionName(section.displayName)
                        }}
                        className="flex-1 text-left font-youyou text-sm text-[#3A3A3A] hover:text-[#A1887F]"
                        title="点击编辑栏目名"
                      >
                        {section.displayName}
                      </button>
                    )}

                    {autoSync && (
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-500">
                        自动同步
                      </span>
                    )}

                    {section.isStandalone && (
                      <span className="shrink-0 rounded-full bg-[#EFEBE9] px-2 py-0.5 text-[10px] text-[#7D7D7D]">
                        独立栏目
                      </span>
                    )}

                    <span className="shrink-0 text-[10px] text-[#B0B0B0]">
                      {section.items.length} 条
                    </span>

                    {isEditingThis ? (
                      <button
                        type="button"
                        onClick={() => void handleUpdateSection(section.id)}
                        disabled={busy}
                        className="shrink-0 rounded-lg bg-[#3A3A3A] px-2.5 py-1 text-[10px] text-white hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
                      >
                        <Save className="h-3 w-3" />
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleMoveSection(sectionIndex, -1)}
                          disabled={sectionIndex === 0 || busy}
                          className="rounded px-1.5 py-0.5 text-[10px] text-[#8D8D8D] hover:bg-[#E8E4DF] disabled:opacity-30"
                          title="上移"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleMoveSection(sectionIndex, 1)}
                          disabled={sectionIndex === sections.length - 1 || busy}
                          className="rounded px-1.5 py-0.5 text-[10px] text-[#8D8D8D] hover:bg-[#E8E4DF] disabled:opacity-30"
                          title="下移"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleStandalone(section)}
                          disabled={busy}
                          className="rounded px-1.5 py-0.5 text-[10px] text-[#8D8D8D] hover:bg-[#E8E4DF]"
                          title={section.isStandalone ? '取消独立栏目' : '设为独立栏目'}
                        >
                          {section.isStandalone ? '取消独立' : '设独立'}
                        </button>

                        {isConfirmingDelete ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSection(section.id)}
                              disabled={busy}
                              className="rounded bg-red-600 px-2 py-0.5 text-[10px] text-white hover:bg-red-700 disabled:bg-red-300"
                            >
                              确认
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteSectionId('')}
                              className="rounded border border-[#D7CCC8] px-2 py-0.5 text-[10px] text-[#7C746D] hover:border-[#A1887F]"
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSectionId(section.id)}
                            disabled={busy}
                            className="rounded px-1 py-0.5 text-[#B0B0B0] hover:text-red-500"
                            title="删除栏目"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  {isExpanded && (
                    <div className="border-t border-[#E8E4DF]/60 px-4 py-3">
                      {section.items.length === 0 && !autoSync ? (
                        <p className="text-xs text-[#B0B0B0]">暂无条目</p>
                      ) : null}

                      {section.items.map((item, itemIndex) => {
                        const isEditingThisItem = editingItemId === item.id
                        const isConfirmingDeleteItem = confirmDeleteItemId === item.id

                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#F7F5F0]/80"
                          >
                            <span className="w-5 shrink-0 text-center text-[10px] text-[#C0C0C0]">
                              {itemIndex + 1}
                            </span>

                            {isEditingThisItem ? (
                              <>
                                <input
                                  type="text"
                                  value={editingItemTitle}
                                  onChange={(e) => setEditingItemTitle(e.target.value)}
                                  placeholder="标题"
                                  className="flex-1 rounded border border-[#A1887F] bg-white px-2 py-1 text-xs text-[#3A3A3A] outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleUpdateItem(item.id)
                                    if (e.key === 'Escape') setEditingItemId('')
                                  }}
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  value={editingItemAuthor}
                                  onChange={(e) => setEditingItemAuthor(e.target.value)}
                                  placeholder="作者"
                                  className="w-24 rounded border border-[#A1887F] bg-white px-2 py-1 text-xs text-[#3A3A3A] outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleUpdateItem(item.id)
                                    if (e.key === 'Escape') setEditingItemId('')
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleUpdateItem(item.id)}
                                  disabled={busy}
                                  className="shrink-0 rounded bg-[#3A3A3A] px-2 py-1 text-[10px] text-white hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
                                >
                                  <Save className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId('')}
                                  className="shrink-0 text-[10px] text-[#8D8D8D] hover:text-[#3A3A3A]"
                                >
                                  取消
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (autoSync) return
                                    setEditingItemId(item.id)
                                    setEditingItemTitle(item.title)
                                    setEditingItemAuthor(item.author)
                                  }}
                                  disabled={autoSync}
                                  className="flex-1 text-left text-xs text-[#3A3A3A] hover:text-[#A1887F] disabled:cursor-default disabled:text-[#3A3A3A] disabled:hover:text-[#3A3A3A]"
                                  title={autoSync ? '自动同步条目不可编辑' : '点击编辑'}
                                >
                                  {item.title}
                                </button>
                                <span className="shrink-0 text-xs text-[#8D8D8D]">
                                  {item.author}
                                </span>

                                {!autoSync && (
                                  <div className="flex shrink-0 items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => void handleMoveItem(section, itemIndex, -1)}
                                      disabled={itemIndex === 0 || busy}
                                      className="rounded px-1 py-0.5 text-[10px] text-[#8D8D8D] hover:bg-[#E8E4DF] disabled:opacity-30"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleMoveItem(section, itemIndex, 1)}
                                      disabled={itemIndex === section.items.length - 1 || busy}
                                      className="rounded px-1 py-0.5 text-[10px] text-[#8D8D8D] hover:bg-[#E8E4DF] disabled:opacity-30"
                                    >
                                      ↓
                                    </button>

                                    {isConfirmingDeleteItem ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => void handleDeleteItem(item.id)}
                                          disabled={busy}
                                          className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-700"
                                        >
                                          确认
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteItemId('')}
                                          className="rounded border border-[#D7CCC8] px-1.5 py-0.5 text-[10px] text-[#7C746D]"
                                        >
                                          取消
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteItemId(item.id)}
                                        disabled={busy}
                                        className="rounded px-0.5 py-0.5 text-[#C0C0C0] hover:text-red-500"
                                      >
                                        <Trash2 className="h-2.5 w-2.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })}

                      {/* Add item form */}
                      {!autoSync && (
                        <>
                          {addingItemSectionId === section.id ? (
                            <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-[#D7CCC8] bg-[#FDFCFB] px-3 py-2">
                              <input
                                type="text"
                                value={newItemTitle}
                                onChange={(e) => setNewItemTitle(e.target.value)}
                                placeholder="标题"
                                className="flex-1 rounded border border-[#E8E4DF] bg-white px-2 py-1 text-xs text-[#3A3A3A] outline-none focus:border-[#A1887F]"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void handleCreateItem(section.id)
                                }}
                                autoFocus
                              />
                              <input
                                type="text"
                                value={newItemAuthor}
                                onChange={(e) => setNewItemAuthor(e.target.value)}
                                placeholder="作者"
                                className="w-24 rounded border border-[#E8E4DF] bg-white px-2 py-1 text-xs text-[#3A3A3A] outline-none focus:border-[#A1887F]"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void handleCreateItem(section.id)
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => void handleCreateItem(section.id)}
                                disabled={busy || !newItemTitle.trim()}
                                className="shrink-0 rounded-lg bg-[#3A3A3A] px-3 py-1 text-[10px] text-white hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
                              >
                                添加
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingItemSectionId('')
                                  setNewItemTitle('')
                                  setNewItemAuthor('')
                                }}
                                className="shrink-0 text-[10px] text-[#8D8D8D] hover:text-[#3A3A3A]"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAddingItemSectionId(section.id)
                                setNewItemTitle('')
                                setNewItemAuthor('')
                              }}
                              className="mt-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] text-[#A1887F] hover:bg-[#F7F5F0]"
                            >
                              <Plus className="h-3 w-3" />
                              添加条目
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add section form */}
          <div className="mt-4 rounded-2xl border border-dashed border-[#D7CCC8] bg-[#FDFCFB] p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="新栏目名称（如：人间剧场-小说）"
                className="flex-1 rounded-xl border border-[#E8E4DF] bg-white px-3 py-2.5 text-sm text-[#3A3A3A] outline-none focus:border-[#A1887F]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateSection()
                }}
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-[#5D5D5D]">
                <input
                  type="checkbox"
                  checked={newSectionStandalone}
                  onChange={(e) => setNewSectionStandalone(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#D7CCC8]"
                />
                独立栏目
              </label>
              <button
                type="button"
                onClick={() => void handleCreateSection()}
                disabled={busy || !newSectionName.trim() || !selectedIssueId}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#3A3A3A] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span className="font-youyou">添加栏目</span>
              </button>
            </div>
          </div>

          {sections.length === 0 && !loading && (
            <div className="mt-4 text-center text-sm text-[#B0B0B0]">
              这一期还没有目录，点击上方「一键生成目录」按钮从文章数据自动生成。
            </div>
          )}
        </>
      )}
    </section>
  )
}
