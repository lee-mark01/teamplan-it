import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#e8f4f8] flex flex-col animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-6">
          <span className="text-sm text-text-2 cursor-pointer hover:text-text transition-all">개인용</span>
          <span className="text-sm text-text-2 cursor-pointer hover:text-text transition-all">학교용</span>
        </div>
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium border border-primary rounded-[var(--radius)] hover:bg-primary hover:text-primary-text transition-all"
        >
          로그인
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-8 pb-12">
        <h1 className="text-[36px] font-bold tracking-tight mb-2 text-[#1a3a4a]">
          팀장 없는 팀플의 시작
        </h1>
        <p className="text-xl font-semibold tracking-tight mb-4 text-[#2a5a6a]">
          Teamplan-it
        </p>
        <p className="text-base text-[#4a7a8a] mb-8 max-w-[480px] leading-relaxed">
          팀장 자리, 더 이상 누구의 부담도 아닙니다.
          <br />
          TeamAI에게 외주하고, 모두가 동등한 팀원이 되어 보세요!
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-1.5 px-6 py-3.5 text-sm font-medium bg-[#2a5a6a] text-white rounded-full hover:bg-[#1a4a5a] transition-all"
        >
          새 프로젝트 시작하기
        </Link>
      </section>

      {/* Feature Cards */}
      <section className="bg-[#dceef4] py-16 px-8">
        <h2 className="text-2xl font-bold text-center mb-10 text-[#1a3a4a]">
          팀플래닛이 함께합니다.
        </h2>
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title="강점 기반 공평한 업무 배분"
            description="해당 팀 프로젝트에 성격에 맞는 전문적 조언 및 가이드라인을 제시해요."
            icon="chart-dots"
          />
          <FeatureCard
            title="팀플 일정 및 진척도 관리"
            description="AI가 직접 팀플 일정과 진척도 관리를 진행해줍니다."
            icon="calendar-stats"
          />
          <FeatureCard
            title="포기하지마! 동기부여"
            description="진행 상황과 단계별 조언, 필요할 땐 현실적인 피드백까지 제공해요."
            icon="message-circle"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-white rounded-[var(--radius-xl)] p-6 border border-border">
      <h3 className="text-base font-bold mb-2 text-[#1a3a4a]">{title}</h3>
      <p className="text-sm text-text-2 leading-relaxed mb-4">{description}</p>
      <div className="h-[140px] bg-surface-2 rounded-[var(--radius-lg)] flex items-center justify-center">
        <i className={`ti ti-${icon} text-3xl text-text-3`} />
      </div>
    </div>
  );
}
