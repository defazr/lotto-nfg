"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type SimpleDraw = {
  draw_no: number;
  date: string;
  numbers: number[];
  bonus: number;
};

type MatchResult = {
  draw_no: number;
  date: string;
  numbers: number[];
  bonus: number;
  matchCount: number;
  bonusMatch: boolean;
  rank: number | null;
  matchedNumbers: number[];
};

function getBallClass(n: number): string {
  if (n <= 10) return "ballYellow";
  if (n <= 20) return "ballBlue";
  if (n <= 30) return "ballRed";
  if (n <= 40) return "ballGray";
  return "ballGreen";
}

function getRank(matchCount: number, bonusMatch: boolean): number | null {
  if (matchCount === 6) return 1;
  if (matchCount === 5 && bonusMatch) return 2;
  if (matchCount === 5) return 3;
  if (matchCount === 4) return 4;
  if (matchCount === 3) return 5;
  return null;
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  return dateString.replaceAll("-", ".");
}

const rankLabels: Record<number, string> = {
  1: "1등",
  2: "2등",
  3: "3등",
  4: "4등",
  5: "5등",
};

const rankDescriptions: Record<number, string> = {
  1: "6개 일치",
  2: "5개 + 보너스",
  3: "5개 일치",
  4: "4개 일치",
  5: "3개 일치",
};

