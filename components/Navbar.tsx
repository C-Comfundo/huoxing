"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Menu, PenLine, PenSquare, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadCurrentUserProfile } from "@/lib/current-user-profile";
import UserMenu from "./UserMenu";

interface UserInfo {
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

const navItems = [
  { name: "有话慢谈", href: "/slow-talk" },
  { name: "人间剧场", href: "/theater" },
  { name: "胡说八道", href: "/nonsense" },
  { name: "三行两句", href: "/poems" },
  { name: "见字如面", href: "/letters" },
  { name: "画里有话", href: "/drawing" },
];

const utilityItems = [
  { name: "投稿", href: "/submit", icon: PenSquare },
  { name: "归档", href: "/issues", icon: Archive },
  { name: "关于我们", href: "/about", icon: PenLine },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (!isMobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[#D7CCC8]/30 bg-[#F7F5F0]/80 backdrop-blur-sm transition-all duration-300">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex-shrink-0 font-youyou text-2xl tracking-widest text-[#3A3A3A] transition-opacity hover:opacity-80 md:text-3xl"
        >
          星火
        </Link>

        <div className="hidden items-center space-x-8 md:flex lg:space-x-12">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="group relative font-youyou text-base tracking-wide text-[#5D5D5D] transition-colors duration-300 hover:text-[#3A3A3A] lg:text-lg"
            >
              {item.name}
              <span className="absolute -bottom-2 left-1/2 h-[1px] w-0 bg-[#A1887F] transition-all duration-300 ease-out group-hover:left-0 group-hover:w-full" />
            </Link>
          ))}
        </div>

        <div className="hidden items-center space-x-6 md:flex lg:space-x-8">
          {utilityItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
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
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
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
          className="fixed right-0 top-20 h-[calc(100vh-5rem)] w-72 max-w-[85vw] border-l border-[#D7CCC8]/50 bg-[#F7F5F0] shadow-xl md:hidden"
        >
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <div className="flex flex-col gap-5">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="font-youyou text-lg tracking-wide text-[#5D5D5D] transition-colors hover:text-[#3A3A3A]"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 border-t border-[#D7CCC8]/50 pt-6">
              {utilityItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
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
                      window.location.href = "/";
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