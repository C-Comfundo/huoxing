'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ActionResult {
    success: boolean
    message: string
    favorited?: boolean
    error?: string
}

export async function getFavoriteStatus(articleId: string): Promise<{
    favorited: boolean
}> {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { favorited: false }

        const adminClient = createAdminClient()
        const { data: existing } = await adminClient
            .from('favorites')
            .select('user_id')
            .eq('article_id', articleId)
            .eq('user_id', user.id)
            .maybeSingle()

        return { favorited: !!existing }
    } catch (error) {
        console.error('[getFavoriteStatus] 异常:', error)
        return { favorited: false }
    }
}

export async function toggleFavorite(articleId: string): Promise<ActionResult> {
    try {
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return { success: false, message: '请先登录', error: 'NOT_AUTHENTICATED' }
        }

        const adminClient = createAdminClient()
        const { data: existing } = await adminClient
            .from('favorites')
            .select('user_id')
            .eq('article_id', articleId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (existing) {
            const { error } = await adminClient
                .from('favorites')
                .delete()
                .eq('article_id', articleId)
                .eq('user_id', user.id)

            if (error) return { success: false, message: '操作失败，请稍后重试', error: error.message }
            return { success: true, message: '已取消收藏', favorited: false }
        } else {
            const { error } = await adminClient
                .from('favorites')
                .insert({ article_id: articleId, user_id: user.id })

            if (error) return { success: false, message: '操作失败，请稍后重试', error: error.message }
            return { success: true, message: '收藏成功', favorited: true }
        }
    } catch (error) {
        console.error('[toggleFavorite] 异常:', error)
        return { success: false, message: '操作失败', error: String(error) }
    }
}
