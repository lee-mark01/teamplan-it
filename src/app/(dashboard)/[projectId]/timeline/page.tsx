"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-accent-bg", text: "text-accent-text" },
  teal: { bg: "bg-teal-bg", text: "text-teal" },
  purple: { bg: "bg-purple-bg", text: "text-purple" },
  coral: { bg: "bg-coral-bg", text: "text-coral" },
};

interface Task {
  id: string; label: string; progress: number; status: string; sort_order: number;
  assignee: { id: string; display_name: string; color: string } | null;
}

export default function TimelinePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const supabase = createClient();

  const [project, setProject] = useState<{ name: string; start_date: string | null; end_date: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: proj } = await supabase.from("projects").select("name, start_date, end_date").eq("id", projectId).single();
      if (proj) setProject(proj);

      const { data: taskData } = await supabase
        .from("tasks")
        .select("id, label, progress, status, sort_order, assignee_id, project_members!tasks_assignee_id_fkey(id, display_name, color)")
        .eq("project_id", projectId)
        .order("sort_order");

      if (taskData) setTasks(taskData.map((t: any) => ({ ...t, assignee: t.project_members || null })));
      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin-slow" /></div>;
  }

  const startDate = project?.start_date ? new Date(project.start_date) : new Date();
  const endDate = project ? new Date(project.end_date) : new Date();
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const currentDay = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const dates = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const members = [...new Map(tasks.filter((t) => t.assignee).map((t) => [t.assignee!.id, t.assignee!])).values()];

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-xl font-semibold mb-6">타임라인</h1>

        <div className="bg-white border border-border rounded-[var(--radius-lg)] p-5 overflow-x-auto">
          {/* 날짜 헤더 */}
          <div className="flex mb-3 ml-[80px]">
            {dates.map((d, i) => (
              <div
                key={i}
                className={`flex-1 min-w-[40px] text-center text-[11px] ${
                  i + 1 === currentDay ? "font-bold text-primary" : "text-text-3"
                }`}
              >
                {String(d.getDate()).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* 멤버별 타임라인 */}
          <div className="space-y-3">
            {members.map((m) => {
              const memberTasks = tasks.filter((t) => t.assignee?.id === m.id);
              const colors = COLOR_MAP[m.color] || COLOR_MAP.blue;

              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-[72px] flex items-center gap-2 shrink-0">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${colors.bg} ${colors.text}`}>
                      {m.display_name.charAt(0)}
                    </span>
                    <span className="text-xs font-medium truncate">{m.display_name}</span>
                  </div>
                  <div className="flex-1 flex relative h-8 bg-surface-2 rounded">
                    {memberTasks.map((t, ti) => {
                      const startPct = (t.sort_order / Math.max(tasks.length, 1)) * 90;
                      const widthPct = Math.max(8, 80 / Math.max(tasks.length, 1));
                      return (
                        <div
                          key={t.id}
                          className="absolute h-full rounded flex items-center gap-1 px-2 overflow-hidden"
                          style={{
                            left: `${startPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: t.status === "done" ? "#047857" : t.progress > 0 ? "#2a5a6a" : "#94a3b8",
                          }}
                        >
                          <span className="text-white text-[11px] font-medium whitespace-nowrap">{t.label}</span>
                          {t.status === "done" && <i className="ti ti-check text-white text-xs" />}
                          {t.status !== "done" && t.progress > 0 && t.progress < 100 && (
                            <span className="text-white/70 text-[10px]">{t.progress}%</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
