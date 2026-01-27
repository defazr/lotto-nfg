import Link from "next/link";
import { getHistory, LottoDraw } from "@/lib/lotto";
import AdBanner from "@/components/AdBanner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로또 번호 통계 | 많이/적게 나온 번호 분석",
  description: "로또 6/45 역대 당첨번호 통계 분석. 가장 많이 나온 번호, 적게 나온 번호, 최근 미출현 번호까지 데이터 기반으로 확인하세요.",
  alternates: {
    canonical: "https://lotto.newsforgreens.com/stats/",
  },
  openGraph: {
    title: "로또 번호 통계 | 많이/적게 나온 번호 분석",
    description: "로또 6/45 역대 당첨번호 통계 분석. 가장 많이 나온 번호, 적게 나온 번호, 최근 미출현 번호까지 확인하세요.",
    url: "https://lotto.newsforgreens.com/stats/",
    type: "website",
    locale: "ko_KR",
    siteName: "LOTTO NFG",
    images: [
      {
        url: "https://lotto.newsforgreens.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "로또 번호 통계 분석",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://lotto.newsforgreens.com/og-image.jpg"],
  },
};

export default function StatsPage() {
  const history = getHistory();
  const draws: LottoDraw[] = Array.isArray(history.data) ? history.data : Object.values(history.data);
  const totalDraws = history.meta.total_draws;

  const freq = new Map<number, number>();
  for (const d of draws) {
    for (const n of d.numbers) {
      freq.set(n, (freq.get(n) || 0) + 1);
    }
  }

  const bonusFreq = new Map<number, number>();
  for (const d of draws) {
    bonusFreq.set(d.bonus, (bonusFreq.get(d.bonus) || 0) + 1);
  }

  const recentDraws = draws.slice(-50);
  const recentNumbers = new Set<number>();
  for (const d of recentDraws) {
    for (const n of d.numbers) recentNumbers.add(n);
  }
  const notAppeared = Array.from({ length: 45 }, (_, i) => i + 1)
    .filter(n => !recentNumbers.has(n));

  const top10 = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const bottom10 = [...freq.entries()].sort((a, b) => a[1] - b[1]).slice(0, 10);
  const bonusTop10 = [...bonusFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const avgFreq = Math.round(totalDraws * 6 / 45);

  // 홀짝 평균 계산
  const oddEvenStats = draws.map(d => d.numbers.filter(n => n % 2 === 1).length);
  const avgOdd = (oddEvenStats.reduce((a, b) => a + b, 0) / draws.length).toFixed(1);

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      {/* Header */}
      <section className="card">
        <h1>로또 번호 통계</h1>
        <p className="subtle" style={{ marginTop: 8 }}>
          1회부터 {history.meta.latest_draw}회까지 총 {totalDraws}회 추첨 데이터를 분석했습니다.
        </p>

        {/* Quick Nav */}
        <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
          <a href="#top" className="chip">TOP 10</a>
          <a href="#bottom" className="chip">BOTTOM 10</a>
          <a href="#missing50" className="chip">미출현</a>
          <a href="#bonus" className="chip">보너스</a>
        </div>
      </section>

      {/* 5줄 요약 블록 */}
      <section className="card" style={{ background: "rgba(47, 125, 99, 0.05)", borderColor: "var(--accent)" }}>
        <h2 className="sectionTitle">로또 당첨번호 통계 요약</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2, color: "var(--muted)" }}>
          <li><strong>데이터 범위:</strong> 1회 ~ {history.meta.latest_draw}회 (총 {totalDraws}회)</li>
          <li><strong>가장 자주 나온 번호:</strong> {top10.slice(0, 3).map(([n, c]) => `${n}번(${c}회)`).join(", ")}</li>
          <li><strong>가장 적게 나온 번호:</strong> {bottom10.slice(0, 3).map(([n, c]) => `${n}번(${c}회)`).join(", ")}</li>
          <li><strong>평균 홀짝 비율:</strong> 홀수 약 {avgOdd}개 : 짝수 약 {(6 - Number(avgOdd)).toFixed(1)}개</li>
          <li style={{ color: "var(--warning)", fontWeight: 500 }}>※ 모든 통계는 참고용이며, 미래 당첨을 예측하지 않습니다.</li>
        </ul>
      </section>

      {/* 요약 배지 */}
      <div style={{ background: "rgba(47, 125, 99, 0.1)", borderLeft: "3px solid var(--accent)", padding: "var(--space-md)", borderRadius: "var(--radius-sm)" }}>
        <strong style={{ color: "var(--accent-2)" }}>전체 데이터 요약 · 참고용</strong>
        <p className="subtle" style={{ marginTop: 4 }}>1회~{history.meta.latest_draw}회 누적 통계 기준</p>
        <p className="subtle" style={{ marginTop: 4, fontSize: 12, fontStyle: "italic" }}>
          전체 흐름을 본 뒤 회차/번호 페이지로 이동해 비교해 보세요.
        </p>
      </div>

      {/* 빠른 탐색 6개 카드 */}
      <section className="card">
        <h2 className="sectionTitle">다음에 볼 페이지</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-sm)" }}>
          <Link href="/draws/#last-10" className="statCard cardClickable" style={{ padding: "var(--space-md)" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>최근 10회</div>
            <div className="subtle" style={{ fontSize: 12 }}>당첨번호 확인</div>
          </Link>
          <Link href="/draws/#last-30" className="statCard cardClickable" style={{ padding: "var(--space-md)" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>최근 30회</div>
            <div className="subtle" style={{ fontSize: 12 }}>당첨번호 모아보기</div>
          </Link>
          <Link href={`/draw/${history.meta.latest_draw}/`} className="statCard cardClickable" style={{ padding: "var(--space-md)", borderColor: "var(--accent)" }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--accent-2)" }}>최신 {history.meta.latest_draw}회</div>
            <div className="subtle" style={{ fontSize: 12 }}>상세 분석 보기</div>
          </Link>
          <a href="#top" className="statCard cardClickable" style={{ padding: "var(--space-md)" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>TOP 10</div>
            <div className="subtle" style={{ fontSize: 12 }}>가장 많이 나온 번호</div>
          </a>
          <a href="#bottom" className="statCard cardClickable" style={{ padding: "var(--space-md)" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>BOTTOM 10</div>
            <div className="subtle" style={{ fontSize: 12 }}>가장 안 나온 번호</div>
          </a>
          <Link href="/numbers/" className="statCard cardClickable" style={{ padding: "var(--space-md)" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>1~45 번호별</div>
            <div className="subtle" style={{ fontSize: 12 }}>출현 빈도 통계</div>
          </Link>
        </div>
      </section>

      {/* TOP 10 */}
      <section id="top" className="card" style={{ background: "rgba(47, 125, 99, 0.1)", borderColor: "var(--accent)" }}>
        <h2 className="sectionTitle" style={{ color: "var(--accent-2)" }}>가장 많이 나온 번호 TOP 10</h2>
        <p className="subtle">
          역대 가장 자주 당첨번호에 포함된 숫자들입니다.
          1위 {top10[0]?.[0]}번은 무려 {top10[0]?.[1]}회나 등장했습니다.
          평균보다 {top10[0] ? top10[0][1] - avgFreq : 0}회 더 많이 나왔네요.
        </p>
        <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
          {top10.map(([n, c], idx) => (
            <Link key={n} href={`/number/${n}/`} className="statCard cardClickable" style={{
              padding: "var(--space-md)",
              minWidth: 70,
              borderColor: idx === 0 ? "var(--accent-2)" : undefined,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{n}</div>
              <div className="subtle">{c}회</div>
            </Link>
          ))}
        </div>
      </section>

      {/* BOTTOM 10 */}
      <section id="bottom" className="card" style={{ background: "rgba(255, 107, 107, 0.08)", borderColor: "var(--danger)" }}>
        <h2 className="sectionTitle" style={{ color: "var(--danger)" }}>가장 적게 나온 번호 BOTTOM 10</h2>
        <p className="subtle">
          상대적으로 덜 등장한 번호들입니다.
          {bottom10[0]?.[0]}번은 {bottom10[0]?.[1]}회로 가장 적게 나왔습니다.
          &quot;언젠간 나오겠지&quot; 하는 분들이 선호하는 번호이기도 합니다.
        </p>
        <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
          {bottom10.map(([n, c], idx) => (
            <Link key={n} href={`/number/${n}/`} className="statCard cardClickable" style={{
              padding: "var(--space-md)",
              minWidth: 70,
              borderColor: idx === 0 ? "var(--danger)" : undefined,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{n}</div>
              <div className="subtle">{c}회</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Missing 50 */}
      <section id="missing50" className="card" style={{ background: "rgba(255, 209, 102, 0.1)", borderColor: "var(--warning)" }}>
        <h2 className="sectionTitle" style={{ color: "var(--warning)" }}>최근 50회 동안 안 나온 번호</h2>
        <p className="subtle">
          {notAppeared.length > 0
            ? `최근 50회 추첨에서 한 번도 등장하지 않은 번호가 ${notAppeared.length}개 있습니다. 조만간 나올 수도 있겠죠?`
            : "최근 50회 동안 모든 번호가 최소 1회 이상 등장했습니다. 골고루 나오고 있네요!"
          }
        </p>
        <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
          {notAppeared.length > 0 ? (
            notAppeared.map(n => (
              <Link key={n} href={`/number/${n}/`} className="statCard cardClickable" style={{
                padding: "var(--space-md)",
                minWidth: 70,
                borderColor: "var(--warning)",
              }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{n}</div>
                <div className="subtle">미출현</div>
              </Link>
            ))
          ) : (
            <div className="subtle">모든 번호가 최근 50회 내 등장</div>
          )}
        </div>
      </section>

      {/* Bonus TOP 10 */}
      <section id="bonus" className="card">
        <h2 className="sectionTitle">보너스 번호 출현 TOP 10</h2>
        <p className="subtle">
          2등 당첨을 결정하는 보너스 번호! 가장 자주 보너스로 뽑힌 번호는 {bonusTop10[0]?.[0]}번({bonusTop10[0]?.[1]}회)입니다.
        </p>
        <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
          {bonusTop10.map(([n, c], idx) => (
            <Link key={n} href={`/number/${n}/`} className="statCard cardClickable" style={{
              padding: "var(--space-md)",
              minWidth: 70,
              borderColor: idx === 0 ? "var(--ball-yellow)" : undefined,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{n}</div>
              <div className="subtle">{c}회</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 분석 기준 안내 */}
      <p className="subtle" style={{ textAlign: "center", padding: "var(--space-md)", lineHeight: 1.7 }}>
        ※ 본 분석은 과거 데이터 기반 통계 요약이며, 각 회차 추첨은 <strong>독립적·무작위</strong>로 진행됩니다.
      </p>

      {/* SEO 롱테일 텍스트 */}
      <section className="card" style={{ background: "var(--surface)" }}>
        <h3 className="sectionTitle">로또 당첨번호 전체 통계 데이터</h3>
        <p className="subtle" style={{ lineHeight: 1.8 }}>
          로또 당첨번호 전체 통계 데이터는 1회부터 {history.meta.latest_draw}회까지의 누적 결과를 기준으로 합니다.
          자주 나온 번호, 덜 나온 번호, 최근 10·30회 흐름을 참고용으로 제공합니다.
          통계 기반 참고용 데이터이며, 당첨을 보장하지 않습니다.
        </p>
      </section>

      {/* 다음 행동 */}
      <div style={{ textAlign: "center", padding: "var(--space-md)" }}>
        <Link href={`/draw/${history.meta.latest_draw}/`} style={{ fontSize: 15, fontWeight: 600 }}>
          최신 회차 로또 당첨번호 분석으로 이동 →
        </Link>
      </div>

      {/* Ad */}
      <AdBanner slot="2914313572" format="horizontal" />

      {/* Navigation */}
      <div className="chipRow">
        <Link href="/" className="btn btnPrimary">이번주 로또 추천번호 3세트</Link>
        <Link href={`/draw/${history.meta.latest_draw}/`} className="btn btnSecondary">
          최신 {history.meta.latest_draw}회 당첨번호 분석
        </Link>
        <Link href="/numbers/" className="btn btnSecondary">1~45 번호별 출현 빈도</Link>
      </div>
    </div>
  );
}
