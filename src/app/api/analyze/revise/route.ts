import { GoogleGenAI } from "@google/genai";
import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function cleanGeminiJson(text: string): string {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  let result = "";
  let inStr = false;
  let esc = false;
  for (const c of cleaned) {
    if (esc) { result += c; esc = false; continue; }
    if (c === "\\") { result += c; esc = true; continue; }
    if (c === '"') { inStr = !inStr; result += c; continue; }
    if (inStr && c.charCodeAt(0) < 0x20) {
      if (c === "\n") result += "\\n";
      else if (c === "\r") result += "\\r";
      else if (c === "\t") result += "\\t";
      else result += " ";
      continue;
    }
    result += c;
  }
  return result.replace(/,\s*([}\]])/g, "$1");
}

export async function POST(request: NextRequest) {
  const { projectId, modificationRequest } = await request.json();
  if (!projectId || !modificationRequest) {
    return NextResponse.json({ error: "projectId와 modificationRequest 필요" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // 현재 active snapshot 로드
  const { data: snapshot } = await supabase
    .from("analysis_snapshots")
    .select("result_json")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .single();

  if (!snapshot) {
    return NextResponse.json({ error: "기존 분석 결과가 없습니다" }, { status: 404 });
  }

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
  const { data: members } = await supabase.from("project_members").select("*").eq("project_id", projectId).order("created_at");

  const prompt = `당신은 팀 프로젝트 매니지먼트 전문가입니다.

이전에 생성한 계획:
${JSON.stringify(snapshot.result_json, null, 2)}

프로젝트: ${project?.name || ""}
팀원: ${members?.map((m) => m.display_name).join(", ") || ""}

사용자의 수정 요청:
"${modificationRequest}"

위 수정 요청을 반영하여 기존 계획을 수정하세요. 동일한 JSON 형식으로 응답하세요.
nodes, timelines, checklists, comment 모두 포함. DAG 구조 유지.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(cleanGeminiJson(response.text || ""));

    await supabase.from("analysis_snapshots").update({ is_active: false }).eq("project_id", projectId).eq("is_active", true);
    await supabase.from("analysis_snapshots").insert({
      project_id: projectId,
      result_json: parsed,
      modification_request: modificationRequest,
      is_active: true,
    });

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("Revise error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "수정 실패" }, { status: 500 });
  }
}
