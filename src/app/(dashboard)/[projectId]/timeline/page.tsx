"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-accent-bg", text: "text-accent-text" },
  teal: { bg: "bg-teal-bg", text: "text-teal" },
  purple: { bg: "bg-purple-bg", text: "text-purple" },
  coral: { bg: "bg-coral-bg", text: "text-coral" },
};

const BAR_COLORS: Record<string, string> = {
  planning: "#6d28d9", design: "#0f766e", backend: "#2563eb", frontend: "#c2410c",
  integration: "#57534e", qa: "#b45309", presentation: "#047857", research: "#6d28d9", content: "#0f766e",
};

interface Task {
  id: string; label: string; category: string; progress: number; status: string;
  assignee: { id: string; display_name: string; color: string } | null;
}

interface SnapshotNode {
  id: string; label: string; day: string; assignee: string; category: string;
}

export default function TimelinePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const supabase = createClient();

  const [project, setProject] = useState<{ name: string; start_date: string | null; end_date: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [snapshotNodes, setSnapshotNodes] = useState<SnapshotNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: proj } = await supabase.from("projects").select("name, start_date, end_date").eq("id", projectId).single();
      if (proj) setProject(proj);

      const { data: taskData } = await supabase
        .from("tasks")
        .select("id, label, category, progress, status, sort_order, assignee_id, project_members!tasks_assignee_id_fkey(id, display_name, color)")
        .eq("project_id", projectId)
        .order("sort_order");

      if (taskData) setTasks(taskData.map((t: any) => ({ ...t, assignee: t.project_members || null })));

      // AI 분석 결과에서 Day 정보 가져오기
      const { data: snapshot } = await supabase
        .from("analysis_snapshots")
        .select("result_json")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .single();

      if (snapshot?.result_json?.nodes) {
        setSnapshotNodes(snapshot.result_json.nodes);
      }

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

  // snapshot nodes에서 Day 정보 파싱
  function parseDayRange(day: string): { start: number; end: number } {
    const match = day?.match(/Day\s*(\d+)(?:\s*-\s*(\d+))?/);
    if (match) {
      const s = parseInt(match[1]);
      const e = match[2] ? parseInt(match[2]) : s;
      return { start: s, end: e };
    }
    return { start: 1, end: 1 };
  }

  // 팀원별 과업 + Day 매핑
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
                  <div className="flex-1 relative h-8 bg-surface-2 rounded" style={{ minWidth: totalDays * 40 }}>
                    {memberTasks.map((t) => {
                      // snapshot에서 Day 정보 매칭
                      const node = snapshotNodes.find((n) => n.label === t.label);
                      const dayRange = node ? parseDayRange(node.day) : { start: 1, end: 1 };

                      const startPct = ((dayRange.start - 1) / totalDays) * 100;
                      const widthPct = Math.max(5, ((dayRange.end - dayRange.start + 1) / totalDays) * 100);

                      const barColor = t.status === "done" ? "#047857" : BAR_COLORS[t.category] || "#94a3b8";

                      return (
                        <div
                          key={t.id}
                          className="absolute h-full rounded flex items-center gap-1 px-2 overflow-hidden"
                          style={{
                            left: `${startPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: barColor,
                            opacity: t.status === "done" ? 1 : t.progress > 0 ? 0.9 : 0.7,
                          }}
                        >
                          <span className="text-white text-[11px] font-medium whitespace-nowrap">{t.label}</span>
                          {t.status === "done" && <i className="ti ti-check text-white text-xs" />}
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
