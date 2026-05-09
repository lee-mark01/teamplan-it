import Link from "next/link";
import { Badge } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-center px-10 animate-fade-in">
      <Badge variant="accent" className="mb-5">
        <i className="ti ti-sparkles" /> AI 팀장
      </Badge>

      <h1 className="text-[28px] font-semibold tracking-tight mb-4 max-w-[560px] leading-tight">
        5분 안에 첫 회의를 끝냅니다
      </h1>

      <p className="text-base text-text-2 mb-8 max-w-[480px] leading-relaxed">
        팀장 자리, 더 이상 누구의 부담도 아닙니다.
        <br />
        AI에게 외주하고, 모두가 동등한 팀원이 되세요.
      </p>

      <Link
        href="/new"
        className="inline-flex items-center gap-1.5 px-5 py-3 text-sm font-medium bg-primary text-primary-text rounded-[var(--radius)] hover:bg-[#404040] transition-all"
      >
        시작하기 <i className="ti ti-arrow-right" />
      </Link>

      <div className="mt-12 flex gap-8 text-xs text-text-3">
        <span>
          <i className="ti ti-check text-success" /> 무료 시작
        </span>
        <span>
          <i className="ti ti-check text-success" /> 한국어 특화
        </span>
        <span>
          <i className="ti ti-check text-success" /> AI 과업 분해
        </span>
      </div>
    </div>
  );
}
