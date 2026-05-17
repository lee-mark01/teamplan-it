"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string;
  status: string;
  created_at: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("projects")
        .select("id, name, description, start_date, end_date, status, created_at")
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin-slow" />
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.status === "active");
  const draftProjects = projects.filter((p) => p.status === "draft");

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">내 프로젝트</h1>
            <p className="text-text-2 text-[13px] mt-1">진행 중인 팀 프로젝트를 관리하세요</p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-primary text-primary-text rounded-[var(--radius)] hover:bg-[#1a4a5a] transition-all"
          >
            <i className="ti ti-plus text-sm" /> 새 프로젝트
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ti ti-folder-off text-2xl text-text-3" />
            </div>
            <p className="text-text-2 text-sm mb-4">아직 프로젝트가 없습니다</p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-primary text-primary-text rounded-[var(--radius)] hover:bg-[#1a4a5a] transition-all"
            >
              첫 프로젝트 만들기
            </Link>
          </div>
        ) : (
          <>
            {/* Draft 프로젝트 */}
            {draftProjects.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-text-3 mb-2">설정 중인 프로젝트</h2>
                <div className="space-y-2">
                  {draftProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/${p.id}/invite`)}
                      className="w-full text-left bg-white border border-dashed border-warning/40 rounded-[var(--radius-lg)] p-4 hover:border-warning/60 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-[15px]">{p.name}</h3>
                          <p className="text-warning text-[12px] mt-0.5">설정 계속하기 →</p>
                        </div>
                        <span className="text-xs font-medium text-warning bg-warning-bg px-2 py-1 rounded-full">설정 중</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active 프로젝트 */}
            {activeProjects.length > 0 && (
              <div className="space-y-3">
                {activeProjects.map((p) => {
                  const daysLeft = Math.ceil(
                    (new Date(p.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/${p.id}/dashboard`)}
                      className="w-full text-left bg-white border border-border rounded-[var(--radius-lg)] p-4 hover:border-accent/30 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-[15px]">{p.name}</h3>
                          {p.description && (
                            <p className="text-text-2 text-[13px] mt-0.5">{p.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <span className={`text-xs font-medium ${daysLeft > 3 ? "text-success" : daysLeft > 0 ? "text-warning" : "text-danger"}`}>
                            {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? "D-Day" : `D+${Math.abs(daysLeft)}`}
                          </span>
                          <div className="text-[11px] text-text-3 mt-0.5">~{p.end_date}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
