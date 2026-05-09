import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "팀장 AI — 5분 안에 첫 회의를 끝냅니다",
  description: "AI에게 팀장을 외주하고, 모두가 동등한 팀원이 되세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.5.0/dist/tabler-icons.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
