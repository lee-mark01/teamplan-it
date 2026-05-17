"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TagInput from "@/components/tag-input";

const STRENGTH_TAGS = ["자료조사", "데이터 분석", "PPT 제작", "대본 작성/발표", "기획/문서화"];
const TIME_TAGS = ["아침", "점심", "저녁", "밤", "새벽"];
const COLORS = ["blue", "teal", "purple", "coral"];

interface MemberForm {
  id?: string;
  displayName: string;
  majorOrPart: string;
  strengths: string[];
  timeSlots: string[];
  hoursPerWeek: string;
}

export default function MembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [members, setMembers] = useState<MemberForm[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("project_members")
        .select("id, display_name, major_or_part, strengths, time_slots, hours_per_week")
        .eq("project_id", projectId)
        .order("created_at");

      if (data && data.length > 0) {
        setMembers(data.map((m) => ({
          id: m.id,
          displayName: m.display_name,
          majorOrPart: m.major_or_part || "",
          strengths: m.strengths || [],
          timeSlots: m.time_slots || [],
          hoursPerWeek: m.hours_per_week || "",
        })));
      } else {
        // 멤버가 없으면 하나 추가
        setMembers([{ displayName: "", majorOrPart: "", strengths: [], timeSlots: [], hoursPerWeek: "" }]);
      }
      setLoading(false);
    }
    load();
  }, [projectId]);

  const current = members[currentIdx];

  const updateField = (field: keyof MemberForm, value: string | string[]) => {
    setMembers((prev) => {
      const next = [...prev];
      next[currentIdx] = { ...next[currentIdx], [field]: value };
      return next;
    });
  };

  const addMember = () => {
    setMembers([...members, { displayName: "", majorOrPart: "", strengths: [], timeSlots: [], hoursPerWeek: "" }]);
    setCurrentIdx(members.length);
  };

  const isCurrentValid = current?.displayName.trim() !== "";
  const isLast = currentIdx === members.length - 1;

  const saveCurrentMember = async () => {
    if (!current) return;

    if (current.id) {
      await supabase.from("project_members").update({
        display_name: current.displayName,
        major_or_part: current.majorOrPart || null,
        strengths: current.strengths,
        time_slots: current.timeSlots,
        hours_per_week: current.hoursPerWeek || null,
        color: COLORS[currentIdx % COLORS.length],
      }).eq("id", current.id);
    } else {
      const { data } = await supabase.from("project_members").insert({
        project_id: projectId,
        display_name: current.displayName,
        major_or_part: current.majorOrPart || null,
        strengths: current.strengths,
        time_slots: current.timeSlots,
        hours_per_week: current.hoursPerWeek || null,
        color: COLORS[currentIdx % COLORS.length],
        role: "member",
      }).select("id").single();

      if (data) {
        setMembers((prev) => {
          const next = [...prev];
          next[currentIdx] = { ...next[currentIdx], id: data.id };
          return next;
        });
      }
    }
  };

  const handleNext = async () => {
    if (!isCurrentValid) return;
    await saveCurrentMember();

    if (!isLast) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleAnalyze = async () => {
    if (!isCurrentValid) return;
    setSaving(true);
    await saveCurrentMember();
    router.push(`/${projectId}/analyzing`);
  };

  if (loading || !current) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin-slow" />
      </div>
    );
  }

  const colorMap: Record<string, string> = {
    blue: "bg-accent-bg text-accent-text",
    teal: "bg-teal-bg text-teal",
    purple: "bg-purple-bg text-purple",
    coral: "bg-coral-bg text-coral",
  };
  const currentColor = COLORS[currentIdx % COLORS.length];

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[640px] mx-auto">
        <h1 className="text-xl font-semibold mb-1">팀원 정보 입력</h1>
        <p className="text-text-2 text-[13px] mb-6">
          AI가 당신에게 맞는 과업을 배정하기 위해 몇 가지 질문을 드립니다.
        </p>

        {/* Progress dots */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {members.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIdx(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] cursor-pointer transition-all ${
                i === currentIdx
                  ? "bg-accent-bg border border-accent/20"
                  : "bg-surface-2 border border-transparent"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${colorMap[COLORS[i % COLORS.length]]}`}>
                {m.displayName.charAt(0) || String(i + 1)}
              </span>
              <span className="text-xs font-medium">{m.displayName || `팀원 ${i + 1}`}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={addMember}
            className="flex items-center gap-1 px-3 py-2 rounded-[var(--radius-lg)] border border-dashed border-border-strong text-text-3 hover:text-text hover:border-accent/30 cursor-pointer transition-all"
          >
            <i className="ti ti-plus text-xs" />
            <span className="text-xs">추가</span>
          </button>
        </div>

        {/* 이름 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">이름 *</label>
          <input
            type="text"
            value={current.displayName}
            onChange={(e) => updateField("displayName", e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
        </div>

        {/* 전공/파트 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">전공 / 파트</label>
          <input
            type="text"
            value={current.majorOrPart}
            onChange={(e) => updateField("majorOrPart", e.target.value)}
            placeholder="예: 컴퓨터공학 / 프론트엔드"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
        </div>

        {/* 강점 태그 */}
        <div className="mb-4">
          <TagInput
            label="강점"
            tags={STRENGTH_TAGS}
            selected={current.strengths}
            onChange={(v) => updateField("strengths", v)}
            allowCustom
            customPlaceholder="선호역할 입력하기"
          />
        </div>

        {/* 선호 작업 시간대 */}
        <div className="mb-4">
          <TagInput
            label="선호하는 작업 시간대"
            tags={TIME_TAGS}
            selected={current.timeSlots}
            onChange={(v) => updateField("timeSlots", v)}
          />
        </div>

        {/* 주당 투입 시간 */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-text-2 mb-1.5">주당 투입 가능한 시간</label>
          <input
            type="text"
            value={current.hoursPerWeek}
            onChange={(e) => updateField("hoursPerWeek", e.target.value)}
            placeholder="예 : 평일은 6시간 주말은 2시간"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => {
              if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
              else router.push(`/${projectId}/invite`);
            }}
            className="px-4 py-2.5 text-sm text-text-2 hover:text-text transition-all cursor-pointer"
          >
            <i className="ti ti-arrow-left" /> 이전
          </button>
          <div className="flex gap-2">
            {!isLast && (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isCurrentValid}
                className="px-4 py-2.5 text-sm text-text-2 hover:text-text transition-all disabled:opacity-40 cursor-pointer"
              >
                다음 팀원 <i className="ti ti-arrow-right" />
              </button>
            )}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!isCurrentValid || saving}
              className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-text rounded-[var(--radius)] hover:bg-[#404040] transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {saving ? "저장 중..." : "AI 분석 시작하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
