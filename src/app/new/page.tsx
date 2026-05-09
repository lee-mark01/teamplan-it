"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_PROJECT } from "@/lib/mock-data";
import { saveProject } from "@/lib/store";
import { Button } from "@/components/ui";

export default function NewProjectPage() {
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [form, setForm] = useState({
    name: DEFAULT_PROJECT.name,
    description: DEFAULT_PROJECT.description,
    deadline: DEFAULT_PROJECT.deadline,
    teamSize: DEFAULT_PROJECT.teamSize,
    deliverable: DEFAULT_PROJECT.deliverable,
    domain: "",
    reference: "",
    criteria: "",
    constraints: "",
  });

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // 마감일 최소: 내일
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  // 필수 필드 검증
  const isValid =
    form.name.trim() !== "" &&
    form.description.trim() !== "" &&
    form.deadline >= minDate &&
    form.teamSize >= 2 &&
    form.teamSize <= 20;

  const handleNext = () => {
    if (!isValid) return;
    saveProject(form);
    router.push("/profile");
  };

  return (
    <div className="min-h-screen bg-bg p-8 animate-fade-in">
      <div className="max-w-[600px] mx-auto">
        <h2 className="text-xl font-semibold mb-1.5">프로젝트 정보</h2>
        <p className="text-text-2 text-[13px] mb-7">
          기본 정보만 입력하면 AI가 알아서 분해해드려요
        </p>

        {/* 프로젝트 이름 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">
            프로젝트 이름 *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="예: 캡스톤 디자인 — AI 추천 시스템"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
        </div>

        {/* 한 줄 설명 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">
            한 줄 설명 *
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="무엇을 만들고 싶으신가요?"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
        </div>

        {/* 마감일 + 팀 인원 */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-2 mb-1.5">
              마감일 *
            </label>
            <input
              type="date"
              value={form.deadline}
              min={minDate}
              onChange={(e) => update("deadline", e.target.value)}
              className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-2 mb-1.5">
              팀 인원 *
            </label>
            <input
              type="number"
              value={form.teamSize || ""}
              min={2}
              max={20}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") { update("teamSize", 0); return; }
                const num = parseInt(raw, 10);
                if (!isNaN(num)) update("teamSize", Math.min(20, Math.max(0, num)));
              }}
              onBlur={() => {
                if (form.teamSize < 2) update("teamSize", 2);
              }}
              className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
            />
          </div>
        </div>

        {/* 산출물 형태 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">
            산출물 형태 *
          </label>
          <select
            value={form.deliverable}
            onChange={(e) => update("deliverable", e.target.value)}
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          >
            <option>웹앱</option>
            <option>모바일 앱</option>
            <option>보고서</option>
            <option>발표 자료</option>
            <option>웹앱 + 발표 자료</option>
            <option>기타</option>
          </select>
        </div>

        {/* 더보기 */}
        <div className="mt-2">
          <button
            onClick={() => setShowMore(!showMore)}
            className="text-xs text-text-2 py-2 cursor-pointer flex items-center gap-1"
          >
            <i className={`ti ${showMore ? "ti-minus" : "ti-plus"} text-[11px]`} />
            더보기 (선택 입력 — 결과 정확도 ↑)
          </button>
          {showMore && (
            <div className="pt-3 space-y-4">
              {[
                { key: "domain", label: "도메인·분야", placeholder: "예: 교육·학생 타깃" },
                { key: "reference", label: "비슷한 레퍼런스", placeholder: "예: 노션 + 칸반" },
                { key: "criteria", label: "평가 기준", placeholder: "예: 교수님께 발표" },
                { key: "constraints", label: "제약 사항", placeholder: "예: 주 1회 회의만 가능" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-text-2 mb-1.5">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    value={(form as Record<string, string | number>)[f.key] as string}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => router.push("/")}>
            취소
          </Button>
          <Button onClick={handleNext} className={!isValid ? "opacity-40 pointer-events-none" : ""}>
            다음 — 팀원 정보 <i className="ti ti-arrow-right" />
          </Button>
        </div>
      </div>
    </div>
  );
}
