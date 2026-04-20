'use server'

import { revalidatePath } from 'next/cache'
import { getAdminAccess } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'

interface ActionResult<T = null> {
  success: boolean
  message: string
  data?: T
  error?: string
}

interface SaveAdminIssueDrawingInput {
  issueId: string
  drawingId?: string
  sortOrder?: number
  title: string
  authorHandle?: string
  authorName?: string
  description?: string
}

export interface AdminIssueDrawingImage {
  id: string
  imageUrl: string
  altText: string | null
  caption: string | null
  sortOrder: number
  createdAt: string | null
  updatedAt: string | null
}

export interface AdminIssueDrawing {
  id: string | null
  issueId: string
  issueSlug: string
  sortOrder: number
  title: string
  authorName: string
  authorHandle: string
  description: string
  createdAt: string | null
  updatedAt: string | null
  images: AdminIssueDrawingImage[]
}

type RawRow = Record<string, unknown>

const DRAWING_SELECT = `
  id,
  issue_id,
  title,
  author_name,
  author_handle,
  description,
  sort_order,
  created_at,
  updated_at
`

const DRAWING_IMAGE_SELECT = `
  id,
  drawing_id,
  image_url,
  alt_text,
  caption,
  sort_order,
  created_at,
  updated_at
`

const DRAWING_IMAGE_BUCKET = 'issue-covers'

function toText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return String(error)
}

function trimOptionalText(value: string | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
}

function isDrawingSectionName(displayName: string) {
  return displayName.includes('画里有话') || displayName.includes('画里话外')
}

function getFileExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (fromName) {
    return fromName
  }

  switch (file.type) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/avif':
      return 'avif'
    default:
      return 'img'
  }
}

function extractStoragePathFromPublicUrl(publicUrl: string, bucket: string) {
  try {
    const { pathname } = new URL(publicUrl)
    const marker = `/storage/v1/object/public/${bucket}/`
    const markerIndex = pathname.indexOf(marker)

    if (markerIndex === -1) {
      return null
    }

    return decodeURIComponent(pathname.slice(markerIndex + marker.length))
  } catch {
    return null
  }
}

function mapDrawingImage(row: RawRow): AdminIssueDrawingImage {
  return {
    id: String(row.id ?? ''),
    imageUrl: toText(row.image_url),
    altText: toText(row.alt_text) || null,
    caption: toText(row.caption) || null,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: toText(row.created_at) || null,
    updatedAt: toText(row.updated_at) || null,
  }
}

async function requireDrawingAdmin<T = null>(): Promise<
  | { ok: true }
  | {
      ok: false
      result: ActionResult<T>
    }
> {
  const access = await getAdminAccess()

  if (access.error === 'NOT_AUTHENTICATED') {
    return {
      ok: false,
      result: {
        success: false,
        message: '请先登录。',
        error: 'NOT_AUTHENTICATED',
      },
    }
  }

  if (access.error) {
    return {
      ok: false,
      result: {
        success: false,
        message: '管理员身份校验失败。',
        error: access.error,
      },
    }
  }

  if (!access.isAdmin || !access.user) {
    return {
      ok: false,
      result: {
        success: false,
        message: '无权访问画里有话管理。',
        error: 'UNAUTHORIZED',
      },
    }
  }

  return { ok: true }
}

async function loadIssue(adminClient: ReturnType<typeof createAdminClient>, issueId: string) {
  const { data, error } = await adminClient
    .from('issues')
    .select('id, slug')
    .eq('id', issueId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    id: String(data.id ?? ''),
    slug: toText(data.slug),
  }
}

