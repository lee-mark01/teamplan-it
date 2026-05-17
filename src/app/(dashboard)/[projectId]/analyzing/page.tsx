"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LOADING_STEPS = [
  "프로젝트 이해 중",
  "팀원 강점 분석",
  "의존성 그래프 형성",
  "타임라인 최적화",
  "코멘트 작성",
];

export default function AnalyzingPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  const apiDoneRef = useRef(false);
  const animDoneRef = useRef(false);
  const navigatedRef = useRef(false);
  const startedRef = useRef(false);

  const tryNavigate = useCallback(() => {
    if (apiDoneRef.current && animDoneRef.current && !navigatedRef.current) {
      navigatedRef.current = true;
      setCurrentStep(LOADING_STEPS.length + 1);
      setTimeout(() => router.push(`/${projectId}/result`), 400);
    }
  }, [router, projectId]);

  // 애니메이션
  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);
      if (step >= LOADING_STEPS.length) {
        clearInterval(interval);
        animDoneRef.current = true;
        if (!apiDoneRef.current) setWaiting(true);
        tryNavigate();
      }
    }, 900);
    return () => clearInterval(interval);
  }, [tryNavigate]);

  // 분석 시작 또는 결과 대기
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function run() {
      // 1) 이미 분석 결과가 있는지 확인
      const { data: existing } = await supabase
        .from("analysis_snapshots")
        .select("id")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .limit(1);

      if (existing && existing.length > 0) {
        apiDoneRef.current = true;
        setWaiting(false);
        tryNavigate();
        return;
      }

      // 2) 내가 owner인지 확인
      const { data: { user } } = await supabase.auth.getUser();
      const { data: project } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("id", projectId)
        .single();

      const isOwner = project?.owner_id === user?.id;

      if (isOwner) {
        // owner: AI 분석 API 호출
        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "API 오류");
          }
          apiDoneRef.current = true;
          setWaiting(false);
          tryNavigate();
        } catch (err: any) {
          setError(err.message);
        }
      } else {
        // 팀원: 결과가 생길 때까지 3초마다 폴링
        const poll = setInterval(async () => {
          const { data } = await supabase
            .from("analysis_snapshots")
            .select("id")
            .eq("project_id", projectId)
            .eq("is_active", true)
            .limit(1);

          if (data && data.length > 0) {
            clearInterval(poll);
            apiDoneRef.current = true;
            setWaiting(false);
            tryNavigate();
          }
        }, 3000);

        return () => clearInterval(poll);
      }
    }

    run();
  }, [tryNavigate, projectId, supabase]);

  const displayStep = waiting ? LOADING_STEPS.length : currentStep;

  return (
    <div className="flex items-center justify-center h-full p-10 animate-fade-in">
      <div className="max-w-[440px] w-full">
        <div className="text-center mb-8">
          {error ? (
            <div className="w-12 h-12 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-5">
              <i className="ti ti-alert-circle text-xl text-danger" />
            </div>
          ) : (
            <div className="w-12 h-12 border-[3px] border-border border-t-primary rounded-full mx-auto mb-5 animate-spin-slow" />
          )}
          <h2 className="text-xl font-semibold mb-1.5">
            {error ? "분석 중 오류가 발생했어요" : "AI가 팀플을 분석하고 있어요"}
          </h2>
          <p className="text-text-2 text-[13px]">
            {error ? error : waiting ? "거의 다 됐어요..." : "잠시만 기다려주세요"}
          </p>
        </div>

        <div className="space-y-0">
          {LOADING_STEPS.map((label, i) => {
            const stepNum = i + 1;
            const done = displayStep > stepNum || displayStep > LOADING_STEPS.length;
            const active = displayStep === stepNum;
            return (
              <div key={i} className="flex items-center gap-3 py-2.5 px-1 text-[13px]">
                <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center text-[11px] shrink-0 transition-all ${
                  done ? "bg-success border-success text-white" : active ? "bg-primary border-primary text-white" : "border-border-strong text-text-3"
                }`}>
                  {done ? <i className="ti ti-check text-xs" /> : active ? <div className="w-2 h-2 border-[1.5px] border-white border-t-transparent rounded-full animate-spin-slow" /> : stepNum}
                </div>
                <span className={done || active ? "text-text font-medium" : "text-text-3"}>{label}</span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="text-center mt-5">
            <button onClick={() => window.location.reload()} className="text-accent text-sm cursor-pointer hover:underline">
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
