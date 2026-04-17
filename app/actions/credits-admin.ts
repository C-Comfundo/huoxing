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

export interface AdminCreditMember {
  id: string
  creditId: string
  department: string
  names: string
  sortOrder: number
}

export interface AdminCredit {
  id: string
  issueId: string
  title: string
  message: string
  members: AdminCreditMember[]
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

async function requireCreditsAdmin<T = null>(): Promise<
  | { ok: true }
  | { ok: false; result: ActionResult<T> }
> {
  const access = await getAdminAccess()

  if (access.error === 'NOT_AUTHENTICATED') {
    return {
      ok: false,
      result: { success: false, message: '请先登录。', error: 'NOT_AUTHENTICATED' },
    }
  }

  if (access.error) {
    return {
      ok: false,
      result: { success: false, message: '管理员身份校验失败。', error: access.error },
    }
  }

  if (!access.isAdmin || !access.user) {
    return {
      ok: false,
      result: { success: false, message: '无权访问制作团队管理。', error: 'UNAUTHORIZED' },
    }
  }

  return { ok: true }
}

function mapMember(row: RawRow): AdminCreditMember {
  return {
    id: String(row.id ?? ''),
    creditId: String(row.credit_id ?? ''),
    department: toText(row.department),
    names: toText(row.names),
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

export async function getAdminCredits(
  issueId: string
): Promise<ActionResult<AdminCredit | null>> {
  try {
    const adminAccess = await requireCreditsAdmin<AdminCredit | null>()
    if (!adminAccess.ok) return adminAccess.result

    if (!issueId) {
      return { success: true, message: '', data: null }
    }

    const adminClient = createAdminClient()

    const { data: creditRow, error: creditError } = await adminClient
      .from('issue_credits')
      .select('id, issue_id, title, message')
      .eq('issue_id', issueId)
      .maybeSingle()

    if (creditError) {
      return { success: false, message: `读取制作团队失败：${getErrorMessage(creditError)}` }
    }

    if (!creditRow) {
      return { success: true, message: '', data: null }
    }

    const raw = creditRow as RawRow
    const creditId = String(raw.id ?? '')

    const { data: memberRows, error: memberError } = await adminClient
      .from('issue_credit_members')
      .select('id, credit_id, department, names, sort_order')
      .eq('credit_id', creditId)
      .order('sort_order', { ascending: true })

    if (memberError) {
      return { success: false, message: `读取团队成员失败：${getErrorMessage(memberError)}` }
    }

    const members = ((memberRows as RawRow[] | null) ?? []).map(mapMember)

    return {
      success: true,
      message: '',
      data: {
        id: creditId,
        issueId: String(raw.issue_id ?? ''),
        title: toText(raw.title),
        message: toText(raw.message),
        members,
      },
    }
  } catch (err) {
    return { success: false, message: `读取制作团队失败：${getErrorMessage(err)}` }
  }
}

export async function upsertAdminCredits(
  issueId: string,
  input: { title: string; message: string }
): Promise<ActionResult<AdminCredit | null>> {
  try {
    const adminAccess = await requireCreditsAdmin<AdminCredit | null>()
    if (!adminAccess.ok) return adminAccess.result

    const title = input.title.trim()
    if (!title) {
      return { success: false, message: '标题不能为空。' }
    }
    if (!issueId) {
      return { success: false, message: '缺少期刊 ID。' }
    }

    const adminClient = createAdminClient()

    // Check if credits already exist for this issue
    const { data: existing } = await adminClient
      .from('issue_credits')
      .select('id')
      .eq('issue_id', issueId)
      .maybeSingle()

    if (existing) {
      // Update
      const { error: updateError } = await adminClient
        .from('issue_credits')
        .update({ title, message: input.message.trim() })
        .eq('id', String(existing.id))

      if (updateError) {
        return { success: false, message: `更新制作团队失败：${getErrorMessage(updateError)}` }
      }
    } else {
      // Insert
      const { error: insertError } = await adminClient
        .from('issue_credits')
        .insert({ issue_id: issueId, title, message: input.message.trim() })

      if (insertError) {
        return { success: false, message: `创建制作团队失败：${getErrorMessage(insertError)}` }
      }
    }

    const issueSlug = await getIssueSlug(adminClient, issueId)
    revalidateIssuePaths(issueSlug)

    const refreshed = await getAdminCredits(issueId)
    return {
      success: true,
      message: existing ? '制作团队信息已更新。' : '制作团队已创建。',
      data: refreshed.data ?? null,
    }
  } catch (err) {
    return { success: false, message: `保存制作团队失败：${getErrorMessage(err)}` }
  }
}

export async function createAdminCreditMember(input: {
  creditId: string
  department: string
  names: string
}): Promise<ActionResult<AdminCredit | null>> {
  try {
    const adminAccess = await requireCreditsAdmin<AdminCredit | null>()
    if (!adminAccess.ok) return adminAccess.result

    const department = input.department.trim()
    if (!department) {
      return { success: false, message: '部门名称不能为空。' }
    }
    if (!input.creditId) {
      return { success: false, message: '缺少制作团队 ID。' }
    }

    const adminClient = createAdminClient()

    // Look up issue_id
    const { data: creditRow } = await adminClient
      .from('issue_credits')
      .select('issue_id')
      .eq('id', input.creditId)
      .maybeSingle()

    if (!creditRow) {
      return { success: false, message: '制作团队不存在。' }
    }

    const issueId = String(creditRow.issue_id ?? '')

    // Get max sort_order
    const { data: existingMembers } = await adminClient
      .from('issue_credit_members')
      .select('sort_order')
      .eq('credit_id', input.creditId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxOrder = ((existingMembers as RawRow[] | null) ?? []).length > 0
      ? Number(existingMembers![0].sort_order ?? 0)
      : 0

    const { error: insertError } = await adminClient
      .from('issue_credit_members')
      .insert({
        credit_id: input.creditId,
        department,
        names: input.names.trim(),
        sort_order: maxOrder + 1,
      })

    if (insertError) {
      return { success: false, message: `添加部门失败：${getErrorMessage(insertError)}` }
    }

    const issueSlug = await getIssueSlug(adminClient, issueId)
    revalidateIssuePaths(issueSlug)

    const refreshed = await getAdminCredits(issueId)
    return {
      success: true,
      message: `部门「${department}」已添加。`,
      data: refreshed.data ?? null,
    }
  } catch (err) {
    return { success: false, message: `添加部门失败：${getErrorMessage(err)}` }
  }
}

export async function updateAdminCreditMember(
  memberId: string,
  input: { department?: string; names?: string }
): Promise<ActionResult<AdminCredit | null>> {
  try {
    const adminAccess = await requireCreditsAdmin<AdminCredit | null>()
    if (!adminAccess.ok) return adminAccess.result

    if (!memberId) {
      return { success: false, message: '缺少成员 ID。' }
    }

    const adminClient = createAdminClient()

    const { data: memberRow } = await adminClient
      .from('issue_credit_members')
      .select('credit_id')
      .eq('id', memberId)
      .maybeSingle()

    if (!memberRow) {
      return { success: false, message: '部门不存在。' }
    }

    const creditId = String(memberRow.credit_id ?? '')

    const { data: creditRow } = await adminClient
      .from('issue_credits')
      .select('issue_id')
      .eq('id', creditId)
      .maybeSingle()

    const issueId = creditRow ? String(creditRow.issue_id ?? '') : ''

    const updatePayload: Record<string, unknown> = {}
    if (input.department !== undefined) {
      const trimmed = input.department.trim()
      if (!trimmed) {
        return { success: false, message: '部门名称不能为空。' }
      }
      updatePayload.department = trimmed
    }
    if (input.names !== undefined) {
      updatePayload.names = input.names.trim()
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, message: '没有需要更新的内容。' }
    }

    const { error: updateError } = await adminClient
      .from('issue_credit_members')
      .update(updatePayload)
      .eq('id', memberId)

    if (updateError) {
      return { success: false, message: `更新部门失败：${getErrorMessage(updateError)}` }
    }

    if (issueId) {
      const issueSlug = await getIssueSlug(adminClient, issueId)
      revalidateIssuePaths(issueSlug)
    }

    const refreshed = issueId ? await getAdminCredits(issueId) : { data: null }
    return {
      success: true,
      message: '部门已更新。',
      data: refreshed.data ?? null,
    }
  } catch (err) {
    return { success: false, message: `更新部门失败：${getErrorMessage(err)}` }
  }
}

export async function deleteAdminCreditMember(
  memberId: string
): Promise<ActionResult<AdminCredit | null>> {
  try {
    const adminAccess = await requireCreditsAdmin<AdminCredit | null>()
    if (!adminAccess.ok) return adminAccess.result

    if (!memberId) {
      return { success: false, message: '缺少成员 ID。' }
    }

    const adminClient = createAdminClient()

    const { data: memberRow } = await adminClient
      .from('issue_credit_members')
      .select('credit_id, department')
      .eq('id', memberId)
      .maybeSingle()

    if (!memberRow) {
      return { success: false, message: '部门不存在。' }
    }

    const creditId = String(memberRow.credit_id ?? '')
    const department = toText(memberRow.department)

    const { data: creditRow } = await adminClient
      .from('issue_credits')
      .select('issue_id')
      .eq('id', creditId)
      .maybeSingle()

    const issueId = creditRow ? String(creditRow.issue_id ?? '') : ''

    const { error: deleteError } = await adminClient
      .from('issue_credit_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      return { success: false, message: `删除部门失败：${getErrorMessage(deleteError)}` }
    }

    if (issueId) {
      const issueSlug = await getIssueSlug(adminClient, issueId)
      revalidateIssuePaths(issueSlug)
    }

    const refreshed = issueId ? await getAdminCredits(issueId) : { data: null }
    return {
      success: true,
      message: `部门「${department}」已删除。`,
      data: refreshed.data ?? null,
    }
  } catch (err) {
    return { success: false, message: `删除部门失败：${getErrorMessage(err)}` }
  }
}

export async function reorderAdminCreditMembers(
  creditId: string,
  orderedIds: string[]
): Promise<ActionResult<AdminCredit | null>> {
  try {
    const adminAccess = await requireCreditsAdmin<AdminCredit | null>()
    if (!adminAccess.ok) return adminAccess.result

    if (!creditId || orderedIds.length === 0) {
      return { success: false, message: '参数不完整。' }
    }

    const adminClient = createAdminClient()

    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await adminClient
        .from('issue_credit_members')
        .update({ sort_order: i + 1 })
        .eq('id', orderedIds[i])

      if (error) {
        return { success: false, message: `更新排序失败：${getErrorMessage(error)}` }
      }
    }

    const { data: creditRow } = await adminClient
      .from('issue_credits')
      .select('issue_id')
      .eq('id', creditId)
      .maybeSingle()

    const issueId = creditRow ? String(creditRow.issue_id ?? '') : ''

    if (issueId) {
      const issueSlug = await getIssueSlug(adminClient, issueId)
      revalidateIssuePaths(issueSlug)
    }

    const refreshed = issueId ? await getAdminCredits(issueId) : { data: null }
    return {
      success: true,
      message: '排序已更新。',
      data: refreshed.data ?? null,
    }
  } catch (err) {
    return { success: false, message: `更新排序失败：${getErrorMessage(err)}` }
  }
}
