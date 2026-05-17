"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileUpload from "@/components/file-upload";

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    description: "",
    goal: "",
    startDate: "",
    endDate: "",
    deliverable: "웹앱",
    domain: "",
    constraints: "",
    isPrivate: false,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const isValid =
    form.name.trim() !== "" &&
    form.endDate >= minDate;

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      // 파일 업로드 (서버 API 경유, 여러 개)
      const uploadedPaths: string[] = [];
      for (const f of files) {
        try {
          const fd = new FormData();
          fd.append("file", f);
          fd.append("projectId", user.id);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
          const uploadData = await uploadRes.json();
          if (uploadData.path) uploadedPaths.push(uploadData.path);
        } catch (e) {
          console.warn("파일 업로드 스킵:", e);
        }
      }
      const documentUrl = uploadedPaths.length > 0 ? uploadedPaths.join(",") : null;

      // 프로젝트 생성
      const { data: project, error: insertErr } = await supabase
        .from("projects")
        .insert({
          name: form.name,
          description: form.description || null,
          goal: form.goal || null,
          document_url: documentUrl,
          start_date: form.startDate || null,
          end_date: form.endDate,
          deliverable: form.deliverable,
          domain: form.domain || null,
          constraints: form.constraints || null,
          is_private: form.isPrivate,
          owner_id: user.id,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // 본인을 owner로 project_members에 추가
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      await supabase.from("project_members").insert({
        project_id: project.id,
        user_id: user.id,
        display_name: profile?.display_name || "나",
        role: "owner",
        color: "blue",
        joined_at: new Date().toISOString(),
      });

      router.push(`/${project.id}/invite`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      setLoading(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[640px] mx-auto">
        <h1 className="text-xl font-semibold mb-1">새로운 프로젝트 등록하기</h1>
        <p className="text-text-2 text-[13px] mb-7">
          프로젝트 정보를 입력하면 AI가 자동으로 과업을 분별하고 팀원에게 배부합니다.
        </p>

        {/* 프로젝트명 + 비공개 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">팀 프로젝트명 *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="예 : 멋쟁이사자처럼 중간고사 대비 프로젝트"
              className="flex-1 bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
            />
            <button
              type="button"
              onClick={() => update("isPrivate", !form.isPrivate)}
              className={`px-3 py-2 rounded-[var(--radius)] text-xs font-medium flex items-center gap-1 transition-all ${
                form.isPrivate ? "bg-primary text-primary-text" : "bg-surface-2 text-text-2 hover:bg-surface"
              }`}
            >
              <i className={`ti ti-${form.isPrivate ? "lock" : "lock-open"} text-sm`} />
              {form.isPrivate ? "비공개" : "공개"}
            </button>
          </div>
        </div>

        {/* 설명 및 문서 업로드 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">팀 프로젝트 설명 및 참고할 문서 업로드</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="프로젝트에 대해 설명해주세요. 구체적일수록 AI가 정확한 맞춤 제안을 드릴 수 있어요!"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all resize-y min-h-[80px] mb-3"
          />
          <FileUpload onFilesChange={setFiles} />
        </div>

        {/* 시작일 + 마감일 */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-2 mb-1.5">시작일</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-2 mb-1.5">마감일 *</label>
            <input
              type="date"
              value={form.endDate}
              min={minDate}
              onChange={(e) => update("endDate", e.target.value)}
              className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
            />
          </div>
        </div>

        {/* 목표 과제 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">목표 과제</label>
          <input
            type="text"
            value={form.goal}
            onChange={(e) => update("goal", e.target.value)}
            placeholder="예: 웹앱 프로토타입 + 발표 자료 완성"
            className="w-full bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
          />
        </div>

        {/* 산출물 형태 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-2 mb-1.5">산출물 형태</label>
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

        {error && <p className="text-danger text-xs mb-4">{error}</p>}

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => router.push("/projects")}
            className="px-4 py-2.5 text-sm text-text-2 hover:text-text transition-all cursor-pointer"
          >
            <i className="ti ti-arrow-left" /> 이전
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-text rounded-[var(--radius)] hover:bg-[#404040] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? "생성 중..." : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
