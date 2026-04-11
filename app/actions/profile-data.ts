'use server'

import { authorLabelFrom } from '@/lib/comment-authors'
import { createClient } from '@/lib/supabase/server'

export interface FavoritedArticle {
  articleId: string
  slug: string
  title: string
  author: string
  category: string
  favoritedAt: string
}

export interface LikedItem {
  id: string
  kind: 'echo' | 'drawing-comment'
  content: string
  authorLabel: string
  createdAt: string
  likedAt: string
  href: string
  targetTitle: string
}

export async function getUserFavorites(): Promise<FavoritedArticle[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  type RawFavoriteRow = {
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

  return (data as unknown as RawFavoriteRow[])
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

export async function getUserLikedItems(): Promise<LikedItem[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const [echoLikesResult, drawingCommentLikesResult] = await Promise.all([
    supabase
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
      .order('created_at', { ascending: false }),
    supabase
      .from('issue_drawing_comment_likes')
      .select(`
        created_at,
        comment:issue_drawing_comments!inner (
          id,
          content,
          is_anonymous,
          author_display_name,
          created_at,
          issue:issues!inner (
            id,
            slug,
            label,
            published_at
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (echoLikesResult.error) {
    console.error('[getUserLikedItems] 查询回响点赞失败:', echoLikesResult.error)
  }

  if (drawingCommentLikesResult.error) {
    console.error(
      '[getUserLikedItems] 查询画里有话评论点赞失败:',
      drawingCommentLikesResult.error
    )
  }

  type RawEchoLikeRow = {
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

  type RawDrawingCommentLikeRow = {
    created_at: string
    comment: {
      id: string
      content: string
      is_anonymous: boolean
      author_display_name: string | null
      created_at: string
      issue: {
        id: string
        slug: string
        label: string | null
        published_at: string | null
      }
    }
  }

  const echoItems = ((echoLikesResult.data as unknown as RawEchoLikeRow[] | null) ?? [])
    .filter((row) => row.echo?.article?.is_published)
    .map((row) => ({
      id: row.echo.id,
      kind: 'echo' as const,
      content: row.echo.content,
      authorLabel: authorLabelFrom(
        row.echo.is_anonymous,
        row.echo.author_display_name
      ),
      createdAt: row.echo.created_at,
      likedAt: row.created_at,
      href: `/articles/${row.echo.article.slug}#echo-${row.echo.id}`,
      targetTitle: row.echo.article.title || '未命名文章',
    }))

  const drawingCommentItems = (
    (drawingCommentLikesResult.data as unknown as RawDrawingCommentLikeRow[] | null) ?? []
  )
    .filter(
      (row) =>
        Boolean(row.comment?.issue?.slug) && Boolean(row.comment?.issue?.published_at)
    )
    .map((row) => ({
      id: row.comment.id,
      kind: 'drawing-comment' as const,
      content: row.comment.content,
      authorLabel: authorLabelFrom(
        row.comment.is_anonymous,
        row.comment.author_display_name
      ),
      createdAt: row.comment.created_at,
      likedAt: row.created_at,
      href: `/issues/${row.comment.issue.slug}/drawing#drawing-comment-${row.comment.id}`,
      targetTitle: `${row.comment.issue.label || '当期'} · 画里有话`,
    }))

  return [...echoItems, ...drawingCommentItems].sort(
    (left, right) =>
      new Date(right.likedAt).getTime() - new Date(left.likedAt).getTime()
  )
}
