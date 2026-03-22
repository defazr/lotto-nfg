import type { Metadata } from "next";
import PrizeCalculator from "@/components/PrizeCalculator";
import AdBanner from "@/components/AdBanner";

export const metadata: Metadata = {
  title: "로또 실수령액 계산기 | 당첨금 세금 계산",
  description: "로또 당첨금 실수령액을 바로 계산하세요. 1등~5등 세금(22%/33%) 자동 계산, 실효세율 확인까지 한번에.",
  alternates: {
    canonical: "https://lotto.newsforgreens.com/calculator/",
  },
  openGraph: {
    title: "로또 실수령액 계산기 | 당첨금 세금 계산",
    description: "로또 당첨금 실수령액을 바로 계산하세요. 세금 22%/33% 자동 적용.",
    url: "https://lotto.newsforgreens.com/calculator/",
    type: "website",
    locale: "ko_KR",
    siteName: "LOTTO NFG",
    images: [
      {
        url: "https://lotto.newsforgreens.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "로또 실수령액 계산기",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://lotto.newsforgreens.com/og-image.jpg"],
  },
};

export default function CalculatorPage() {
  return (
    <div style={{ display: "grid", gap: "var(--space-lg)", gridTemplateColumns: "minmax(0, 1fr)" }}>
      <section className="card">
        <h1 className="pageTitle">로또 실수령액 계산기</h1>
        <p className="pageDesc">
          당첨금을 입력하면 세금과 실수령액을 바로 확인할 수 있습니다.
        </p>
      </section>

      <PrizeCalculator />

      {/* Ad Banner */}
      <AdBanner slot="2668974755" format="horizontal" />
    </div>
  );
}
