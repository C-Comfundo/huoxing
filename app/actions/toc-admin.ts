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

export interface AdminTocSection {
  id: string
  issueId: string
  displayName: string
  sortOrder: number
  isStandalone: boolean
  items: AdminTocItem[]
}

export interface AdminTocItem {
  id: string
  sectionId: string
  title: string
  author: string
  sortOrder: number
}

type RawRow = Record<string, unknown>

function toText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return String(error)
}

async function requireTocAdmin<T = null>(): Promise<
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
        message: '无权访问目录管理。',
        error: 'UNAUTHORIZED',
      },
    }
  }

  return { ok: true }
}

function mapSection(row: RawRow, items: AdminTocItem[]): AdminTocSection {
  return {
    id: String(row.id ?? ''),
    issueId: String(row.issue_id ?? ''),
    displayName: toText(row.display_name),
    sortOrder: Number(row.sort_order ?? 0),
    isStandalone: Boolean(row.is_standalone),
    items,
  }
}

function mapItem(row: RawRow): AdminTocItem {
  return {
    id: String(row.id ?? ''),
    sectionId: String(row.section_id ?? ''),
    title: toText(row.title),
    author: toText(row.author),
    sortOrder: Number(row.sort_order ?? 0),
  }
}

function revalidateIssuePaths(issueSlug?: string | null) {
  revalidatePath('/')
  revalidatePath('/issues')
  if (issueSlug) {
    revalidatePath(`/issues/${issueSlug}`)
  }
}

async function getIssueSlug(
  adminClient: ReturnType<typeof createAdminClient>,
  issueId: string
): Promise<string | null> {
  const { data } = await adminClient
    .from('issues')
    .select('slug')
    .eq('id', issueId)
    .maybeSingle()

  return data?.slug ? String(data.slug) : null
}

// ─── Public API ──────────────────────────────────────────────

export async function getAdminTocSections(
  issueId: string
): Promise<ActionResult<AdminTocSection[]>> {
  try {
    const adminAccess = await requireTocAdmin<AdminTocSection[]>()
    if (!adminAccess.ok) return adminAccess.result

    if (!issueId) {
      return { success: true, message: '', data: [] }
    }

    const adminClient = createAdminClient()

    const { data: sectionRows, error: secError } = await adminClient
      .from('issue_toc_sections')
      .select('id, issue_id, display_name, sort_order, is_standalone')
      .eq('issue_id', issueId)
      .order('sort_order', { ascending: true })

    if (secError) {
      return {
        success: false,
        message: `读取栏目失败：${getErrorMessage(secError)}`,
      }
    }

    const sections = (sectionRows as RawRow[] | null) ?? []
    const sectionIds = sections.map((s) => String(s.id ?? ''))

    let allItems: RawRow[] = []
    if (sectionIds.length > 0) {
      const { data: itemRows, error: itemError } = await adminClient
        .from('issue_toc_items')
        .select('id, section_id, title, author, sort_order')
        .in('section_id', sectionIds)
        .order('sort_order', { ascending: true })

      if (itemError) {
        return {
          success: false,
          message: `读取条目失败：${getErrorMessage(itemError)}`,
        }
      }

      allItems = (itemRows as RawRow[] | null) ?? []
    }

    const itemsBySectionId = new Map<string, AdminTocItem[]>()
    for (const row of allItems) {
      const sectionId = String(row.section_id ?? '')
      const items = itemsBySectionId.get(sectionId) ?? []
      items.push(mapItem(row))
      itemsBySectionId.set(sectionId, items)
    }

    const result = sections.map((row) =>
      mapSection(row, itemsBySectionId.get(String(row.id ?? '')) ?? [])
    )

    return { success: true, message: '', data: result }
  } catch (err) {
    return {
      success: false,
      message: `读取目录失败：${getErrorMessage(err)}`,
    }
  }
}

