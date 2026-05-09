import type { Member, TaskNode, MemberTimeline, KanbanCard, Notification, RebalanceOption, RetroStats } from "./types";

export const MEMBERS: Member[] = [
  { name: "김민준", role: "백엔드, FastAPI 익숙", availability: "평일 저녁 3hr, 주말 5hr", preference: "회의록 정리는 싫어요. 단독 개발 작업이 좋아요.", initial: "민", color: "blue" },
  { name: "이서연", role: "프론트엔드, React", availability: "주말 집중 8hr", preference: "평일은 학교 수업 많아요", initial: "서", color: "teal" },
  { name: "박지호", role: "기획·디자인", availability: "평일 자유 4hr", preference: "문서화 좋아함", initial: "지", color: "purple" },
  { name: "최예린", role: "디자인·UI", availability: "주말 집중 6hr", preference: "마감 직전 몰아치기 싫음", initial: "예", color: "coral" },
];

export const MEMBER_COLORS: Record<Member["color"], { bg: string; text: string; fill: string }> = {
  blue: { bg: "bg-accent-bg", text: "text-accent-text", fill: "#2563eb" },
  teal: { bg: "bg-teal-bg", text: "text-teal", fill: "#0f766e" },
  purple: { bg: "bg-purple-bg", text: "text-purple", fill: "#6d28d9" },
  coral: { bg: "bg-coral-bg", text: "text-coral", fill: "#c2410c" },
};

export const TASK_NODES: TaskNode[] = [
  { id: "concept", label: "컨셉", day: "Day 2", category: "planning", dependsOn: [] },
  { id: "wireframe", label: "와이어프레임", day: "Day 3", category: "design", dependsOn: ["concept"] },
  { id: "api", label: "API 설계", day: "Day 4", assignee: "민준", category: "backend", dependsOn: ["wireframe"] },
  { id: "ui", label: "UI", day: "Day 7", assignee: "서연", category: "frontend", dependsOn: ["wireframe"] },
  { id: "integration", label: "통합", day: "Day 10", category: "integration", dependsOn: ["api", "ui"] },
  { id: "qa", label: "QA", day: "Day 12", category: "qa", dependsOn: ["integration"] },
  { id: "presentation", label: "발표자료", day: "Day 13", category: "presentation", dependsOn: ["qa"] },
];

export const CATEGORY_COLORS: Record<string, { bg: string; stroke: string; text: string }> = {
  planning: { bg: "#f5f3ff", stroke: "#6d28d9", text: "#6d28d9" },
  design: { bg: "#f0fdfa", stroke: "#0f766e", text: "#0f766e" },
  backend: { bg: "#eff6ff", stroke: "#2563eb", text: "#1e40af" },
  frontend: { bg: "#fff7ed", stroke: "#c2410c", text: "#c2410c" },
  integration: { bg: "#f5f5f4", stroke: "#57534e", text: "#1c1917" },
  qa: { bg: "#fffbeb", stroke: "#b45309", text: "#b45309" },
  presentation: { bg: "#ecfdf5", stroke: "#047857", text: "#047857" },
};

export const TIMELINES: MemberTimeline[] = [
  {
    member: MEMBERS[0],
    bars: [
      { label: "API 설계", startPercent: 22, widthPercent: 18, color: "#2563eb" },
      { label: "통합", startPercent: 65, widthPercent: 14, color: "#57534e" },
    ],
  },
  {
    member: MEMBERS[1],
    bars: [
      { label: "와프", startPercent: 12, widthPercent: 16, color: "#0f766e" },
      { label: "UI", startPercent: 42, widthPercent: 22, color: "#c2410c" },
    ],
  },
  {
    member: MEMBERS[2],
    bars: [
      { label: "컨셉", startPercent: 0, widthPercent: 14, color: "#6d28d9" },
      { label: "QA", startPercent: 80, widthPercent: 12, color: "#b45309" },
    ],
  },
  {
    member: MEMBERS[3],
    bars: [
      { label: "UI", startPercent: 42, widthPercent: 22, color: "#c2410c" },
      { label: "발표", startPercent: 88, widthPercent: 10, color: "#047857" },
    ],
  },
];

