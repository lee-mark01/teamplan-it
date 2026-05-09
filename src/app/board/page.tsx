"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MEMBERS, MEMBER_COLORS, CATEGORY_COLORS, TIMELINES, AI_COMMENT } from "@/lib/mock-data";
import { loadResult, loadProject, type AnalyzeResult } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Badge, Avatar, Button, SectionNum } from "@/components/ui";
import type { Member } from "@/lib/types";

// ─── Auto-layout for dependency graph ────────────────────
function layoutNodes(nodes: AnalyzeResult["nodes"]) {
  // Topological sort to determine layers
  const idIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const layers: string[][] = [];
  const visited = new Set<string>();
  const nodeLayer = new Map<string, number>();

  function getLayer(id: string): number {
    if (nodeLayer.has(id)) return nodeLayer.get(id)!;
    const node = nodes[idIndex.get(id)!];
    if (!node || node.dependsOn.length === 0) {
      nodeLayer.set(id, 0);
      return 0;
    }
    const maxDep = Math.max(...node.dependsOn.filter((d) => idIndex.has(d)).map(getLayer));
    const layer = maxDep + 1;
    nodeLayer.set(id, layer);
    return layer;
  }

  nodes.forEach((n) => getLayer(n.id));

  const maxLayer = Math.max(...Array.from(nodeLayer.values()), 0);
  const layerGroups: typeof nodes[] = Array.from({ length: maxLayer + 1 }, () => []);
  nodes.forEach((n) => layerGroups[nodeLayer.get(n.id)!].push(n));

  // Position nodes — width scales with label length
  const NODE_H = 40;
  const GAP_X = 30;
  const GAP_Y = 20;

  function nodeWidth(label: string) {
    return Math.max(80, label.length * 16 + 24);
  }

  // Calculate max width per layer for consistent spacing
  const layerMaxW = layerGroups.map((group) =>
    Math.max(...group.map((n) => nodeWidth(n.label)))
  );
  const layerX = layerMaxW.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? 10 : acc[i - 1] + layerMaxW[i - 1] + GAP_X);
    return acc;
  }, []);
  const totalW = (layerX[layerX.length - 1] || 10) + (layerMaxW[layerMaxW.length - 1] || 90) + 10;

  const positioned: { id: string; x: number; y: number; w: number; label: string; sub: string; cat: string }[] = [];

  layerGroups.forEach((group, layerIdx) => {
    const x = layerX[layerIdx];
    const totalH = group.length * (NODE_H + GAP_Y) - GAP_Y;
    const startY = Math.max(10, (200 - totalH) / 2);

    group.forEach((node, gi) => {
      const w = nodeWidth(node.label);
      positioned.push({
        id: node.id,
        x,
        y: startY + gi * (NODE_H + GAP_Y),
        w,
        label: node.label,
        sub: `${node.day}${node.assignee ? ` · ${node.assignee}` : ""}`,
        cat: node.category,
      });
    });
  });

  // Build edges
  const posMap = new Map(positioned.map((p) => [p.id, p]));
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  nodes.forEach((n) => {
    const to = posMap.get(n.id);
    if (!to) return;
    n.dependsOn.forEach((depId) => {
      const from = posMap.get(depId);
      if (!from) return;
      edges.push({
        x1: from.x + from.w,
        y1: from.y + NODE_H / 2,
        x2: to.x,
        y2: to.y + NODE_H / 2,
      });
    });
  });

  const svgW = Math.max(totalW + 20, 760);
  const maxY = Math.max(...positioned.map((p) => p.y + NODE_H), 200);

  return { positioned, edges, svgW, svgH: maxY + 20 };
}

