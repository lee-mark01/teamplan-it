"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge, SectionNum } from "@/components/ui";
import { CATEGORY_COLORS } from "@/lib/mock-data";

// ─── Types ──────────────────────────────
interface AnalysisNode {
  id: string; label: string; day: string; assignee?: string; category: string; dependsOn: string[];
}
interface TimelineData {
  memberName: string; memberInitial: string; memberColor: string;
  bars: { label: string; startPercent: number; widthPercent: number; color: string }[];
}
interface AnalysisResult {
  nodes: AnalysisNode[];
  timelines: TimelineData[];
  checklists?: Record<string, string[]>;
  comment: string;
}

// ─── Dependency Graph (reused from board) ────
function layoutNodes(nodes: AnalysisNode[]) {
  const idIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const nodeLayer = new Map<string, number>();
  function getLayer(id: string): number {
    if (nodeLayer.has(id)) return nodeLayer.get(id)!;
    const node = nodes[idIndex.get(id)!];
    if (!node || node.dependsOn.length === 0) { nodeLayer.set(id, 0); return 0; }
    const maxDep = Math.max(...node.dependsOn.filter((d) => idIndex.has(d)).map(getLayer));
    nodeLayer.set(id, maxDep + 1);
    return maxDep + 1;
  }
  nodes.forEach((n) => getLayer(n.id));
  const maxLayer = Math.max(...Array.from(nodeLayer.values()), 0);
  const layerGroups: AnalysisNode[][] = Array.from({ length: maxLayer + 1 }, () => []);
  nodes.forEach((n) => layerGroups[nodeLayer.get(n.id)!].push(n));

  const NODE_H = 40, GAP_X = 30, GAP_Y = 20;
  const nodeWidth = (label: string) => Math.max(80, label.length * 16 + 24);
  const layerMaxW = layerGroups.map((g) => Math.max(...g.map((n) => nodeWidth(n.label))));
  const layerX = layerMaxW.reduce<number[]>((acc, w, i) => { acc.push(i === 0 ? 10 : acc[i - 1] + layerMaxW[i - 1] + GAP_X); return acc; }, []);
  const totalW = (layerX[layerX.length - 1] || 10) + (layerMaxW[layerMaxW.length - 1] || 90) + 10;

  const positioned: { id: string; x: number; y: number; w: number; label: string; sub: string; cat: string }[] = [];
  layerGroups.forEach((group, li) => {
    const x = layerX[li];
    const totalH = group.length * (NODE_H + GAP_Y) - GAP_Y;
    const startY = Math.max(10, (200 - totalH) / 2);
    group.forEach((node, gi) => {
      const w = nodeWidth(node.label);
      positioned.push({ id: node.id, x, y: startY + gi * (NODE_H + GAP_Y), w, label: node.label, sub: `${node.day}${node.assignee ? ` / ${node.assignee}` : ""}`, cat: node.category });
    });
  });

  const posMap = new Map(positioned.map((p) => [p.id, p]));
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  nodes.forEach((n) => {
    const to = posMap.get(n.id);
    if (!to) return;
    n.dependsOn.forEach((depId) => {
      const from = posMap.get(depId);
      if (!from) return;
      edges.push({ x1: from.x + from.w, y1: from.y + NODE_H / 2, x2: to.x, y2: to.y + NODE_H / 2 });
    });
  });

  const svgW = Math.max(totalW + 20, 760);
  const maxY = Math.max(...positioned.map((p) => p.y + NODE_H), 200);
  return { positioned, edges, svgW, svgH: maxY + 20 };
}

function DependencyGraph({ nodes }: { nodes: AnalysisNode[] }) {
  const { positioned, edges, svgW, svgH } = layoutNodes(nodes);
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-6 overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto block min-w-[600px]">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a8a29e" />
          </marker>
        </defs>
        {positioned.map((n) => {
          const c = CATEGORY_COLORS[n.cat] || CATEGORY_COLORS.integration;
          return (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={n.w} height={40} rx={8} fill={c.bg} stroke={c.stroke} strokeWidth={1} />
              <text x={n.x + n.w / 2} y={n.y + 19} textAnchor="middle" fontSize={12} fontWeight={600} fill={c.text}>{n.label}</text>
              <text x={n.x + n.w / 2} y={n.y + 32} textAnchor="middle" fontSize={10} fill={c.text} opacity={0.7}>{n.sub}</text>
            </g>
          );
        })}
        {edges.map((e, i) => {
          const dy = e.y2 - e.y1;
          if (Math.abs(dy) < 5) return <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#a8a29e" strokeWidth={1.5} markerEnd="url(#arrow)" />;
          const mx = e.x1 + (e.x2 - e.x1) * 0.5;
          return <path key={i} d={`M ${e.x1} ${e.y1} C ${mx} ${e.y1}, ${mx} ${e.y2}, ${e.x2} ${e.y2}`} stroke="#a8a29e" strokeWidth={1.5} fill="none" markerEnd="url(#arrow)" />;
        })}
      </svg>
    </div>
  );
}

