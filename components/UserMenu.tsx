'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, ChevronDown, User } from 'lucide-react'
import { signOut } from '@/app/actions/auth'

interface UserMenuProps {
  user: {
    email: string
    displayName: string
  }
  onClose?: () => void
}

export default function UserMenu({ user, onClose }: UserMenuProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
    onClose?.()
    router.push('/')
    router.refresh()
  }

  // 获取显示名称的首字
  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?'
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-[#5D5D5D] hover:text-[#3A3A3A] transition-colors"
      >
        {/* 首字母头像 - 莫兰迪色系 */}
        <div className="w-8 h-8 rounded-full bg-[#A1887F] flex items-center justify-center text-white text-sm font-youyou">
          {getInitial(user.displayName)}
        </div>
        
        {/* 名字（桌面端显示） */}
        <span className="hidden lg:block text-sm font-youyou max-w-[100px] truncate">
          {user.displayName}
        </span>
        
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg border border-[#E8E4DF] py-2 z-50">
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-[#E8E4DF]">
            <p className="text-sm font-youyou text-[#3A3A3A] truncate">{user.displayName}</p>
            <p className="text-xs text-[#8D8D8D] truncate">{user.email}</p>
          </div>

          {/* 个人主页 */}
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-3 px-4 py-2.5 text-sm font-youyou text-[#5D5D5D] hover:bg-[#FAF9F6] hover:text-[#A1887F] transition-colors"
          >
            <User className="w-4 h-4" />
            <span>个人主页</span>
          </Link>

          {/* 登出 */}
          <div className="border-t border-[#E8E4DF] mt-1 pt-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-youyou text-[#5D5D5D] hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
