import Link from "next/link";
import type { Metadata } from "next";

import cacheData from "../../public/data/lotto_cache.json";
import historyData from "../../public/data/lotto_history.json";
import numberIndexData from "../../public/data/number_index.json";
import LatestDrawLive from "../components/LatestDrawLive";
import SearchBox from "../components/SearchBox";
import AdBanner from "../components/AdBanner";
import RecommendedNumbers from "../components/RecommendedNumbers";
import GuideLinks from "../components/GuideLinks";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://lotto.newsforgreens.com/",
  },
  openGraph: {
    title: "로또 당첨번호 조회 | 1회~최신 회차 통계 분석",
    description: "로또 6/45 당첨번호 조회, 번호별 출현 통계, 최근 트렌드 분석. 2002년 1회부터 최신 회차까지 모든 데이터를 무료로 확인하세요.",
    url: "https://lotto.newsforgreens.com/",
    type: "website",
    locale: "ko_KR",
    siteName: "LOTTO NFG",
    images: [
      {
        url: "https://lotto.newsforgreens.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "로또 당첨번호 조회",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://lotto.newsforgreens.com/og-image.jpg"],
  },
};

function getBallClass(n: number): string {
  if (n <= 10) return "ballYellow";
  if (n <= 20) return "ballBlue";
  if (n <= 30) return "ballRed";
  if (n <= 40) return "ballGray";
  return "ballGreen";
}

// FAQ data (8개)
const faqItems = [
  {
    question: "로또 당첨번호는 언제 업데이트되나요?",
    answer: "매주 토요일 저녁 8시 35분 동행복권 추첨 직후, 약 30분~1시간 이내에 자동으로 업데이트됩니다. 공식 결과는 동행복권 사이트에서 확인하실 수 있습니다."
  },
  {
    question: "이 사이트의 당첨번호 데이터는 정확한가요?",
    answer: "네, 1회부터 최신 회차까지 모든 당첨번호는 동행복권 공식 API와 웹사이트에서 수집한 데이터를 교차 검증하여 제공합니다."
  },
  {
    question: "로또 번호 추천은 믿을 만한가요?",
    answer: "추천 번호는 과거 통계 기반의 참고용 데이터일 뿐, 당첨을 보장하지 않습니다. 로또는 매 추첨마다 독립적인 확률 게임입니다."
  },
  {
    question: "자주 나온 번호가 더 유리한가요?",
    answer: "모든 번호는 동일한 1/45 확률로 추첨됩니다. 다만 통계적으로 자주 보인 패턴은 참고용으로 활용할 수 있습니다."
  },
  {
    question: "연속번호는 피하는 게 좋나요?",
    answer: "연속번호도 실제로 종종 등장합니다. 무조건 회피하는 것은 비합리적이며, 과거 데이터를 참고해 판단하시기 바랍니다."
  },
  {
    question: "홀짝 비율은 어느 정도가 흔한가요?",
    answer: "3:3 또는 4:2 비율이 자주 나타나며, 6:0이나 0:6 같은 극단적인 비율은 상대적으로 드뭅니다."
  },
  {
    question: "이번주 추천 3세트는 어떻게 만들었나요?",
    answer: "역대 출현 빈도 기준으로 HOT/MID/COLD 번호를 혼합하고, 홀짝 비율과 합계 범위를 검증하여 생성합니다."
  },
  {
    question: "번호별 분석 페이지에서는 무엇을 볼 수 있나요?",
    answer: "각 번호(1~45)의 역대 출현 횟수, 최근 출현 회차, 첫 출현 회차, 함께 많이 나온 번호 TOP 10, 비슷한 빈도 번호를 확인할 수 있습니다."
  },
  {
    question: "이 데이터는 어디서 가져오나요?",
    answer: "본 사이트의 모든 당첨번호 데이터는 동행복권 공식 발표 결과를 기준으로 수집·정리됩니다. 매주 토요일 추첨 이후 자동으로 갱신되며, 통계·패턴 분석은 참고용으로 제공됩니다."
  }
];

