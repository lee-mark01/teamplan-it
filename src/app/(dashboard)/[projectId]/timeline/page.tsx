"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  blue: { bg: "bg-accent-bg", text: "text-accent-text", dot: "#2563eb" },
  teal: { bg: "bg-teal-bg", text: "text-teal", dot: "#0f766e" },
  purple: { bg: "bg-purple-bg", text: "text-purple", dot: "#6d28d9" },
  coral: { bg: "bg-coral-bg", text: "text-coral", dot: "#c2410c" },
};

const STATUS_COLORS: Record<string, { bg: string; label: string }> = {
  done: { bg: "#059669", label: "완료" },
  in_progress: { bg: "#2563eb", label: "진행중" },
  todo: { bg: "#94a3b8", label: "예정" },
};

const CATEGORY_COLORS: Record<string, string> = {
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

      const { data: snapshot } = await supabase
        .from("analysis_snapshots")
        .select("result_json")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .single();
      if (snapshot?.result_json?.nodes) setSnapshotNodes(snapshot.result_json.nodes);

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
  const currentDay = Math.max(1, Math.min(totalDays, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))));

  const dates = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  function parseDayRange(day: string): { start: number; end: number } {
    const match = day?.match(/Day\s*(\d+)(?:\s*-\s*(\d+))?/);
    if (match) return { start: parseInt(match[1]), end: match[2] ? parseInt(match[2]) : parseInt(match[1]) };
    return { start: 1, end: 1 };
  }

  const members = [...new Map(tasks.filter((t) => t.assignee).map((t) => [t.assignee!.id, t.assignee!])).values()];

  // 요약 통계
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const todayPct = ((currentDay - 0.5) / totalDays) * 100;
  const COL_W = 48;

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-[1200px] mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>타임라인</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            {project?.start_date || "시작일 미정"} ~ {project?.end_date} ({totalDays}일)
          </p>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "총 작업", value: `${totalTasks}개`, color: "#0f172a" },
            { label: "진행중", value: `${inProgressTasks}개`, color: "#2563eb" },
            { label: "완료율", value: `${completionRate}%`, color: "#059669" },
            { label: "남은 일수", value: `${Math.max(0, totalDays - currentDay + 1)}일`, color: "#b45309" },
          ].map((card, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* 타임라인 카드 */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          {/* 기간 헤더 */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
              {project?.start_date} ~ {project?.end_date}
            </span>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              오늘: Day {currentDay}
            </span>
          </div>

          <div style={{ display: "flex", overflow: "hidden" }}>
            {/* 좌측 고정: 담당자 */}
            <div style={{ width: 160, flexShrink: 0, borderRight: "1px solid #e5e7eb" }}>
              <div style={{ height: 40, borderBottom: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", padding: "0 16px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>담당자</span>
              </div>
              {members.map((m) => {
                const colors = COLOR_MAP[m.color] || COLOR_MAP.blue;
                return (
                  <div key={m.id} style={{ height: 48, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", borderBottom: "1px solid #f1f5f9" }}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${colors.bg} ${colors.text}`} style={{ flexShrink: 0 }}>
                      {m.display_name.charAt(0)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{m.display_name}</span>
                  </div>
                );
              })}
            </div>

            {/* 우측 스크롤: 날짜 + 바 */}
            <div style={{ flex: 1, overflowX: "auto" }}>
              {/* 날짜 헤더 */}
              <div style={{ display: "flex", height: 40, borderBottom: "1px solid #e5e7eb", background: "#f8fafc", position: "relative" }}>
                {dates.map((d, i) => {
                  const isToday = i + 1 === currentDay;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div key={i} style={{
                      width: COL_W, minWidth: COL_W, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: isToday ? 700 : 400,
                      color: isToday ? "#2563eb" : isWeekend ? "#cbd5e1" : "#64748b",
                      background: isToday ? "#eff6ff" : "transparent",
                    }}>
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>

              {/* 멤버별 바 */}
              {members.map((m) => {
                const memberTasks = tasks.filter((t) => t.assignee?.id === m.id);
                return (
                  <div key={m.id} style={{ height: 48, position: "relative", borderBottom: "1px solid #f1f5f9", display: "flex" }}>
                    {/* 배경 그리드 */}
                    {dates.map((d, i) => {
                      const isToday = i + 1 === currentDay;
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <div key={i} style={{
                          width: COL_W, minWidth: COL_W, borderRight: "1px solid #f1f5f9",
                          background: isToday ? "#eff6ff" : isWeekend ? "#fafbfc" : "transparent",
                        }} />
                      );
                    })}

                    {/* 오늘 표시선 */}
                    <div style={{
                      position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0,
                      width: 2, background: "#2563eb", opacity: 0.4, zIndex: 5,
                    }} />

                    {/* 과업 바 */}
                    {memberTasks.map((t) => {
                      const node = snapshotNodes.find((n) => n.label === t.label);
                      const dayRange = node ? parseDayRange(node.day) : { start: 1, end: 1 };
                      const left = (dayRange.start - 1) * COL_W + 4;
                      const width = Math.max(COL_W - 8, (dayRange.end - dayRange.start + 1) * COL_W - 8);
                      const statusColor = STATUS_COLORS[t.status] || STATUS_COLORS.todo;
                      const barColor = t.status === "done" ? statusColor.bg : CATEGORY_COLORS[t.category] || "#94a3b8";

                      return (
                        <div
                          key={t.id}
                          title={`${t.label} (${t.progress}%)`}
                          style={{
                            position: "absolute", top: 8, height: 32, left, width,
                            background: barColor, borderRadius: 8,
                            display: "flex", alignItems: "center", padding: "0 10px",
                            opacity: t.status === "todo" ? 0.6 : 1,
                            zIndex: 10, cursor: "pointer",
                            transition: "box-shadow 0.15s",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          }}
                          onMouseEnter={(e) => { (e.target as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)"; }}
                          onMouseLeave={(e) => { (e.target as HTMLElement).style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)"; }}
                        >
                          <span style={{ color: "#fff", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {t.label}
                          </span>
                          {t.status === "done" && <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: val.bg }} />
              {val.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
