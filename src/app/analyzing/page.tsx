"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LOADING_STEPS } from "@/lib/mock-data";
import { loadProject, loadMembers, saveResult } from "@/lib/store";

export default function AnalyzingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  const apiDoneRef = useRef(false);
  const animDoneRef = useRef(false);
  const navigatedRef = useRef(false);
  const apiCalledRef = useRef(false);

  const tryNavigate = useCallback(() => {
    if (apiDoneRef.current && animDoneRef.current && !navigatedRef.current) {
      navigatedRef.current = true;
      setCurrentStep(LOADING_STEPS.length + 1);
      setTimeout(() => router.push("/board"), 400);
    }
  }, [router]);

  // Animation
  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);
      if (step >= LOADING_STEPS.length) {
        clearInterval(interval);
        animDoneRef.current = true;
        if (!apiDoneRef.current) {
          setWaiting(true);
        }
        tryNavigate();
      }
    }, 900);
    return () => clearInterval(interval);
  }, [tryNavigate]);

  // API call
  useEffect(() => {
    if (apiCalledRef.current) return;
    apiCalledRef.current = true;

    const project = loadProject();
    const members = loadMembers();

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project, members }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "API 오류");
        }
        return res.json();
      })
      .then((data) => {
        saveResult(data);
        apiDoneRef.current = true;
        setWaiting(false);
        tryNavigate();
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [tryNavigate]);

  const displayStep = waiting ? LOADING_STEPS.length : currentStep;

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-10 animate-fade-in">
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
            {error ? "분석 중 오류가 발생했어요" : "AI가 분석하고 있어요"}
          </h2>
          {error ? (
            <p className="text-danger text-[13px]">{error}</p>
          ) : (
            <p className="text-text-2 text-[13px]">
              {waiting ? "거의 다 됐어요..." : "Gemini가 과업을 분해하고 있습니다"}
            </p>
          )}
        </div>

        <div className="space-y-0">
          {LOADING_STEPS.map((label, i) => {
            const stepNum = i + 1;
            const done = displayStep > stepNum || displayStep > LOADING_STEPS.length;
            const active = displayStep === stepNum;

            return (
              <div key={i} className="flex items-center gap-3 py-2.5 px-1 text-[13px]">
                <div
                  className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center text-[11px] shrink-0 transition-all ${
                    done
                      ? "bg-success border-success text-white"
                      : active
                      ? "bg-primary border-primary text-white"
                      : "border-border-strong text-text-3"
                  }`}
                >
                  {done ? (
                    <i className="ti ti-check text-xs" />
                  ) : active ? (
                    <div className="w-2 h-2 border-[1.5px] border-white border-t-transparent rounded-full animate-spin-slow" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span className={done || active ? "text-text font-medium" : "text-text-3"}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-5 flex flex-col gap-2">
          {error && (
            <button
              onClick={() => window.location.reload()}
              className="text-accent text-sm cursor-pointer hover:underline"
            >
              다시 시도
            </button>
          )}
          <button
            onClick={() => router.push("/board")}
            className="text-text-2 text-sm cursor-pointer hover:text-text"
          >
            {error ? "mock 데이터로 보기 →" : "건너뛰고 결과 보기 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
