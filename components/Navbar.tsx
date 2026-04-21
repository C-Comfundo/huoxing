"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ChevronDown, ChevronRight, Menu, PenLine, PenSquare, Search, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { loadCurrentUserProfile } from "@/lib/current-user-profile";
import UserMenu from "./UserMenu";


interface UserInfo {
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface NavLinkItem {
  name: string;
  href: string;
  subtitle?: string;
}

interface NavGroupItem {
  name: string;
  items: NavLinkItem[];
}

type PrimaryNavItem = NavLinkItem | NavGroupItem;

interface NavbarProps {
  articleId?: string; // 添加 articleId 参数
}

const primaryNavItems: PrimaryNavItem[] = [
  {
    name: "文字",
    items: [
      { name: "人间剧场", subtitle: "小说", href: "/theater" },
      { name: "有话慢谈", subtitle: "随笔", href: "/slow-talk" },
      { name: "胡说八道", subtitle: "杂谈", href: "/nonsense" },
      { name: "三行两句", subtitle: "诗歌", href: "/poems" },
      { name: "见字如面", subtitle: "书信", href: "/letters" },
      { name: "把话说尽", subtitle: "论文", href: "/papers" },
    ],
  },
  {
    name: "画作",
    items: [{ name: "画里有话", href: "/drawing" }],
  },
  { name: "声音", href: "/sound" },
  { name: "影像", href: "/video" },
  { name: "游戏", href: "/game" },
  { name: "留言板", href: "/board" },
];

const utilityItems = [
  { name: "投稿", href: "/submit", icon: PenSquare },
  { name: "往期", href: "/issues", icon: Archive },
  { name: "关于我们", href: "/about", icon: PenLine },
];

function isNavGroup(item: PrimaryNavItem): item is NavGroupItem {
  return "items" in item;
}

export default function Navbar({ articleId }: NavbarProps) { // 接收 articleId
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }

