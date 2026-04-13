'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Heart,
  Loader2,
  MessageCircle,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loadCurrentUserProfile } from '@/lib/current-user-profile'
import {
  getUserFavorites,
  getUserLikedItems,
  type FavoritedArticle,
  type LikedItem,
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
  return `${text.slice(0, max).trim()}...`
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
  const [likedItems, setLikedItems] = useState<LikedItem[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState<Record<Tab, boolean>>({
    favorites: false,
    likes: false,
  })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      if (!supabase) {
        router.push('/login')
        return
      }

      const currentUser = await loadCurrentUserProfile(supabase)
      if (!currentUser) {
        router.push('/login')
        return
      }

      setProfile({
        displayName: currentUser.displayName,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
      })
      setLoading(false)
    }

    load()
  }, [router])

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
          const data = await getUserLikedItems()
          setLikedItems(data)
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
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0]">
        <Loader2 className="h-6 w-6 animate-spin text-[#A1887F]" />
      </div>
    )
  }

  if (!profile) return null

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'favorites', label: '我的收藏', icon: <Bookmark className="h-4 w-4" /> },
    { key: 'likes', label: '点赞的内容', icon: <Heart className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      <div className="sticky top-0 z-10 border-b border-[#E8E4DF] bg-white/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-[#5D5D5D] transition-colors hover:text-[#3A3A3A]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-youyou text-sm">返回</span>
            </Link>
            <span className="text-[#D7CCC8]">|</span>
            <h1 className="font-youyou text-lg text-[#3A3A3A]">个人主页</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8 rounded-2xl border border-[#E8E4DF] bg-white/60 p-8 backdrop-blur-sm">
          <div className="flex items-center space-x-5">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.displayName}
                width={72}
                height={72}
                unoptimized
                className="h-[72px] w-[72px] shrink-0 rounded-full border-2 border-[#E8E4DF] object-cover"
              />
            ) : (
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-2 border-[#E8E4DF] bg-[#A1887F] text-2xl font-youyou text-white">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h2 className="truncate font-youyou text-xl text-[#3A3A3A]">
                {profile.displayName}
              </h2>
              <p className="mt-1 truncate text-sm text-[#8D8D8D]">{profile.email}</p>
              <Link
                href="/settings"
                className="mt-3 inline-flex items-center space-x-1.5 text-xs text-[#A1887F] transition-colors hover:text-[#8D6E63]"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="font-youyou tracking-wide">编辑资料</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-6 flex border-b border-[#E8E4DF]">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`-mb-[1px] flex items-center space-x-2 border-b-2 px-5 py-3 text-sm font-youyou tracking-wide transition-all duration-300 ${
                tab === item.key
                  ? 'border-[#A1887F] text-[#3A3A3A]'
                  : 'border-transparent text-[#8D8D8D] hover:text-[#5D5D5D]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[#A1887F]" />
          </div>
        ) : tab === 'favorites' ? (
          <FavoritesList items={favorites} />
        ) : (
          <LikedItemsList items={likedItems} />
        )}
      </div>
    </div>
  )
}

function FavoritesList({ items }: { items: FavoritedArticle[] }) {
  if (items.length === 0) {
    return (
      <div className="space-y-3 py-16 text-center">
        <Bookmark className="mx-auto h-10 w-10 text-[#D7CCC8]" />
        <p className="font-youyou text-[#8D8D8D]">还没有收藏的文章</p>
        <p className="text-sm text-[#BCAAA4]">阅读文章时点击收藏按钮，即可添加到这里</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.articleId}
          href={`/articles/${item.slug}`}
          className="group block rounded-xl border border-[#E8E4DF] bg-white/60 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-youyou text-base text-[#3A3A3A] transition-colors group-hover:text-[#A1887F]">
                {item.title}
              </h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-[#8D8D8D]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#D7CCC8]" />
                  {item.category}
                </span>
                <span>作者：{item.author}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-[#BCAAA4]">
              <Bookmark className="h-3.5 w-3.5" />
              <span>{formatDate(item.favoritedAt)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function LikedItemsList({ items }: { items: LikedItem[] }) {
  if (items.length === 0) {
    return (
      <div className="space-y-3 py-16 text-center">
        <Heart className="mx-auto h-10 w-10 text-[#D7CCC8]" />
        <p className="font-youyou text-[#8D8D8D]">还没有点赞的内容</p>
        <p className="text-sm text-[#BCAAA4]">
          在文章回响或画里有话评论里点击心形按钮，就会出现在这里
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const TargetIcon = item.kind === 'echo' ? BookOpen : MessageSquare

        return (
          <Link
            key={`${item.kind}-${item.id}`}
            href={item.href}
            className="group block rounded-xl border border-[#E8E4DF] bg-white/60 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
          >
            <p className="font-serif text-sm leading-7 text-[#3A3A3A] group-hover:text-[#5D5D5D]">
              「{truncate(item.content, 80)}」
            </p>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-[#8D8D8D]">
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 opacity-60" />
                  {item.authorLabel}
                </span>
                <span className="text-[#D7CCC8]">·</span>
                <span className="inline-flex items-center gap-1">
                  <TargetIcon className="h-3 w-3 opacity-60" />
                  <span className="max-w-[180px] truncate">{item.targetTitle}</span>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-[#BCAAA4]">
                <Heart className="h-3 w-3" />
                <span>{formatDate(item.likedAt)}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
