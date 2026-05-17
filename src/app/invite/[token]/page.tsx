"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<"loading" | "show_invite" | "login_required" | "accepting" | "done" | "error">("loading");
  const [error, setError] = useState("");
  const [projectName, setProjectName] = useState("");
  const [inviteData, setInviteData] = useState<{ id: string; projectId: string } | null>(null);

  // 1단계: 서버 API로 초대 정보 확인 (비로그인도 가능)
  useEffect(() => {
    async function checkInvite() {
      const res = await fetch(`/api/invite/check?token=${token}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "유효하지 않은 초대 링크입니다");
        setStatus("error");
        return;
      }

      setProjectName(data.projectName);
      setInviteData({ id: data.id, projectId: data.projectId });

      // 로그인 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus("login_required");
      } else {
        setStatus("show_invite");
      }
    }
    checkInvite();
  }, [token]);

  // 2단계: 수락 처리
  async function handleAccept() {
    if (!inviteData) return;
    setStatus("accepting");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setStatus("login_required");
      return;
    }

    // 서버 API로 수락 처리
    const res = await fetch("/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId: user.id }),
    });

    if (res.ok) {
      setStatus("done");
      setTimeout(() => router.push(`/${inviteData.projectId}/members/me`), 1500);
    } else {
      const data = await res.json();
      setError(data.error || "참여 실패");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-[#edf5f8] flex items-center justify-center px-4 animate-fade-in">
      <div className="max-w-[400px] w-full text-center">
        <h1 className="text-2xl font-bold mb-2 text-[#1a3a4a]">Teamplan-it</h1>

        {status === "loading" && (
          <div className="mt-8">
            <div className="w-8 h-8 border-[3px] border-[#dceef4] border-t-[#2a5a6a] rounded-full animate-spin-slow mx-auto" />
            <p className="text-[#4a7a8a] text-sm mt-4">초대 확인 중...</p>
          </div>
        )}

        {status === "login_required" && (
          <div className="mt-8 bg-white border border-[#dceef4] rounded-2xl p-6">
            <p className="text-sm mb-4"><b>{projectName}</b>에 초대되었습니다</p>
            <p className="text-[#4a7a8a] text-sm mb-6">참여하려면 먼저 로그인해주세요</p>
            <Link
              href={`/login?redirect=/invite/${token}`}
              className="inline-block px-5 py-2.5 bg-[#2a5a6a] text-white rounded-xl text-sm font-medium hover:bg-[#1a4a5a] transition-all"
            >
              로그인하기
            </Link>
            <p className="text-xs text-[#8aabb8] mt-3">
              계정이 없으신가요? <Link href={`/signup?redirect=/invite/${token}`} className="text-[#2a5a6a] hover:underline">회원가입</Link>
            </p>
          </div>
        )}

        {status === "show_invite" && (
          <div className="mt-8 bg-white border border-[#dceef4] rounded-2xl p-6">
            <p className="text-sm mb-4"><b>{projectName}</b>에 초대되었습니다</p>
            <p className="text-[#4a7a8a] text-sm mb-6">참여하시겠습니까?</p>
            <button
              onClick={handleAccept}
              className="px-5 py-2.5 bg-[#2a5a6a] text-white rounded-xl text-sm font-medium hover:bg-[#1a4a5a] transition-all cursor-pointer"
            >
              프로젝트 참여하기
            </button>
          </div>
        )}

        {status === "accepting" && (
          <div className="mt-8">
            <div className="w-8 h-8 border-[3px] border-[#dceef4] border-t-[#2a5a6a] rounded-full animate-spin-slow mx-auto" />
            <p className="text-[#4a7a8a] text-sm mt-4">프로젝트에 참여하는 중...</p>
          </div>
        )}

        {status === "done" && (
          <div className="mt-8">
            <div className="w-12 h-12 bg-[#ecfdf5] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">✓</span>
            </div>
            <p className="text-sm font-medium">참여 완료!</p>
            <p className="text-[#4a7a8a] text-xs mt-1">대시보드로 이동합니다...</p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-8">
            <div className="w-12 h-12 bg-[#fef2f2] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">✕</span>
            </div>
            <p className="text-sm text-[#b91c1c]">{error}</p>
            <Link href="/" className="text-[#2a5a6a] text-sm mt-4 inline-block hover:underline">홈으로</Link>
          </div>
        )}
      </div>
    </div>
  );
}
