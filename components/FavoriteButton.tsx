'use client'

import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { toggleFavorite } from '@/app/actions/favorites'

interface FavoriteButtonProps {
    articleId: string
    initialFavorited: boolean
}

export default function FavoriteButton({ articleId, initialFavorited }: FavoriteButtonProps) {
    const [favorited, setFavorited] = useState(initialFavorited)
    const [isPending, startTransition] = useTransition()
    const [toast, setToast] = useState<string | null>(null)

    const handleClick = () => {
        startTransition(async () => {
            const result = await toggleFavorite(articleId)
            if (result.error === 'NOT_AUTHENTICATED') {
                alert('请先登录后再收藏')
                return
            }
            if (result.success && result.favorited !== undefined) {
                setFavorited(result.favorited)
                setToast(result.favorited ? '去吃灰吧' : '放它自由')
                setTimeout(() => setToast(null), 1800)
            }
        })
    }

    return (
        <span className="relative inline-flex items-center gap-2 not-italic">
            <button
                onClick={handleClick}
                disabled={isPending}
                aria-label={favorited ? '取消收藏' : '收藏'}
                className="inline-flex items-center transition-colors duration-200"
            >
                <Bookmark
                    className={`h-4 w-4 transition-all duration-200 ${favorited
                            ? 'fill-[#A1887F] text-[#A1887F]'
                            : 'opacity-60 hover:opacity-100 hover:text-[#A1887F]'
                        }`}
                    aria-hidden="true"
                />
            </button>
            {toast && (
                <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#5D5D5D] px-2 py-0.5 text-[11px] text-white shadow-sm animate-fade-out">
                    {toast}
                </span>
            )}
        </span>
    )
}