    const getUser = async () => {
      try {
        const currentUser = await loadCurrentUserProfile(supabase);

        if (!currentUser) {
          setUser(null);
          return;
        }

        setUser({
          email: currentUser.email,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
        });
      } catch (error) {
        console.error("获取用户信息失败:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      void getUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen && !openDesktopMenu) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        setOpenDesktopMenu(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen, openDesktopMenu]);

  useEffect(() => {
    if (!openDesktopMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenDesktopMenu(null);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [openDesktopMenu]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setOpenMobileGroup(null);
  };

  const prefetchHref = (href: string) => {
    if (prefetchedRoutesRef.current.has(href)) {
      return;
    }

    prefetchedRoutesRef.current.add(href);
    void router.prefetch(href);
  };

  const prefetchNavItem = (item: PrimaryNavItem | NavLinkItem) => {
    if ("items" in item) {
      item.items.forEach((entry) => prefetchHref(entry.href));
      return;
    }

    prefetchHref(item.href);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const nextHref = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      setOpenDesktopMenu(null);
      closeMobileMenu();
      router.push(nextHref);
    }
  };

  return (
    <nav
      ref={navRef}
      className="fixed top-0 z-50 w-full border-b border-[#D7CCC8]/30 bg-[#F7F5F0]/80 backdrop-blur-sm transition-all duration-300"
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link
          href={articleId ? `/#${articleId}` : "/"} // 使用 articleId 构建链接
          className="flex-shrink-0 font-youyou text-2xl tracking-widest text-[#3A3A3A] transition-opacity hover:opacity-80 md:text-3xl"
        >
          星火
        </Link>

        <div className="hidden items-center space-x-6 md:flex lg:space-x-8">
          {primaryNavItems.map((item) =>
            isNavGroup(item) ? (
              <div
                key={item.name}
                className="relative"
              >
                <button
                  type="button"
                  className="group inline-flex items-center gap-1.5 font-youyou text-base tracking-wide text-[#5D5D5D] transition-colors duration-300 hover:text-[#3A3A3A] lg:text-lg"
                  aria-expanded={openDesktopMenu === item.name}
                  aria-haspopup="menu"
                  onMouseEnter={() => prefetchNavItem(item)}
                  onFocus={() => prefetchNavItem(item)}
                  onClick={() => {
                    prefetchNavItem(item);
                    setOpenDesktopMenu((current) => (current === item.name ? null : item.name));
                  }}
                >
                  <span className="relative">
                    {item.name}
                    <span className="absolute -bottom-2 left-1/2 h-[1px] w-0 bg-[#A1887F] transition-all duration-300 ease-out group-hover:left-0 group-hover:w-full" />
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${
                      openDesktopMenu === item.name ? "rotate-180" : ""
                    }`}
                    strokeWidth={1.5}
                  />
                </button>

                <div
                  className={`absolute left-1/2 top-full z-20 mt-4 -translate-x-1/2 transition-all duration-200 ${
                    openDesktopMenu === item.name
                      ? "visible translate-y-0 opacity-100"
                      : "pointer-events-none invisible -translate-y-2 opacity-0"
                  }`}
                >
                  <div
                    className={`rounded-[1.75rem] border border-[#E5D8D1] bg-[rgba(255,252,249,0.96)] p-3 shadow-[0_24px_60px_rgba(58,58,58,0.12)] backdrop-blur-sm ${
                      item.items.length > 1 ? "w-[28rem]" : "w-64"
                    }`}
                  >
                    <div className={item.items.length > 1 ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className="rounded-2xl px-4 py-3 text-left transition-colors duration-200 hover:bg-[#F3ECE6]"
                          onClick={() => setOpenDesktopMenu(null)}
                        >
                          <p className="font-youyou text-lg tracking-[0.08em] text-[#3A3A3A]">
                            {subItem.name}
                          </p>
                          {subItem.subtitle ? (
                            <p className="mt-1 text-xs tracking-[0.28em] text-[#9A8378]">
                              {subItem.subtitle}
                            </p>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                onMouseEnter={() => prefetchNavItem(item)}
                onFocus={() => prefetchNavItem(item)}
                className="group relative font-youyou text-base tracking-wide text-[#5D5D5D] transition-colors duration-300 hover:text-[#3A3A3A] lg:text-lg"
              >
                {item.name}
                <span className="absolute -bottom-2 left-1/2 h-[1px] w-0 bg-[#A1887F] transition-all duration-300 ease-out group-hover:left-0 group-hover:w-full" />
              </Link>
            )
          )}
        </div>

        <div className="hidden items-center space-x-6 md:flex lg:space-x-8">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文章或作者..."
              className="pl-10 pr-4 py-2 rounded-full border border-[#D7CCC8] bg-white/60 text-sm text-[#5D5D5D] focus:outline-none focus:ring-2 focus:ring-[#A1887F]/30 focus:border-[#A1887F]"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
          </form>
          
          {utilityItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onMouseEnter={() => prefetchHref(item.href)}
                onFocus={() => prefetchHref(item.href)}
                className="group flex items-center space-x-2 text-[#5D5D5D] transition-colors duration-300 hover:text-[#A1887F]"
              >
                <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />
                <span className="text-xs font-youyou tracking-wide md:text-sm">
                  {item.name}
                </span>
              </Link>
            );
          })}

          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-[#E8E4DF]" />
          ) : user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-[#D7CCC8] px-3 py-1 text-xs font-youyou tracking-wide text-[#5D5D5D] transition-all duration-300 hover:bg-[#A1887F] hover:text-white hover:border-[#A1887F] hover:shadow-md hover:-translate-y-[2px] md:px-5 md:py-1.5 md:text-sm"
            >
              登录 / 加入
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center p-2 text-[#5D5D5D] transition-colors hover:text-[#3A3A3A] md:hidden"
          aria-label={isMobileMenuOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation-drawer"
          onClick={() => {
            setOpenDesktopMenu(null);
            setIsMobileMenuOpen((prev) => !prev);
          }}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" strokeWidth={1.75} />
          ) : (
            <Menu className="h-6 w-6" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 top-20 bg-[#3A3A3A]/40 md:hidden"
          aria-label="关闭菜单遮罩"
          onClick={closeMobileMenu}
        />
      ) : null}

      {isMobileMenuOpen ? (
        <div
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="移动端导航菜单"
          className="fixed right-0 top-20 h-[calc(100dvh-5rem)] w-72 max-w-[85vw] border-l border-[#D7CCC8]/50 bg-[#F7F5F0] shadow-xl md:hidden"
        >
          <div className="flex h-full flex-col overflow-y-auto overscroll-contain p-6 pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
            <form onSubmit={handleSearch} className="mb-6 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索文章或作者..."
                className="w-full pl-10 pr-4 py-2 rounded-full border border-[#D7CCC8] bg-white/60 text-sm text-[#5D5D5D] focus:outline-none focus:ring-2 focus:ring-[#A1887F]/30 focus:border-[#A1887F]"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
            </form>
            
            <div className="flex flex-col gap-3">
              {primaryNavItems.map((item) =>
                isNavGroup(item) ? (
                  <div key={item.name} className="rounded-3xl border border-[#E6DDD6] bg-white/55 px-4 py-3">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between font-youyou text-lg tracking-wide text-[#5D5D5D]"
                      aria-expanded={openMobileGroup === item.name}
                      onClick={() => {
                        prefetchNavItem(item);
                        setOpenMobileGroup((current) => (current === item.name ? null : item.name));
                      }}
                    >
                      <span>{item.name}</span>
                      <ChevronRight
                        className={`h-5 w-5 transition-transform duration-300 ${
                          openMobileGroup === item.name ? "rotate-90" : ""
                        }`}
                        strokeWidth={1.5}
                      />
                    </button>

                    {openMobileGroup === item.name ? (
                      <div className="mt-3 flex flex-col gap-2 border-t border-[#E6DDD6] pt-3">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            onClick={closeMobileMenu}
                            className="rounded-2xl px-3 py-2 transition-colors hover:bg-[#F3ECE6]"
                          >
                            <p className="font-youyou text-base tracking-[0.08em] text-[#3A3A3A]">
                              {subItem.name}
                            </p>
                            {subItem.subtitle ? (
                              <p className="mt-1 text-xs tracking-[0.24em] text-[#9A8378]">
                                {subItem.subtitle}
                              </p>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    onMouseEnter={() => prefetchNavItem(item)}
                    onFocus={() => prefetchNavItem(item)}
                    onClick={closeMobileMenu}
                    className="font-youyou text-lg tracking-wide text-[#5D5D5D] transition-colors hover:text-[#3A3A3A]"
                  >
                    {item.name}
                  </Link>
                )
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-[#D7CCC8]/50 pt-4">
              {utilityItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onMouseEnter={() => prefetchHref(item.href)}
                    onFocus={() => prefetchHref(item.href)}
                    onClick={closeMobileMenu}
                    className="group inline-flex items-center space-x-2 text-[#5D5D5D] transition-colors duration-300 hover:text-[#A1887F]"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                    <span className="text-sm font-youyou tracking-wide">
                      {item.name}
                    </span>
                  </Link>
                );
              })}

              {loading ? (
                <div className="h-8 w-8 animate-pulse rounded-full bg-[#E8E4DF]" />
              ) : user ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-3 py-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A1887F] font-youyou text-white">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div>
                      <p className="text-sm font-youyou text-[#3A3A3A]">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-[#8D8D8D]">{user.email}</p>
                    </div>
                  </div>

                  <Link
                    href="/profile"
                    onClick={closeMobileMenu}
                    className="text-left text-sm font-youyou text-[#5D5D5D] transition-colors hover:text-[#A1887F]"
                  >
                    个人主页
                  </Link>

                  <button
                    onClick={async () => {
                      const { signOut } = await import("@/app/actions/auth");
                      await signOut();
                      closeMobileMenu();
                      router.push("/");
                      router.refresh();
                    }}
                    className="text-left text-sm font-youyou text-[#5D5D5D] transition-colors hover:text-red-500"
                  >
                    退出登录
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="inline-flex justify-center rounded-full border border-[#D7CCC8] px-5 py-2 text-sm font-youyou tracking-wide text-[#5D5D5D] transition-all duration-300 hover:bg-[#A1887F] hover:text-white hover:border-[#A1887F] hover:shadow-md hover:-translate-y-[2px]"
                >
                  登录 / 加入
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

