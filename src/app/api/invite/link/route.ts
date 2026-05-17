import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { projectId, token } = await request.json();

  if (!projectId || !token) {
    return NextResponse.json({ error: "projectId와 token 필요" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // 기존 링크 초대가 있으면 재사용
  const { data: existing } = await supabase
    .from("invitations")
    .select("token")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .is("email", null)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ token: existing[0].token });
  }

  // 새로 생성
  const { error } = await supabase.from("invitations").insert({
    project_id: projectId,
    token,
    email: null,
  });

  if (error) {
    console.error("Invite link error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token });
}
