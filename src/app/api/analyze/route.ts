import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `당신은 "팀장 AI"입니다. 대학생 팀 프로젝트의 과업을 분해하고, 팀원에게 배분하고, 타임라인을 짜는 전문가입니다.

## 입력
- 프로젝트 정보 (이름, 설명, 마감일, 산출물, 팀 인원)
- 팀원 목록 (이름, 강점/역할, 가용 시간, 선호도)

## 출력 규칙

반드시 아래 JSON 스키마를 따르는 **유효한 JSON만** 출력하세요. 설명 텍스트, 마크다운 코드 블록 없이 순수 JSON만.

{
  "nodes": [
    {
      "id": "고유ID (영문 snake_case)",
      "label": "과업 이름 (한국어, 2~4글자)",
      "day": "Day N (마감일)",
      "assignee": "담당자 이름 (성 빼고 이름만, 예: 민준)",
      "category": "planning | design | backend | frontend | integration | qa | presentation | research | content",
      "dependsOn": ["선행 과업 id 배열"]
    }
  ],
  "timelines": [
    {
      "memberName": "팀원 풀네임",
      "memberInitial": "성 1글자",
      "memberColor": "blue | teal | purple | coral",
      "bars": [
        {
          "label": "과업 약칭 (2~3글자)",
          "startPercent": 0~90,
          "widthPercent": 5~30,
          "color": "#hex색상"
        }
      ]
    }
  ],
  "comment": "AI 코멘트 (한국어, 3~4 문단을 <br><br>로 구분, **볼드** 가능, 왜 이렇게 분해했는지 설명. 절대로 실제 줄바꿈 문자를 사용하지 마세요. 문단 구분은 반드시 <br><br> 태그로.)"
}

## 분해 원칙

1. **과업 수**: 팀원 수 × 1.5 ~ 2.5 개 (4명이면 6~10개)
2. **의존성**: 반드시 DAG (순환 없음). 초반 기획/디자인 → 중반 개발 → 후반 통합/QA 흐름
3. **배분 기준**:
   - 강점에 맞는 과업 우선 배정
   - 가용 시간이 적은 사람은 적은 과업 or 짧은 과업
   - 선호도 반영 (싫다고 한 건 피함)
4. **타임라인**:
   - startPercent와 widthPercent는 전체 프로젝트 기간 대비 % (0~100)
   - 의존성 있으면 선행 과업 끝난 후 시작
   - 한 사람의 bar가 겹치면 안 됨
5. **색상 규칙**:
   - planning: #6d28d9, design: #0f766e, backend: #2563eb
   - frontend: #c2410c, integration: #57534e, qa: #b45309
   - presentation: #047857, research: #6d28d9, content: #0f766e
6. **memberColor 배정**: 첫 번째 팀원 blue, 두 번째 teal, 세 번째 purple, 네 번째 coral (5명 이상이면 순환)
7. **코멘트**: 배분 이유를 구체적으로. 팀원 이름 언급. 주의사항 포함.

## 예시 참고용 (4명, 2주, 웹앱)
- 컨셉 → 와이어프레임 → API 설계 / UI 디자인 (병렬) → 통합 → QA → 발표자료
- 기획 강점 → 컨셉, 백엔드 강점 → API, 디자인 강점 → 와이어프레임+UI

이 예시는 참고만. 실제 프로젝트와 팀원에 맞게 창의적으로 분해하세요.`;

// ─── Simple in-memory rate limiter ───────────────────────
const rateMap = new Map<string, number[]>();
const RATE_LIMIT = 5;       // max requests
const RATE_WINDOW = 60_000; // per 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  rateMap.set(ip, recent);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 1분 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { project, members } = body;

    if (!project || !members) {
      return NextResponse.json({ error: "project와 members 필드가 필요합니다" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY가 설정되지 않았습니다" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const userPrompt = `## 프로젝트 정보
- 이름: ${project.name}
- 설명: ${project.description}
- 마감일: ${project.deadline}
- 팀 인원: ${project.teamSize}명
- 산출물: ${project.deliverable}
${project.domain ? `- 도메인: ${project.domain}` : ""}
${project.constraints ? `- 제약: ${project.constraints}` : ""}

## 팀원 정보
${members.map((m: { name: string; role: string; availability: string; preference: string }, i: number) => `### ${i + 1}. ${m.name}
- 강점/역할: ${m.role}
- 가용 시간: ${m.availability}
- 선호도: ${m.preference}`).join("\n\n")}

위 정보를 바탕으로 과업을 분해하고 JSON으로 응답하세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text ?? "";

    // Gemini 2.5-flash can produce unescaped control chars in JSON strings.
    // Walk through chars and escape them properly.
    let inStr = false;
    let esc = false;
    let fixed = "";
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (esc) { fixed += c; esc = false; continue; }
      if (c === "\\") { fixed += c; esc = true; continue; }
      if (c === '"') { inStr = !inStr; fixed += c; continue; }
      if (inStr) {
        const code = c.charCodeAt(0);
        if (code < 0x20) {
          // Escape all control characters
          if (c === "\n") { fixed += "\\n"; }
          else if (c === "\r") { fixed += "\\r"; }
          else if (c === "\t") { fixed += "\\t"; }
          else { fixed += "\\u" + code.toString(16).padStart(4, "0"); }
          continue;
        }
      }
      fixed += c;
    }

    // Also fix trailing commas
    const cleaned = fixed.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Analyze API error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `분석 실패: ${message}` }, { status: 500 });
  }
}
