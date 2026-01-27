import Link from "next/link";
import { getNumberIndex, getBallClass } from "@/lib/lotto";
import { getBreadcrumbJsonLd } from "@/lib/seo";
import AdBanner from "@/components/AdBanner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로또 번호 1~45 전체 분석 | 번호별 출현 통계",
  description: "로또 6/45 번호 1번부터 45번까지 각 번호의 출현 횟수, 최근 출현 회차를 한눈에 확인하세요.",
  alternates: {
    canonical: "https://lotto.newsforgreens.com/numbers/",
  },
};

export default function NumbersPage() {
  const numberIndex = getNumberIndex();
  const latestDraw = numberIndex.meta.latest_draw;

  const stats = Object.entries(numberIndex.numbers)
    .map(([k, v]) => ({ num: Number(k), ...v }))
    .sort((a, b) => a.num - b.num);

  // Add gap calculation
  const statsWithGap = stats.map(s => ({
    ...s,
    gap: latestDraw - s.last_seen,
  }));

  const top5 = [...statsWithGap].sort((a, b) => b.count - a.count).slice(0, 5);
  const bottom5 = [...statsWithGap].sort((a, b) => a.count - b.count).slice(0, 5);
  const cold5 = [...statsWithGap].sort((a, b) => b.gap - a.gap).slice(0, 5);

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", url: "/" },
    { name: "번호 목록", url: "/numbers/" },
  ]);

  // Group by zone
  const zones = [
    { label: "1~10", start: 1, end: 10 },
    { label: "11~20", start: 11, end: 20 },
    { label: "21~30", start: 21, end: 30 },
    { label: "31~40", start: 31, end: 40 },
    { label: "41~45", start: 41, end: 45 },
  ];

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
          <h1>로또 번호 1~45 전체 분석</h1>
          <p className="subtle" style={{ marginTop: 8 }}>
            1회부터 {latestDraw}회까지 각 번호의 출현 통계를 확인하세요.
            번호를 클릭하면 상세 분석 페이지로 이동합니다.
          </p>

          {/* Quick Nav */}
          <div className="chipRow" style={{ marginTop: "var(--space-lg)" }}>
            <a href="#top5" className="chip">TOP 5</a>
            <a href="#bottom5" className="chip">BOTTOM 5</a>
            <a href="#cold5" className="chip">미출현</a>
            <Link href="/stats/" className="btn btnSecondary btnSmall">전체 통계</Link>
          </div>

          {/* Zone Quick Jump */}
          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            {zones.map((zone) => (
              <a key={zone.label} href={`#zone-${zone.start}`} className="chip">{zone.label}</a>
            ))}
          </div>
        </section>

        {/* TOP 5 / BOTTOM 5 / COLD 5 */}
        <div className="grid3">
          <section id="top5" className="card" style={{ background: "rgba(47, 125, 99, 0.1)", borderColor: "var(--accent)" }}>
            <h2 className="sectionTitle" style={{ color: "var(--accent-2)" }}>가장 많이 나온 번호</h2>
            <div className="chipRow">
              {top5.map((s) => (
                <Link key={s.num} href={`/number/${s.num}/`} className={`ball ${getBallClass(s.num)}`}>
                  {s.num}
                </Link>
              ))}
            </div>
            <div className="subtle" style={{ marginTop: 8 }}>
              {top5.map(s => `${s.num}번(${s.count}회)`).join(" · ")}
            </div>
          </section>

          <section id="bottom5" className="card" style={{ background: "rgba(255, 107, 107, 0.08)", borderColor: "var(--danger)" }}>
            <h2 className="sectionTitle" style={{ color: "var(--danger)" }}>가장 적게 나온 번호</h2>
            <div className="chipRow">
              {bottom5.map((s) => (
                <Link key={s.num} href={`/number/${s.num}/`} className={`ball ${getBallClass(s.num)}`}>
                  {s.num}
                </Link>
              ))}
            </div>
            <div className="subtle" style={{ marginTop: 8 }}>
              {bottom5.map(s => `${s.num}번(${s.count}회)`).join(" · ")}
            </div>
          </section>

          <section id="cold5" className="card" style={{ background: "rgba(255, 209, 102, 0.1)", borderColor: "var(--warning)" }}>
            <h2 className="sectionTitle" style={{ color: "var(--warning)" }}>오래 안 나온 번호</h2>
            <div className="chipRow">
              {cold5.map((s) => (
                <Link key={s.num} href={`/number/${s.num}/`} className={`ball ${getBallClass(s.num)}`}>
                  {s.num}
                </Link>
              ))}
            </div>
            <div className="subtle" style={{ marginTop: 8 }}>
              {cold5.map(s => `${s.num}번(${s.gap}회 전)`).join(" · ")}
            </div>
          </section>
        </div>

        {/* By Zone */}
        {zones.map((zone) => {
          const zoneStats = statsWithGap.filter(s => s.num >= zone.start && s.num <= zone.end);
          return (
            <section key={zone.label} id={`zone-${zone.start}`} className="card">
              <h2 className="sectionTitle">{zone.label} 구간</h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: 12,
              }}>
                {zoneStats.map((s) => (
                  <Link key={s.num} href={`/number/${s.num}/`} className="card cardClickable" style={{
                    padding: "var(--space-md)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    <span className={`ball ${getBallClass(s.num)}`}>{s.num}</span>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{s.count}회</div>
                      <div className="subtle">
                        {s.gap === 0 ? "최신" : `${s.gap}회 전`}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {/* All Numbers Grid (compact) */}
        <section className="card" style={{ background: "var(--surface)" }}>
          <h2 className="sectionTitle">전체 번호 (1~45)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 8 }}>
            {statsWithGap.map((s) => (
              <Link key={s.num} href={`/number/${s.num}/`} className={`ball ${getBallClass(s.num)}`} style={{
                width: "100%",
                height: "auto",
                aspectRatio: "1",
                fontSize: 14,
              }}>
                {s.num}
              </Link>
            ))}
          </div>
        </section>

        {/* Ad Banner */}
        <AdBanner slot="5233440872" format="horizontal" />

        {/* Navigation */}
        <div className="chipRow">
          <Link href="/stats/" className="btn btnPrimary">전체 통계</Link>
          <Link href="/draws/" className="btn btnSecondary">회차 목록</Link>
          <Link href="/" className="btn btnSecondary">홈으로</Link>
        </div>
      </div>
    </>
  );
}
