// Simple sessionStorage-based store for cross-page data sharing

import type { Project, Member } from "./types";
import { DEFAULT_PROJECT, MEMBERS } from "./mock-data";

const KEYS = {
  project: "ideaton_project",
  members: "ideaton_members",
  result: "ideaton_result",
} as const;

export function saveProject(project: Project) {
  sessionStorage.setItem(KEYS.project, JSON.stringify(project));
}

export function loadProject(): Project {
  try {
    const raw = sessionStorage.getItem(KEYS.project);
    return raw ? JSON.parse(raw) : DEFAULT_PROJECT;
  } catch {
    return DEFAULT_PROJECT;
  }
}

export function saveMembers(members: { name: string; role: string; availability: string; preference: string }[]) {
  sessionStorage.setItem(KEYS.members, JSON.stringify(members));
}

export function loadMembers(): { name: string; role: string; availability: string; preference: string }[] {
  try {
    const raw = sessionStorage.getItem(KEYS.members);
    return raw ? JSON.parse(raw) : MEMBERS.map((m) => ({ name: m.name, role: m.role, availability: m.availability, preference: m.preference }));
  } catch {
    return MEMBERS.map((m) => ({ name: m.name, role: m.role, availability: m.availability, preference: m.preference }));
  }
}

export interface AnalyzeResult {
  nodes: {
    id: string;
    label: string;
    day: string;
    assignee?: string;
    category: string;
    dependsOn: string[];
  }[];
  timelines: {
    memberName: string;
    memberInitial: string;
    memberColor: string;
    bars: {
      label: string;
      startPercent: number;
      widthPercent: number;
      color: string;
    }[];
  }[];
  comment: string;
}

export function saveResult(result: AnalyzeResult) {
  sessionStorage.setItem(KEYS.result, JSON.stringify(result));
}

export function loadResult(): AnalyzeResult | null {
  try {
    const raw = sessionStorage.getItem(KEYS.result);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
