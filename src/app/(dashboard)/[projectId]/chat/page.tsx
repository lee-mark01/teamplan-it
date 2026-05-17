"use client";

import { use, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  progressUpdate?: { taskLabel: string; progress: number } | null;
  checklistUpdates?: { content: string; completed: boolean }[] | null;
}

function renderMarkdown(text: string) {
  // 줄 단위로 처리
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    let processed: React.ReactNode = line;

    // **볼드** 처리
    if (line.includes("**")) {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      processed = parts.map((part, j) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : part
      );
    }

    // ### 제목
    if (line.startsWith("### ")) {
      elements.push(<div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 8, marginBottom: 4 }}>{line.slice(4).replace(/\*\*/g, "")}</div>);
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(<div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 8, marginBottom: 4 }}>{line.slice(3).replace(/\*\*/g, "")}</div>);
      return;
    }

    // * 또는 - 리스트
    if (line.match(/^\s*[\*\-]\s+/)) {
      const indent = line.match(/^\s*/)?.[0].length || 0;
      const content = line.replace(/^\s*[\*\-]\s+/, "");
      const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part
      );
      elements.push(
        <div key={i} style={{ paddingLeft: Math.max(8, indent * 4), display: "flex", gap: 6, marginBottom: 2 }}>
          <span style={{ color: "#8aabb8" }}>•</span>
          <span>{parts}</span>
        </div>
      );
      return;
    }

    // --- 구분선
    if (line.trim() === "---") {
      elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #e4eff3", margin: "8px 0" }} />);
      return;
    }

    // 빈 줄
    if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 8 }} />);
      return;
    }

    // 일반 텍스트
    elements.push(<div key={i}>{processed}</div>);
  });

  return <>{elements}</>;
}

function ChatInner({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userIdRef = useRef<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (user) userIdRef.current = user.id;
    });

    sb.from("chat_messages")
      .select("role, content, metadata")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setMessages(
            data
              .filter((d) => d.role === "user" || d.role === "assistant")
              .map((d) => ({
                role: d.role as "user" | "assistant",
                content: d.content,
                progressUpdate: (d.metadata as any)?.progressUpdate || null,
              }))
          );
        }
      });
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    if ((!input.trim() && !file) || loading) return;

    const text = input.trim();
    const attachedFile = file;

    setInput("");
    setFile(null);

    const displayText = attachedFile ? `${text ? text + "\n" : ""}📎 ${attachedFile.name}` : text;
    setMessages((prev) => [...prev, { role: "user", content: displayText }]);
    setLoading(true);

    let aiContent = "오류가 발생했어요. 다시 시도해주세요.";
    let checklistUpdates: { content: string; completed: boolean }[] | null = null;
    let progressUpdate = null;

    try {
      let res: Response;
      if (attachedFile) {
        const fd = new FormData();
        fd.append("projectId", projectId);
        fd.append("message", text || "첨부된 파일을 분석해주세요.");
        fd.append("senderId", userIdRef.current || "");
        fd.append("file", attachedFile);
        res = await fetch("/api/chat", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, message: text, senderId: userIdRef.current }),
        });
      }
      const json = await res.json();
      if (json.message) aiContent = json.message;
      if (json.progressUpdate) progressUpdate = json.progressUpdate;
      checklistUpdates = json.checklistUpdates || null;
    } catch {}

    setMessages((prev) => [...prev, { role: "assistant", content: aiContent, progressUpdate, checklistUpdates }]);
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #e7e5e4", background: "white" }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>AI Chat</h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#a8a29e" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
            <p style={{ fontSize: 14 }}>AI에게 프로젝트에 대해 물어보세요</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>과업 진행 보고, 어려움 상담, 파일 피드백 요청 등</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                background: m.role === "user" ? "#2a5a6a" : "white",
                color: m.role === "user" ? "white" : "#1c1917",
                border: m.role === "user" ? "none" : "1px solid #e7e5e4",
                borderRadius: 16,
                padding: "12px 16px",
                maxWidth: "70%",
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
              </div>
            </div>
            {m.progressUpdate && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 4 }}>
                <div style={{ fontSize: 11, color: "#047857", background: "#ecfdf5", borderRadius: 8, padding: "4px 10px" }}>
                  ✅ {m.progressUpdate.taskLabel}: 진척도 {m.progressUpdate.progress}%로 업데이트됨
                </div>
              </div>
            )}
            {m.checklistUpdates && m.checklistUpdates.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 4 }}>
                <div style={{ fontSize: 11, color: "#047857", background: "#ecfdf5", borderRadius: 8, padding: "4px 10px" }}>
                  {m.checklistUpdates.map((cl, ci) => (
                    <div key={ci}>✅ 체크리스트 완료: {cl.content}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 16, padding: "12px 16px", fontSize: 13 }}>
              응답 생성 중...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #e7e5e4", background: "white" }}>
        {file && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 12px", background: "#f5f5f4", borderRadius: 8, fontSize: 12 }}>
            <span>📎 {file.name}</span>
            <button onClick={() => setFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8a29e", fontSize: 14 }}>✕</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: "8px", background: "none", border: "1px solid #d6d3d1", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#57534e", flexShrink: 0 }}
            title="파일 첨부"
          >
            📎
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
            placeholder="Teamplan-it 에게 물어보기"
            style={{ flex: 1, minWidth: 0, border: "1px solid #d6d3d1", borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none" }}
          />
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && !file)}
            style={{ padding: "10px 14px", background: loading || (!input.trim() && !file) ? "#a8a29e" : "#1c1917", color: "white", borderRadius: 10, border: "none", cursor: "pointer", flexShrink: 0, fontSize: 13 }}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <ChatInner projectId={projectId} />;
}
