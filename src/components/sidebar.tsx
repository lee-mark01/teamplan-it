"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SidebarProject {
  id: string;
  name: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<{ display_name: string; email: string } | null>(null);
  const [projects, setProjects] = useState<SidebarProject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const projectIdMatch = pathname.match(/^\/([0-9a-f-]{36})/);
  const currentProjectId = projectIdMatch?.[1];

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", authUser.id)
        .single();
      if (profile) setUser(profile);

      const { data: owned } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (owned) setProjects(owned);
    }
    load();
  }, []);

  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItem = (href: string, icon: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-[13px] transition-all ${
          active
            ? "bg-accent-bg text-accent-text font-medium"
            : "text-text-2 hover:bg-surface-2 hover:text-text"
        }`}
      >
        <i className={`ti ti-${icon} text-base`} />
        {label}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo + Search */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <Link href="/projects" className="text-lg font-bold tracking-tight block mb-3">
            Teamplan-it
          </Link>
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-text-2 mb-3 cursor-pointer"
          >
            <i className="ti ti-x text-lg" />
          </button>
        </div>
        <div className="relative">
          <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3 text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="프로젝트명으로 찾기"
            className="w-full bg-surface-2 border-none rounded-[var(--radius)] pl-8 pr-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItem("/projects", "home", "홈")}

        <div className="mt-4 mb-1">
          <span className="px-3 text-[11px] font-medium text-text-3 uppercase tracking-wider">
            진행 중인 프로젝트
          </span>
        </div>
        {filteredProjects.length === 0 ? (
          <p className="px-3 text-[11px] text-text-3">프로젝트가 없습니다</p>
        ) : (
          filteredProjects.map((p) => (
            <Link
              key={p.id}
              href={`/${p.id}/dashboard`}
              className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-[13px] transition-all ${
                currentProjectId === p.id
                  ? "bg-accent-bg text-accent-text font-medium"
                  : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
              <span className="truncate">{p.name}</span>
            </Link>
          ))
        )}

        <div className="border-t border-border my-3" />

        <Link
          href="/projects/new"
          className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-[13px] text-accent hover:bg-accent-bg transition-all"
        >
          <i className="ti ti-plus text-base" />
          새 프로젝트 추가
        </Link>

        {currentProjectId && (
          <>
            <div className="border-t border-border my-3" />
            <div className="mb-1">
              <span className="px-3 text-[11px] font-medium text-text-3 uppercase tracking-wider">
                프로젝트 메뉴
              </span>
            </div>
            {navItem(`/${currentProjectId}/dashboard`, "layout-dashboard", "대시보드")}
            {navItem(`/${currentProjectId}/timeline`, "calendar", "타임라인")}
            {navItem(`/${currentProjectId}/progress`, "chart-bar", "진행 현황")}
            {navItem(`/${currentProjectId}/chat`, "message-circle", "AI 채팅")}
            {navItem(`/${currentProjectId}/members`, "users", "팀원")}
            {navItem(`/${currentProjectId}/invite`, "user-plus", "팀원 초대")}
          </>
        )}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border">
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent-bg flex items-center justify-center text-xs font-semibold text-accent-text shrink-0">
              {user.display_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user.display_name}</div>
              <div className="text-[10px] text-text-3 truncate">{user.email}</div>
            </div>
            <button onClick={handleLogout} className="text-text-3 hover:text-text transition-all cursor-pointer" title="로그아웃">
              <i className="ti ti-logout text-base" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-border rounded-lg p-2 shadow-sm cursor-pointer"
      >
        <i className="ti ti-menu-2 text-lg text-text" />
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 데스크톱 사이드바 */}
      <aside className="hidden md:flex w-[220px] h-screen bg-[#e4eff3] border-r border-border flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* 모바일 사이드바 */}
      <aside className={`md:hidden fixed top-0 left-0 w-[260px] h-screen bg-[#e4eff3] border-r border-border flex flex-col z-50 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
