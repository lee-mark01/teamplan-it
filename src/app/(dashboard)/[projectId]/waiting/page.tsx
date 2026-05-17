"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface MemberStatus {
  id: string;
  display_name: string;
  color: string;
  has_info: boolean; // 강점 등 정보를 입력했는지
}

const COLOR_MAP: Record<string, string> = {
  blue: "bg-accent-bg text-accent-text",
  teal: "bg-teal-bg text-teal",
  purple: "bg-purple-bg text-purple",
  coral: "bg-coral-bg text-coral",
};

export default function WaitingPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [projectName, setProjectName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadStatus() {
    const { data: project } = await supabase
      .from("projects")
      .select("name, owner_id")
      .eq("id", projectId)
      .single();
    if (project) {
      setProjectName(project.name);
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwner(project.owner_id === user?.id);
    }

    const { data: memberData } = await supabase
      .from("project_members")
      .select("id, display_name, color, info_completed")
      .eq("project_id", projectId)
      .order("created_at");

    if (memberData) {
      setMembers(memberData.map((m) => ({
        id: m.id,
        display_name: m.display_name,
        color: m.color || "blue",
        has_info: m.info_completed === true,
      })));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStatus();

    // 5초마다 폴링
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const totalMembers = members.length;
  const readyMembers = members.filter((m) => m.has_info).length;
  const allReady = totalMembers > 0 && readyMembers === totalMembers;

  // 전원 완료 시: 모두 분석 페이지로 (owner만 API 호출, 팀원은 폴링)
  useEffect(() => {
    if (allReady && totalMembers >= 1) {
      const timer = setTimeout(() => {
        router.push(`/${projectId}/analyzing`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [allReady, totalMembers, projectId, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin-slow" /></div>;
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[500px] mx-auto text-center">
        <h1 className="text-xl font-semibold mb-2">팀원 정보 입력 대기 중</h1>
        <p className="text-text-2 text-[13px] mb-8">
          <b>{projectName}</b> — 모든 팀원이 정보를 입력하면 AI 분석이 시작됩니다.
        </p>

        {/* 진행 현황 */}
        <div className="bg-white border border-border rounded-[var(--radius-lg)] p-6 mb-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-3xl font-bold text-primary">{readyMembers}</span>
            <span className="text-text-3 text-lg">/</span>
            <span className="text-3xl font-bold text-text-3">{totalMembers}</span>
            <span className="text-sm text-text-2 ml-2">명 완료</span>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full h-2 bg-surface-2 rounded-full mb-6">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${totalMembers > 0 ? (readyMembers / totalMembers) * 100 : 0}%` }}
            />
          </div>

          {/* 멤버 목록 */}
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-[var(--radius)] bg-surface">
                <div className="flex items-center gap-2.5">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${COLOR_MAP[m.color] || COLOR_MAP.blue}`}>
                    {m.display_name.charAt(0)}
                  </span>
                  <span className="text-sm font-medium">{m.display_name}</span>
                </div>
                {m.has_info ? (
                  <span className="text-xs font-medium text-success bg-success-bg px-2.5 py-1 rounded-full">완료</span>
                ) : (
                  <span className="text-xs font-medium text-warning bg-warning-bg px-2.5 py-1 rounded-full">대기 중</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {allReady && totalMembers >= 2 ? (
          <div className="text-center">
            <div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin-slow mx-auto mb-3" />
            <p className="text-sm text-primary font-medium">모든 팀원이 준비됐습니다! AI 분석을 시작합니다...</p>
          </div>
        ) : (
          <>
            <p className="text-text-3 text-xs mb-4">초대 링크를 공유해서 팀원들이 정보를 입력하도록 안내하세요.</p>
            {isOwner && (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => router.push(`/${projectId}/invite`)}
                  className="px-4 py-2.5 text-sm border border-border-strong rounded-[var(--radius)] hover:bg-surface transition-all cursor-pointer"
                >
                  팀원 초대하기
                </button>
                {readyMembers >= 1 && (
                  <button
                    onClick={() => router.push(`/${projectId}/analyzing`)}
                    className="px-4 py-2.5 text-sm font-medium bg-primary text-primary-text rounded-[var(--radius)] hover:bg-[#1a4a5a] transition-all cursor-pointer"
                  >
                    지금 바로 분석 시작
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