function Timeline({ timelines, nodes }: { timelines: TimelineData[]; nodes: AnalysisNode[] }) {
  const COLOR_BG: Record<string, string> = {
    blue: "#dceef4", teal: "#d5f0eb", purple: "#ede9fe", coral: "#ffedd5",
  };
  const COLOR_TEXT: Record<string, string> = {
    blue: "#1a3a4a", teal: "#0f766e", purple: "#6d28d9", coral: "#c2410c",
  };

  function getMemberTasks(tl: TimelineData) {
    // 이 팀원에게 배정된 nodes를 찾아서 매칭
    const memberNodes = nodes.filter((n) =>
      n.assignee === tl.memberName || n.assignee?.includes(tl.memberName.slice(1)) || n.assignee?.includes(tl.memberName)
    );

    return tl.bars.map((bar) => {
      // 1) 정확한 label 매칭
      let node = nodes.find((n) => n.label === bar.label);
      // 2) 부분 매칭
      if (!node) node = nodes.find((n) => n.label.includes(bar.label) || bar.label.includes(n.label));
      // 3) 이 멤버의 nodes 중 아직 매칭 안 된 것에서 순서대로
      if (!node) {
        node = memberNodes.find((n) =>
          !tl.bars.some((b) => b.label === n.label) // 이미 다른 bar에 매칭된 건 제외
        );
      }
      return {
        label: node?.label || bar.label,
        day: node?.day || "",
        width: bar.widthPercent,
      };
    });
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-6">
      <div className="space-y-8">
        {timelines.map((tl, i) => {
          const bgColor = COLOR_BG[tl.memberColor] || COLOR_BG.blue;
          const textColor = COLOR_TEXT[tl.memberColor] || COLOR_TEXT.blue;
          const tasks = getMemberTasks(tl);
          const totalWidth = tasks.reduce((s, t) => s + t.width, 0);

          return (
            <div key={i}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: bgColor, color: textColor }}>
                  {tl.memberInitial}
                </span>
                <span className="text-sm font-semibold">{tl.memberName}</span>
              </div>

              <div style={{ display: "flex", backgroundColor: "#e4eff3", borderRadius: 8, overflow: "hidden" }}>
                {tasks.map((task, j) => {
                  const flexBasis = `${(task.width / totalWidth) * 100}%`;

                  return (
                    <div
                      key={j}
                      style={{
                        flexBasis,
                        flexGrow: 0,
                        flexShrink: 0,
                        borderLeft: j > 0 ? "2px solid #d6e8ee" : "none",
                        padding: "12px 16px",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#1a3a4a" }}>
                        {task.label} / {task.day || ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AIComment({ text }: { text: string }) {
  const paragraphs = text.split(/(?:\n\n|<br\s*\/?><br\s*\/?>)/g).filter(Boolean);
  const renderText = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part
  );
  return (
    <div className="bg-accent-bg border-l-[3px] border-accent rounded-[var(--radius-lg)] p-4">
      <div className="flex items-start gap-2.5">
        <i className="ti ti-sparkles text-base text-accent mt-0.5" />
        <div className="text-[13px] text-accent-text leading-relaxed">
          {paragraphs.map((p, i) => <p key={i} className={i < paragraphs.length - 1 ? "mb-4" : ""}>{renderText(p)}</p>)}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────
export default function ResultPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [project, setProject] = useState<{ name: string; start_date: string; end_date: string; owner_id?: string; status?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRevise, setShowRevise] = useState(false);
  const [reviseText, setReviseText] = useState("");
  const [revising, setRevising] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: proj } = await supabase.from("projects").select("name, start_date, end_date, owner_id, status").eq("id", projectId).single();
      if (proj) {
        setProject(proj);
        setIsOwner(proj.owner_id === user?.id);

        // 팀원: 프로젝트가 active로 바뀌면 대시보드로 이동
        if (proj.owner_id !== user?.id && proj.status === "active") {
          router.push(`/${projectId}/dashboard`);
          return;
        }
      }

      const { data: snap } = await supabase.from("analysis_snapshots").select("result_json").eq("project_id", projectId).eq("is_active", true).single();
      if (snap) setResult(snap.result_json as AnalysisResult);
      setLoading(false);
    }
    load();

    // 팀원: 3초마다 프로젝트 status 폴링
    const poll = setInterval(async () => {
      const { data: proj } = await supabase.from("projects").select("status").eq("id", projectId).single();
      if (proj?.status === "active") {
        clearInterval(poll);
        router.push(`/${projectId}/dashboard`);
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [projectId]);

  const handleRevise = async () => {
    if (!reviseText.trim()) return;
    setRevising(true);
    const res = await fetch("/api/analyze/revise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, modificationRequest: reviseText }),
    });
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setShowRevise(false);
      setReviseText("");
    }
    setRevising(false);
  };

  const handleAccept = async () => {
    if (!result) return;
    setAccepting(true);

    // 멤버 목록 가져오기
    const { data: members } = await supabase
      .from("project_members")
      .select("id, display_name")
      .eq("project_id", projectId);

    const memberMap = new Map(members?.map((m) => [m.display_name, m.id]) || []);

    // tasks 생성
    const taskIdMap = new Map<string, string>();
    for (const node of result.nodes) {
      const assigneeId = node.assignee ? memberMap.get(node.assignee) || null : null;

      const { data: task } = await supabase.from("tasks").insert({
        project_id: projectId,
        label: node.label,
        category: node.category,
        assignee_id: assigneeId,
        depends_on: [],
        status: "todo",
        progress: 0,
      }).select("id").single();

      if (task) taskIdMap.set(node.id, task.id);
    }

    // depends_on 업데이트 (실제 UUID로)
    for (const node of result.nodes) {
      const taskId = taskIdMap.get(node.id);
      if (!taskId) continue;
      const deps = node.dependsOn.map((d) => taskIdMap.get(d)).filter(Boolean) as string[];
      if (deps.length > 0) {
        await supabase.from("tasks").update({ depends_on: deps }).eq("id", taskId);
      }
    }

    // checklists 생성
    if (result.checklists) {
      for (const [nodeId, items] of Object.entries(result.checklists)) {
        const taskId = taskIdMap.get(nodeId);
        if (!taskId) continue;
        for (let i = 0; i < items.length; i++) {
          await supabase.from("task_checklists").insert({
            task_id: taskId,
            content: items[i],
            sort_order: i,
          });
        }
      }
    }

    // 프로젝트 status를 active로
    await supabase.from("projects").update({ status: "active" }).eq("id", projectId);

    router.push(`/${projectId}/dashboard`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-2">분석 결과가 없습니다</p>
      </div>
    );
  }

  const totalDays = project ? Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date || Date.now()).getTime()) / (1000 * 60 * 60 * 24)) : 14;

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Badge variant="accent"><i className="ti ti-sparkles" /> AI 분석 완료</Badge>
          <h2 className="text-xl font-semibold mt-2">{project?.name || "프로젝트"}</h2>
          <p className="text-text-2 text-[13px] mt-1">
            {project?.start_date || "오늘"}~ {project?.end_date} ({totalDays}일 플랜) — {result.timelines.length}인
          </p>
        </div>

        {/* 의존성 그래프 */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <SectionNum num={1} />
            <h3 className="text-base font-semibold">의존성 그래프</h3>
            <span className="text-xs text-text-3">— 왜 이렇게 분배 했는지 기록했어요.</span>
          </div>
          <DependencyGraph nodes={result.nodes} />
        </div>

        {/* 타임라인 */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <SectionNum num={2} />
            <h3 className="text-base font-semibold">팀원별 타임라인</h3>
            <span className="text-xs text-text-3">— 무엇이 무엇 다음에 가능한지 알려주는 그래프에요.</span>
          </div>
          <Timeline timelines={result.timelines} nodes={result.nodes} />
        </div>

        {/* AI 코멘트 */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <SectionNum num={3} />
            <h3 className="text-base font-semibold">AI 코멘트</h3>
            <span className="text-xs text-text-3">— AI가 분석한 현재 팀 프로젝트에 대한 한줄 코멘트입니다.</span>
          </div>
          <AIComment text={result.comment} />
        </div>

        {/* 수정 요청 모달 */}
        {showRevise && (
          <div className="mb-6 bg-surface border border-border rounded-[var(--radius-lg)] p-5">
            <h4 className="text-sm font-semibold mb-2">수정 요청</h4>
            <textarea
              value={reviseText}
              onChange={(e) => setReviseText(e.target.value)}
              placeholder="어떤 부분을 수정하고 싶은지 자유롭게 입력하세요"
              className="w-full bg-white border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all resize-y min-h-[80px] mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRevise(false)} className="px-3 py-2 text-sm text-text-2 hover:text-text cursor-pointer">취소</button>
              <button onClick={handleRevise} disabled={revising || !reviseText.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-primary-text rounded-[var(--radius)] hover:bg-[#404040] disabled:opacity-50">
                {revising ? "수정 중..." : "수정 요청"}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center border-t border-border pt-5">
          {isOwner ? (
            <>
              <button
                onClick={() => setShowRevise(!showRevise)}
                className="px-4 py-2.5 text-sm border border-border-strong rounded-[var(--radius)] hover:bg-surface transition-all cursor-pointer"
              >
                수정 요청
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="px-6 py-2.5 text-sm font-medium bg-[#d4a843] text-white rounded-[var(--radius)] hover:bg-[#c49a3a] transition-all disabled:opacity-50"
              >
                {accepting ? "저장 중..." : "이 계획으로 시작하기"}
              </button>
            </>
          ) : (
            <div className="w-full text-center">
              <div className="flex items-center justify-center gap-2 text-text-2 text-sm">
                <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin-slow" />
                생성자가 계획을 확정하면 대시보드로 자동 이동합니다
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
