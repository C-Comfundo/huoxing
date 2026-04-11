'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface UpdateProfileData {
  displayName?: string
  avatarUrl?: string | null
}

interface ActionResult {
  success: boolean
  message: string
  error?: string
}

export async function updateProfile(data: UpdateProfileData): Promise<ActionResult> {
  try {
    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        message: '请先登录',
        error: 'NOT_AUTHENTICATED',
      }
    }

    const profileUpdateData: Record<string, string | null> = {}
    const authMetadata = {
      ...(user.user_metadata ?? {}),
    }

    if (data.displayName !== undefined) {
      const nextDisplayName =
        data.displayName.trim() || user.email?.split('@')[0] || '用户'

      profileUpdateData.display_name = nextDisplayName
      authMetadata.display_name = nextDisplayName
    }

    if (data.avatarUrl !== undefined) {
      profileUpdateData.avatar_url = data.avatarUrl
      authMetadata.avatar_url = data.avatarUrl
    }

    if (Object.keys(profileUpdateData).length === 0) {
      return {
        success: false,
        message: '没有要更新的内容',
        error: 'NO_DATA',
      }
    }

    profileUpdateData.id = user.id
    profileUpdateData.updated_at = new Date().toISOString()

    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('profiles')
      .upsert(profileUpdateData, {
        onConflict: 'id',
      })

    if (error) {
      console.error('[updateProfile] 更新失败:', error)
      return {
        success: false,
        message: '更新失败，请稍后重试',
        error: error.message,
      }
    }

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: authMetadata,
      }
    )

    if (authUpdateError) {
      console.error('[updateProfile] 更新 Auth 元数据失败:', authUpdateError)
    }

    revalidatePath('/', 'layout')
    revalidatePath('/profile')
    revalidatePath('/settings')

    return {
      success: true,
      message: '更新成功',
    }
  } catch (error) {
    console.error('[updateProfile] 异常:', error)
    return {
      success: false,
      message: '更新失败',
      error: String(error),
    }
  }
}

export async function getProfile() {
  try {
    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[getProfile] 获取档案失败:', profileError)
      return null
    }

    return {
      id: user.id,
      email: user.email,
      ...profile,
    }
  } catch (error) {
    console.error('[getProfile] 异常:', error)
    return null
  }
}