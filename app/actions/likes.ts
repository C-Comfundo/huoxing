'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ActionResult {
  success: boolean
  message: string
  liked?: boolean
  error?: string
}

export async function getEchoLikeStatuses(
  echoIds: string[],
  userId: string | null
): Promise<Record<string, { count: number; liked: boolean }>> {
  if (echoIds.length === 0) return {}

  const adminClient = createAdminClient()

  // 批量查所有点赞记录
  const { data: allLikes } = await adminClient
    .from('likes')
    .select('echo_id, user_id')
    .in('echo_id', echoIds)

  const result: Record<string, { count: number; liked: boolean }> = {}

  for (const echoId of echoIds) {
    const echoLikes = allLikes?.filter((l) => l.echo_id === echoId) ?? []
    result[echoId] = {
      count: echoLikes.length,
      liked: userId ? echoLikes.some((l) => l.user_id === userId) : false,
    }
  }

  return result
}

export async function toggleEchoLike(echoId: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, message: '请先登录', error: 'NOT_AUTHENTICATED' }
    }

    const adminClient = createAdminClient()
    const { data: existing } = await adminClient
      .from('likes')
      .select('user_id')
      .eq('echo_id', echoId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await adminClient
        .from('likes')
        .delete()
        .eq('echo_id', echoId)
        .eq('user_id', user.id)

      if (error) return { success: false, message: '操作失败', error: error.message }
      return { success: true, message: '已取消点赞', liked: false }
    } else {
      const { error } = await adminClient
        .from('likes')
        .insert({ echo_id: echoId, user_id: user.id })

      if (error) return { success: false, message: '操作失败', error: error.message }
      return { success: true, message: '点赞成功', liked: true }
    }
  } catch (error) {
    console.error('[toggleEchoLike] 异常:', error)
    return { success: false, message: '操作失败', error: String(error) }
  }
}
