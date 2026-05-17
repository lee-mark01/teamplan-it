"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const COLORS = ["blue", "teal", "purple", "coral"];

interface MemberRow {
  id: string;
  display_name: string;
  color: string;
}

export default function InvitePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [emails, setEmails] = useState<string[]>([""]);
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("project_members")
        .select("id, display_name, color")
        .eq("project_id", projectId);
      if (data) setMembers(data);

      // 초대 링크: 서버 API로 생성
      const newToken = crypto.randomUUID();
      const res = await fetch("/api/invite/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, token: newToken }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(`${window.location.origin}/invite/${data.token}`);
      }
    }
    load();
  }, [projectId]);

  const addEmail = () => setEmails([...emails, ""]);
  const removeEmail = (idx: number) => setEmails(emails.filter((_, i) => i !== idx));
  const updateEmail = (idx: number, val: string) => {
    const next = [...emails];
    next[idx] = val;
    setEmails(next);
  };

  const handleInvite = async () => {
    setLoading(true);
    const validEmails = emails.filter((e) => e.trim() && e.includes("@"));

    for (const email of validEmails) {
      const token = crypto.randomUUID();
      await supabase.from("invitations").insert({
        project_id: projectId,
        email: email.trim(),
        token,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
      });

      // 이메일 발송 API 호출
      await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), token, projectId }),
      });
    }
    setLoading(false);
    router.push(`/${projectId}/members/me`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSkip = () => router.push(`/${projectId}/members/me`);

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-[640px] mx-auto">
        <h1 className="text-xl font-semibold mb-1">팀원 초대하기</h1>
        <p className="text-text-2 text-[13px] mb-2">
          함께 프로젝트를 진행 할 팀원의 이메일을 입력하세요.
        </p>
        <p className="text-text-3 text-[12px] mb-6">
          이메일이 확인되면 초대된 팀원은 각자 사전정보를 입력하게 됩니다.
        </p>

        {/* 기존 멤버 */}
        {members.length > 0 && (
          <div className="mb-6 space-y-2">
            {members.map((m, i) => {
              const colorMap: Record<string, string> = {
                blue: "bg-accent-bg text-accent-text",
                teal: "bg-teal-bg text-teal",
                purple: "bg-purple-bg text-purple",
                coral: "bg-coral-bg text-coral",
              };
              return (
                <div key={m.id} className="flex items-center gap-3 py-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${colorMap[m.color] || colorMap.blue}`}>
                    {m.display_name.charAt(0)}
                  </span>
                  <span className="text-sm font-medium">{m.display_name}</span>
                  {i === 0 && <span className="text-[11px] text-text-3">(나)</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* 이메일 입력 */}
        <div className="space-y-3 mb-4">
          {emails.map((email, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                ["bg-teal-bg text-teal", "bg-purple-bg text-purple", "bg-coral-bg text-coral"][i % 3]
              }`}>
                {email.charAt(0) || "?"}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => updateEmail(i, e.target.value)}
                placeholder="email@example.com"
                className="flex-1 bg-surface border border-border-strong rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/10 transition-all"
              />
              {emails.length > 1 && (
                <button type="button" onClick={() => removeEmail(i)} className="text-text-3 hover:text-danger cursor-pointer">
                  <i className="ti ti-minus text-lg" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addEmail}
          className="text-accent text-[13px] hover:underline mb-6 block cursor-pointer"
        >
          + 팀원 초대하기
        </button>

        {/* 초대 링크 */}
        <div className="mb-8">
          <label className="block text-xs font-medium text-text-2 mb-1.5">초대 링크</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 bg-surface-2 border border-border rounded-[var(--radius)] px-3 py-2.5 text-[13px] text-text-2"
            />
            <button
              type="button"
              onClick={copyLink}
              className="px-3 py-2 bg-surface-2 rounded-[var(--radius)] hover:bg-surface transition-all cursor-pointer"
            >
              <i className={`ti ti-${copied ? "check" : "copy"} text-base ${copied ? "text-success" : "text-text-2"}`} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push("/projects/new")}
            className="px-4 py-2.5 text-sm text-text-2 hover:text-text transition-all cursor-pointer"
          >
            <i className="ti ti-arrow-left" /> 이전
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2.5 text-sm text-text-2 hover:text-text transition-all cursor-pointer"
            >
              건너뛰기
            </button>
            <button
              type="button"
              onClick={handleInvite}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-text rounded-[var(--radius)] hover:bg-[#404040] transition-all disabled:opacity-50"
            >
              {loading ? "초대 중..." : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
