"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMembers, loadProject } from "@/lib/store";
import { Button } from "@/components/ui";
import type { Member } from "@/lib/types";

const COLORS: Member["color"][] = ["blue", "teal", "purple", "coral"];
const COLOR_STYLES: Record<Member["color"], { bg: string; text: string }> = {
  blue: { bg: "bg-accent-bg", text: "text-accent-text" },
  teal: { bg: "bg-teal-bg", text: "text-teal" },
  purple: { bg: "bg-purple-bg", text: "text-purple" },
  coral: { bg: "bg-coral-bg", text: "text-coral" },
};

interface MemberForm {
  name: string;
  role: string;
  availability: string;
  preference: string;
}

function getTeamSize(): number {
  if (typeof window === "undefined") return 4;
  const project = loadProject();
  return project.teamSize || 4;
}

function createEmptyForms(count: number): MemberForm[] {
  return Array.from({ length: count }, (_, i) => ({
    name: "",
    role: "",
    availability: "",
    preference: "",
  }));
}

export default function ProfilePage() {
  const router = useRouter();
  const [teamSize] = useState(getTeamSize);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [forms, setForms] = useState(() => createEmptyForms(teamSize));

  const current = forms[currentIdx];
  const color = COLORS[currentIdx % COLORS.length];
  const colorStyle = COLOR_STYLES[color];

  const updateField = (field: keyof MemberForm, value: string) => {
    setForms((prev) => {
      const next = [...prev];
      next[currentIdx] = { ...next[currentIdx], [field]: value };
      return next;
    });
  };

  const handleSubmit = () => {
    saveMembers(forms);
    router.push("/analyzing");
  };

  // 현재 팀원의 필수 필드 검증
  const isCurrentValid =
    current.name.trim() !== "" &&
    current.availability.trim() !== "";

  const handleNext = () => {
    if (!isCurrentValid) return;
    if (currentIdx < teamSize - 1) {
      setCurrentIdx(currentIdx + 1);
      setShowMore(false);
    } else {
      handleSubmit();
    }
  };

  const isLast = currentIdx === teamSize - 1;
  const initial = current.name.charAt(0) || String(currentIdx + 1);

  return (
    <div className="min-h-screen bg-bg p-8 animate-fade-in">
      <div className="max-w-[700px] mx-auto">
        <h2 className="text-xl font-semibold mb-1.5">팀원 정보 입력</h2>
        <p className="text-text-2 text-[13px] mb-6">
          AI가 강점·시간을 고려해 과업을 분배해드려요
        </p>

        {/* Progress dots */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {forms.map((f, i) => {
            const c = COLOR_STYLES[COLORS[i % COLORS.length]];
            const fi = f.name.charAt(0) || String(i + 1);
            return (
              <button
                key={i}
                onClick={() => { setCurrentIdx(i); setShowMore(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] cursor-pointer transition-all ${
                  i === currentIdx
                    ? "bg-accent-bg border border-accent/20"
                    : i < currentIdx
                    ? "bg-success-bg border border-success/20"
                    : "bg-surface-2 border border-transparent"
                }`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>
                  {fi}
                </span>
                <span className="text-xs font-medium">{f.name || `팀원 ${i + 1}`}</span>
                {i < currentIdx && <i className="ti ti-check text-success text-xs" />}
              </button>
            );
          })}
        </div>

        {/* Current member header */}
        <div className={`flex items-center gap-3 p-3 ${colorStyle.bg} rounded-[var(--radius-lg)] mb-6`}>
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-semibold ${colorStyle.bg} ${colorStyle.text}`}>
            {initial}
          </span>
          <div>
            <div className={`font-medium text-[13px] ${colorStyle.text}`}>{current.name || `팀원 ${currentIdx + 1}`}</div>
            <div className={`text-[11px] ${colorStyle.text} opacity-70`}>
              {currentIdx === 0
                ? "본인 — 다른 팀원도 각자 입력할 거예요"
                : `팀원 ${currentIdx + 1} / ${teamSize}`}
            </div>
          </div>
        </div>

        {/* Name field */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">이름 *</label>
          <input
            type="text"
            value={current.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="예: 김민준"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
        </div>

        {/* Role field */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">강점·역할</label>
          <input
            type="text"
            value={current.role}
            onChange={(e) => updateField("role", e.target.value)}
            placeholder="예: 백엔드 개발, FastAPI 1년 경험"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
          <div className="text-[11px] text-text-3 mt-1">AI가 어떤 과업을 맡길지 결정할 때 쓰는 정보예요</div>
        </div>

        {/* Availability field */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">가용 시간 *</label>
          <input
            type="text"
            value={current.availability}
            onChange={(e) => updateField("availability", e.target.value)}
            placeholder="예: 평일 저녁 2시간, 주말 6시간"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
          <div className="text-[11px] text-text-3 mt-1">자유롭게 적어주세요. AI가 알아서 해석해요</div>
        </div>

        {/* Preference field */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">선호도</label>
          <textarea
            value={current.preference}
            onChange={(e) => updateField("preference", e.target.value)}
            placeholder="하고 싶은 일·하기 싫은 일을 자유롭게"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all resize-y min-h-[80px]"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (currentIdx > 0) {
                setCurrentIdx(currentIdx - 1);
                setShowMore(false);
              } else {
                router.push("/new");
              }
            }}
          >
            <i className="ti ti-arrow-left" /> 이전
          </Button>
          <Button onClick={handleNext} className={!isCurrentValid ? "opacity-40 pointer-events-none" : ""}>
            {isLast ? (
              <>완료 — AI 분석 시작 <i className="ti ti-sparkles" /></>
            ) : (
              <>다음 팀원 <i className="ti ti-arrow-right" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