// JSON-LD for structured data
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LOTTO NFG",
  url: "https://lotto.newsforgreens.com",
  description: "로또 6/45 당첨번호 조회, 번호별 출현 통계, 회차별 분석을 제공하는 무료 서비스",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://lotto.newsforgreens.com/draw/{search_term}/",
    "query-input": "required name=search_term"
  }
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map(faq => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer
    }
  }))
};

export default function HomePage() {
  const latest = (cacheData as { latest_draw: { draw_no: number; date?: string; draw_date?: string; numbers: number[]; bonus: number } }).latest_draw;
  const history = historyData as { meta: { total_draws: number; latest_draw: number; updated_at_kst?: string } };
  const numberIndex = numberIndexData as { meta: { latest_draw: number }; numbers: Record<string, { count: number; last_seen: number }> };

  const latestRound = latest.draw_no;

  // Get top 6 most frequent numbers
  const allStats = Object.entries(numberIndex.numbers)
    .map(([k, v]) => ({ num: Number(k), ...v }))
    .sort((a, b) => b.count - a.count);
  const top6 = allStats.slice(0, 6);

  // Get cold numbers (highest gap from latest)
  const cold6 = allStats
    .map(s => ({ ...s, gap: latestRound - s.last_seen }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 6);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div style={{ display: "grid", gap: "var(--space-lg)" }}>
        {/* Section 1: Hero */}
        <section className="card">
          <h1 className="pageTitle">역대 로또 6/45 당첨번호</h1>
          <p className="pageDesc">
            1회~{latestRound}회 자동 업데이트 · 회차/번호/통계 분석
          </p>
          <p className="subtle" style={{ marginTop: 4 }}>
            매주 토요일 추첨 후 자동 갱신 · 공식 결과는 동행복권
          </p>

          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            <Link href={`/draw/${latestRound}/`} className="btn btnPrimary">
              이번 회차 자세히 보기
            </Link>
            <Link href="/stats/" className="btn btnSecondary">
              전체 회차 통계 보기
            </Link>
          </div>
        </section>

        {/* Section 2: Latest Draw LIVE (첫 폴드에 노출) */}
        <LatestDrawLive fallback={latest} />

        {/* 행동 유도 문구 */}
        <p className="subtle" style={{ textAlign: "center", padding: "0 var(--space-md)" }}>
          회차·번호·통계, 매주 자동 업데이트되는 로또 데이터를 한눈에 확인하세요
        </p>

        {/* Guide Quick Links */}
        <GuideLinks />

        {/* Section 3: Quick Search (Round & Number) */}
        <SearchBox latestRound={latestRound} />

        {/* Ad Banner */}
        <AdBanner slot="2914313572" format="horizontal" />

        {/* Section: Recommended 3 Sets */}
        <RecommendedNumbers numberStats={allStats} latestDraw={latestRound} />

        {/* Section: Internal Links */}
        <section className="card">
          <h2 className="sectionTitle">더 알아보기</h2>
          <div className="chipRow" style={{ flexWrap: "wrap" }}>
            <Link href="/draws/" className="chip">회차별 당첨번호 전체 보기</Link>
            <Link href="/numbers/" className="chip">번호별 출현 빈도 분석 보기</Link>
            <Link href="/stats/" className="chip">전체 통계(합계/홀짝/구간분포) 보기</Link>
          </div>
        </section>

        {/* Section 4: Top Links Grid */}
        <section className="card">
          <h2 className="sectionTitle">많이 찾는 페이지</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "var(--space-sm)"
          }}>
            {[
              { title: "최근 미출현 번호", href: "/stats/#missing50" },
              { title: "TOP 10 번호", href: "/stats/#top" },
              { title: "BOTTOM 10 번호", href: "/stats/#bottom" },
              { title: "보너스 번호 통계", href: "/stats/#bonus" },
              { title: "번호별 분석 (1~45)", href: "/numbers/" },
              { title: "전체 회차 목록", href: "/draws/" },
              { title: "최신 회차 분석", href: `/draw/${latestRound}/` },
              { title: "첫 회차 (1회)", href: "/draw/1/" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="chip" style={{ justifyContent: "center", textAlign: "center" }}>
                {item.title}
              </Link>
            ))}
          </div>
        </section>

        {/* Section 5: Recommended Numbers */}
        <div className="grid2">
          <section className="card recommendCard">
            <div className="recommendTitle">HOT - 역대 최다 출현</div>
            <p className="subtle" style={{ marginBottom: "var(--space-md)" }}>
              1회~{latestRound}회까지 가장 많이 당첨된 번호
            </p>
            <div className="ballRow">
              {top6.map((s) => (
                <Link key={s.num} href={`/number/${s.num}/`} className={`ball ${getBallClass(s.num)}`}>
                  {s.num}
                </Link>
              ))}
            </div>
            <div className="subtle" style={{ marginTop: "var(--space-sm)" }}>
              {top6.map(s => `${s.num}번(${s.count}회)`).join(" · ")}
            </div>
          </section>

          <section className="card recommendCard">
            <div className="recommendTitle">COLD - 오래 안 나온 번호</div>
            <p className="subtle" style={{ marginBottom: "var(--space-md)" }}>
              최근 추첨에서 가장 오래 미출현
            </p>
            <div className="ballRow">
              {cold6.map((s) => (
                <Link key={s.num} href={`/number/${s.num}/`} className={`ball ${getBallClass(s.num)}`}>
                  {s.num}
                </Link>
              ))}
            </div>
            <div className="subtle" style={{ marginTop: "var(--space-sm)" }}>
              {cold6.map(s => `${s.num}번(${s.gap}회 전)`).join(" · ")}
            </div>
          </section>
        </div>

        {/* Recent Draws Quick Links */}
        <section className="card">
          <h2 className="sectionTitle">최근 회차</h2>
          <div className="chipRow">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
              const round = latestRound - i;
              return (
                <Link
                  key={round}
                  href={`/draw/${round}/`}
                  className={`chip ${i === 0 ? "chipActive" : ""}`}
                >
                  {round}회 {i === 0 && "(최신)"}
                </Link>
              );
            })}
            <Link href="/draws/" className="chip">전체 보기 →</Link>
          </div>
        </section>

        {/* Section 6: FAQ */}
        <section className="card" id="faq">
          <h2 className="sectionTitle">자주 묻는 질문</h2>
          <div style={{ display: "grid", gap: "var(--space-md)" }}>
            {faqItems.map((item, idx) => (
              <details key={idx} className="faqItem">
                <summary className="faqQuestion">{item.question}</summary>
                <div className="faqAnswer">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Data Status Footer */}
        <section className="card" style={{ background: "var(--surface)" }}>
          <div className="flexBetween" style={{ flexWrap: "wrap", gap: "var(--space-md)" }}>
            <div className="subtle">
              <strong>데이터:</strong> 1회~{latestRound}회 (총 {history.meta.total_draws}회) ·
              업데이트: {history.meta.updated_at_kst || "자동"}
            </div>
            <div className="chipRow">
              <Link href="/numbers/" className="chip">번호 1~45</Link>
              <Link href="/draws/" className="chip">전체 회차</Link>
              <Link href="/stats/" className="chip">통계</Link>
            </div>
          </div>
        </section>

        {/* 데이터 출처 안내 */}
        <section className="card" style={{ background: "var(--surface)", borderLeft: "3px solid var(--accent)" }}>
          <div className="subtle" style={{ lineHeight: 1.8 }}>
            <strong>📌 데이터 출처 안내</strong><br />
            본 사이트의 로또 당첨번호 데이터는 <strong>동행복권 공식 발표</strong>를 기준으로 하며,
            <strong>매주 토요일 추첨 후 자동 갱신</strong>됩니다.<br />
            본 서비스는 <strong>참고용 정보 제공 목적</strong>이며, 당첨을 보장하지 않습니다.
          </div>
        </section>

        {/* 다음 행동 */}
        <div style={{ textAlign: "center", padding: "var(--space-md)" }}>
          <Link href="/draws/?range=30" style={{ fontSize: 15, fontWeight: 600 }}>
            최근 30회 로또 당첨번호 한눈에 보기 →
          </Link>
        </div>
      </div>
    </>
  );
}
