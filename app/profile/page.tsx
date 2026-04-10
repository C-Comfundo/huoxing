'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bookmark,
  Heart,
  Loader2,
  Settings,
  BookOpen,
  MessageCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getUserFavorites,
  getUserLikedEchoes,
  type FavoritedArticle,
  type LikedEcho,
} from '@/app/actions/profile-data'

type Tab = 'favorites' | 'likes'

function formatDate(input: string): string {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return input
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trim() + '…'
}

export default function ProfilePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{
    displayName: string
    email: string
    avatarUrl: string | null
  } | null>(null)

  const [tab, setTab] = useState<Tab>('favorites')
  const [favorites, setFavorites] = useState<FavoritedArticle[]>([])
  const [likedEchoes, setLikedEchoes] = useState<LikedEcho[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState<Record<Tab, boolean>>({
    favorites: false,
    likes: false,
  })

  // Load user profile
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      if (!supabase) {
        router.push('/login')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      let displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || '用户'
      let avatarUrl: string | null = null

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single()

        if (profileData) {
          if (profileData.display_name) displayName = profileData.display_name
          avatarUrl = profileData.avatar_url
        }
      } catch {
        // Fall back to auth metadata
      }

      setProfile({
        displayName,
        email: user.email || '',
        avatarUrl,
      })
      setLoading(false)
    }

    load()
  }, [router])

  // Load tab data lazily
  useEffect(() => {
    if (loading || !profile) return
    if (dataLoaded[tab]) return

    const loadTabData = async () => {
      setDataLoading(true)
      try {
        if (tab === 'favorites') {
          const data = await getUserFavorites()
          setFavorites(data)
        } else {
          const data = await getUserLikedEchoes()
          setLikedEchoes(data)
        }
        setDataLoaded((prev) => ({ ...prev, [tab]: true }))
      } catch (error) {
        console.error(`[ProfilePage] 加载 ${tab} 数据失败:`, error)
      } finally {
        setDataLoading(false)
      }
    }

    loadTabData()
  }, [tab, loading, profile, dataLoaded])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#A1887F] animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'favorites', label: '我的收藏', icon: <Bookmark className="w-4 h-4" /> },
    { key: 'likes', label: '点赞的回响', icon: <Heart className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-[#E8E4DF] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-[#5D5D5D] hover:text-[#3A3A3A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-youyou text-sm">返回首页</span>
            </Link>
            <span className="text-[#D7CCC8]">|</span>
            <h1 className="font-youyou text-lg text-[#3A3A3A]">个人主页</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Profile Card */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-[#E8E4DF] mb-8">
          <div className="flex items-center space-x-5">
            {/* Avatar */}
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.displayName}
                width={72}
                height={72}
                unoptimized
                className="w-[72px] h-[72px] rounded-full object-cover border-2 border-[#E8E4DF] shrink-0"
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full bg-[#A1887F] flex items-center justify-center text-white text-2xl font-youyou border-2 border-[#E8E4DF] shrink-0">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-youyou text-xl text-[#3A3A3A] truncate">
                {profile.displayName}
              </h2>
              <p className="text-sm text-[#8D8D8D] truncate mt-1">{profile.email}</p>
              <Link
                href="/settings"
                className="inline-flex items-center space-x-1.5 mt-3 text-xs text-[#A1887F] hover:text-[#8D6E63] transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="font-youyou tracking-wide">编辑资料</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E8E4DF] mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center space-x-2 px-5 py-3 text-sm font-youyou tracking-wide transition-all duration-300 border-b-2 -mb-[1px] ${
                tab === t.key
                  ? 'border-[#A1887F] text-[#3A3A3A]'
                  : 'border-transparent text-[#8D8D8D] hover:text-[#5D5D5D]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-[#A1887F] animate-spin" />
          </div>
        ) : tab === 'favorites' ? (
          <FavoritesList items={favorites} />
        ) : (
          <LikedEchoesList items={likedEchoes} />
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function FavoritesList({ items }: { items: FavoritedArticle[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Bookmark className="w-10 h-10 mx-auto text-[#D7CCC8]" />
        <p className="font-youyou text-[#8D8D8D]">还没有收藏的文章</p>
        <p className="text-sm text-[#BCAAA4]">阅读文章时点击收藏按钮即可添加</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.articleId}
          href={`/articles/${item.slug}`}
          className="group block bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-[#E8E4DF] transition-all duration-300 hover:bg-white hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-youyou text-base text-[#3A3A3A] group-hover:text-[#A1887F] transition-colors truncate">
                {item.title}
              </h3>
              <div className="flex items-center gap-3 mt-2 text-xs text-[#8D8D8D]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#D7CCC8]" />
                  {item.category}
                </span>
                <span>作者：{item.author}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-xs text-[#BCAAA4]">
              <Bookmark className="w-3.5 h-3.5" />
              <span>{formatDate(item.favoritedAt)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function LikedEchoesList({ items }: { items: LikedEcho[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Heart className="w-10 h-10 mx-auto text-[#D7CCC8]" />
        <p className="font-youyou text-[#8D8D8D]">还没有点赞的回响</p>
        <p className="text-sm text-[#BCAAA4]">阅读文章下方的回响，点击 ♥ 即可添加</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.echoId}
          href={`/articles/${item.article.slug}#echo-${item.echoId}`}
          className="group block bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-[#E8E4DF] transition-all duration-300 hover:bg-white hover:shadow-md hover:-translate-y-0.5"
        >
          {/* Echo content */}
          <p className="font-serif text-sm leading-7 text-[#3A3A3A] group-hover:text-[#5D5D5D]">
            「{truncate(item.content, 80)}」
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-[#8D8D8D]">
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-3 h-3 opacity-60" />
                {item.authorLabel}
              </span>
              <span className="text-[#D7CCC8]">·</span>
              <span className="inline-flex items-center gap-1">
                <BookOpen className="w-3 h-3 opacity-60" />
                <span className="truncate max-w-[160px]">{item.article.title}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-xs text-[#BCAAA4]">
              <Heart className="w-3 h-3" />
              <span>{formatDate(item.likedAt)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
