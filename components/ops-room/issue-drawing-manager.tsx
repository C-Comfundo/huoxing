'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brush, ImagePlus, Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import {
  deleteAdminIssueDrawingImage,
  getAdminIssueDrawing,
  saveAdminIssueDrawing,
  uploadAdminIssueDrawingImages,
  type AdminIssueDrawing,
} from '@/app/actions/drawing-admin'
import { getIssueDisplayTitle } from '@/lib/issue-display'

interface DrawingManagerIssue {
  id: string
  isCurrent: boolean
  label: string
  publishedAt: string | null
  slug: string
  sortOrder: number
  title: string
}

interface IssueDrawingManagerProps {
  issues: DrawingManagerIssue[]
  loginPath: string
}

function getDefaultIssueId(issues: DrawingManagerIssue[]) {
  const currentIssue = issues.find((issue) => issue.isCurrent)

  if (currentIssue) {
    return currentIssue.id
  }

  return [...issues].sort((left, right) => right.sortOrder - left.sortOrder)[0]?.id ?? ''
}

function getIssueStatusLabel(issue: DrawingManagerIssue | null) {
  if (!issue?.publishedAt) {
    return '未排期'
  }

  const publishedTime = new Date(issue.publishedAt).getTime()

  if (Number.isNaN(publishedTime)) {
    return '未排期'
  }

  return publishedTime <= Date.now() ? '已上线' : '定时中'
}

function makeEmptyDrawing(issueId: string, issueSlug: string, sortOrder: number): AdminIssueDrawing {
  return {
    id: null,
    issueId,
    issueSlug,
    sortOrder,
    title: '画里有话',
    authorName: '',
    authorHandle: '',
    description: '',
    createdAt: null,
    updatedAt: null,
    images: [],
  }
}

