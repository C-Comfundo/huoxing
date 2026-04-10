'use server'

/**
 * 用户档案管理 Server Actions
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface UpdateProfileData {
  displayName?: string
  avatarUrl?: string
}

interface ActionResult {
  success: boolean
  message: string
  error?: string
}

/**
 * 更新用户档案
 */
export async function updateProfile(data: UpdateProfileData): Promise<ActionResult> {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return {
        success: false,
        message: '请先登录',
        error: 'NOT_AUTHENTICATED',
      }
    }

    const updateData: Record<string, string> = {
      id: user.id
    }
    
    if (data.displayName !== undefined) {
      updateData.display_name = data.displayName
    }
    
    if (data.avatarUrl !== undefined) {
      updateData.avatar_url = data.avatarUrl
    }

    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        message: '没有要更新的内容',
        error: 'NO_DATA',
      }
    }

    updateData.updated_at = new Date().toISOString()

    const adminClient = createAdminClient()
    
    const { error } = await adminClient
      .from('profiles')
      .upsert(updateData)

    if (error) {
      console.error('[updateProfile] 更新失败:', error)
      return {
        success: false,
        message: '更新失败，请稍后重试',
        error: error.message,
      }
    }

    revalidatePath('/', 'layout')
    
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

/**
 * 获取当前用户档案
 */
export async function getProfile() {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
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
