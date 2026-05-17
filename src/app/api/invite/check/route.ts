import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token 필요" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, project_id, status, expires_at")
    .eq("token", token)
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "유효하지 않은 초대" }, { status: 404 });
  }

  if (invitation.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 초대" }, { status: 400 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "만료된 초대" }, { status: 400 });
  }

  // 프로젝트 이름 가져오기
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", invitation.project_id)
    .single();

  return NextResponse.json({
    id: invitation.id,
    projectId: invitation.project_id,
    projectName: project?.name || "프로젝트",
  });
}
