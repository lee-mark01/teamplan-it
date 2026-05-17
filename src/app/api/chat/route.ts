import { GoogleGenAI } from "@google/genai";
import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  let projectId: string;
  let message: string;
  let senderId: string | null = null;
  let fileBase64: string | null = null;
  let fileMimeType: string | null = null;
  let fileName: string | null = null;

  // FormData (파일 첨부) 또는 JSON
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    projectId = formData.get("projectId") as string;
    message = formData.get("message") as string || "";
    senderId = formData.get("senderId") as string || null;
    const file = formData.get("file") as File | null;
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      fileBase64 = buffer.toString("base64");
      fileMimeType = file.type;
      fileName = file.name;
    }
  } else {
    const body = await request.json();
    projectId = body.projectId;
    message = body.message;
    senderId = body.senderId;
  }

  if (!projectId || (!message && !fileBase64)) {
    return NextResponse.json({ error: "projectId와 message 필요" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // 컨텍스트 로드
  const { data: project } = await supabase.from("projects").select("name, description, start_date, end_date").eq("id", projectId).single();
  const { data: members } = await supabase.from("project_members").select("id, display_name, strengths, hours_per_week").eq("project_id", projectId);
  const { data: tasks } = await supabase.from("tasks").select("id, label, progress, status, assignee_id, updated_at").eq("project_id", projectId);
  const { data: checklists } = await supabase.from("task_checklists").select("id, content, is_completed, task_id").in("task_id", tasks?.map((t) => t.id) || []);
  const { data: history } = await supabase.from("chat_messages").select("role, content").eq("project_id", projectId).order("created_at", { ascending: false }).limit(15);

  // 파일 업로드 시 storage에 저장
  if (fileBase64 && fileName) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${projectId}/chat_${Date.now()}_${safeName}`;
    const buffer = Buffer.from(fileBase64, "base64");
    await supabase.storage.from("project-files").upload(path, buffer, { contentType: fileMimeType || "application/octet-stream" });
    await supabase.from("files").insert({ project_id: projectId, uploader_id: senderId, file_name: fileName, storage_path: path, mime_type: fileMimeType, size_bytes: buffer.length });
  }

  // 발신자 이름 조회
  let senderName = "알 수 없는 팀원";
  if (senderId) {
    const senderMember = members?.find((m) => m.id === senderId);
    if (senderMember) {
      senderName = senderMember.display_name;
    } else {
      // project_members.user_id로 매칭
      const { data: senderProfile } = await supabase
        .from("project_members")
        .select("display_name")
        .eq("project_id", projectId)
        .eq("user_id", senderId)
        .single();
      if (senderProfile) senderName = senderProfile.display_name;
    }
  }

  // 유저 메시지 저장
  const userContent = fileName ? `[파일 첨부: ${fileName}] ${message}` : message;
  await supabase.from("chat_messages").insert({ project_id: projectId, sender_id: senderId, role: "user", content: userContent });

  // 컨텍스트 구성
  const memberMap = new Map(members?.map((m) => [m.id, m.display_name]) || []);

  const taskSummary = tasks?.map((t) => {
    const taskChecklists = checklists?.filter((c) => c.task_id === t.id) || [];
    const doneCount = taskChecklists.filter((c) => c.is_completed).length;
    const checklistStr = taskChecklists.length > 0 ? ` (체크리스트: ${doneCount}/${taskChecklists.length})` : "";
    return `- ${t.label}: ${t.progress}% (${t.status}) [${memberMap.get(t.assignee_id) || "미배정"}]${checklistStr}`;
  }).join("\n") || "없음";

  // 감정 트리거 감지
  const emotionTriggers: string[] = [];
  if (tasks) {
    for (const t of tasks) {
      // 3일 이상 진행 0%인 과업
      if (t.progress === 0 && t.updated_at) {
        const daysSinceUpdate = (Date.now() - new Date(t.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 3) {
          const assignee = memberMap.get(t.assignee_id) || "미배정";
          emotionTriggers.push(`${assignee}님의 "${t.label}" 과업이 ${Math.floor(daysSinceUpdate)}일째 진행 0%입니다.`);
        }
      }
    }
  }

  const totalDays = project ? Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date || Date.now()).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const daysLeft = project ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  const systemPrompt = `당신은 "Teamplan-it" AI 매니저입니다. 팀 프로젝트를 관리하고 팀원들을 돕습니다.

현재 대화 상대: **${senderName}**
(이 사람의 이름을 불러주며 대화하세요. 이 사람에게 배정된 과업을 중심으로 답변하세요.)

프로젝트: ${project?.name || ""}
설명: ${project?.description || ""}
기간: ${project?.start_date || "미정"} ~ ${project?.end_date || "미정"} (총 ${totalDays}일, 남은 일수: ${daysLeft}일)
팀원: ${members?.map((m) => `${m.display_name} (강점: ${m.strengths?.join(",") || "미입력"}, 주당: ${m.hours_per_week || "미입력"})`).join(" / ") || "없음"}

현재 과업 현황:
${taskSummary}

${emotionTriggers.length > 0 ? `⚠️ 감정 트리거 감지:\n${emotionTriggers.join("\n")}\n위 상황을 부드럽게 언급하고 팀원을 격려해주세요.\n` : ""}

규칙:
1. 한국어로 친근하고 따뜻하게 답변
2. 팀원이 과업 완료를 보고하면 축하하고 다음 할 일 안내
3. 팀원이 어려움을 호소하면 공감하고 실질적 조언 제공
4. 파일이 첨부되면 내용을 분석하고 구체적 피드백 제공
5. 진행 상황 질문에는 현재 과업 현황을 기반으로 상세히 답변
6. 지연되는 과업이 있으면 부드럽게 알리고 해결 방안 제안
7. 응답 끝에 진척도나 체크리스트 변경이 필요하면 다음 태그를 포함:
   [PROGRESS_UPDATE]{"task_label": "과업명", "progress": 숫자}[/PROGRESS_UPDATE]
   [CHECKLIST_UPDATE]{"checklist_content": "체크리스트 항목 내용", "is_completed": true}[/CHECKLIST_UPDATE]
   - 팀원이 "XX 끝났어", "XX 완료" 등 과업 완료를 보고하면 progress를 100으로
   - "XX 절반 했어", "XX 50%" 등이면 해당 수치로
   - 파일 첨부 + 긍정적 피드백이면 5~10% 올려주기
   - 체크리스트 항목 완료 보고 시 CHECKLIST_UPDATE 태그 사용
   - 여러 항목이면 태그를 여러 번 사용`;

  const chatHistory = (history || []).reverse()
    .filter((h) => h.role === "user" || h.role === "assistant")
    .map((h) => ({
      role: (h.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: h.content }],
    }));

  // Gemini 요청 구성
  const userParts: any[] = [];
  if (fileBase64 && fileMimeType) {
    userParts.push({ inlineData: { mimeType: fileMimeType, data: fileBase64 } });
  }
  userParts.push({ text: message || "첨부된 파일을 분석해주세요." });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [...chatHistory, { role: "user", parts: userParts }],
      config: { systemInstruction: systemPrompt, temperature: 0.8, maxOutputTokens: 2048 },
    });

    let aiText = response.text || "죄송합니다, 응답을 생성할 수 없었어요.";

    // 진척도 업데이트 파싱 (여러 개 지원)
    const progressUpdates: { taskLabel: string; progress: number }[] = [];
    const progressMatches = aiText.matchAll(/\[PROGRESS_UPDATE\]([\s\S]*?)\[\/PROGRESS_UPDATE\]/g);
    for (const pm of progressMatches) {
      try {
        const update = JSON.parse(pm[1]);
        const task = tasks?.find((t) => t.label === update.task_label);
        if (task) {
          const newProgress = Math.min(100, Math.max(0, update.progress));
          await supabase.from("tasks").update({
            progress: newProgress,
            status: newProgress === 100 ? "done" : newProgress > 0 ? "in_progress" : "todo",
          }).eq("id", task.id);
          progressUpdates.push({ taskLabel: update.task_label, progress: newProgress });
        }
      } catch {}
    }
    aiText = aiText.replace(/\[PROGRESS_UPDATE\][\s\S]*?\[\/PROGRESS_UPDATE\]/g, "").trim();
    const progressUpdate = progressUpdates.length > 0 ? progressUpdates[0] : null;

    // 체크리스트 업데이트 파싱
    const checklistUpdates: { content: string; completed: boolean }[] = [];
    const clMatches = aiText.matchAll(/\[CHECKLIST_UPDATE\]([\s\S]*?)\[\/CHECKLIST_UPDATE\]/g);
    for (const m of clMatches) {
      try {
        const update = JSON.parse(m[1]);
        // 체크리스트 항목 찾기 (부분 매칭)
        const cl = checklists?.find((c) =>
          c.content === update.checklist_content ||
          c.content.includes(update.checklist_content) ||
          update.checklist_content.includes(c.content)
        );
        if (cl) {
          await supabase.from("task_checklists").update({
            is_completed: update.is_completed,
            completed_at: update.is_completed ? new Date().toISOString() : null,
          }).eq("id", cl.id);
          checklistUpdates.push({ content: cl.content, completed: update.is_completed });

          // 해당 과업의 진행률 자동 계산
          const taskChecklists = checklists?.filter((c2) => c2.task_id === cl.task_id) || [];
          const updatedList = taskChecklists.map((c2) => c2.id === cl.id ? { ...c2, is_completed: update.is_completed } : c2);
          const doneCount = updatedList.filter((c2) => c2.is_completed).length;
          const newProgress = Math.round((doneCount / updatedList.length) * 100);
          await supabase.from("tasks").update({
            progress: newProgress,
            status: newProgress === 100 ? "done" : newProgress > 0 ? "in_progress" : "todo",
          }).eq("id", cl.task_id);
        }
      } catch {}
    }
    aiText = aiText.replace(/\[CHECKLIST_UPDATE\][\s\S]*?\[\/CHECKLIST_UPDATE\]/g, "").trim();

    // AI 응답 저장
    const metadata: any = {};
    if (progressUpdate) metadata.progressUpdate = progressUpdate;
    if (checklistUpdates.length > 0) metadata.checklistUpdates = checklistUpdates;

    await supabase.from("chat_messages").insert({
      project_id: projectId,
      role: "assistant",
      content: aiText,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    });

    return NextResponse.json({ message: aiText, progressUpdate, progressUpdates, checklistUpdates });
  } catch (err: unknown) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "채팅 실패" }, { status: 500 });
  }
}