export const AI_COMMENT = `박지호님 컨셉 문서를 **Day 2 마감**으로 잡았어요. 평일 자유 시간 + 기획 강점이 있으셔서요.

주말 집중 멤버 2명(이서연·최예린)에게 **후반부 UI 작업**을 몰았습니다. 평일 가용 멤버는 초반 작업 우선이에요.

김민준님 백엔드 API는 와이어프레임 완료 후 시작하도록 의존성을 잡았어요. **병렬로 UI도 진행**됩니다 — 두 작업이 통합 단계에서 만납니다.

**주의**: 통합 단계가 빡빡합니다. UI 또는 API 중 하나라도 늦어지면 QA 일정이 밀려요.`;

export const KANBAN_CARDS: KanbanCard[] = [
  { id: "1", title: "API 설계", assignee: MEMBERS[0], day: "Day 4", status: "todo" },
  { id: "2", title: "UI 디자인", assignee: MEMBERS[1], day: "Day 7", status: "todo" },
  { id: "3", title: "통합 작업", assignee: MEMBERS[0], day: "Day 10", status: "todo" },
  { id: "4", title: "와이어프레임", assignee: MEMBERS[3], day: "Day 3", progress: 60, status: "in_progress" },
  { id: "5", title: "컨셉 문서", assignee: MEMBERS[2], day: "Day 2", status: "done" },
];

export const NOTIFICATIONS: Notification[] = [
  { type: "dependency", trigger: "발동: 의존 작업 마감 D-1, 진행률 50% 미만", message: "박지호님, 컨셉 문서가 늦어지면 이서연님 와이어프레임도 못 시작해요. 30분만 짬 내실 수 있어요?", time: "방금" },
  { type: "strength", trigger: "발동: 막힘 + 강점 보유 멤버 존재", message: "김민준님이 FastAPI에 익숙하시니, 박지호님이 막힌 백엔드 부분 잠깐 봐주실 수 있나요?", time: "10분 전" },
  { type: "load", trigger: "발동: 한 멤버 이번 주 작업 3개 이상", message: "최예린님이 이번 주 작업이 3개입니다. 1개를 다음 주로 미루는 게 어떨까요?", time: "1시간 전" },
  { type: "emotion", trigger: "발동: 진행률 0%가 3일 이상 지속", message: "이서연님이 3일 동안 진행 0%입니다. 막혔는지 한 번 물어보는 게 어떨까요?", time: "2시간 전" },
];

export const REBALANCE_OPTIONS: RebalanceOption[] = [
  { id: "a", title: "A. 강점 매칭 — 최예린님이 와이어프레임 도움", description: "디자인 강점 활용, 마감 영향 0일", recommended: true },
  { id: "b", title: "B. 마감 1일 연기", description: "팀 부담 적음, 발표 일정 조정 필요" },
  { id: "c", title: "C. 김민준님이 API 설계 일부 먼저 시작", description: "병렬 진행, 통합 시 충돌 가능성" },
];

export const RETRO_STATS: RetroStats = {
  tasksCompleted: "7/7",
  deadlineRate: "94%",
  dependencyResolved: 3,
  aiAdviceCount: 12,
};

export const RETRO_MEMBERS = [
  { ...MEMBERS[0], tasks: 2, helped: 1, overcome: 1, tag: "안정적", tagColor: "text-success" },
  { ...MEMBERS[1], tasks: 2, helped: 0, overcome: 2, tag: "분발", tagColor: "text-warning" },
  { ...MEMBERS[2], tasks: 2, helped: 2, overcome: 0, tag: "MVP", tagColor: "text-success" },
  { ...MEMBERS[3], tasks: 1, helped: 1, overcome: 0, tag: "협력", tagColor: "text-accent" },
];

export const LOADING_STEPS = [
  "프로젝트 이해 중",
  "팀원 강점 분석",
  "의존성 그래프 생성",
  "타임라인 최적화",
  "코멘트 작성",
];

export const DEFAULT_PROJECT = {
  name: "AI 사이드 프로젝트",
  description: "대학생용 팀플 도구 웹앱 만들기",
  deadline: "2026-05-23",
  teamSize: 4,
  deliverable: "웹앱 + 발표 자료",
};