export async function createAdminTocSection(input: {
  issueId: string
  displayName: string
  isStandalone?: boolean
}): Promise<ActionResult<AdminTocSection[]>> {
  try {
    const adminAccess = await requireTocAdmin<AdminTocSection[]>()
    if (!adminAccess.ok) return adminAccess.result

    const displayName = input.displayName.trim()
    if (!displayName) {
      return { success: false, message: '栏目名称不能为空。' }
    }

    if (!input.issueId) {
      return { success: false, message: '缺少期刊 ID。' }
    }

    const adminClient = createAdminClient()

    // Get max sort_order for this issue
    const { data: existingSections } = await adminClient
      .from('issue_toc_sections')
      .select('sort_order')
      .eq('issue_id', input.issueId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxOrder = ((existingSections as RawRow[] | null) ?? []).length > 0
      ? Number(existingSections![0].sort_order ?? 0)
      : 0

    const { error: insertError } = await adminClient
      .from('issue_toc_sections')
      .insert({
        issue_id: input.issueId,
        display_name: displayName,
        sort_order: maxOrder + 1,
        is_standalone: input.isStandalone ?? false,
      })

    if (insertError) {
      return {
        success: false,
        message: `创建栏目失败：${getErrorMessage(insertError)}`,
      }
    }

    const issueSlug = await getIssueSlug(adminClient, input.issueId)
    revalidateIssuePaths(issueSlug)

    const refreshed = await getAdminTocSections(input.issueId)
    return {
      success: true,
      message: `栏目「${displayName}」已创建。`,
      data: refreshed.data ?? [],
    }
  } catch (err) {
    return {
      success: false,
      message: `创建栏目失败：${getErrorMessage(err)}`,
    }
  }
}

export async function updateAdminTocSection(
  sectionId: string,
  input: {
    displayName?: string
    isStandalone?: boolean
  }
): Promise<ActionResult<AdminTocSection[]>> {
  try {
    const adminAccess = await requireTocAdmin<AdminTocSection[]>()
    if (!adminAccess.ok) return adminAccess.result

    if (!sectionId) {
      return { success: false, message: '缺少栏目 ID。' }
    }

    const adminClient = createAdminClient()

    // Look up the section to get issue_id
    const { data: sectionRow, error: lookupError } = await adminClient
      .from('issue_toc_sections')
      .select('issue_id')
      .eq('id', sectionId)
      .maybeSingle()

    if (lookupError || !sectionRow) {
      return { success: false, message: '栏目不存在。' }
    }

    const issueId = String(sectionRow.issue_id ?? '')

    const updatePayload: Record<string, unknown> = {}
    if (input.displayName !== undefined) {
      const trimmed = input.displayName.trim()
      if (!trimmed) {
        return { success: false, message: '栏目名称不能为空。' }
      }
      updatePayload.display_name = trimmed
    }
    if (input.isStandalone !== undefined) {
      updatePayload.is_standalone = input.isStandalone
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, message: '没有需要更新的内容。' }
    }

    const { error: updateError } = await adminClient
      .from('issue_toc_sections')
      .update(updatePayload)
      .eq('id', sectionId)

    if (updateError) {
      return {
        success: false,
        message: `更新栏目失败：${getErrorMessage(updateError)}`,
      }
    }

    const issueSlug = await getIssueSlug(adminClient, issueId)
    revalidateIssuePaths(issueSlug)

    const refreshed = await getAdminTocSections(issueId)
    return {
      success: true,
      message: '栏目已更新。',
      data: refreshed.data ?? [],
    }
  } catch (err) {
    return {
      success: false,
      message: `更新栏目失败：${getErrorMessage(err)}`,
    }
  }
}

export async function deleteAdminTocSection(
  sectionId: string
): Promise<ActionResult<AdminTocSection[]>> {
  try {
    const adminAccess = await requireTocAdmin<AdminTocSection[]>()
    if (!adminAccess.ok) return adminAccess.result

    if (!sectionId) {
      return { success: false, message: '缺少栏目 ID。' }
    }

    const adminClient = createAdminClient()

    const { data: sectionRow, error: lookupError } = await adminClient
      .from('issue_toc_sections')
      .select('issue_id, display_name')
      .eq('id', sectionId)
      .maybeSingle()

    if (lookupError || !sectionRow) {
      return { success: false, message: '栏目不存在。' }
    }

    const issueId = String(sectionRow.issue_id ?? '')
    const displayName = toText(sectionRow.display_name)

    const { error: deleteError } = await adminClient
      .from('issue_toc_sections')
      .delete()
      .eq('id', sectionId)

    if (deleteError) {
      return {
        success: false,
        message: `删除栏目失败：${getErrorMessage(deleteError)}`,
      }
    }

    const issueSlug = await getIssueSlug(adminClient, issueId)
    revalidateIssuePaths(issueSlug)

    const refreshed = await getAdminTocSections(issueId)
    return {
      success: true,
      message: `栏目「${displayName}」已删除。`,
      data: refreshed.data ?? [],
    }
  } catch (err) {
    return {
      success: false,
      message: `删除栏目失败：${getErrorMessage(err)}`,
    }
  }
}

