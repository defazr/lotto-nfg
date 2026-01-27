import Link from "next/link";
import { getHistory, formatDate, getBallClass, LottoDraw } from "@/lib/lotto";
import { getBreadcrumbJsonLd } from "@/lib/seo";
import AdBanner from "@/components/AdBanner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로또 당첨번호 전체 회차 목록 | 1회~최신",
  description: "로또 6/45 역대 모든 당첨번호 목록. 1회부터 최신 회차까지 전체 추첨 결과를 확인하세요.",
  alternates: {
    canonical: "https://lotto.newsforgreens.com/draws/",
  },
  openGraph: {
    title: "로또 당첨번호 전체 회차 목록 | 1회~최신",
    description: "로또 6/45 역대 모든 당첨번호 목록. 1회부터 최신 회차까지 전체 추첨 결과를 확인하세요.",
    url: "https://lotto.newsforgreens.com/draws/",
    type: "website",
    locale: "ko_KR",
    siteName: "LOTTO NFG",
    images: [
      {
        url: "https://lotto.newsforgreens.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "로또 당첨번호 전체 목록",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://lotto.newsforgreens.com/og-image.jpg"],
  },
};

export default function DrawsPage() {
  const history = getHistory();
  const draws: LottoDraw[] = Array.isArray(history.data) ? history.data : Object.values(history.data);
  const sortedDraws = [...draws].sort((a, b) => b.draw_no - a.draw_no);
  const latestDraw = history.meta.latest_draw;

  // 최근 N회 데이터
  const last10 = sortedDraws.slice(0, 10);
  const last30 = sortedDraws.slice(0, 30);
  const last50 = sortedDraws.slice(0, 50);

  const byYear: Record<string, LottoDraw[]> = {};
  for (const d of sortedDraws) {
    const dateStr = d.draw_date || d.date || "";
    const year = dateStr.slice(0, 4) || "Unknown";
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(d);
  }
  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", url: "/" },
    { name: "회차 목록", url: "/draws/" },
  ]);

  const DrawCard = ({ draw }: { draw: LottoDraw }) => (
    <Link href={`/draw/${draw.draw_no}/`} className="card cardClickable" style={{
      padding: "var(--space-md)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontWeight: 700, minWidth: 70 }}>{draw.draw_no}회</span>
        <span className="subtle">{formatDate(draw.draw_date || draw.date)}</span>
      </div>
      <div className="ballRow">
        {draw.numbers.map((n) => (
          <span key={n} className={`ball ballSmall ${getBallClass(n)}`}>{n}</span>
        ))}
        <span className="ballPlus" style={{ fontSize: 14 }}>+</span>
        <span className={`ball ballSmall ballBonus ${getBallClass(draw.bonus)}`}>{draw.bonus}</span>
      </div>
    </Link>
  );

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div style={{ display: "grid", gap: "var(--space-lg)" }}>
        {/* Header */}
        <section className="card">
          <h1>로또 당첨번호 전체 목록</h1>
          <p className="subtle" style={{ marginTop: 8 }}>
            1회부터 {latestDraw}회까지 총 {history.meta.total_draws}회 추첨 결과
          </p>

          {/* Filter Buttons */}
          <div className="chipRow" style={{ marginTop: "var(--space-lg)" }}>
            <a href="#last-10" className="btn btnPrimary">최근 10회</a>
            <a href="#last-30" className="btn btnSecondary">최근 30회</a>
            <a href="#last-50" className="btn btnSecondary">최근 50회</a>
            <a href="#all" className="btn btnSecondary">전체 보기</a>
          </div>

          {/* Year Quick Jump */}
          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            {years.slice(0, 10).map((year) => (
              <a key={year} href={`#year-${year}`} className="chip">{year}년</a>
            ))}
          </div>
        </section>

        {/* Last 10 */}
        <section id="last-10" className="card" style={{ background: "rgba(47, 125, 99, 0.08)", borderColor: "var(--accent)" }}>
          <h2 className="sectionTitle" style={{ color: "var(--accent-2)" }}>최근 10회 당첨번호</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {last10.map((draw) => <DrawCard key={draw.draw_no} draw={draw} />)}
          </div>
        </section>

        {/* Last 30 */}
        <section id="last-30" className="card">
          <h2 className="sectionTitle">최근 30회 당첨번호</h2>
          <p className="subtle" style={{ marginBottom: "var(--space-md)" }}>11회~30회 전 (위 10회 제외)</p>
          <div style={{ display: "grid", gap: 8 }}>
            {last30.slice(10).map((draw) => <DrawCard key={draw.draw_no} draw={draw} />)}
          </div>
        </section>

        {/* Last 50 */}
        <section id="last-50" className="card">
          <h2 className="sectionTitle">최근 50회 당첨번호</h2>
          <p className="subtle" style={{ marginBottom: "var(--space-md)" }}>31회~50회 전 (위 30회 제외)</p>
          <div style={{ display: "grid", gap: 8 }}>
            {last50.slice(30).map((draw) => <DrawCard key={draw.draw_no} draw={draw} />)}
          </div>
        </section>

        {/* All - By Year */}
        <section id="all" className="card" style={{ background: "var(--surface)" }}>
          <h2 className="sectionTitle">전체 회차 (연도별)</h2>
          <div className="chipRow">
            {years.map((year) => (
              <a key={year} href={`#year-${year}`} className="chip">{year}년 ({byYear[year].length})</a>
            ))}
          </div>
        </section>

        {/* By Year */}
        {years.map((year) => (
          <section key={year} id={`year-${year}`} className="card">
            <h2 className="sectionTitle">{year}년 ({byYear[year].length}회)</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {byYear[year].map((draw) => <DrawCard key={draw.draw_no} draw={draw} />)}
            </div>
          </section>
        ))}

        {/* Ad Banner */}
        <AdBanner slot="5233440872" format="horizontal" />

        {/* Navigation */}
        <div className="chipRow">
          <Link href="/stats/" className="btn btnPrimary">전체 통계</Link>
          <Link href="/numbers/" className="btn btnSecondary">번호별 분석</Link>
          <Link href="/" className="btn btnSecondary">홈으로</Link>
        </div>
      </div>
    </>
  );
}