async function loadDrawingImages(
  adminClient: ReturnType<typeof createAdminClient>,
  drawingId: string
) {
  const { data, error } = await adminClient
    .from('issue_drawing_images')
    .select(DRAWING_IMAGE_SELECT)
    .eq('drawing_id', drawingId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return ((data as RawRow[] | null) ?? []).map(mapDrawingImage)
}

async function buildAdminIssueDrawings(
  adminClient: ReturnType<typeof createAdminClient>,
  issueId: string,
  issueSlug: string
): Promise<AdminIssueDrawing[]> {
  const { data, error } = await adminClient
    .from('issue_drawings')
    .select(DRAWING_SELECT)
    .eq('issue_id', issueId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  const rows = (data as RawRow[] | null) ?? []

  if (rows.length === 0) {
    return []
  }

  const drawings: AdminIssueDrawing[] = []

  for (const row of rows) {
    const drawingId = String(row.id ?? '')
    const images = drawingId ? await loadDrawingImages(adminClient, drawingId) : []

    drawings.push({
      id: drawingId || null,
      issueId,
      issueSlug,
      sortOrder: Number(row.sort_order ?? 0),
      title: toText(row.title) || '画里有话',
      authorName: toText(row.author_name),
      authorHandle: toText(row.author_handle),
      description: toText(row.description),
      createdAt: toText(row.created_at) || null,
      updatedAt: toText(row.updated_at) || null,
      images,
    })
  }

  return drawings
}

function revalidateDrawingPaths(issueSlug: string) {
  revalidatePath('/')
  revalidatePath('/drawing')
  revalidatePath('/issues')
  revalidatePath('/ops-room')
  revalidatePath('/ops-room/articles')
  revalidatePath(`/issues/${issueSlug}`)
  revalidatePath(`/issues/${issueSlug}/drawing`)
}

async function syncIssueDrawingTocItems(
  adminClient: ReturnType<typeof createAdminClient>,
  issueId: string
) {
  const { data: sectionRows, error: sectionError } = await adminClient
    .from('issue_toc_sections')
    .select('id, display_name')
    .eq('issue_id', issueId)

  if (sectionError) {
    console.error('[syncIssueDrawingTocItems] Failed to load TOC sections:', sectionError)
    return
  }

  const drawingSection = ((sectionRows as RawRow[] | null) ?? []).find((row) =>
    isDrawingSectionName(toText(row.display_name))
  )

  const sectionId = drawingSection ? String(drawingSection.id ?? '') : ''

  if (!sectionId) {
    return
  }

  // Load all drawings for this issue to build TOC entries
  const { data: drawingRows, error: drawingError } = await adminClient
    .from('issue_drawings')
    .select('title, author_name, author_handle, sort_order')
    .eq('issue_id', issueId)
    .order('sort_order', { ascending: true })

  if (drawingError) {
    console.error('[syncIssueDrawingTocItems] Failed to load drawings:', drawingError)
    return
  }

  const drawings = (drawingRows as RawRow[] | null) ?? []

  // Delete existing TOC items for this drawing section, then recreate one per drawing
  const { error: deleteError } = await adminClient
    .from('issue_toc_items')
    .delete()
    .eq('section_id', sectionId)

  if (deleteError) {
    console.error('[syncIssueDrawingTocItems] Failed to delete old TOC items:', deleteError)
    return
  }

  if (drawings.length === 0) {
    return
  }

  const newItems = drawings.map((d, index) => ({
    section_id: sectionId,
    title: toText(d.title) || '画里有话',
    author: toText(d.author_name) || toText(d.author_handle) || '匿名',
    sort_order: index,
  }))

  const { error: insertError } = await adminClient
    .from('issue_toc_items')
    .insert(newItems)

  if (insertError) {
    console.error('[syncIssueDrawingTocItems] Failed to insert TOC items:', insertError)
  }
}

export async function getAdminIssueDrawing(
  issueId: string
): Promise<ActionResult<AdminIssueDrawing[]>> {
  try {
    const adminAccess = await requireDrawingAdmin<AdminIssueDrawing[]>()
    if (!adminAccess.ok) {
      return adminAccess.result
    }

    if (!issueId) {
      return {
        success: false,
        message: '缺少期号 ID。',
        error: 'MISSING_ISSUE_ID',
      }
    }

    const adminClient = createAdminClient()
    const issue = await loadIssue(adminClient, issueId)

    if (!issue) {
      return {
        success: false,
        message: '未找到对应期刊。',
        error: 'ISSUE_NOT_FOUND',
      }
    }

    return {
      success: true,
      message: '已加载画里有话内容。',
      data: await buildAdminIssueDrawings(adminClient, issue.id, issue.slug),
    }
  } catch (error) {
    console.error('[getAdminIssueDrawing] Unexpected error:', error)
    return {
      success: false,
      message: '读取画里有话内容失败。',
      error: getErrorMessage(error),
    }
  }
}

export async function saveAdminIssueDrawing(
  input: SaveAdminIssueDrawingInput
): Promise<ActionResult<AdminIssueDrawing[]>> {
  try {
    const adminAccess = await requireDrawingAdmin<AdminIssueDrawing[]>()
    if (!adminAccess.ok) {
      return adminAccess.result
    }

    const issueId = input.issueId.trim()
    const drawingId = input.drawingId?.trim() || ''
    const sortOrder = input.sortOrder ?? 0
    const title = input.title.trim()
    const authorName = trimOptionalText(input.authorName)
    const authorHandle = trimOptionalText(input.authorHandle)
    const description = trimOptionalText(input.description)

    if (!issueId || !title) {
      return {
        success: false,
        message: '请先填写标题并选择期刊。',
        error: 'MISSING_FIELDS',
      }
    }

    const adminClient = createAdminClient()
    const issue = await loadIssue(adminClient, issueId)

    if (!issue) {
      return {
        success: false,
        message: '未找到对应期刊。',
        error: 'ISSUE_NOT_FOUND',
      }
    }

    const payload = {
      title,
      author_name: authorName,
      author_handle: authorHandle,
      description,
    }

    let isUpdate = false

    if (drawingId) {
      const { error: updateError } = await adminClient
        .from('issue_drawings')
        .update(payload)
        .eq('id', drawingId)

      if (updateError) {
        throw updateError
      }

      isUpdate = true
    } else {
      const { error: insertError } = await adminClient.from('issue_drawings').insert({
        issue_id: issueId,
        sort_order: sortOrder,
        ...payload,
      })

      if (insertError) {
        throw insertError
      }
    }

    await syncIssueDrawingTocItems(adminClient, issueId)

    const drawings = await buildAdminIssueDrawings(adminClient, issueId, issue.slug)
    revalidateDrawingPaths(issue.slug)

    return {
      success: true,
      message: isUpdate ? '画里有话内容已更新。' : '画里有话内容已创建。',
      data: drawings,
    }
  } catch (error) {
    console.error('[saveAdminIssueDrawing] Unexpected error:', error)
    return {
      success: false,
      message: '保存画里有话内容失败。',
      error: getErrorMessage(error),
    }
  }
}

export async function uploadAdminIssueDrawingImages(
  drawingId: string,
  formData: FormData
): Promise<ActionResult<AdminIssueDrawing[]>> {
  try {
    const adminAccess = await requireDrawingAdmin<AdminIssueDrawing[]>()
    if (!adminAccess.ok) {
      return adminAccess.result
    }

    if (!drawingId) {
      return {
        success: false,
        message: '缺少作品 ID。',
        error: 'MISSING_DRAWING_ID',
      }
    }

    const fileEntries = formData
      .getAll('files')
      .filter((value): value is File => value instanceof File && value.size > 0)

    if (fileEntries.length === 0) {
      return {
        success: false,
        message: '请先选择图片文件。',
        error: 'NO_FILES',
      }
    }

    const invalidFile = fileEntries.find((file) => !file.type.startsWith('image/'))

    if (invalidFile) {
      return {
        success: false,
        message: '只能上传图片文件。',
        error: 'INVALID_FILE_TYPE',
      }
    }

    const adminClient = createAdminClient()

    const { data: drawingRow, error: drawingError } = await adminClient
      .from('issue_drawings')
      .select('id, issue_id, title')
      .eq('id', drawingId)
      .maybeSingle()

    if (drawingError) {
      throw drawingError
    }

    if (!drawingRow?.id) {
      return {
        success: false,
        message: '请先保存画里有话的标题和作者信息，再上传图片。',
        error: 'DRAWING_NOT_FOUND',
      }
    }

    const issueId = String(drawingRow.issue_id ?? '')
    const issue = await loadIssue(adminClient, issueId)

    if (!issue) {
      return {
        success: false,
        message: '未找到对应期刊。',
        error: 'ISSUE_NOT_FOUND',
      }
    }

    const currentDrawingId = String(drawingRow.id ?? '')
    const drawingTitle = toText(drawingRow.title) || '画里有话'

    const { data: maxSortRow, error: maxSortError } = await adminClient
      .from('issue_drawing_images')
      .select('sort_order')
      .eq('drawing_id', currentDrawingId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxSortError) {
      throw maxSortError
    }

    const baseSortOrder = Number(maxSortRow?.sort_order ?? -1) + 1
    const timestamp = Date.now()
    const imageDrafts = fileEntries.map((file, index) => {
      const extension = getFileExtension(file)
      const filePath =
        `drawings/${issueId}/${timestamp}-${index}-${crypto.randomUUID()}.${extension}`
      const {
        data: { publicUrl },
      } = adminClient.storage.from(DRAWING_IMAGE_BUCKET).getPublicUrl(filePath)

      return {
        file,
        filePath,
        publicUrl,
        sortOrder: baseSortOrder + index,
      }
    })

    const { data: insertedRows, error: insertError } = await adminClient
      .from('issue_drawing_images')
      .insert(
        imageDrafts.map((draft, index) => ({
          drawing_id: currentDrawingId,
          image_url: draft.publicUrl,
          alt_text: `${drawingTitle} ${baseSortOrder + index + 1}`,
          caption: null,
          sort_order: draft.sortOrder,
        }))
      )
      .select(DRAWING_IMAGE_SELECT)

    if (insertError) {
      throw insertError
    }

    const insertedIds = ((insertedRows as RawRow[] | null) ?? [])
      .map((row) => String(row.id ?? ''))
      .filter(Boolean)
    const uploadedPaths: string[] = []

    for (const draft of imageDrafts) {
      const { error: uploadError } = await adminClient.storage
        .from(DRAWING_IMAGE_BUCKET)
        .upload(draft.filePath, draft.file, {
          upsert: true,
          contentType: draft.file.type,
        })

      if (uploadError) {
        if (insertedIds.length > 0) {
          const { error: rollbackError } = await adminClient
            .from('issue_drawing_images')
            .delete()
            .in('id', insertedIds)

          if (rollbackError) {
            console.error(
              '[uploadAdminIssueDrawingImages] Failed to rollback DB rows:',
              rollbackError
            )
          }
        }

        if (uploadedPaths.length > 0) {
          const { error: removeError } = await adminClient.storage
            .from(DRAWING_IMAGE_BUCKET)
            .remove(uploadedPaths)

          if (removeError) {
            console.error(
              '[uploadAdminIssueDrawingImages] Failed to rollback storage files:',
              removeError
            )
          }
        }

        return {
          success: false,
          message:
            '上传图片失败。请确认 Supabase Storage 已创建公开 bucket "issue-covers"。',
          error: uploadError.message,
        }
      }

      uploadedPaths.push(draft.filePath)
    }

    const drawings = await buildAdminIssueDrawings(adminClient, issueId, issue.slug)
    revalidateDrawingPaths(issue.slug)

    return {
      success: true,
      message: `已上传 ${fileEntries.length} 张画作图片。`,
      data: drawings,
    }
  } catch (error) {
    console.error('[uploadAdminIssueDrawingImages] Unexpected error:', error)
    return {
      success: false,
      message: '上传画作图片失败。',
      error: getErrorMessage(error),
    }
  }
}

export async function deleteAdminIssueDrawingImage(
  imageId: string
): Promise<ActionResult<AdminIssueDrawing[]>> {
  try {
    const adminAccess = await requireDrawingAdmin<AdminIssueDrawing[]>()
    if (!adminAccess.ok) {
      return adminAccess.result
    }

    if (!imageId) {
      return {
        success: false,
        message: '缺少图片 ID。',
        error: 'MISSING_IMAGE_ID',
      }
    }

    const adminClient = createAdminClient()

    const { data: imageRow, error: imageError } = await adminClient
      .from('issue_drawing_images')
      .select('id, drawing_id, image_url')
      .eq('id', imageId)
      .maybeSingle()

    if (imageError) {
      throw imageError
    }

    if (!imageRow?.id || !imageRow.drawing_id) {
      return {
        success: false,
        message: '未找到对应图片。',
        error: 'IMAGE_NOT_FOUND',
      }
    }

    const drawingId = String(imageRow.drawing_id ?? '')
    const imageUrl = toText(imageRow.image_url)

    const { data: drawingRow, error: drawingError } = await adminClient
      .from('issue_drawings')
      .select('issue_id')
      .eq('id', drawingId)
      .maybeSingle()

    if (drawingError) {
      throw drawingError
    }

    const issueId = String(drawingRow?.issue_id ?? '')

    if (!issueId) {
      return {
        success: false,
        message: '未找到图片所属期刊。',
        error: 'ISSUE_NOT_FOUND',
      }
    }

    const issue = await loadIssue(adminClient, issueId)

    if (!issue) {
      return {
        success: false,
        message: '未找到图片所属期刊。',
        error: 'ISSUE_NOT_FOUND',
      }
    }

    const { error: deleteError } = await adminClient
      .from('issue_drawing_images')
      .delete()
      .eq('id', imageId)

    if (deleteError) {
      throw deleteError
    }

    let storageDeleteWarning = false
    const storagePath = extractStoragePathFromPublicUrl(imageUrl, DRAWING_IMAGE_BUCKET)

    if (storagePath) {
      const { error: storageDeleteError } = await adminClient.storage
        .from(DRAWING_IMAGE_BUCKET)
        .remove([storagePath])

      if (storageDeleteError) {
        storageDeleteWarning = true
        console.error(
          '[deleteAdminIssueDrawingImage] Failed to delete storage object:',
          storageDeleteError
        )
      }
    }

    const drawings = await buildAdminIssueDrawings(adminClient, issueId, issue.slug)
    revalidateDrawingPaths(issue.slug)

    return {
      success: true,
      message: storageDeleteWarning
        ? '图片已从页面移除，但存储文件删除失败，请稍后检查 Supabase Storage。'
        : '图片已删除。',
      data: drawings,
    }
  } catch (error) {
    console.error('[deleteAdminIssueDrawingImage] Unexpected error:', error)
    return {
      success: false,
      message: '删除画作图片失败。',
      error: getErrorMessage(error),
    }
  }
}
