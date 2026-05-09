export interface Project {
  name: string;
  description: string;
  deadline: string;
  teamSize: number;
  deliverable: string;
  domain?: string;
  reference?: string;
  criteria?: string;
  constraints?: string;
}

export interface Member {
  name: string;
  role: string;
  availability: string;
  preference: string;
  initial: string;
  color: "blue" | "teal" | "purple" | "coral";
}

export interface TaskNode {
  id: string;
  label: string;
  day: string;
  assignee?: string;
  category: "planning" | "design" | "backend" | "frontend" | "integration" | "qa" | "presentation";
  dependsOn: string[];
}

export interface TimelineBar {
  label: string;
  startPercent: number;
  widthPercent: number;
  color: string;
}

export interface MemberTimeline {
  member: Member;
  bars: TimelineBar[];
}

export interface KanbanCard {
  id: string;
  title: string;
  assignee: Member;
  day: string;
  progress?: number;
  status: "todo" | "in_progress" | "done";
}

export interface Notification {
  type: "dependency" | "strength" | "load" | "emotion";
  message: string;
  trigger: string;
  time: string;
}

export interface RebalanceOption {
  id: string;
  title: string;
  description: string;
  recommended?: boolean;
}

export interface RetroStats {
  tasksCompleted: string;
  deadlineRate: string;
  dependencyResolved: number;
  aiAdviceCount: number;
}

export interface AnalyzeResponse {
  nodes: TaskNode[];
  timelines: MemberTimeline[];
  comment: string;
}
