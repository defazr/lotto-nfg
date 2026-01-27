import Link from "next/link";
import { getHistory } from "@/lib/lotto";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로또 당첨 확률 계산 | 1등 확률은 얼마일까?",
  description: "로또 6/45 당첨 확률을 수학적으로 계산합니다. 1등부터 5등까지 각 등수별 확률과 기대값을 알아보세요.",
  alternates: {
    canonical: "https://lotto.newsforgreens.com/guide/lotto-probability/",
  },
};

export default function LottoProbabilityPage() {
  const history = getHistory();
  const latestDraw = history.meta.latest_draw;
  const totalDraws = history.meta.total_draws;

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      {/* Header */}
      <section className="card">
        <h1>로또 당첨 확률 계산</h1>
        <p className="subtle" style={{ marginTop: 8 }}>
          로또 6/45의 당첨 확률을 수학적으로 분석합니다.
        </p>
      </section>

      {/* 1등 확률 */}
      <section className="card">
        <h2 className="sectionTitle">1등 당첨 확률</h2>
        <p>
          로또 1등은 45개 숫자 중 6개를 모두 맞춰야 합니다.
        </p>
        <div style={{
          background: "var(--bg-alt)",
          padding: "var(--space-md)",
          borderRadius: 8,
          marginTop: "var(--space-md)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 14, color: "var(--text-subtle)" }}>조합의 수</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
            ₄₅C₆ = 8,145,060
          </div>
          <div style={{ fontSize: 14, color: "var(--text-subtle)", marginTop: 8 }}>1등 확률</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--accent)" }}>
            1 / 8,145,060
          </div>
          <div style={{ fontSize: 14, color: "var(--text-subtle)", marginTop: 4 }}>
            약 0.0000123% (814만 분의 1)
          </div>
        </div>
        <p style={{ marginTop: "var(--space-md)" }}>
          매주 1장씩 산다면, 통계적으로 <strong>약 15만 6천 년</strong>에 한 번 1등에 당첨됩니다.
        </p>
      </section>

      {/* 등수별 확률 */}
      <section className="card">
        <h2 className="sectionTitle">등수별 당첨 확률</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "var(--space-md)" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>등수</th>
              <th style={{ padding: "8px", textAlign: "left" }}>조건</th>
              <th style={{ padding: "8px", textAlign: "right" }}>확률</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "8px" }}><strong>1등</strong></td>
              <td style={{ padding: "8px" }}>6개 번호 일치</td>
              <td style={{ padding: "8px", textAlign: "right" }}>1/8,145,060</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "8px" }}><strong>2등</strong></td>
              <td style={{ padding: "8px" }}>5개 + 보너스</td>
              <td style={{ padding: "8px", textAlign: "right" }}>1/1,357,510</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "8px" }}><strong>3등</strong></td>
              <td style={{ padding: "8px" }}>5개 번호 일치</td>
              <td style={{ padding: "8px", textAlign: "right" }}>1/35,724</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "8px" }}><strong>4등</strong></td>
              <td style={{ padding: "8px" }}>4개 번호 일치</td>
              <td style={{ padding: "8px", textAlign: "right" }}>1/733</td>
            </tr>
            <tr>
              <td style={{ padding: "8px" }}><strong>5등</strong></td>
              <td style={{ padding: "8px" }}>3개 번호 일치</td>
              <td style={{ padding: "8px", textAlign: "right" }}>1/45</td>
            </tr>
          </tbody>
        </table>
        <p className="subtle" style={{ marginTop: "var(--space-md)" }}>
          5등은 약 2.2% 확률로, 45장 구매 시 평균 1장 당첨됩니다.
        </p>
      </section>

      {/* 기대값 */}
      <section className="card">
        <h2 className="sectionTitle">로또의 기대값</h2>
        <p>
          로또 1장(1,000원)의 통계적 기대값은 약 <strong>500원</strong>입니다.
        </p>
        <ul style={{ marginTop: "var(--space-md)", paddingLeft: 20 }}>
          <li>판매액의 약 50%가 당첨금으로 지급</li>
          <li>나머지는 복권기금(공익사업)으로 사용</li>
          <li>장기적으로는 손해지만, 꿈을 사는 비용으로 생각하면 OK</li>
        </ul>
      </section>

      {/* 실제 데이터 연결 */}
      <section className="card" style={{ background: "rgba(47, 125, 99, 0.1)", borderColor: "var(--accent)" }}>
        <h2 className="sectionTitle" style={{ color: "var(--accent-2)" }}>실제 당첨 데이터 확인하기</h2>
        <p>
          현재까지 총 <strong>{totalDraws}회</strong> 추첨이 진행되었습니다.
          역대 당첨번호 통계를 확인해보세요.
        </p>
        <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
          <Link href="/stats/" className="btn btnPrimary">
            번호별 출현 통계 보기
          </Link>
          <Link href={`/draw/${latestDraw}/`} className="btn btnSecondary">
            최신 {latestDraw}회 당첨번호
          </Link>
        </div>
      </section>

      {/* 관련 가이드 */}
      <section className="card">
        <h2 className="sectionTitle">관련 가이드</h2>
        <div className="chipRow">
          <Link href="/guide/lotto-hot-cold/" className="chip">
            많이/적게 나온 번호 분석
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