// ─── Dynamic Dependency Graph ────────────────────────────
function DependencyGraph({ nodes }: { nodes: AnalyzeResult["nodes"] }) {
  const { positioned, edges, svgW, svgH } = layoutNodes(nodes);

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-6">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto block">
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
              <text x={n.x + n.w / 2} y={n.y + 19} textAnchor="middle" fontFamily="Pretendard, sans-serif" fontSize={12} fontWeight={600} fill={c.text}>
                {n.label}
              </text>
              <text x={n.x + n.w / 2} y={n.y + 32} textAnchor="middle" fontFamily="Pretendard, sans-serif" fontSize={10} fill={c.text} opacity={0.7}>
                {n.sub}
              </text>
            </g>
          );
        })}

        {edges.map((e, i) => {
          const dx = e.x2 - e.x1;
          const dy = e.y2 - e.y1;
          // Straight if same height, curved otherwise
          if (Math.abs(dy) < 5) {
            return <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#a8a29e" strokeWidth={1.5} markerEnd="url(#arrow)" />;
          }
          const mx = e.x1 + dx * 0.5;
          return <path key={i} d={`M ${e.x1} ${e.y1} C ${mx} ${e.y1}, ${mx} ${e.y2}, ${e.x2} ${e.y2}`} stroke="#a8a29e" strokeWidth={1.5} fill="none" markerEnd="url(#arrow)" />;
        })}
      </svg>

      <div className="flex gap-4 mt-3 pt-3 border-t border-border text-[11px] text-text-3">
        {[
          { color: "#6d28d9", label: "기획" },
          { color: "#0f766e", label: "디자인" },
          { color: "#2563eb", label: "백엔드" },
          { color: "#c2410c", label: "프론트" },
          { color: "#57534e", label: "통합" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Timeline Bar with auto-shrink text ──────────────────
function TimelineBar({ label, color }: { label: string; color: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(11);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;
    let size = 11;
    text.style.fontSize = `${size}px`;
    while (text.scrollWidth > container.clientWidth - 8 && size > 7) {
      size -= 0.5;
      text.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  }, [label]);

  return (
    <div ref={containerRef} className="absolute h-full rounded flex items-center justify-center overflow-hidden" title={label} style={{ backgroundColor: color }}>
      <span ref={textRef} className="text-white font-medium px-1 whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>
        {label}
      </span>
    </div>
  );
}

// ─── Dynamic Timeline ────────────────────────────────────
function DynamicTimeline({ timelines }: { timelines: AnalyzeResult["timelines"] }) {
  const MEMBER_COLOR_MAP: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-accent-bg", text: "text-accent-text" },
    teal: { bg: "bg-teal-bg", text: "text-teal" },
    purple: { bg: "bg-purple-bg", text: "text-purple" },
    coral: { bg: "bg-coral-bg", text: "text-coral" },
  };

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-4">
      <div className="grid grid-cols-[60px_1fr] mb-2">
        <div />
        <div className="flex justify-between text-[10px] text-text-3 px-0.5">
          <span>Day 1</span><span>25%</span><span>50%</span><span>75%</span><span>마감</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {timelines.map((tl, i) => {
          const colors = MEMBER_COLOR_MAP[tl.memberColor] || MEMBER_COLOR_MAP.blue;
          return (
            <div key={i} className="grid grid-cols-[60px_1fr] items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
                  {tl.memberInitial}
                </span>
                <span className="text-xs font-medium">{tl.memberName.length > 2 ? tl.memberName.slice(1) : tl.memberName}</span>
              </div>
              <div className="relative h-[28px] bg-surface-2 rounded">
                {tl.bars.map((bar, j) => (
                  <div key={j} className="absolute h-full" style={{ left: `${bar.startPercent}%`, width: `${bar.widthPercent}%` }}>
                    <TimelineBar label={bar.label} color={bar.color} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Comment ──────────────────────────────────────────
function AICommentBlock({ text }: { text: string }) {
  const renderText = (t: string) => {
    const parts = t.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <b key={i}>{part.slice(2, -2)}</b>;
      }
      return part;
    });
  };

  // Support both \n\n and <br><br> as paragraph separators
  const paragraphs = text.split(/(?:\n\n|<br\s*\/?><br\s*\/?>)/g).filter(Boolean);

  return (
    <div className="bg-accent-bg border-l-[3px] border-accent rounded-[var(--radius-lg)] p-4">
      <div className="flex items-start gap-2.5">
        <i className="ti ti-sparkles text-base text-accent mt-0.5" />
        <div className="text-[13px] text-accent-text leading-relaxed">
          {paragraphs.map((p, i) => (
            <p key={i} className={i < paragraphs.length - 1 ? "mb-4" : ""}>
              {renderText(p)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────
export default function BoardPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    setProject(loadProject());
    const saved = loadResult();
    if (saved && saved.nodes && saved.timelines) {
      setResult(saved);
    } else {
      setUsingMock(true);
    }
  }, []);

  // Mock fallback rendering (original static version)
  if (usingMock) {
    return <MockBoardPage project={project} />;
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin-slow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-8 animate-fade-in">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="accent">
                <i className="ti ti-sparkles" /> AI 분석 완료
              </Badge>
              <span className="text-[11px] text-text-3">Gemini로 분석</span>
            </div>
            <h2 className="text-xl font-semibold">
              {project?.name || "과업 분해 결과"}
              {project?.deadline ? ` — ${Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}일 플랜` : ""}
            </h2>
            <p className="text-text-2 text-[13px] mt-1">
              {project?.description ? `${project.description} · ` : ""}{result.nodes.length}개 과업 · {result.timelines.length}명
            </p>
          </div>
          <div className="flex gap-1">
            {result.timelines.map((tl, i) => {
              const colorMap: Record<string, { bg: string; text: string }> = {
                blue: { bg: "bg-accent-bg", text: "text-accent-text" },
                teal: { bg: "bg-teal-bg", text: "text-teal" },
                purple: { bg: "bg-purple-bg", text: "text-purple" },
                coral: { bg: "bg-coral-bg", text: "text-coral" },
              };
              const c = colorMap[tl.memberColor] || colorMap.blue;
              return (
                <span key={i} className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>
                  {tl.memberInitial}
                </span>
              );
            })}
          </div>
        </div>

        {/* Section 1: Dependency Graph */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <SectionNum num={1} />
            <h3 className="text-base font-semibold">의존성 그래프</h3>
            <span className="text-xs text-text-3">— 무엇이 무엇 다음에 가능한지</span>
          </div>
          <DependencyGraph nodes={result.nodes} />
        </div>

        {/* Section 2: Timeline */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <SectionNum num={2} />
            <h3 className="text-base font-semibold">팀원별 타임라인</h3>
            <span className="text-xs text-text-3">— 누가 언제 무엇을</span>
          </div>
          <DynamicTimeline timelines={result.timelines} />
        </div>

        {/* Section 3: AI Comment */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <SectionNum num={3} />
            <h3 className="text-base font-semibold">AI 코멘트</h3>
            <span className="text-xs text-text-3">— 왜 이렇게 분해했는지</span>
          </div>
          <AICommentBlock text={result.comment} />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center border-t border-border pt-5 mt-6">
          <Button variant="ghost" onClick={() => router.push("/profile")}>
            <i className="ti ti-arrow-left" /> 정보 다시 입력
          </Button>
          <Button onClick={() => router.push("/")}>
            처음으로 <i className="ti ti-home" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Mock fallback (original static) ─────────────────────
function MockBoardPage({ project }: { project: Project | null }) {
  const router = useRouter();
  const projName = project?.name || "AI 사이드 프로젝트";
  const projDesc = project?.description || "대학생용 팀플 도구 웹앱";
  const daysLeft = project?.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 14;

  return (
    <div className="min-h-screen bg-bg p-8 animate-fade-in">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="accent"><i className="ti ti-sparkles" /> AI 분석 완료</Badge>
              <span className="text-[11px] text-text-3">데모 데이터</span>
            </div>
            <h2 className="text-xl font-semibold">{projName} — {daysLeft}일 플랜</h2>
            <p className="text-text-2 text-[13px] mt-1">{projDesc} · {project?.teamSize || 4}명 · ~Day {daysLeft}</p>
          </div>
          <div className="flex gap-1">
            {MEMBERS.map((m, i) => <Avatar key={i} member={m} size="sm" />)}
          </div>
        </div>

        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <SectionNum num={1} />
            <h3 className="text-base font-semibold">의존성 그래프</h3>
            <span className="text-xs text-text-3">— 무엇이 무엇 다음에 가능한지</span>
          </div>
          <StaticDependencyGraph />
        </div>

        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <SectionNum num={2} />
            <h3 className="text-base font-semibold">팀원별 타임라인</h3>
            <span className="text-xs text-text-3">— 누가 언제 무엇을</span>
          </div>
          <StaticTimeline />
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <SectionNum num={3} />
            <h3 className="text-base font-semibold">AI 코멘트</h3>
            <span className="text-xs text-text-3">— 왜 이렇게 분해했는지</span>
          </div>
          <AICommentBlock text={AI_COMMENT} />
        </div>

        <div className="flex justify-between items-center border-t border-border pt-5 mt-6">
          <Button variant="ghost" onClick={() => router.push("/profile")}><i className="ti ti-arrow-left" /> 정보 다시 입력</Button>
          <Button onClick={() => router.push("/")}>처음으로 <i className="ti ti-home" /></Button>
        </div>
      </div>
    </div>
  );
}

function StaticDependencyGraph() {
  const nodes = [
    { id: "concept", x: 10, y: 70, w: 86, label: "컨셉", sub: "Day 2", cat: "planning" },
    { id: "wireframe", x: 130, y: 70, w: 100, label: "와이어프레임", sub: "Day 3", cat: "design" },
    { id: "api", x: 270, y: 20, w: 86, label: "API 설계", sub: "Day 4 · 민준", cat: "backend" },
    { id: "ui", x: 270, y: 120, w: 86, label: "UI", sub: "Day 7 · 서연", cat: "frontend" },
    { id: "integration", x: 390, y: 70, w: 86, label: "통합", sub: "Day 10", cat: "integration" },
    { id: "qa", x: 510, y: 70, w: 86, label: "QA", sub: "Day 12", cat: "qa" },
    { id: "presentation", x: 630, y: 70, w: 100, label: "발표자료", sub: "Day 13", cat: "presentation" },
  ];

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-6">
      <svg viewBox="0 0 760 180" className="w-full h-auto block">
        <defs>
          <marker id="arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a8a29e" />
          </marker>
        </defs>
        {nodes.map((n) => {
          const c = CATEGORY_COLORS[n.cat];
          return (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={n.w} height={40} rx={8} fill={c.bg} stroke={c.stroke} strokeWidth={1} />
              <text x={n.x + n.w / 2} y={n.y + 19} textAnchor="middle" fontFamily="Pretendard, sans-serif" fontSize={12} fontWeight={600} fill={c.text}>{n.label}</text>
              <text x={n.x + n.w / 2} y={n.y + 32} textAnchor="middle" fontFamily="Pretendard, sans-serif" fontSize={10} fill={c.text} opacity={0.7}>{n.sub}</text>
            </g>
          );
        })}
        <line x1={100} y1={90} x2={126} y2={90} stroke="#a8a29e" strokeWidth={1.5} markerEnd="url(#arrow2)" />
        <path d="M 230 80 Q 250 80 252 60 Q 254 40 268 40" stroke="#a8a29e" strokeWidth={1.5} fill="none" markerEnd="url(#arrow2)" />
        <path d="M 230 100 Q 250 100 252 120 Q 254 140 268 140" stroke="#a8a29e" strokeWidth={1.5} fill="none" markerEnd="url(#arrow2)" />
        <path d="M 358 40 Q 376 40 380 60 Q 384 80 388 88" stroke="#a8a29e" strokeWidth={1.5} fill="none" markerEnd="url(#arrow2)" />
        <path d="M 358 140 Q 376 140 380 120 Q 384 100 388 92" stroke="#a8a29e" strokeWidth={1.5} fill="none" markerEnd="url(#arrow2)" />
        <line x1={478} y1={90} x2={506} y2={90} stroke="#a8a29e" strokeWidth={1.5} markerEnd="url(#arrow2)" />
        <line x1={598} y1={90} x2={626} y2={90} stroke="#a8a29e" strokeWidth={1.5} markerEnd="url(#arrow2)" />
      </svg>
      <div className="flex gap-4 mt-3 pt-3 border-t border-border text-[11px] text-text-3">
        {[{ color: "#6d28d9", label: "기획" }, { color: "#0f766e", label: "디자인" }, { color: "#2563eb", label: "백엔드" }, { color: "#c2410c", label: "프론트" }, { color: "#57534e", label: "통합" }].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StaticTimeline() {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-4">
      <div className="grid grid-cols-[60px_1fr] mb-2">
        <div />
        <div className="flex justify-between text-[10px] text-text-3 px-0.5">
          <span>Day 1</span><span>Day 4</span><span>Day 7</span><span>Day 10</span><span>Day 14</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {TIMELINES.map((tl, i) => (
          <div key={i} className="grid grid-cols-[60px_1fr] items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Avatar member={tl.member} size="sm" />
              <span className="text-xs font-medium">{tl.member.name.slice(1)}</span>
            </div>
            <div className="relative h-[28px] bg-surface-2 rounded">
              {tl.bars.map((bar, j) => (
                <div key={j} className="absolute h-full" style={{ left: `${bar.startPercent}%`, width: `${bar.widthPercent}%` }}>
                  <TimelineBar label={bar.label} color={bar.color} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
