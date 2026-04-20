'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
  Users,
} from 'lucide-react'
import {
  createAdminCreditMember,
  deleteAdminCreditMember,
  getAdminCredits,
  reorderAdminCreditMembers,
  updateAdminCreditMember,
  upsertAdminCredits,
  type AdminCredit,
  type AdminCreditMember,
} from '@/app/actions/credits-admin'
import { getIssueDisplayTitle } from '@/lib/issue-display'
import { getCurrentOrLatestIssue } from '@/lib/issue-selection'

interface CreditsManagerIssue {
  id: string
  isCurrent: boolean
  label: string
  publishedAt: string | null
  slug: string
  sortOrder: number
  title: string
}

interface IssueCreditsManagerProps {
  issues: CreditsManagerIssue[]
  loginPath: string
}

function getDefaultIssueId(issues: CreditsManagerIssue[]) {
  return getCurrentOrLatestIssue(issues)?.id ?? ''
}

export default function IssueCreditsManager({ issues, loginPath }: IssueCreditsManagerProps) {
  const router = useRouter()
  const [selectedIssueId, setSelectedIssueId] = useState('')
  const [credit, setCredit] = useState<AdminCredit | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [expanded, setExpanded] = useState(true)

  // Credit header form
  const [editTitle, setEditTitle] = useState('')
  const [editMessage, setEditMessage] = useState('')

  // New member form
  const [addingMember, setAddingMember] = useState(false)
  const [newDepartment, setNewDepartment] = useState('')
  const [newNames, setNewNames] = useState('')

  // Inline editing
  const [editingMemberId, setEditingMemberId] = useState('')
  const [editingDepartment, setEditingDepartment] = useState('')
  const [editingNames, setEditingNames] = useState('')

  // Delete confirmation
  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState('')

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

  const applyResult = useCallback(
    (result: { success: boolean; message: string; data?: AdminCredit | null; error?: string }) => {
      if (!result.success) {
        handleGuardFailure(result.error, result.message)
        return
      }
      setCredit(result.data ?? null)
      if (result.data) {
        setEditTitle(result.data.title)
        setEditMessage(result.data.message)
      }
      if (result.message) {
        setMessage(result.message)
        setIsError(false)
      }
    },
    [handleGuardFailure]
  )

  const loadCredits = useCallback(
    async (issueId: string) => {
      if (!issueId) {
        setCredit(null)
        setLoading(false)
        return
      }
      setLoading(true)
      const result = await getAdminCredits(issueId)
      applyResult(result)
      if (result.data) {
        setEditTitle(result.data.title)
        setEditMessage(result.data.message)
      } else {
        setEditTitle('')
        setEditMessage('')
      }
      setLoading(false)
    },
    [applyResult]
  )

  useEffect(() => {
    if (issues.length > 0 && !selectedIssueId) {
      setSelectedIssueId(getDefaultIssueId(issues))
    }
  }, [issues, selectedIssueId])

  useEffect(() => {
    if (selectedIssueId) {
      void loadCredits(selectedIssueId)
    }
  }, [selectedIssueId, loadCredits])

  // ── Save header ───────────────────────────────────────────

  const handleSaveHeader = async () => {
    if (!editTitle.trim() || !selectedIssueId) return
    setBusy(true)
    setMessage('')
    const result = await upsertAdminCredits(selectedIssueId, {
      title: editTitle,
      message: editMessage,
    })
    applyResult(result)
    setBusy(false)
  }

  // ── Member CRUD ───────────────────────────────────────────

  const handleCreateMember = async () => {
    if (!newDepartment.trim() || !credit) return
    setBusy(true)
    setMessage('')
    const result = await createAdminCreditMember({
      creditId: credit.id,
      department: newDepartment,
      names: newNames,
    })
    applyResult(result)
    if (result.success) {
      setNewDepartment('')
      setNewNames('')
      setAddingMember(false)
    }
    setBusy(false)
  }

  const handleUpdateMember = async (memberId: string) => {
    setBusy(true)
    setMessage('')
    const result = await updateAdminCreditMember(memberId, {
      department: editingDepartment,
      names: editingNames,
    })
    applyResult(result)
    setEditingMemberId('')
    setBusy(false)
  }

  const handleDeleteMember = async (memberId: string) => {
    setBusy(true)
    setMessage('')
    const result = await deleteAdminCreditMember(memberId)
    applyResult(result)
    setConfirmDeleteMemberId('')
    setBusy(false)
  }

  const handleMoveMember = async (index: number, direction: -1 | 1) => {
    if (!credit) return
    const members = credit.members
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= members.length) return

    const reordered = [...members]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    // Optimistic update
    setCredit({ ...credit, members: reordered })

    setBusy(true)
    setMessage('')
    const result = await reorderAdminCreditMembers(
      credit.id,
      reordered.map((m) => m.id)
    )
    applyResult(result)
    setBusy(false)
  }

  const selectedIssue = issues.find((i) => i.id === selectedIssueId) ?? null

  return (
    <section className="rounded-3xl border border-[#E8E4DF] bg-white/70 p-6 backdrop-blur-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-[#F7F5F0] p-3">
          <Users className="h-5 w-5 text-[#A1887F]" />
        </div>
        <div>
          <h2 className="font-youyou text-2xl text-[#3A3A3A]">制作团队管理</h2>
          <p className="mt-1 text-sm text-[#8D8D8D]">
            管理每期期刊的制作团队信息，包括各部门及成员名单。
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
              {issue.label} · {getIssueDisplayTitle(issue)}
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
          正在读取制作团队...
        </div>
      ) : !selectedIssue ? (
        <div className="py-10 text-center text-sm text-[#8D8D8D]">
          请先选择一期期刊。
        </div>
      ) : (
        <>
          {/* Title & message editor */}
          <div className="mb-4 space-y-3 rounded-2xl border border-[#E8E4DF] bg-[#FDFCFB] p-4">
            <div>
              <label className="mb-1 block text-xs text-[#8D8D8D]">标题</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="如：第三看 《月经》制作团队"
                className="w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm text-[#3A3A3A] outline-none focus:border-[#A1887F]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#8D8D8D]">结尾寄语</label>
              <input
                type="text"
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="如：感谢每一位读者与支持者！"
                className="w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm text-[#3A3A3A] outline-none focus:border-[#A1887F]"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSaveHeader()}
              disabled={busy || !editTitle.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3A3A3A] px-5 py-2.5 text-sm text-white transition-colors hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="font-youyou">{credit ? '保存修改' : '创建制作团队'}</span>
            </button>
          </div>

          {/* Members list */}
          {credit && (
            <div className="rounded-2xl border border-[#E8E4DF] bg-[#FDFCFB] overflow-hidden">
              <div
                className="flex items-center gap-2 px-4 py-3 bg-[#F7F5F0]/60 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
              >
                <button type="button" className="shrink-0 rounded p-0.5 text-[#8D8D8D] hover:text-[#3A3A3A]">
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <span className="flex-1 font-youyou text-sm text-[#3A3A3A]">部门列表</span>
                <span className="text-[10px] text-[#B0B0B0]">{credit.members.length} 个部门</span>
              </div>

              {expanded && (
                <div className="border-t border-[#E8E4DF]/60 px-4 py-3">
                  {credit.members.length === 0 && (
                    <p className="text-xs text-[#B0B0B0]">暂无部门，请先添加。</p>
                  )}

                  {credit.members.map((member, idx) => {
                    const isEditingThis = editingMemberId === member.id
                    const isConfirmingDelete = confirmDeleteMemberId === member.id

                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#F7F5F0]/80"
                      >
                        <GripVertical className="h-3 w-3 shrink-0 text-[#D7CCC8]" />

                        {isEditingThis ? (
                          <>
                            <input
                              type="text"
                              value={editingDepartment}
                              onChange={(e) => setEditingDepartment(e.target.value)}
                              placeholder="部门"
                              className="w-20 rounded border border-[#A1887F] bg-white px-2 py-1 text-xs text-[#3A3A3A] outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleUpdateMember(member.id)
                                if (e.key === 'Escape') setEditingMemberId('')
                              }}
                              autoFocus
                            />
                            <input
                              type="text"
                              value={editingNames}
                              onChange={(e) => setEditingNames(e.target.value)}
                              placeholder="成员名单"
                              className="flex-1 rounded border border-[#A1887F] bg-white px-2 py-1 text-xs text-[#3A3A3A] outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleUpdateMember(member.id)
                                if (e.key === 'Escape') setEditingMemberId('')
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => void handleUpdateMember(member.id)}
                              disabled={busy}
                              className="shrink-0 rounded bg-[#3A3A3A] px-2 py-1 text-[10px] text-white hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
                            >
                              <Save className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMemberId('')}
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
                                setEditingMemberId(member.id)
                                setEditingDepartment(member.department)
                                setEditingNames(member.names)
                              }}
                              className="w-20 shrink-0 text-left text-xs font-medium text-[#8D6E63] hover:text-[#A1887F]"
                              title="点击编辑"
                            >
                              {member.department}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMemberId(member.id)
                                setEditingDepartment(member.department)
                                setEditingNames(member.names)
                              }}
                              className="flex-1 text-left text-xs text-[#3A3A3A] hover:text-[#A1887F]"
                              title="点击编辑"
                            >
                              {member.names}
                            </button>

                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => void handleMoveMember(idx, -1)}
                                disabled={idx === 0 || busy}
                                className="rounded px-1 py-0.5 text-[10px] text-[#8D8D8D] hover:bg-[#E8E4DF] disabled:opacity-30"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleMoveMember(idx, 1)}
                                disabled={idx === credit.members.length - 1 || busy}
                                className="rounded px-1 py-0.5 text-[10px] text-[#8D8D8D] hover:bg-[#E8E4DF] disabled:opacity-30"
                              >
                                ↓
                              </button>

                              {isConfirmingDelete ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteMember(member.id)}
                                    disabled={busy}
                                    className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-700"
                                  >
                                    确认
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteMemberId('')}
                                    className="rounded border border-[#D7CCC8] px-1.5 py-0.5 text-[10px] text-[#7C746D]"
                                  >
                                    取消
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteMemberId(member.id)}
                                  disabled={busy}
                                  className="rounded px-0.5 py-0.5 text-[#C0C0C0] hover:text-red-500"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* Add member form */}
                  {addingMember ? (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-[#D7CCC8] bg-[#FDFCFB] px-3 py-2">
                      <input
                        type="text"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        placeholder="部门名称"
                        className="w-20 rounded border border-[#E8E4DF] bg-white px-2 py-1 text-xs text-[#3A3A3A] outline-none focus:border-[#A1887F]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleCreateMember()
                        }}
                        autoFocus
                      />
                      <input
                        type="text"
                        value={newNames}
                        onChange={(e) => setNewNames(e.target.value)}
                        placeholder="成员名单（如：张三、李四、王五）"
                        className="flex-1 rounded border border-[#E8E4DF] bg-white px-2 py-1 text-xs text-[#3A3A3A] outline-none focus:border-[#A1887F]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleCreateMember()
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateMember()}
                        disabled={busy || !newDepartment.trim()}
                        className="shrink-0 rounded-lg bg-[#3A3A3A] px-3 py-1 text-[10px] text-white hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
                      >
                        添加
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingMember(false)
                          setNewDepartment('')
                          setNewNames('')
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
                        setAddingMember(true)
                        setNewDepartment('')
                        setNewNames('')
                      }}
                      className="mt-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] text-[#A1887F] hover:bg-[#F7F5F0]"
                    >
                      <Plus className="h-3 w-3" />
                      添加部门
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {!credit && !loading && (
            <div className="mt-4 text-center text-sm text-[#B0B0B0]">
              这一期还没有制作团队信息，请在上方填写标题和寄语后点击「创建制作团队」。
            </div>
          )}
        </>
      )}
    </section>
  )
}
