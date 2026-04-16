'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmail, signUpWithCode } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Eye, EyeOff, Sparkles } from 'lucide-react'

type AuthMode = 'login' | 'register' | 'forgot'
const FORGOT_PASSWORD_COOLDOWN_SECONDS = 60

function getForgotPasswordErrorMessage(message?: string) {
  if (!message) {
    return '重置邮件发送失败，请稍后重试。'
  }

  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('security purposes') ||
    normalizedMessage.includes('after 60 seconds') ||
    normalizedMessage.includes('over_email_send_rate_limit')
  ) {
    return '发送过于频繁，请至少等待 60 秒后再试。'
  }

  if (normalizedMessage.includes('rate limit')) {
    return '当前发送过于频繁，请稍后再试。'
  }

  if (normalizedMessage.includes('redirect')) {
    return '重置邮件发送失败，请检查 Supabase 的 Redirect URLs 是否已添加 /auth/callback。'
  }

  if (
    normalizedMessage.includes('smtp') ||
    normalizedMessage.includes('error sending') ||
    normalizedMessage.includes('sending recovery email') ||
    normalizedMessage.includes('email address not authorized')
  ) {
    return '邮件服务发送失败，请检查 Supabase 的 SMTP/Resend 配置。'
  }

  if (normalizedMessage.includes('captcha')) {
    return '当前项目启用了验证码校验，找回密码请求缺少验证码。'
  }

  return '重置邮件发送失败，请稍后重试。'
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotPasswordCountdown, setForgotPasswordCountdown] = useState(0)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const redirectTo = (() => {
    const candidate = searchParams.get('redirectTo')
    return candidate?.startsWith('/') ? candidate : '/'
  })()

  useEffect(() => {
    const requestedMode = searchParams.get('mode')
    if (requestedMode === 'register' || requestedMode === 'forgot' || requestedMode === 'login') {
      setMode(requestedMode)
    }

    const nextMessage = searchParams.get('message')
    const nextType = searchParams.get('type')
    if (nextMessage) {
      setMessage(nextMessage)
      setIsError(nextType === 'error')

      const params = new URLSearchParams(searchParams.toString())
      params.delete('message')
      params.delete('type')

      const nextQuery = params.toString()
      const nextUrl = nextQuery ? `/login?${nextQuery}` : '/login'
      router.replace(nextUrl, { scroll: false })
    }
  }, [router, searchParams])

  useEffect(() => {
    if (forgotPasswordCountdown <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setForgotPasswordCountdown((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [forgotPasswordCountdown])

  const clearFeedback = () => {
    setMessage('')
    setIsError(false)
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    clearFeedback()
  }

  const handleForgotPassword = async () => {
    const normalizedEmail = email.toLowerCase().trim()
    const supabase = createClient()

    if (!supabase) {
      setMessage('服务配置缺失，请联系管理员。')
      setIsError(true)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    if (error) {
      console.error('[resetPasswordForEmail] 发送重置邮件失败:', error)
      setMessage(getForgotPasswordErrorMessage(error.message))
      setIsError(true)
      return
    }

    setMessage('如果该邮箱已注册，我们已发送重置密码邮件，请注意查收。')
    setIsError(false)
    setForgotPasswordCountdown(FORGOT_PASSWORD_COOLDOWN_SECONDS)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    clearFeedback()

    try {
      if (mode === 'login') {
        const result = await signInWithEmail({ email, password })
        if (result.success) {
          setMessage(result.message)
          setIsError(false)
          router.push(redirectTo)
          router.refresh()
        } else {
          setMessage(result.message)
          setIsError(true)
        }
      } else if (mode === 'register') {
        const result = await signUpWithCode({
          email,
          password,
          inviteCode,
          displayName: displayName || undefined,
        })

        if (result.success) {
          setMessage(`${result.message} 请登录以继续。`)
          setIsError(false)
          setMode('login')
          setPassword('')
          setInviteCode('')
          setDisplayName('')
        } else {
          setMessage(result.message)
          setIsError(true)
        }
      } else {
        await handleForgotPassword()
      }
    } catch (error) {
      setMessage('发生未知错误，请稍后重试。')
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  const titleText =
    mode === 'login' ? '欢迎回来' : mode === 'register' ? '加入我们，点燃星火' : '通过邮箱找回密码'

  const submitText =
    mode === 'login'
      ? '登录'
      : mode === 'register'
        ? '注册'
        : forgotPasswordCountdown > 0
          ? `${forgotPasswordCountdown} 秒后可重新发送`
          : '发送重置邮件'

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      <div className="p-6">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-[#5D5D5D] hover:text-[#3A3A3A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-youyou text-sm">返回首页</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="font-youyou text-4xl tracking-widest text-[#3A3A3A] mb-3">星火</h1>
            <p className="text-[#8D8D8D] font-youyou text-sm tracking-wide">{titleText}</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-[#E8E4DF]">
            {mode === 'forgot' ? (
              <div className="mb-8 rounded-2xl bg-[#F7F5F0] px-4 py-3">
                <div>
                  <p className="text-sm font-youyou text-[#3A3A3A]">找回密码</p>
                  <p className="mt-1 text-xs text-[#8D8D8D] font-youyou">
                    我们会向您的邮箱发送重置链接
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex mb-8 bg-[#F7F5F0] rounded-full p-1">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2.5 text-sm font-youyou tracking-wide rounded-full transition-all duration-300 ${
                    mode === 'login'
                      ? 'bg-white text-[#3A3A3A] shadow-sm'
                      : 'text-[#8D8D8D] hover:text-[#5D5D5D]'
                  }`}
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={`flex-1 py-2.5 text-sm font-youyou tracking-wide rounded-full transition-all duration-300 ${
                    mode === 'register'
                      ? 'bg-white text-[#3A3A3A] shadow-sm'
                      : 'text-[#8D8D8D] hover:text-[#5D5D5D]'
                  }`}
                >
                  注册
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-youyou text-[#5D5D5D] mb-2">
                    邀请码 <span className="text-[#A1887F]">*</span>
                  </label>
                  <div className="relative">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1887F]" />
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-[#F7F5F0] border border-[#E8E4DF] rounded-xl text-[#3A3A3A] placeholder-[#BCAAA4] focus:outline-none focus:border-[#A1887F] focus:ring-1 focus:ring-[#A1887F]/20 transition-all font-mono tracking-widest text-center"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-[#8D8D8D] font-youyou leading-relaxed">
                    星火社区采用邀请制，邀请码申请，请添加WeChat：xinghuotakan0308
                  </p>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-youyou text-[#5D5D5D] mb-2">
                    笔名 <span className="text-[#8D8D8D] text-xs">（选填）</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="您希望如何被称呼"
                    className="w-full px-4 py-3 bg-[#F7F5F0] border border-[#E8E4DF] rounded-xl text-[#3A3A3A] placeholder-[#BCAAA4] focus:outline-none focus:border-[#A1887F] focus:ring-1 focus:ring-[#A1887F]/20 transition-all font-youyou"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-youyou text-[#5D5D5D] mb-2">
                  邮箱 <span className="text-[#A1887F]">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 bg-[#F7F5F0] border border-[#E8E4DF] rounded-xl text-[#3A3A3A] placeholder-[#BCAAA4] focus:outline-none focus:border-[#A1887F] focus:ring-1 focus:ring-[#A1887F]/20 transition-all"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-youyou text-[#5D5D5D]">
                      密码 <span className="text-[#A1887F]">*</span>
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs font-youyou text-[#A1887F] hover:text-[#8D6E63] transition-colors"
                      >
                        忘记密码？
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? '至少 6 位字符' : '输入密码'}
                      required
                      minLength={mode === 'register' ? 6 : undefined}
                      className="w-full px-4 py-3 pr-11 bg-[#F7F5F0] border border-[#E8E4DF] rounded-xl text-[#3A3A3A] placeholder-[#BCAAA4] focus:outline-none focus:border-[#A1887F] focus:ring-1 focus:ring-[#A1887F]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8D8D8D] hover:text-[#5D5D5D] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

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

              {mode === 'forgot' && (
                <p className="text-xs leading-relaxed text-[#8D8D8D] font-youyou">
                  请填写注册时使用的邮箱地址。收到邮件后，点击其中的链接即可重设密码。
                </p>
              )}

              <button
                type="submit"
                disabled={loading || (mode === 'forgot' && forgotPasswordCountdown > 0)}
                className="w-full py-3.5 bg-[#3A3A3A] hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D] text-white font-youyou tracking-wider rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>处理中...</span>
                  </span>
                ) : (
                  submitText
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#8D8D8D] font-youyou">
              {mode === 'login' && (
                <>
                  还没有账号？
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="ml-1 text-[#A1887F] hover:text-[#8D6E63] transition-colors"
                  >
                    立即注册
                  </button>
                </>
              )}
              {mode === 'register' && (
                <>
                  已有账号？
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="ml-1 text-[#A1887F] hover:text-[#8D6E63] transition-colors"
                  >
                    立即登录
                  </button>
                </>
              )}
              {mode === 'forgot' && (
                <>
                  想起密码了？
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="ml-1 text-[#A1887F] hover:text-[#8D6E63] transition-colors"
                  >
                    返回登录
                  </button>
                </>
              )}
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-[#BCAAA4] font-youyou leading-relaxed">
            星火是一个仅限邀请的私密社区
            <br />
            我们珍视每一位成员的声音
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
