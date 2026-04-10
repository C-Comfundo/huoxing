'use server'

import { createClient } from '@/lib/supabase/server'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface FavoritedArticle {
  articleId: string
  slug: string
  title: string
  author: string
  category: string
  favoritedAt: string
}

export interface LikedEcho {
  echoId: string
  content: string
  authorLabel: string
  createdAt: string
  likedAt: string
  article: {
    id: string
    slug: string
    title: string
  }
}

// ──────────────────────────────────────────────
// getUserFavorites
// ──────────────────────────────────────────────

export async function getUserFavorites(): Promise<FavoritedArticle[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('favorites')
    .select(`
      created_at,
      article:articles!inner (
        id,
        slug,
        title,
        author_name,
        category,
        is_published
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('[getUserFavorites] 查询失败:', error)
    return []
  }

  type RawRow = {
    created_at: string
    article: {
      id: string
      slug: string
      title: string
      author_name: string | null
      category: string | null
      is_published: boolean
    }
  }

  return (data as unknown as RawRow[])
    .filter((row) => row.article?.is_published)
    .map((row) => ({
      articleId: row.article.id,
      slug: row.article.slug,
      title: row.article.title || '未命名文章',
      author: row.article.author_name || '匿名',
      category: row.article.category || '未分类',
      favoritedAt: row.created_at,
    }))
}

// ──────────────────────────────────────────────
// getUserLikedEchoes
// ──────────────────────────────────────────────

export async function getUserLikedEchoes(): Promise<LikedEcho[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('likes')
    .select(`
      created_at,
      echo:echoes!inner (
        id,
        content,
        is_anonymous,
        author_display_name,
        created_at,
        article:articles!inner (
          id,
          slug,
          title,
          is_published
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('[getUserLikedEchoes] 查询失败:', error)
    return []
  }

  type RawRow = {
    created_at: string
    echo: {
      id: string
      content: string
      is_anonymous: boolean
      author_display_name: string | null
      created_at: string
      article: {
        id: string
        slug: string
        title: string
        is_published: boolean
      }
    }
  }

  return (data as unknown as RawRow[])
    .filter((row) => row.echo?.article?.is_published)
    .map((row) => ({
      echoId: row.echo.id,
      content: row.echo.content,
      authorLabel: row.echo.is_anonymous
        ? '匿名'
        : row.echo.author_display_name || '用户',
      createdAt: row.echo.created_at,
      likedAt: row.created_at,
      article: {
        id: row.echo.article.id,
        slug: row.echo.article.slug,
        title: row.echo.article.title || '未命名文章',
      },
    }))
}