export default function CheckWinning({ draws }: { draws: SimpleDraw[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const toggleNumber = (n: number) => {
    setChecked(false);
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length >= 6) return prev;
      return [...prev, n].sort((a, b) => a - b);
    });
  };

  const reset = () => {
    setSelected([]);
    setChecked(false);
    setShowAll(false);
  };

  const results = useMemo(() => {
    if (!checked || selected.length !== 6) return [];

    const selectedSet = new Set(selected);
    const matched: MatchResult[] = [];

    for (const draw of draws) {
      const matchedNumbers = draw.numbers.filter((n) => selectedSet.has(n));
      const matchCount = matchedNumbers.length;
      const bonusMatch = selectedSet.has(draw.bonus);
      const rank = getRank(matchCount, bonusMatch);

      if (rank !== null) {
        matched.push({
          draw_no: draw.draw_no,
          date: draw.date,
          numbers: draw.numbers,
          bonus: draw.bonus,
          matchCount,
          bonusMatch,
          rank,
          matchedNumbers,
        });
      }
    }

    matched.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.draw_no - a.draw_no);
    return matched;
  }, [checked, selected, draws]);

  const rankCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of results) {
      if (r.rank) counts[r.rank]++;
    }
    return counts;
  }, [results]);

  const summaryText = useMemo(() => {
    if (!checked) return "";
    const parts: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (rankCounts[i] > 0) parts.push(`${i}등 ${rankCounts[i]}회`);
    }
    if (parts.length === 0) return `${draws.length}회차 중 당첨 이력이 없습니다.`;
    return `${draws.length}회차 중 ${parts.join(", ")} 당첨`;
  }, [checked, rankCounts, draws.length]);

  const displayResults = showAll ? results : results.slice(0, 50);

  return (
    <>
      {/* Number Selection Grid */}
      <section className="card">
        <h2 className="sectionTitle">번호 선택</h2>
        <p className="subtle" style={{ marginBottom: "var(--space-md)" }}>
          6개의 번호를 선택하세요 ({selected.length}/6)
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(9, 1fr)",
            gap: 6,
            maxWidth: 420,
            margin: "0 auto",
          }}
        >
          {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => {
            const isSelected = selected.includes(n);
            return (
              <button
                key={n}
                onClick={() => toggleNumber(n)}
                className={`ball ballSmall ${getBallClass(n)}`}
                style={{
                  cursor: selected.length >= 6 && !isSelected ? "default" : "pointer",
                  opacity: selected.length >= 6 && !isSelected ? 0.35 : isSelected ? 1 : 0.7,
                  transform: isSelected ? "scale(1.15)" : "scale(1)",
                  boxShadow: isSelected
                    ? "0 0 0 3px var(--accent-2), 0 4px 12px rgba(0,0,0,0.4)"
                    : "none",
                  border: "none",
                  width: "100%",
                  aspectRatio: "1",
                  height: "auto",
                  fontSize: 13,
                }}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* Selected Preview */}
        {selected.length > 0 && (
          <div
            style={{
              marginTop: "var(--space-lg)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-md)",
            }}
          >
            <div className="ballRow" style={{ justifyContent: "center" }}>
              {selected.map((n) => (
                <span key={n} className={`ball ${getBallClass(n)}`}>
                  {n}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <button
                className="btn btnPrimary"
                disabled={selected.length !== 6}
                onClick={() => setChecked(true)}
                style={{
                  opacity: selected.length !== 6 ? 0.5 : 1,
                  cursor: selected.length !== 6 ? "not-allowed" : "pointer",
                }}
              >
                당첨 확인
              </button>
              <button className="btn btnSecondary" onClick={reset}>
                초기화
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Results Summary */}
      {checked && selected.length === 6 && (
        <>
          <section className="card">
            <h2 className="sectionTitle">당첨 결과</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
              {[1, 2, 3, 4, 5].map((rank) => (
                <div
                  key={rank}
                  className="statCard"
                  style={{
                    borderColor: rankCounts[rank] > 0 ? "var(--accent)" : undefined,
                  }}
                >
                  <div
                    className="statValue"
                    style={{
                      color: rankCounts[rank] > 0 ? "var(--accent-2)" : "var(--muted)",
                      fontSize: 24,
                    }}
                  >
                    {rankCounts[rank]}회
                  </div>
                  <div className="statLabel">{rankLabels[rank]}</div>
                  <div className="subtle" style={{ fontSize: 11 }}>
                    {rankDescriptions[rank]}
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: 15,
                color: results.length > 0 ? "var(--accent-2)" : "var(--muted)",
                fontWeight: 600,
              }}
            >
              {summaryText}
            </p>
          </section>

          {/* Matched Draws List */}
          {results.length > 0 && (
            <section className="card">
              <h2 className="sectionTitle">
                매칭 회차 ({results.length}건)
              </h2>

              <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                {displayResults.map((r) => (
                  <div
                    key={r.draw_no}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "var(--space-sm)",
                      padding: "var(--space-md)",
                      background: "var(--surface)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", minWidth: 120 }}>
                      <Link
                        href={`/draw/${r.draw_no}/`}
                        style={{ fontWeight: 700, fontSize: 15 }}
                      >
                        {r.draw_no}회
                      </Link>
                      <span className="subtle">{formatDate(r.date)}</span>
                    </div>

                    <div className="ballRow" style={{ flex: 1, gap: 4 }}>
                      {r.numbers.map((n) => {
                        const isMatch = r.matchedNumbers.includes(n);
                        return (
                          <span
                            key={n}
                            className={`ball ballSmall ${getBallClass(n)}`}
                            style={{
                              opacity: isMatch ? 1 : 0.3,
                              transform: isMatch ? "scale(1.1)" : "scale(0.9)",
                            }}
                          >
                            {n}
                          </span>
                        );
                      })}
                      <span className="ballPlus" style={{ fontSize: 14 }}>+</span>
                      <span
                        className={`ball ballSmall ${getBallClass(r.bonus)} ballBonus`}
                        style={{
                          opacity: r.bonusMatch ? 1 : 0.3,
                          transform: r.bonusMatch ? "scale(1.1)" : "scale(0.9)",
                        }}
                      >
                        {r.bonus}
                      </span>
                    </div>

                    <span
                      className={`badge ${r.rank && r.rank <= 3 ? "badgeAccent" : "badgeMuted"}`}
                    >
                      {r.rank ? rankLabels[r.rank] : ""}
                    </span>
                  </div>
                ))}
              </div>

              {results.length > 50 && !showAll && (
                <button
                  className="btn btnGhost"
                  onClick={() => setShowAll(true)}
                  style={{ width: "100%", marginTop: "var(--space-md)" }}
                >
                  나머지 {results.length - 50}건 더보기
                </button>
              )}
            </section>
          )}

          {/* FAQ */}
          <section className="card">
            <h2 className="sectionTitle">자주 묻는 질문</h2>
            <div style={{ display: "grid", gap: "var(--space-sm)" }}>
              <details className="faqItem">
                <summary className="faqQuestion">
                  당첨 확인은 어떻게 하나요?
                </summary>
                <div className="faqAnswer">
                  선택한 6개 번호를 1회부터 최신 회차까지 모든 추첨 결과와
                  비교합니다. 메인 번호 일치 수와 보너스 번호 일치 여부를 기준으로
                  1등~5등을 판정합니다.
                </div>
              </details>
              <details className="faqItem">
                <summary className="faqQuestion">등수 기준은?</summary>
                <div className="faqAnswer">
                  <strong>1등</strong>: 6개 번호 모두 일치
                  <br />
                  <strong>2등</strong>: 5개 일치 + 보너스 번호 일치
                  <br />
                  <strong>3등</strong>: 5개 일치
                  <br />
                  <strong>4등</strong>: 4개 일치
                  <br />
                  <strong>5등</strong>: 3개 일치
                </div>
              </details>
            </div>
          </section>

          {/* Navigation */}
          <div className="chipRow">
            <Link href="/" className="btn btnSecondary" style={{ flex: 1, textAlign: "center" }}>
              추천번호
            </Link>
            <Link
              href={`/draw/${draws[draws.length - 1]?.draw_no}/`}
              className="btn btnSecondary"
              style={{ flex: 1, textAlign: "center" }}
            >
              최신 회차
            </Link>
            <Link href="/stats/" className="btn btnSecondary" style={{ flex: 1, textAlign: "center" }}>
              통계
            </Link>
          </div>
        </>
      )}
    </>
  );
}
