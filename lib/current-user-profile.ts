import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface CurrentUserProfile {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeAvatarUrl(value: unknown): string | null {
  const avatarUrl = normalizeText(value)
  return avatarUrl || null
}

function getFallbackDisplayName(user: User): string {
  return (
    normalizeText(user.user_metadata?.display_name) ||
    normalizeText(user.email?.split('@')[0]) ||
    '用户'
  )
}

export async function loadCurrentUserProfile(
  supabase: SupabaseClient
): Promise<CurrentUserProfile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  let displayName = getFallbackDisplayName(user)
  let avatarUrl = normalizeAvatarUrl(user.user_metadata?.avatar_url)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[loadCurrentUserProfile] 获取 profiles 失败:', profileError)
  }

  if (profile) {
    const profileDisplayName = normalizeText(profile.display_name)

    if (profileDisplayName) {
      displayName = profileDisplayName
    }

    avatarUrl = normalizeAvatarUrl(profile.avatar_url)
  }

  return {
    id: user.id,
    email: user.email || '',
    displayName,
    avatarUrl,
  }
}
