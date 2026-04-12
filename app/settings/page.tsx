'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loadCurrentUserProfile } from '@/lib/current-user-profile'
import { updateProfile } from '@/app/actions/profile'

interface Profile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // 获取用户档案
  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      if (!supabase) {
        setMessage('服务配置缺失，请联系管理员')
        setIsError(true)
        setLoading(false)
        return
      }

      const currentUser = await loadCurrentUserProfile(supabase)

      if (!currentUser) {
        router.push('/login')
        return
      }

      setProfile({
        id: currentUser.id,
        email: currentUser.email,
        display_name: currentUser.displayName,
        avatar_url: currentUser.avatarUrl,
      })
      setDisplayName(currentUser.displayName)
      setAvatarUrl(currentUser.avatarUrl)
      setLoading(false)
    }

    loadProfile()
  }, [router])

  // 处理头像上传
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setMessage('请选择图片文件')
      setIsError(true)
      return
    }

    // 验证文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      setMessage('图片大小不能超过 2MB')
      setIsError(true)
      return
    }

    // 显示预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // 上传到 Supabase Storage
    setUploading(true)
    setMessage('')

    try {
      const supabase = createClient()
      if (!supabase) {
        setMessage('服务配置缺失，请联系管理员')
        setIsError(true)
        setAvatarPreview(null)
        return
      }
      
      // 生成唯一文件名
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // 上传文件
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        // 如果 bucket 不存在，提示需要创建
        if (uploadError.message.includes('Bucket not found')) {
          setMessage('请先在 Supabase 中创建 avatars 存储桶')
          setIsError(true)
          setAvatarPreview(null)
          setUploading(false)
          return
        }
        throw uploadError
      }

      // 获取公开 URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      setMessage('头像上传成功，请点击保存')
      setIsError(false)
    } catch (error) {
      console.error('上传头像失败:', error)
      setMessage('上传失败，请稍后重试')
      setIsError(true)
      setAvatarPreview(null)
    } finally {
      setUploading(false)
    }
  }

  // 保存设置
  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    setMessage('')

    const nextDisplayName = displayName.trim() || profile.email.split('@')[0] || '用户'

    const result = await updateProfile({
      displayName: displayName !== profile.display_name ? displayName : undefined,
      avatarUrl: avatarUrl !== profile.avatar_url ? avatarUrl || undefined : undefined,
    })

    if (result.success) {
      setMessage('保存成功')
      setIsError(false)
      // 更新本地状态
      setProfile({
        ...profile,
        display_name: nextDisplayName,
        avatar_url: avatarUrl,
      })
      setDisplayName(nextDisplayName)
      setAvatarPreview(null)
      // 重新加载整个页面以更新各处的顶栏缓存
      window.location.reload()
    } else {
      setMessage(result.message)
      setIsError(true)
    }

    setSaving(false)
  }

  // 获取显示名称首字
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#A1887F] animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* 顶部导航 */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-[#E8E4DF] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/profile" 
              className="inline-flex items-center space-x-2 text-[#5D5D5D] hover:text-[#3A3A3A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-youyou text-sm">返回</span>
            </Link>
            <span className="text-[#D7CCC8]">|</span>
            <h1 className="font-youyou text-lg text-[#3A3A3A]">个人设置</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-[#E8E4DF]">
          {/* 头像设置 */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              {/* 头像显示 */}
              {avatarPreview || avatarUrl ? (
                <Image
                  src={avatarPreview || avatarUrl || ''}
                  alt={displayName}
                  width={96}
                  height={96}
                  unoptimized
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#E8E4DF]"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#A1887F] flex items-center justify-center text-white text-3xl font-youyou border-2 border-[#E8E4DF]">
                  {getInitial(displayName)}
                </div>
              )}
            </div>
            
            <p className="mt-4 text-sm text-[#8D8D8D] font-youyou">
              头像上传功能正在升级中，暂不可用
            </p>
          </div>

          {/* 表单 */}
          <div className="space-y-6">
            {/* 邮箱（只读） */}
            <div>
              <label className="block text-sm font-youyou text-[#5D5D5D] mb-2">
                邮箱
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-3 bg-[#F7F5F0] border border-[#E8E4DF] rounded-xl text-[#8D8D8D] cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-[#BCAAA4] font-youyou">邮箱不可更改</p>
            </div>

            {/* 显示名称 */}
            <div>
              <label className="block text-sm font-youyou text-[#5D5D5D] mb-2">
                笔名
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="您希望如何被称呼"
                className="w-full px-4 py-3 bg-[#F7F5F0] border border-[#E8E4DF] rounded-xl text-[#3A3A3A] placeholder-[#BCAAA4] focus:outline-none focus:border-[#A1887F] focus:ring-1 focus:ring-[#A1887F]/20 transition-all font-youyou"
              />
            </div>

            {/* 消息提示 */}
            {message && (
              <div
                className={`p-3 rounded-xl text-sm font-youyou ${
                  isError
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : 'bg-green-50 text-green-600 border border-green-100'
                }`}
              >
                {message}
              </div>
            )}

            {/* 保存按钮 */}
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="w-full py-3.5 bg-[#3A3A3A] hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D] text-white font-youyou tracking-wider rounded-xl transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>保存设置</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 提示 */}
        <p className="mt-6 text-center text-xs text-[#BCAAA4] font-youyou">
          修改后记得点击保存按钮
        </p>
      </div>
    </div>
  )
}