"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ProgressRing from "@/components/progress-ring";
import Link from "next/link";

interface Task {
  id: string; label: string; category: string; progress: number; status: string;
  start_date: string | null; end_date: string | null;
  assignee: { id: string; display_name: string; color: string } | null;
}
interface Checklist { id: string; content: string; is_completed: boolean; task_id: string; }
interface Project { name: string; start_date: string | null; end_date: string; }

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-accent-bg", text: "text-accent-text" },
  teal: { bg: "bg-teal-bg", text: "text-teal" },
  purple: { bg: "bg-purple-bg", text: "text-purple" },
  coral: { bg: "bg-coral-bg", text: "text-coral" },
};

export default function DashboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMyId(user.id);

      const { data: proj } = await supabase.from("projects").select("name, start_date, end_date").eq("id", projectId).single();
      if (proj) setProject(proj);

      // 내 member id
      if (user) {
        const { data: member } = await supabase.from("project_members").select("id").eq("project_id", projectId).eq("user_id", user.id).single();
        if (member) setMyMemberId(member.id);
      }

      const { data: taskData } = await supabase
        .from("tasks")
        .select("id, label, category, progress, status, start_date, end_date, assignee_id, project_members!tasks_assignee_id_fkey(id, display_name, color)")
        .eq("project_id", projectId)
        .order("sort_order");

      if (taskData) {
        setTasks(taskData.map((t: any) => ({
          ...t,
          assignee: t.project_members || null,
        })));

        const taskIds = taskData.map((t: any) => t.id);
        if (taskIds.length > 0) {
          const { data: cl } = await supabase
            .from("task_checklists")
            .select("id, content, is_completed, task_id")
            .in("task_id", taskIds)
            .order("sort_order");
          if (cl) setChecklists(cl);
        }
      }
      setLoading(false);
    }
    load();

    // Realtime subscription
    const channel = supabase
      .channel(`tasks:${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` }, () => { load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_checklists" }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const toggleChecklist = async (id: string, current: boolean) => {
    await supabase.from("task_checklists").update({
      is_completed: !current,
      completed_at: !current ? new Date().toISOString() : null,
    }).eq("id", id);
    setChecklists((prev) => prev.map((c) => c.id === id ? { ...c, is_completed: !current } : c));

    // 태스크 진행률 자동 계산
    const item = checklists.find((c) => c.id === id);
    if (item) {
      const taskChecklists = checklists.filter((c) => c.task_id === item.task_id);
      const updated = taskChecklists.map((c) => c.id === id ? { ...c, is_completed: !current } : c);
      const doneCount = updated.filter((c) => c.is_completed).length;
      const progress = Math.round((doneCount / updated.length) * 100);
      await supabase.from("tasks").update({ progress, status: progress === 100 ? "done" : progress > 0 ? "in_progress" : "todo" }).eq("id", item.task_id);
      setTasks((prev) => prev.map((t) => t.id === item.task_id ? { ...t, progress, status: progress === 100 ? "done" : progress > 0 ? "in_progress" : "todo" } : t));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin-slow" /></div>;
  }

  const startDate = project?.start_date ? new Date(project.start_date) : new Date();
  const endDate = project ? new Date(project.end_date) : new Date();
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const currentDay = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const projectProgress = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) : 0;
  const myTasks = tasks.filter((t) => t.assignee?.id === myMemberId);
  const myProgress = myTasks.length > 0 ? Math.round(myTasks.reduce((sum, t) => sum + t.progress, 0) / myTasks.length) : 0;
  const myChecklists = checklists.filter((c) => myTasks.some((t) => t.id === c.task_id));

  // Gantt 데이터: 날짜별 멤버들의 task
  const members = [...new Map(tasks.filter((t) => t.assignee).map((t) => [t.assignee!.id, t.assignee!])).values()];

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">{project?.name || "프로젝트"}</h1>
            <p className="text-text-2 text-[13px] mt-0.5">Day {Math.min(currentDay, totalDays)} / {totalDays}</p>
          </div>
          <span className="px-3 py-1.5 bg-surface-2 rounded-full text-xs font-medium text-text-2">
            Day {Math.min(currentDay, totalDays)}/{totalDays}
          </span>
        </div>

        {/* 팀 타임라인 (간트 차트) */}
        <div className="bg-white border border-border rounded-[var(--radius-lg)] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">팀 타임라인</h3>
            <Link href={`/${projectId}/timeline`} className="text-xs text-accent hover:underline">자세히 보기 &gt;</Link>
          </div>
          <div className="overflow-x-auto">
          <div className="min-w-[500px]">
          <div className="mb-2 flex gap-1 text-[10px] text-text-3 ml-[70px]">
            {Array.from({ length: Math.min(totalDays, 20) }, (_, i) => {
              const d = new Date(startDate);
              d.setDate(d.getDate() + i);
              return <span key={i} className={`flex-1 text-center ${i + 1 === currentDay ? "font-bold text-primary" : ""}`}>{d.getDate()}</span>;
            })}
          </div>
          <div className="space-y-2">
            {members.map((m) => {
              const memberTasks = tasks.filter((t) => t.assignee?.id === m.id);
              const colors = COLOR_MAP[m.color] || COLOR_MAP.blue;
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="w-[62px] flex items-center gap-1.5 shrink-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
                      {m.display_name.charAt(0)}
                    </span>
                    <span className="text-xs truncate">{m.display_name.slice(0, 3)}</span>
                  </div>
                  <div className="flex-1 relative h-7 bg-surface-2 rounded">
                    {memberTasks.map((t) => {
                      // 간단한 위치 계산 (sort_order 기반)
                      const idx = tasks.indexOf(t);
                      const start = (idx / Math.max(tasks.length, 1)) * 80;
                      const width = Math.max(10, 80 / Math.max(tasks.length, 1));
                      const bgColor = t.status === "done" ? "#047857" : t.progress > 0 ? "#2a5a6a" : "#94a3b8";
                      return (
                        <div key={t.id} className="absolute h-full rounded flex items-center px-1.5 overflow-hidden" style={{ left: `${start}%`, width: `${width}%`, backgroundColor: bgColor }}>
                          <span className="text-white text-[10px] font-medium whitespace-nowrap">{t.label}</span>
                          {t.status === "done" && <i className="ti ti-check text-white text-[10px] ml-0.5" />}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* AI 진척도 관리 */}
          <div className="bg-white border border-border rounded-[var(--radius-lg)] p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold">AI 진척도 관리</h3>
              <Link href={`/${projectId}/progress`} className="text-xs text-accent hover:underline">자세히 보기 &gt;</Link>
            </div>
            <div className="flex justify-around pb-4">
              <ProgressRing percent={projectProgress} label="프로젝트 진척도" size={100} />
              <ProgressRing percent={myProgress} label="나의 진척도" size={100} />
            </div>
          </div>

          {/* 내 체크리스트 */}
          <div className="bg-white border border-border rounded-[var(--radius-lg)] p-5">
            <h3 className="text-base font-semibold mb-4">내 체크리스트</h3>
            {myChecklists.length === 0 ? (
              <p className="text-text-3 text-sm">할당된 체크리스트가 없습니다</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {myChecklists.map((c) => (
                  <label key={c.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.is_completed}
                      onChange={() => toggleChecklist(c.id, c.is_completed)}
                      className="w-4 h-4 rounded border-border-strong accent-[#2a5a6a]"
                    />
                    <span className={`text-sm ${c.is_completed ? "line-through text-text-3" : "text-text"}`}>
                      {c.content}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI 조언 센터 */}
        <div className="bg-white border border-border rounded-[var(--radius-lg)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">AI 조언 센터</h3>
            <Link href={`/${projectId}/chat`} className="text-xs text-accent hover:underline">
              채팅으로 이동하기 &gt;
            </Link>
          </div>
          <div className="bg-accent-bg rounded-[var(--radius)] p-4 text-[13px] text-accent-text leading-relaxed">
            {projectProgress < 30
              ? "프로젝트가 시작 단계입니다! 각 팀원이 첫 과업을 확인하고 착수해보세요."
              : projectProgress < 70
              ? "순조롭게 진행 중입니다. 의존도가 있는 과업이 지연되지 않도록 주의하세요."
              : "거의 완료 단계! 마지막 QA와 발표 준비에 집중하세요."}
            {" "}필요하다면 AI Chat을 통해 조언을 건네보시는 건 어떨까요?
          </div>
        </div>
      </div>
    </div>
  );
}
