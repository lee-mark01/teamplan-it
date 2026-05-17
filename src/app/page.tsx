import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#e8f4f8] flex flex-col animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-end px-8 py-4">
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium border border-[#2a5a6a] text-[#2a5a6a] rounded-[var(--radius)] hover:bg-[#2a5a6a] hover:text-white transition-all"
        >
          로그인
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-8 pb-16">
        <h1 className="text-[32px] md:text-[40px] font-bold tracking-tight mb-3 text-[#1a3a4a]">
          팀장 없는 팀플의 시작
        </h1>
        <Image src="/logo.png" alt="Teamplan-it" width={220} height={40} className="mb-4" />
        <p className="text-sm md:text-base text-[#4a7a8a] mb-8 max-w-[460px] leading-relaxed">
          팀장 자리, 더 이상 누구의 부담도 아닙니다.
          <br />
          팀플래닛에게 외주하고, 모두가 동등한 팀원이 되어보세요!
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-1.5 px-7 py-3.5 text-sm font-medium bg-[#2a5a6a] text-white rounded-full hover:bg-[#1a4a5a] transition-all shadow-sm"
        >
          새 프로젝트 시작하기
        </Link>
      </section>

      {/* Feature Cards */}
      <section className="bg-[#dceef4] py-16 px-6 md:px-8">
        <h2 className="text-2xl md:text-[28px] font-bold text-center mb-12 text-[#1a3a4a]">
          팀플래닛이 함께합니다.
        </h2>
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title="강점 기반"
            subtitle="공평한 업무 배분"
            description="해당 팀 프로젝트에 성격에 맞는 전문적 조언 및 가이드라인을 제시해요."
            image="/feature-dashboard.png"
          />
          <FeatureCard
            title="팀플 일정 및"
            subtitle="진척도 관리"
            description="AI가 직접 팀플 일정과 진척도 관리를 진행해줍니다."
            image="/feature-comment.png"
          />
          <FeatureCard
            title="포기하지마!"
            subtitle="동기부여"
            description="진행 상황과 단계별 조언, 필요할 땐 현실적인 피드백까지 제공해요."
            image="/feature-chat.png"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, subtitle, description, image }: { title: string; subtitle: string; description: string; image: string }) {
  return (
    <div className="bg-white rounded-[16px] p-6 border border-[#d0e4ec]">
      <h3 className="text-[15px] font-bold text-[#1a3a4a] leading-tight">{title}</h3>
      <h3 className="text-[15px] font-bold text-[#1a3a4a] mb-2">{subtitle}</h3>
      <p className="text-[13px] text-[#4a7a8a] leading-relaxed mb-4">{description}</p>
      <div className="rounded-[12px] overflow-hidden border border-[#e4eff3]">
        <Image
          src={image}
          alt={title}
          width={400}
          height={250}
          className="w-full h-auto object-cover"
        />
      </div>
    </div>
  );
}
