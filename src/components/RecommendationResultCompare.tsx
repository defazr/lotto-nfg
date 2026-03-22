"use client";

import { useState, useEffect } from "react";

type Props = {
  currentDraw: number;
  winNumbers: number[];
  bonus: number;
};

type SavedData = {
  date: string;
  latestDraw: number;
  numbers: number[][];
};

function getBallClass(n: number): string {
  if (n <= 10) return "ballYellow";
  if (n <= 20) return "ballBlue";
  if (n <= 30) return "ballRed";
  if (n <= 40) return "ballGray";
  return "ballGreen";
}

function getRank(mainMatch: number, bonusUsed: boolean): string {
  if (mainMatch === 6) return "1등";
  if (mainMatch === 5 && bonusUsed) return "2등";
  if (mainMatch === 5) return "3등";
  if (mainMatch === 4) return "4등";
  if (mainMatch === 3) return "5등";
  return "낙첨";
}

function getRankStyle(rank: string): React.CSSProperties {
  if (rank === "1등") return { color: "#fbbf24", fontWeight: 800 };
  if (rank === "2등") return { color: "#60a5fa", fontWeight: 700 };
  if (rank === "3등") return { color: "#f87171", fontWeight: 700 };
  if (rank === "4등" || rank === "5등") return { color: "var(--accent-2)", fontWeight: 600 };
  return { color: "var(--muted)" };
}

function compareSet(
  set: number[],
  winNumbers: number[],
  bonus: number
): { mainMatch: number; bonusUsed: boolean; rank: string; matched: Set<number> } {
  const winSet = new Set(winNumbers);
  const matched = new Set<number>();
  for (const n of set) {
    if (winSet.has(n)) matched.add(n);
  }
  const mainMatch = matched.size;

  let bonusUsed = false;
  if (mainMatch === 5) {
    const unmatched = set.filter((n) => !winSet.has(n));
    if (unmatched.length === 1 && unmatched[0] === bonus) {
      bonusUsed = true;
    }
  }

  return { mainMatch, bonusUsed, rank: getRank(mainMatch, bonusUsed), matched };
}

export default function RecommendationResultCompare({ currentDraw, winNumbers, bonus }: Props) {
  const [saved, setSaved] = useState<SavedData | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("saved_recommendation");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.numbers) && typeof parsed.latestDraw === "number") {
        setSaved(parsed);
      }
    } catch {
      setUnavailable(true);
    }
  }, []);

  if (unavailable) {
    return (
      <section className="card">
        <h2 className="sectionTitle">추천번호 결과 비교</h2>
        <p className="subtle">추천번호 결과 비교를 사용할 수 없습니다.</p>
      </section>
    );
  }

  if (!saved || !saved.numbers || saved.numbers.length === 0) {
    return (
      <section className="card">
        <h2 className="sectionTitle">추천번호 결과 비교</h2>
        <p className="subtle">저장된 추천번호가 없습니다. 위에서 추천번호를 저장하면 추첨 결과와 비교할 수 있습니다.</p>
      </section>
    );
  }

  const isCurrent = saved.latestDraw === currentDraw;

  const results = saved.numbers.map((set) => compareSet(set, winNumbers, bonus));

  const renderResults = (sets: number[][], results: ReturnType<typeof compareSet>[], drawNo: number) => (
    <div style={{ display: "grid", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
      {sets.map((set, idx) => {
        const r = results[idx];
        return (
          <div
            key={idx}
            className="statCard"
            style={{
              padding: "var(--space-md)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
              flexWrap: "wrap",
            }}
          >
            <div className="subtle" style={{ fontSize: 12, minWidth: 50 }}>세트 {idx + 1}</div>
            <div className="ballRow" style={{ flex: 1 }}>
              {set.map((n) => (
                <span
                  key={n}
                  className={`ball ballSmall ${getBallClass(n)}`}
                  style={{
                    opacity: r.matched.has(n) ? 1 : 0.35,
                    outline: r.matched.has(n) ? "2px solid var(--accent-2)" : "none",
                    outlineOffset: 2,
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
            <div style={{ textAlign: "right", minWidth: 80 }}>
              <div style={getRankStyle(r.rank)}>{r.rank}</div>
              <div className="subtle" style={{ fontSize: 11 }}>
                {r.mainMatch}개 일치{r.bonusUsed && " +보너스"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="card">
      <h2 className="sectionTitle">추천번호 결과 비교</h2>
      <p className="subtle">
        저장된 추천번호와 {currentDraw}회 당첨번호를 비교한 결과입니다.
      </p>

      {isCurrent ? (
        <>
          <div className="subtle" style={{ marginTop: "var(--space-md)", fontWeight: 600 }}>
            {saved.latestDraw}회 추천번호 결과
          </div>
          {renderResults(saved.numbers, results, saved.latestDraw)}
        </>
      ) : (
        <>
          <div
            className="subtle"
            style={{
              marginTop: "var(--space-md)",
              padding: "var(--space-sm) var(--space-md)",
              background: "var(--surface)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            저장된 추천번호는 {saved.latestDraw}회 기준입니다. (현재 {currentDraw}회)
          </div>
          <button
            onClick={() => setShowPast(!showPast)}
            className="btn btnSecondary"
            style={{ marginTop: "var(--space-sm)", fontSize: 13, padding: "8px 14px" }}
          >
            {showPast ? "지난 회차 결과 접기" : "지난 회차 결과 펼치기"}
          </button>
          {showPast && renderResults(saved.numbers, results, saved.latestDraw)}
        </>
      )}
    </section>
  );
}