export async function createAdminTocItem(input: {
  sectionId: string
  title: string
  author?: string
}): Promise<ActionResult<AdminTocSection[]>> {
  try {
    const adminAccess = await requireTocAdmin<AdminTocSection[]>()
    if (!adminAccess.ok) return adminAccess.result

    const title = input.title.trim()
    if (!title) {
      return { success: false, message: '条目标题不能为空。' }
    }

    if (!input.sectionId) {
      return { success: false, message: '缺少栏目 ID。' }
    }

    const adminClient = createAdminClient()

    // Look up issue_id from section
    const { data: sectionRow, error: lookupError } = await adminClient
      .from('issue_toc_sections')
      .select('issue_id')
      .eq('id', input.sectionId)
      .maybeSingle()

    if (lookupError || !sectionRow) {
      return { success: false, message: '栏目不存在。' }
    }

    const issueId = String(sectionRow.issue_id ?? '')

    // Get max sort_order
    const { data: existingItems } = await adminClient
      .from('issue_toc_items')
      .select('sort_order')
      .eq('section_id', input.sectionId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxOrder = ((existingItems as RawRow[] | null) ?? []).length > 0
      ? Number(existingItems![0].sort_order ?? 0)
      : 0

    const { error: insertError } = await adminClient
      .from('issue_toc_items')
      .insert({
        section_id: input.sectionId,
        title,
        author: input.author?.trim() ?? '',
        sort_order: maxOrder + 1,
      })

    if (insertError) {
      return {
        success: false,
        message: `创建条目失败：${getErrorMessage(insertError)}`,
      }
    }

    const issueSlug = await getIssueSlug(adminClient, issueId)
    revalidateIssuePaths(issueSlug)

    const refreshed = await getAdminTocSections(issueId)
    return {
      success: true,
      message: `条目「${title}」已创建。`,
      data: refreshed.data ?? [],
    }
  } catch (err) {
    return {
      success: false,
      message: `创建条目失败：${getErrorMessage(err)}`,
    }
  }
}

export async function updateAdminTocItem(
  itemId: string,
  input: {
    title?: string
    author?: string
  }
): Promise<ActionResult<AdminTocSection[]>> {
  try {
    const adminAccess = await requireTocAdmin<AdminTocSection[]>()
    if (!adminAccess.ok) return adminAccess.result

    if (!itemId) {
      return { success: false, message: '缺少条目 ID。' }
    }

    const adminClient = createAdminClient()

    // Look up section_id -> issue_id
    const { data: itemRow, error: lookupError } = await adminClient
      .from('issue_toc_items')
      .select('section_id')
      .eq('id', itemId)
      .maybeSingle()

    if (lookupError || !itemRow) {
      return { success: false, message: '条目不存在。' }
    }

    const { data: sectionRow } = await adminClient
      .from('issue_toc_sections')
      .select('issue_id')
      .eq('id', String(itemRow.section_id ?? ''))
      .maybeSingle()

    const issueId = sectionRow ? String(sectionRow.issue_id ?? '') : ''

    const updatePayload: Record<string, unknown> = {}
    if (input.title !== undefined) {
      const trimmed = input.title.trim()
      if (!trimmed) {
        return { success: false, message: '条目标题不能为空。' }
      }
      updatePayload.title = trimmed
    }
    if (input.author !== undefined) {
      updatePayload.author = input.author.trim()
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, message: '没有需要更新的内容。' }
    }

    const { error: updateError } = await adminClient
      .from('issue_toc_items')
      .update(updatePayload)
      .eq('id', itemId)

    if (updateError) {
      return {
        success: false,
        message: `更新条目失败：${getErrorMessage(updateError)}`,
      }
    }

    if (issueId) {
      const issueSlug = await getIssueSlug(adminClient, issueId)
      revalidateIssuePaths(issueSlug)
    }

    const refreshed = issueId ? await getAdminTocSections(issueId) : { data: [] }
    return {
      success: true,
      message: '条目已更新。',
      data: refreshed.data ?? [],
    }
  } catch (err) {
    return {
      success: false,
      message: `更新条目失败：${getErrorMessage(err)}`,
    }
  }
}

