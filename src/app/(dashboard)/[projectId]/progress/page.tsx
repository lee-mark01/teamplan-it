"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TaskRow {
  id: string; label: string; category: string; progress: number; status: string;
  start_date: string | null; end_date: string | null; depends_on: string[] | null;
  assignee: { display_name: string; color: string } | null;
}

export default function ProgressPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const supabase = createClient();

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("tasks")
        .select("id, label, category, progress, status, start_date, end_date, depends_on, assignee_id, project_members!tasks_assignee_id_fkey(display_name, color)")
        .eq("project_id", projectId)
        .order("sort_order");

      if (data) setTasks(data.map((t: any) => ({ ...t, assignee: t.project_members || null })));
      setLoading(false);
    }
    load();
  }, [projectId]);

  const updateProgress = async (taskId: string, progress: number) => {
    const status = progress === 100 ? "done" : progress > 0 ? "in_progress" : "todo";
    await supabase.from("tasks").update({ progress, status }).eq("id", taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, progress, status } : t));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin-slow" /></div>;
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">진척도 관리 테이블</h1>
          <span className="text-xs text-text-3">{today}</span>
        </div>

        <div className="bg-white border border-border rounded-[var(--radius-lg)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-2">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-2">과업 명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-2">시작 - 마감일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-2">담당 팀원</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-2">의존성 연관도</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-2">진행률</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const hasDeps = t.depends_on && t.depends_on.length > 0;
                return (
                  <tr key={t.id} className="border-b border-border last:border-b-0 hover:bg-surface transition-all">
                    <td className="px-4 py-3">
                      {t.status === "done" ? (
                        <i className="ti ti-circle-check-filled text-success text-lg" />
                      ) : t.status === "in_progress" ? (
                        <i className="ti ti-clock text-warning text-lg" />
                      ) : (
                        <i className="ti ti-circle text-text-3 text-lg" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{t.label}</td>
                    <td className="px-4 py-3 text-xs text-text-2">
                      {t.start_date && t.end_date ? `${t.start_date} ~ ${t.end_date}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">{t.assignee?.display_name || "-"}</td>
                    <td className="px-4 py-3 text-xs text-text-2">{hasDeps ? "있음" : ""}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={t.progress}
                          onChange={(e) => updateProgress(t.id, parseInt(e.target.value))}
                          className="w-16 accent-[#2a5a6a]"
                        />
                        <span className={`text-xs font-medium ${t.progress === 100 ? "text-success" : t.progress > 50 ? "text-accent" : "text-text-2"}`}>
                          {t.progress}%
                        </span>
                        {t.progress > 0 && t.progress < 100 && t.status !== "done" && hasDeps && (
                          <i className="ti ti-alert-triangle text-warning text-sm" title="의존성 있는 과업 진행 중" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
