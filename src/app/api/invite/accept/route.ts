import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { token, userId } = await request.json();
  if (!token || !userId) {
    return NextResponse.json({ error: "token과 userId 필요" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // 초대 확인
  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, project_id, status")
    .eq("token", token)
    .single();

  if (!invitation || invitation.status !== "pending") {
    return NextResponse.json({ error: "유효하지 않은 초대" }, { status: 400 });
  }

  // 이미 멤버인지 확인
  const { data: existing } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", invitation.project_id)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    // 프로필 가져오기
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    // 멤버 추가
    const { data: memberCount } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", invitation.project_id);

    const colorOrder = ["blue", "teal", "purple", "coral"];
    const color = colorOrder[(memberCount?.length || 0) % 4];

    await supabase.from("project_members").insert({
      project_id: invitation.project_id,
      user_id: userId,
      display_name: profile?.display_name || "팀원",
      role: "member",
      color,
      joined_at: new Date().toISOString(),
    });
  }

  // 초대 상태 업데이트 (이메일 초대만, 링크 초대는 유지)
  if (invitation.id) {
    const { data: inv } = await supabase
      .from("invitations")
      .select("email")
      .eq("id", invitation.id)
      .single();

    if (inv?.email) {
      await supabase.from("invitations").update({ status: "accepted" }).eq("id", invitation.id);
    }
  }

  return NextResponse.json({ success: true, projectId: invitation.project_id });
}
