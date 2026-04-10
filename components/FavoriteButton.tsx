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

    const handleClick = () => {
        startTransition(async () => {
            const result = await toggleFavorite(articleId)
            if (result.error === 'NOT_AUTHENTICATED') {
                alert('请先登录后再收藏')
                return
            }
            if (result.success && result.favorited !== undefined) {
                setFavorited(result.favorited)
            }
        })
    }

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            aria-label={favorited ? '取消收藏' : '收藏'}
            className="inline-flex items-center gap-2 not-italic transition-colors duration-200"
        >
            <Bookmark
                className={`h-4 w-4 transition-all duration-200 ${favorited
                        ? 'fill-[#A1887F] text-[#A1887F]'
                        : 'opacity-60 hover:opacity-100 hover:text-[#A1887F]'
                    }`}
                aria-hidden="true"
            />
        </button>
    )
}
