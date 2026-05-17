import { GoogleGenAI } from "@google/genai";
import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ─── Rate limiter ───────────────────────
const rateMap = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateMap.get(ip) || []).filter((t) => now - t < 60_000);
  if (timestamps.length >= 5) return true;
  timestamps.push(now);
  rateMap.set(ip, timestamps);
  return false;
}

function cleanGeminiJson(text: string): string {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // 제어문자 이스케이프
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
  result = result.replace(/,\s*([}\]])/g, "$1");

  // Unterminated string 복구: 열린 문자열 닫기
  if (inStr) {
    result += '"';
  }

  // 닫히지 않은 브래킷 복구
  let opens = 0;
  let closes = 0;
  let inStr2 = false;
  let esc2 = false;
  for (const c of result) {
    if (esc2) { esc2 = false; continue; }
    if (c === "\\") { esc2 = true; continue; }
    if (c === '"') { inStr2 = !inStr2; continue; }
    if (!inStr2) {
      if (c === "{" || c === "[") opens++;
      if (c === "}" || c === "]") closes++;
    }
  }

  // 부족한 닫는 브래킷 추가
  // 마지막 열린 구조 파악해서 역순으로 닫기
  const stack: string[] = [];
  inStr2 = false;
  esc2 = false;
  for (const c of result) {
    if (esc2) { esc2 = false; continue; }
    if (c === "\\") { esc2 = true; continue; }
    if (c === '"') { inStr2 = !inStr2; continue; }
    if (!inStr2) {
      if (c === "{") stack.push("}");
      else if (c === "[") stack.push("]");
      else if (c === "}" || c === "]") stack.pop();
    }
  }
  while (stack.length > 0) {
    result += stack.pop();
  }

  return result;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 1분 후 다시 시도해주세요." }, { status: 429 });
  }

  const body = await request.json();
  const { projectId } = body;

  // 레거시 지원: projectId 없으면 기존 방식 (sessionStorage 모드)
  if (!projectId) {
    return NextResponse.json({ error: "projectId 필요" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (!project) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });

  const { data: members } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at");
  if (!members || members.length === 0) {
    return NextResponse.json({ error: "팀원 정보가 필요합니다" }, { status: 400 });
  }

  const startDate = project.start_date || new Date().toISOString().split("T")[0];
  const totalDays = Math.ceil((new Date(project.end_date).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const colorOrder = ["blue", "teal", "purple", "coral"];

  const memberList = members.map((m, i) => ({
    name: m.display_name,
    major: m.major_or_part || "미입력",
    strengths: m.strengths?.join(", ") || "미입력",
    timeSlots: m.time_slots?.join(", ") || "미입력",
    hours: m.hours_per_week || "미입력",
    color: m.color || colorOrder[i % 4],
  }));

  const prompt = `당신은 팀 프로젝트 매니지먼트 전문가입니다. 한국어로 답변하세요.

프로젝트: ${project.name}
설명: ${project.description || "없음"}
목표: ${project.goal || "없음"}
산출물: ${project.deliverable || "없음"}
기간: ${startDate} ~ ${project.end_date} (${totalDays}일)
제약: ${project.constraints || "없음"}

팀원:
${memberList.map((m, i) => `${i + 1}. ${m.name} (${m.major}) — 강점: ${m.strengths}, 시간대: ${m.timeSlots}, 주당: ${m.hours}`).join("\n")}

과업을 분해하고, 각 팀원에게 배정하세요. 아래 JSON으로만 응답:
{
  "nodes": [{ "id": "영문snake", "label": "과업명 (한국어)", "day": "Day N", "assignee": "담당자 이름 1명만", "category": "planning|design|backend|frontend|integration|qa|presentation|research|content", "dependsOn": ["선행과업id"] }],
  "timelines": [{ "memberName": "풀네임", "memberInitial": "성1글자", "memberColor": "blue", "bars": [{ "label": "반드시 nodes의 label과 100% 동일한 문자열을 사용. 절대 축약하지 마세요.", "startPercent": 0, "widthPercent": 20, "color": "#hex" }] }],
  "checklists": { "과업id": ["체크리스트1", "체크리스트2", "체크리스트3"] },
  "comment": "배정 이유 설명. **굵게** 가능. 문단은 \\n\\n으로 구분."
}

규칙:
- 과업 수: 팀원수 × 1.5~2.5개
- DAG (순환 없음)
- 각 과업의 assignee는 반드시 1명만 (공동 작업이면 과업을 분리)
- timelines의 bars.label은 nodes의 label과 정확히 같은 전체 과업명 사용 (축약 금지)
- memberColor: ${memberList.map((m) => `${m.name}="${m.color}"`).join(", ")}
- startPercent/widthPercent: 0~100 (전체 기간 대비 %)
- 한 팀원의 bars가 시간순으로 겹치면 안 됨 (이전 바의 start+width <= 다음 바의 start)
- 색상: planning=#6d28d9, design=#0f766e, backend=#2563eb, frontend=#c2410c, integration=#57534e, qa=#b45309, presentation=#047857
- 각 과업에 체크리스트 3~5개
- 강점·시간대 고려해서 배정 이유 설명`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    // 프로젝트 첨부 파일이 있으면 Gemini에 같이 전송 (여러 개 지원)
    const parts: any[] = [{ text: prompt }];
    const MIME_MAP: Record<string, string> = {
      pdf: "application/pdf", txt: "text/plain", html: "text/html", css: "text/css",
      csv: "text/csv", md: "text/markdown", json: "application/json",
      js: "text/javascript", ts: "text/javascript", py: "text/x-python",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
    };
    if (project.document_url) {
      const paths = project.document_url.split(",");
      for (const path of paths) {
        try {
          const { data: fileData } = await supabase.storage
            .from("project-files")
            .download(path.trim());
          if (fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            const ext = path.trim().split(".").pop()?.toLowerCase() || "";
            const mimeType = MIME_MAP[ext];
            if (mimeType) {
              parts.unshift({ inlineData: { mimeType, data: buffer.toString("base64") } });
            }
          }
        } catch (e) {
          console.warn("첨부 파일 로드 실패 (무시):", path, e);
        }
      }
    }

    // responseSchema로 JSON 구조 강제
    const responseSchema = {
      type: "object" as const,
      properties: {
        nodes: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              id: { type: "string" as const },
              label: { type: "string" as const },
              day: { type: "string" as const },
              assignee: { type: "string" as const },
              category: { type: "string" as const },
              dependsOn: { type: "array" as const, items: { type: "string" as const } },
            },
            required: ["id", "label", "day", "assignee", "category", "dependsOn"] as const,
          },
        },
        timelines: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              memberName: { type: "string" as const },
              memberInitial: { type: "string" as const },
              memberColor: { type: "string" as const },
              bars: {
                type: "array" as const,
                items: {
                  type: "object" as const,
                  properties: {
                    label: { type: "string" as const },
                    startPercent: { type: "number" as const },
                    widthPercent: { type: "number" as const },
                    color: { type: "string" as const },
                  },
                  required: ["label", "startPercent", "widthPercent", "color"] as const,
                },
              },
            },
            required: ["memberName", "memberInitial", "memberColor", "bars"] as const,
          },
        },
        comment: { type: "string" as const },
      },
      required: ["nodes", "timelines", "comment"] as const,
    };

    // 최대 3회 재시도
    let parsed: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config: {
          temperature: attempt === 0 ? 0.7 : 0.3,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      // finishReason 체크
      const candidate = (response as any).candidates?.[0];
      if (candidate?.finishReason && candidate.finishReason !== "STOP") {
        console.warn(`Gemini 출력 미완료 (시도 ${attempt + 1}): ${candidate.finishReason}`);
        if (attempt === 2) throw new Error(`AI 출력이 잘렸습니다 (${candidate.finishReason})`);
        continue;
      }

      try {
        parsed = JSON.parse(cleanGeminiJson(response.text || ""));
        if (parsed.nodes && parsed.timelines) break;
      } catch (e) {
        console.warn(`Gemini JSON 파싱 실패 (시도 ${attempt + 1}):`, e);
        if (attempt === 2) throw e;
      }
    }

    // 후처리: nodes에서 timelines를 재구성 (Gemini 축약 문제 해결)
    if (parsed.nodes && parsed.timelines) {
      const totalDaysNum = totalDays || 14;
      // 멤버별로 nodes 그룹핑
      const memberMap = new Map<string, any[]>();
      for (const node of parsed.nodes) {
        const assignee = node.assignee || "미배정";
        if (!memberMap.has(assignee)) memberMap.set(assignee, []);
        memberMap.get(assignee)!.push(node);
      }

      // 기존 timelines의 멤버 정보(color, initial) 보존
      const tlInfoMap = new Map<string, any>();
      for (const tl of parsed.timelines) {
        tlInfoMap.set(tl.memberName, { memberInitial: tl.memberInitial, memberColor: tl.memberColor });
      }

      const CATEGORY_COLORS: Record<string, string> = {
        planning: "#6d28d9", design: "#0f766e", backend: "#2563eb", frontend: "#c2410c",
        integration: "#57534e", qa: "#b45309", presentation: "#047857", research: "#6d28d9", content: "#0f766e"
      };

      parsed.timelines = Array.from(memberMap.entries()).map(([name, mnodes]) => {
        const info = tlInfoMap.get(name) || { memberInitial: name.charAt(0), memberColor: "blue" };

        // Day 파싱: "Day 1-3" → start=1, end=3
        const bars = mnodes.map((n: any) => {
          const dayMatch = n.day?.match(/Day\s*(\d+)(?:\s*-\s*(\d+))?/);
          const dayStart = dayMatch ? parseInt(dayMatch[1]) : 1;
          const dayEnd = dayMatch && dayMatch[2] ? parseInt(dayMatch[2]) : dayStart;
          return {
            label: n.label,
            startPercent: Math.round(((dayStart - 1) / totalDaysNum) * 100),
            widthPercent: Math.max(5, Math.round(((dayEnd - dayStart + 1) / totalDaysNum) * 100)),
            color: CATEGORY_COLORS[n.category] || "#57534e",
          };
        }).sort((a: any, b: any) => a.startPercent - b.startPercent);

        // 겹침 방지
        for (let i = 1; i < bars.length; i++) {
          const prevEnd = bars[i - 1].startPercent + bars[i - 1].widthPercent;
          if (prevEnd > bars[i].startPercent) {
            bars[i].startPercent = prevEnd;
          }
        }

        return { memberName: name, ...info, bars };
      });
    }

    // checklists가 없으면 각 과업별로 기본 체크리스트 생성
    if (!parsed.checklists || Object.keys(parsed.checklists).length === 0) {
      parsed.checklists = {};
      for (const node of parsed.nodes) {
        parsed.checklists[node.id] = [
          `${node.label} 자료 조사 및 준비`,
          `${node.label} 초안 작성`,
          `${node.label} 검토 및 수정`,
        ];
      }
    }

    // 이전 snapshot 비활성화 + 새 snapshot 저장
    await supabase.from("analysis_snapshots").update({ is_active: false }).eq("project_id", projectId).eq("is_active", true);
    await supabase.from("analysis_snapshots").insert({ project_id: projectId, result_json: parsed, is_active: true });

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("Analyze error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI 분석 실패" }, { status: 500 });
  }
}
