import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, token, projectId } = await request.json();

  if (!email || !token) {
    return NextResponse.json({ error: "email과 token 필요" }, { status: 400 });
  }

  // Resend API 키가 없으면 스킵 (개발 중)
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log(`[Invite] Email would be sent to ${email} with token ${token}`);
    return NextResponse.json({ success: true, skipped: true });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    const inviteUrl = `${request.headers.get("origin") || "https://teamplanit.site"}/invite/${token}`;

    await resend.emails.send({
      from: "Teamplan-it <noreply@teamplanit.site>",
      to: email,
      subject: "Teamplan-it 프로젝트에 초대되었습니다",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a3a4a;">Teamplan-it</h2>
          <p>팀 프로젝트에 초대되었습니다.</p>
          <p>아래 링크를 클릭하여 참여하세요:</p>
          <a href="${inviteUrl}" style="display: inline-block; background: #2a5a6a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
            프로젝트 참여하기
          </a>
          <p style="color: #888; font-size: 12px;">이 링크는 7일 후 만료됩니다.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Email error:", err);
    return NextResponse.json({ error: "이메일 발송 실패" }, { status: 500 });
  }
}
