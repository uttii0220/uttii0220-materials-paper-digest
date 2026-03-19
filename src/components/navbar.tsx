"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { BookOpen, Home, Search, Bookmark, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: Home },
  { href: "/papers", label: "論文一覧", icon: Search },
  { href: "/bookmarks", label: "ブックマーク", icon: Bookmark },
  { href: "/settings", label: "設定", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-blue-600">
            <BookOpen className="w-6 h-6" />
            <span className="hidden sm:block">材料科学論文ダイジェスト</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors ml-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">ログアウト</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