export async function deleteAdminTocItem(
  itemId: string
): Promise<ActionResult<AdminTocSection[]>> {
  try {
    const adminAccess = await requireTocAdmin<AdminTocSection[]>()
    if (!adminAccess.ok) return adminAccess.result

    if (!itemId) {
      return { success: false, message: '缺少条目 ID。' }
    }

    const adminClient = createAdminClient()

    const { data: itemRow, error: lookupError } = await adminClient
      .from('issue_toc_items')
      .select('section_id, title')
      .eq('id', itemId)
      .maybeSingle()

    if (lookupError || !itemRow) {
      return { success: false, message: '条目不存在。' }
    }

    const itemTitle = toText(itemRow.title)

    const { data: sectionRow } = await adminClient
      .from('issue_toc_sections')
      .select('issue_id')
      .eq('id', String(itemRow.section_id ?? ''))
      .maybeSingle()

    const issueId = sectionRow ? String(sectionRow.issue_id ?? '') : ''

    const { error: deleteError } = await adminClient
      .from('issue_toc_items')
      .delete()
      .eq('id', itemId)

    if (deleteError) {
      return {
        success: false,
        message: `删除条目失败：${getErrorMessage(deleteError)}`,
      }
    }

    if (issueId) {
      const issueSlug = await getIssueSlug(adminClient, issueId)
      revalidateIssuePaths(issueSlug)
    }

    const refreshed = issueId ? await getAdminTocSections(issueId) : { data: [] }
    return {
      success: true,
      message: `条目「${itemTitle}」已删除。`,
      data: refreshed.data ?? [],
    }
  } catch (err) {
    return {
      success: false,
      message: `删除条目失败：${getErrorMessage(err)}`,
    }
  }
}

export async function reorderAdminTocSections(
  issueId: string,
  orderedIds: string[]
): Promise<ActionResult<AdminTocSection[]>> {
  try {
    const adminAccess = await requireTocAdmin<AdminTocSection[]>()
    if (!adminAccess.ok) return adminAccess.result

    if (!issueId || orderedIds.length === 0) {
      return { success: false, message: '参数不完整。' }
    }

    const adminClient = createAdminClient()

    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await adminClient
        .from('issue_toc_sections')
        .update({ sort_order: i + 1 })
        .eq('id', orderedIds[i])

      if (error) {
        return {
          success: false,
          message: `更新栏目排序失败：${getErrorMessage(error)}`,
        }
      }
    }

    const issueSlug = await getIssueSlug(adminClient, issueId)
    revalidateIssuePaths(issueSlug)

    const refreshed = await getAdminTocSections(issueId)
    return {
      success: true,
      message: '栏目排序已更新。',
      data: refreshed.data ?? [],
    }
  } catch (err) {
    return {
      success: false,
      message: `更新栏目排序失败：${getErrorMessage(err)}`,
    }
  }
}

export async function reorderAdminTocItems(
  sectionId: string,
  orderedIds: string[]
): Promise<ActionResult<AdminTocSection[]>> {
  try {
    const adminAccess = await requireTocAdmin<AdminTocSection[]>()
    if (!adminAccess.ok) return adminAccess.result

    if (!sectionId || orderedIds.length === 0) {
      return { success: false, message: '参数不完整。' }
    }

    const adminClient = createAdminClient()

    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await adminClient
        .from('issue_toc_items')
        .update({ sort_order: i + 1 })
        .eq('id', orderedIds[i])

      if (error) {
        return {
          success: false,
          message: `更新条目排序失败：${getErrorMessage(error)}`,
        }
      }
    }

    // Look up issue_id from section
    const { data: sectionRow } = await adminClient
      .from('issue_toc_sections')
      .select('issue_id')
      .eq('id', sectionId)
      .maybeSingle()

    const issueId = sectionRow ? String(sectionRow.issue_id ?? '') : ''

    if (issueId) {
      const issueSlug = await getIssueSlug(adminClient, issueId)
      revalidateIssuePaths(issueSlug)
    }

    const refreshed = issueId ? await getAdminTocSections(issueId) : { data: [] }
    return {
      success: true,
      message: '条目排序已更新。',
      data: refreshed.data ?? [],
    }
  } catch (err) {
    return {
      success: false,
      message: `更新条目排序失败：${getErrorMessage(err)}`,
    }
  }
}