export default function IssueDrawingManager({
  issues,
  loginPath,
}: IssueDrawingManagerProps) {
  const router = useRouter()
  const [selectedIssueId, setSelectedIssueId] = useState('')
  const [drawings, setDrawings] = useState<AdminIssueDrawing[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingImageId, setDeletingImageId] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId) ?? null
  const activeDrawing = drawings[activeTab] ?? null

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

  const loadDrawings = useCallback(
    async (issueId: string) => {
      if (!issueId) {
        setDrawings([])
        setLoading(false)
        return
      }

      setLoading(true)
      const result = await getAdminIssueDrawing(issueId)

      if (!result.success) {
        handleGuardFailure(result.error, result.message)
        setLoading(false)
        return
      }

      setDrawings(result.data ?? [])
      setActiveTab(0)
      setLoading(false)
    },
    [handleGuardFailure]
  )

  useEffect(() => {
    if (!selectedIssueId && issues.length > 0) {
      setSelectedIssueId(getDefaultIssueId(issues))
    }
  }, [issues, selectedIssueId])

  useEffect(() => {
    if (!selectedIssueId) {
      return
    }

    void loadDrawings(selectedIssueId)
  }, [loadDrawings, selectedIssueId])

  const updateDrawingField = useCallback(
    (field: keyof Pick<AdminIssueDrawing, 'title' | 'authorName' | 'authorHandle' | 'description'>, value: string) => {
      setDrawings((current) =>
        current.map((d, i) => (i === activeTab ? { ...d, [field]: value } : d))
      )
    },
    [activeTab]
  )

  const handleAddDrawing = () => {
    if (!selectedIssue || drawings.length >= 2) {
      return
    }

    const newSortOrder = drawings.length > 0 ? Math.max(...drawings.map((d) => d.sortOrder)) + 1 : 0
    const newDrawing = makeEmptyDrawing(selectedIssueId, selectedIssue.slug, newSortOrder)
    setDrawings((current) => [...current, newDrawing])
    setActiveTab(drawings.length)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!activeDrawing || !selectedIssueId) {
      return
    }

    setSaving(true)
    setMessage('')
    setIsError(false)

    const result = await saveAdminIssueDrawing({
      issueId: selectedIssueId,
      drawingId: activeDrawing.id ?? undefined,
      sortOrder: activeDrawing.sortOrder,
      title: activeDrawing.title,
      authorName: activeDrawing.authorName,
      authorHandle: activeDrawing.authorHandle,
      description: activeDrawing.description,
    })

    if (!result.success) {
      handleGuardFailure(result.error, result.message)
      setSaving(false)
      return
    }

    setDrawings(result.data ?? [])
    // keep activeTab in range
    setActiveTab((prev) => Math.min(prev, (result.data ?? []).length - 1))
    setMessage(result.message)
    setIsError(false)
    setSaving(false)
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length === 0 || !selectedIssueId) {
      return
    }

    if (!activeDrawing?.id) {
      setMessage('请先保存画里有话的标题与作者信息，再上传图片。')
      setIsError(true)
      return
    }

    setUploading(true)
    setMessage('')
    setIsError(false)

    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }

    const result = await uploadAdminIssueDrawingImages(activeDrawing.id, formData)

    if (!result.success) {
      handleGuardFailure(result.error, result.message)
      setUploading(false)
      return
    }

    setDrawings(result.data ?? [])
    setMessage(result.message)
    setIsError(false)
    setUploading(false)
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!window.confirm('确定删除这张图片吗？')) {
      return
    }

    setDeletingImageId(imageId)
    setMessage('')
    setIsError(false)

    const result = await deleteAdminIssueDrawingImage(imageId)

    if (!result.success) {
      handleGuardFailure(result.error, result.message)
      setDeletingImageId('')
      return
    }

    setDrawings(result.data ?? [])
    setMessage(result.message)
    setIsError(false)
    setDeletingImageId('')
  }

  return (
    <section className="rounded-3xl border border-[#E8E4DF] bg-white/70 p-6 backdrop-blur-sm lg:col-span-2">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#F7F5F0] p-3">
            <Brush className="h-5 w-5 text-[#A1887F]" />
          </div>
          <div>
            <h2 className="font-youyou text-2xl text-[#3A3A3A]">画里有话管理</h2>
            <p className="mt-1 text-sm text-[#8D8D8D]">
              按期维护画作标题、作者、小红书 ID 和图片。每期最多支持两个作品。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedIssueId}
            onChange={(event) => {
              setSelectedIssueId(event.target.value)
              setMessage('')
              setIsError(false)
            }}
            className="rounded-xl border border-[#E8E4DF] bg-[#F7F5F0] px-4 py-2.5 text-sm text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F]"
          >
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                {issue.label} · {getIssueDisplayTitle(issue)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              if (selectedIssueId) {
                void loadDrawings(selectedIssueId)
              }
            }}
            disabled={loading || !selectedIssueId}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E8E4DF] bg-white px-4 py-2.5 text-sm text-[#5D5D5D] transition-colors hover:border-[#A1887F] hover:text-[#A1887F] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {selectedIssue ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#EEE7DF] bg-[#FDFBF8] px-4 py-3 text-sm text-[#6C665F]">
          <span className="font-youyou text-[#3A3A3A]">
            {selectedIssue.label} · {getIssueDisplayTitle(selectedIssue)}
          </span>
          <span className="rounded-full bg-[#EFE7E2] px-3 py-1 text-xs text-[#8A7A73]">
            {getIssueStatusLabel(selectedIssue)}
          </span>
          <Link
            href={`/issues/${selectedIssue.slug}/drawing`}
            className="text-[#A1887F] transition-colors hover:text-[#8D6E63]"
          >
            查看前台页面
          </Link>
        </div>
      ) : null}

      {message ? (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
            isError
              ? 'border-red-100 bg-red-50 text-red-600'
              : 'border-green-100 bg-green-50 text-green-600'
          }`}
        >
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[#E8E4DF] bg-[#FAF8F4] text-sm text-[#8D8D8D]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>正在读取画里有话内容...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Tab bar for switching between artworks */}
          <div className="mb-5 flex items-center gap-2">
            {drawings.map((d, index) => (
              <button
                key={d.id ?? `new-${index}`}
                type="button"
                onClick={() => setActiveTab(index)}
                className={`rounded-xl px-4 py-2 text-sm font-youyou transition-colors ${
                  activeTab === index
                    ? 'bg-[#3A3A3A] text-white'
                    : 'border border-[#E8E4DF] bg-white text-[#5D5D5D] hover:border-[#A1887F] hover:text-[#A1887F]'
                }`}
              >
                作品 {index + 1}{d.title && d.title !== '画里有话' ? ` · ${d.title}` : ''}
              </button>
            ))}

            {drawings.length < 2 ? (
              <button
                type="button"
                onClick={handleAddDrawing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#D7CCC8] px-4 py-2 text-sm text-[#8D8D8D] transition-colors hover:border-[#A1887F] hover:text-[#A1887F]"
              >
                <Plus className="h-4 w-4" />
                <span>添加作品</span>
              </button>
            ) : null}
          </div>

          {activeDrawing ? (
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-[#E8E4DF] bg-[#FCFBF8] p-5">
                <div className="space-y-1">
                  <h3 className="font-youyou text-lg text-[#3A3A3A]">
                    基本信息 · 作品 {activeTab + 1}
                  </h3>
                  <p className="text-sm text-[#8D8D8D]">
                    这里保存的是这一期"画里有话"作品 {activeTab + 1} 的正式内容源。
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-youyou text-[#5D5D5D]">标题</label>
                  <input
                    type="text"
                    value={activeDrawing.title}
                    onChange={(event) => updateDrawingField('title', event.target.value)}
                    className="w-full rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F]"
                    placeholder="画里有话"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-youyou text-[#5D5D5D]">作者</label>
                    <input
                      type="text"
                      value={activeDrawing.authorName}
                      onChange={(event) => updateDrawingField('authorName', event.target.value)}
                      className="w-full rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F]"
                      placeholder="作者名字"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-youyou text-[#5D5D5D]">小红书 ID</label>
                    <input
                      type="text"
                      value={activeDrawing.authorHandle}
                      onChange={(event) => updateDrawingField('authorHandle', event.target.value)}
                      className="w-full rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F]"
                      placeholder="小红书账号"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-youyou text-[#5D5D5D]">简介</label>
                  <textarea
                    value={activeDrawing.description}
                    onChange={(event) => updateDrawingField('description', event.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F]"
                    placeholder="可选，前台标题下方会展示。"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3A3A3A] px-5 py-3 text-sm text-white transition-colors hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{saving ? '保存中...' : '保存基本信息'}</span>
                </button>
              </form>

              <div className="space-y-5 rounded-2xl border border-[#E8E4DF] bg-[#FCFBF8] p-5">
                <div className="space-y-1">
                  <h3 className="font-youyou text-lg text-[#3A3A3A]">
                    画作图片 · 作品 {activeTab + 1}
                  </h3>
                  <p className="text-sm text-[#8D8D8D]">
                    图片会按上传顺序追加到前台轮播中。若是新作品，请先保存左侧基本信息，再开始上传。
                  </p>
                </div>

                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D7CCC8] bg-white px-4 py-6 text-sm text-[#6C665F] transition-colors hover:border-[#A1887F] hover:text-[#A1887F]">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  <span>{uploading ? '上传中...' : '选择并上传图片'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    onChange={(event) => {
                      void handleUpload(event)
                    }}
                    className="hidden"
                  />
                </label>

                {activeDrawing.images.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E8E4DF] bg-white/70 px-4 py-10 text-center text-sm text-[#8D8D8D]">
                    暂无已上传图片。
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {activeDrawing.images.map((image, index) => {
                      const isDeleting = deletingImageId === image.id

                      return (
                        <div
                          key={image.id}
                          className="overflow-hidden rounded-2xl border border-[#E8E4DF] bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.imageUrl}
                            alt={image.altText || `${activeDrawing.title} ${index + 1}`}
                            className="h-48 w-full object-cover"
                          />

                          <div className="space-y-3 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm text-[#3A3A3A]">
                                  第 {image.sortOrder + 1} 张
                                </p>
                                <p className="truncate text-xs text-[#8D8D8D]">
                                  {image.altText || '未设置替代文本'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => void handleDeleteImage(image.id)}
                                disabled={isDeleting}
                                className="inline-flex items-center gap-1 rounded-full border border-red-100 px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                <span>{isDeleting ? '删除中...' : '删除'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[#E8E4DF] bg-[#FAF8F4] text-sm text-[#8D8D8D]">
              暂无作品，请点击"添加作品"开始创建。
            </div>
          )}
        </>
      )}
    </section>
  )
}
