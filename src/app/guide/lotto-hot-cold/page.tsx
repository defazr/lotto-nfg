import Link from "next/link";
import { getHistory, getNumberIndex, LottoDraw, getBallClass } from "@/lib/lotto";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로또 많이 나온 번호 / 안 나온 번호 | Hot & Cold 분석",
  description: "로또 6/45에서 가장 많이 나온 번호와 적게 나온 번호를 분석합니다. 핫넘버와 콜드넘버 전략의 의미를 알아보세요.",
  alternates: {
    canonical: "https://lotto.newsforgreens.com/guide/lotto-hot-cold/",
  },
};

export default function LottoHotColdPage() {
  const history = getHistory();
  const numberIndex = getNumberIndex();
  const draws: LottoDraw[] = Array.isArray(history.data) ? history.data : Object.values(history.data);
  const totalDraws = history.meta.total_draws;
  const latestDraw = history.meta.latest_draw;

  // 전체 통계
  const allStats = Object.entries(numberIndex.numbers)
    .map(([k, v]) => ({ num: Number(k), count: v.count, lastSeen: v.last_seen }))
    .sort((a, b) => b.count - a.count);

  const top10 = allStats.slice(0, 10);
  const bottom10 = [...allStats].sort((a, b) => a.count - b.count).slice(0, 10);

  // 최근 50회 미출현
  const recentDraws = draws.slice(-50);
  const recentNumbers = new Set<number>();
  for (const d of recentDraws) {
    for (const n of d.numbers) recentNumbers.add(n);
  }
  const notAppeared50 = Array.from({ length: 45 }, (_, i) => i + 1)
    .filter(n => !recentNumbers.has(n));

  // 평균 출현 횟수
  const avgFreq = Math.round(totalDraws * 6 / 45);

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      {/* Header */}
      <section className="card">
        <h1>많이 나온 번호 / 안 나온 번호</h1>
        <p className="subtle" style={{ marginTop: 8 }}>
          Hot Number와 Cold Number 전략을 이해합니다.
        </p>
      </section>

      {/* 핫넘버 설명 */}
      <section className="card">
        <h2 className="sectionTitle">Hot Number (많이 나온 번호)</h2>
        <p>
          역대 추첨에서 <strong>가장 자주 당첨번호에 포함된 숫자</strong>들입니다.
          평균 출현 횟수는 약 <strong>{avgFreq}회</strong>입니다.
        </p>
        <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
          {top10.map((item, idx) => (
            <Link
              key={item.num}
              href={`/number/${item.num}/`}
              className={`ball ${getBallClass(item.num)}`}
              style={{
                width: 48,
                height: 48,
                fontSize: 18,
                textDecoration: "none",
                position: "relative",
              }}
            >
              {item.num}
              {idx < 3 && (
                <span style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  background: "var(--accent)",
                  color: "white",
                  fontSize: 10,
                  padding: "2px 4px",
                  borderRadius: 4,
                }}>
                  #{idx + 1}
                </span>
              )}
            </Link>
          ))}
        </div>
        <p className="subtle" style={{ marginTop: "var(--space-md)" }}>
          1위 {top10[0]?.num}번은 {top10[0]?.count}회 등장 (평균 대비 +{top10[0] ? top10[0].count - avgFreq : 0}회)
        </p>
      </section>

      {/* 콜드넘버 설명 */}
      <section className="card">
        <h2 className="sectionTitle">Cold Number (적게 나온 번호)</h2>
        <p>
          상대적으로 <strong>덜 등장한 번호</strong>들입니다.
          &quot;언젠간 나오겠지&quot; 하며 선택하는 분들이 많습니다.
        </p>
        <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
          {bottom10.map((item, idx) => (
            <Link
              key={item.num}
              href={`/number/${item.num}/`}
              className={`ball ${getBallClass(item.num)}`}
              style={{
                width: 48,
                height: 48,
                fontSize: 18,
                textDecoration: "none",
                opacity: 0.7,
                position: "relative",
              }}
            >
              {item.num}
              {idx < 3 && (
                <span style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  background: "var(--danger)",
                  color: "white",
                  fontSize: 10,
                  padding: "2px 4px",
                  borderRadius: 4,
                }}>
                  #{idx + 1}
                </span>
              )}
            </Link>
          ))}
        </div>
        <p className="subtle" style={{ marginTop: "var(--space-md)" }}>
          {bottom10[0]?.num}번은 {bottom10[0]?.count}회로 가장 적게 등장 (평균 대비 {bottom10[0] ? bottom10[0].count - avgFreq : 0}회)
        </p>
      </section>

      {/* 최근 미출현 */}
      <section className="card" style={{ background: "rgba(255, 209, 102, 0.1)", borderColor: "var(--warning)" }}>
        <h2 className="sectionTitle" style={{ color: "var(--warning)" }}>최근 50회 미출현 번호</h2>
        <p>
          최근 50회 추첨에서 한 번도 등장하지 않은 번호입니다.
        </p>
        {notAppeared50.length > 0 ? (
          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            {notAppeared50.map(n => (
              <Link
                key={n}
                href={`/number/${n}/`}
                className={`ball ${getBallClass(n)}`}
                style={{
                  width: 44,
                  height: 44,
                  fontSize: 16,
                  textDecoration: "none",
                }}
              >
                {n}
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ marginTop: "var(--space-md)" }}>
            현재 모든 번호가 최근 50회 내에 최소 1회 이상 등장했습니다.
          </p>
        )}
        <p className="subtle" style={{ marginTop: "var(--space-md)" }}>
          미출현 번호가 &quot;나올 차례&quot;라는 보장은 없지만, 많은 분들이 참고합니다.
        </p>
      </section>

      {/* 전략 설명 */}
      <section className="card">
        <h2 className="sectionTitle">Hot vs Cold 어떤 전략이 좋을까?</h2>
        <p>
          로또는 <strong>완전 무작위</strong> 추첨이므로, 과거 통계가 미래를 예측하지 못합니다.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-md)",
          marginTop: "var(--space-md)",
        }}>
          <div style={{
            background: "rgba(47, 125, 99, 0.1)",
            padding: "var(--space-md)",
            borderRadius: 8,
          }}>
            <strong>Hot 전략</strong>
            <p className="subtle" style={{ marginTop: 4 }}>
              &quot;잘 나오는 번호는 계속 나온다&quot;
            </p>
          </div>
          <div style={{
            background: "rgba(255, 107, 107, 0.1)",
            padding: "var(--space-md)",
            borderRadius: 8,
          }}>
            <strong>Cold 전략</strong>
            <p className="subtle" style={{ marginTop: 4 }}>
              &quot;안 나온 번호는 곧 나올 차례&quot;
            </p>
          </div>
        </div>
        <p className="subtle" style={{ marginTop: "var(--space-md)" }}>
          두 전략 모두 수학적 근거는 없지만, 번호 선택의 재미로 활용할 수 있습니다.
        </p>
      </section>

      {/* 상세 통계 링크 */}
      <section className="card" style={{ background: "rgba(47, 125, 99, 0.1)", borderColor: "var(--accent)" }}>
        <h2 className="sectionTitle" style={{ color: "var(--accent-2)" }}>더 자세한 통계 확인</h2>
        <p>
          각 번호별 출현 이력과 함께 나온 번호를 확인해보세요.
        </p>
        <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
          <Link href="/stats/" className="btn btnPrimary">
            전체 번호 통계
          </Link>
          <Link href="/numbers/" className="btn btnSecondary">
            번호별 상세 분석
          </Link>
          <Link href={`/draw/${latestDraw}/`} className="btn btnSecondary">
            최신 {latestDraw}회
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
          <Link href="/guide/lotto-number-pattern/" className="chip">
            번호 패턴 분석
          </Link>
        </div>
      </section>

      {/* Navigation */}
      <div className="chipRow">
        <Link href="/" className="btn btnPrimary">홈으로</Link>
        <Link href="/draws/" className="btn btnSecondary">전체 회차 보기</Link>
      </div>
    </div>
  );
}
