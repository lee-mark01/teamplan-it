"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TagInput from "@/components/tag-input";

const STRENGTH_TAGS = ["자료조사", "데이터 분석", "PPT 제작", "대본 작성/발표", "기획/문서화"];
const TIME_TAGS = ["아침", "점심", "저녁", "밤", "새벽"];

export default function MyInfoPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [memberId, setMemberId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [majorOrPart, setMajorOrPart] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();
      if (project) setProjectName(project.name);

      const { data: member } = await supabase
        .from("project_members")
        .select("id, display_name, major_or_part, strengths, time_slots, hours_per_week")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .single();

      if (member) {
        setMemberId(member.id);
        setDisplayName(member.display_name || "");
        setMajorOrPart(member.major_or_part || "");
        setStrengths(member.strengths || []);
        setTimeSlots(member.time_slots || []);
        setHoursPerWeek(member.hours_per_week || "");
      }
      setLoading(false);
    }
    load();
  }, [projectId]);

  async function handleSave() {
    if (!memberId || !displayName.trim()) return;
    setSaving(true);

    await supabase.from("project_members").update({
      display_name: displayName,
      major_or_part: majorOrPart || null,
      strengths,
      time_slots: timeSlots,
      hours_per_week: hoursPerWeek || null,
      info_completed: true,
    }).eq("id", memberId);

    // 대기 페이지로 이동 (모든 팀원 입력 완료 시 자동 분석 시작)
    router.push(`/${projectId}/waiting`);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin-slow" /></div>;
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[640px] mx-auto">
        <h1 className="text-xl font-semibold mb-1">내 정보 입력</h1>
        <p className="text-text-2 text-[13px] mb-6">
          <b>{projectName}</b>에 참여했습니다! AI가 과업을 배정하기 위해 정보를 입력해주세요.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">이름 *</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">전공 / 파트</label>
          <input
            type="text"
            value={majorOrPart}
            onChange={(e) => setMajorOrPart(e.target.value)}
            placeholder="예: 컴퓨터공학 / 프론트엔드"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
        </div>

        <div className="mb-4">
          <TagInput
            label="강점"
            tags={STRENGTH_TAGS}
            selected={strengths}
            onChange={setStrengths}
            allowCustom
            customPlaceholder="선호역할 입력하기"
          />
        </div>

        <div className="mb-4">
          <TagInput
            label="선호하는 작업 시간대"
            tags={TIME_TAGS}
            selected={timeSlots}
            onChange={setTimeSlots}
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-medium text-text-2 mb-1.5">주당 투입 가능한 시간</label>
          <input
            type="text"
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(e.target.value)}
            placeholder="예: 평일은 6시간 주말은 2시간"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!displayName.trim() || saving}
          className="w-full py-2.5 text-sm font-medium bg-primary text-primary-text rounded-[var(--radius)] hover:bg-[#1a4a5a] transition-all disabled:opacity-40"
        >
          {saving ? "저장 중..." : "완료 — 대시보드로 이동"}
        </button>
      </div>
    </div>
  );
}
