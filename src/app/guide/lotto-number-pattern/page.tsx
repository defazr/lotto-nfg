import Link from "next/link";
import { getHistory, LottoDraw } from "@/lib/lotto";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로또 번호 패턴 분석 | 자주 나오는 조합 유형",
  description: "로또 6/45 당첨번호의 패턴을 분석합니다. 홀짝 비율, 번호 합계, 구간 분포 등 역대 당첨번호의 공통점을 알아보세요.",
  alternates: {
    canonical: "https://lotto.newsforgreens.com/guide/lotto-number-pattern/",
  },
};

export default function LottoNumberPatternPage() {
  const history = getHistory();
  const draws: LottoDraw[] = Array.isArray(history.data) ? history.data : Object.values(history.data);
  const latestDraw = history.meta.latest_draw;
  const totalDraws = history.meta.total_draws;

  // 홀짝 분석
  const oddEvenStats = new Map<string, number>();
  for (const d of draws) {
    const odd = d.numbers.filter(n => n % 2 === 1).length;
    const even = 6 - odd;
    const key = `${odd}:${even}`;
    oddEvenStats.set(key, (oddEvenStats.get(key) || 0) + 1);
  }
  const oddEvenSorted = [...oddEvenStats.entries()].sort((a, b) => b[1] - a[1]);

  // 합계 분석
  const sumStats = { low: 0, mid: 0, high: 0 };
  for (const d of draws) {
    const sum = d.numbers.reduce((a, b) => a + b, 0);
    if (sum < 100) sumStats.low++;
    else if (sum <= 170) sumStats.mid++;
    else sumStats.high++;
  }

  // 연속번호 분석
  let hasConsecutive = 0;
  for (const d of draws) {
    const sorted = [...d.numbers].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] === 1) {
        hasConsecutive++;
        break;
      }
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      {/* Header */}
      <section className="card">
        <h1>로또 번호 패턴 분석</h1>
        <p className="subtle" style={{ marginTop: 8 }}>
          역대 {totalDraws}회 당첨번호에서 발견되는 패턴을 분석합니다.
        </p>
      </section>

      {/* 홀짝 비율 */}
      <section className="card">
        <h2 className="sectionTitle">홀수/짝수 비율</h2>
        <p>
          6개 번호 중 홀수와 짝수의 분포입니다. <strong>3:3 비율</strong>이 가장 많이 등장합니다.
        </p>
        <div style={{ marginTop: "var(--space-md)" }}>
          {oddEvenSorted.slice(0, 5).map(([ratio, count]) => {
            const pct = ((count / totalDraws) * 100).toFixed(1);
            return (
              <div key={ratio} style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}>
                <span>홀:짝 = <strong>{ratio}</strong></span>
                <span>{count}회 ({pct}%)</span>
              </div>
            );
          })}
        </div>
        <p className="subtle" style={{ marginTop: "var(--space-md)" }}>
          극단적인 비율(6:0, 0:6)은 매우 드물게 나타납니다.
        </p>
      </section>

      {/* 합계 범위 */}
      <section className="card">
        <h2 className="sectionTitle">번호 합계 분포</h2>
        <p>
          6개 번호의 합계는 이론적으로 21(1+2+3+4+5+6)부터 255(40+41+42+43+44+45)까지 가능합니다.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-md)",
          marginTop: "var(--space-md)",
        }}>
          <div style={{
            background: "var(--bg-alt)",
            padding: "var(--space-md)",
            borderRadius: 8,
            textAlign: "center",
          }}>
            <div className="subtle">낮음 (&lt;100)</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{sumStats.low}회</div>
            <div className="subtle">{((sumStats.low / totalDraws) * 100).toFixed(1)}%</div>
          </div>
          <div style={{
            background: "rgba(47, 125, 99, 0.1)",
            padding: "var(--space-md)",
            borderRadius: 8,
            textAlign: "center",
            border: "1px solid var(--accent)",
          }}>
            <div className="subtle">중간 (100-170)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{sumStats.mid}회</div>
            <div className="subtle">{((sumStats.mid / totalDraws) * 100).toFixed(1)}%</div>
          </div>
          <div style={{
            background: "var(--bg-alt)",
            padding: "var(--space-md)",
            borderRadius: 8,
            textAlign: "center",
          }}>
            <div className="subtle">높음 (&gt;170)</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{sumStats.high}회</div>
            <div className="subtle">{((sumStats.high / totalDraws) * 100).toFixed(1)}%</div>
          </div>
        </div>
        <p className="subtle" style={{ marginTop: "var(--space-md)" }}>
          대부분의 당첨번호는 합계 100~170 구간에 분포합니다.
        </p>
      </section>

      {/* 구간 분포 */}
      <section className="card">
        <h2 className="sectionTitle">번호 구간(Zone) 분포</h2>
        <p>
          45개 번호를 5개 구간으로 나눕니다. 골고루 분포되는 것이 일반적입니다.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "var(--space-sm)",
          marginTop: "var(--space-md)",
        }}>
          {[
            { range: "1-10", color: "#fbbf24" },
            { range: "11-20", color: "#60a5fa" },
            { range: "21-30", color: "#f87171" },
            { range: "31-40", color: "#9ca3af" },
            { range: "41-45", color: "#4ade80" },
          ].map(zone => (
            <div key={zone.range} style={{
              background: zone.color + "20",
              padding: "var(--space-sm)",
              borderRadius: 8,
              textAlign: "center",
              borderTop: `3px solid ${zone.color}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{zone.range}</div>
            </div>
          ))}
        </div>
        <p className="subtle" style={{ marginTop: "var(--space-md)" }}>
          특정 구간에 몰리는 번호 조합은 상대적으로 적게 나타납니다.
        </p>
      </section>

      {/* 연속 번호 */}
      <section className="card">
        <h2 className="sectionTitle">연속 번호 출현</h2>
        <p>
          연속된 번호(예: 7, 8)가 포함된 당첨 조합은 얼마나 될까요?
        </p>
        <div style={{
          background: "var(--bg-alt)",
          padding: "var(--space-md)",
          borderRadius: 8,
          marginTop: "var(--space-md)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {hasConsecutive}회 / {totalDraws}회
          </div>
          <div className="subtle" style={{ marginTop: 4 }}>
            ({((hasConsecutive / totalDraws) * 100).toFixed(1)}%)
          </div>
        </div>
        <p className="subtle" style={{ marginTop: "var(--space-md)" }}>
          연속 번호가 1쌍 이상 포함된 조합이 상당히 많습니다.
          연속 번호를 피할 필요는 없습니다.
        </p>
      </section>

      {/* 실제 데이터 연결 */}
      <section className="card" style={{ background: "rgba(47, 125, 99, 0.1)", borderColor: "var(--accent)" }}>
        <h2 className="sectionTitle" style={{ color: "var(--accent-2)" }}>실제 회차별 패턴 확인</h2>
        <p>
          각 회차별 당첨번호의 패턴을 직접 확인해보세요.
        </p>
        <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
          <Link href={`/draw/${latestDraw}/`} className="btn btnPrimary">
            최신 {latestDraw}회 패턴 분석
          </Link>
          <Link href="/draws/" className="btn btnSecondary">
            전체 회차 목록
          </Link>
        </div>
      </section>

      {/* 관련 가이드 */}
      <section className="card">
        <h2 className="sectionTitle">관련 가이드</h2>
        <div className="chipRow">
          <Link href="/guide/lotto-probability/" className="chip">
            당첨 확률 계산
          </Link>
          <Link href="/guide/lotto-hot-cold/" className="chip">
            많이/적게 나온 번호
          </Link>
        </div>
      </section>

      {/* Navigation */}
      <div className="chipRow">
        <Link href="/" className="btn btnPrimary">홈으로</Link>
        <Link href="/stats/" className="btn btnSecondary">전체 통계 보기</Link>
      </div>
    </div>
  );
}
