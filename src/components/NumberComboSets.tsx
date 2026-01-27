"use client";

import { useState, useMemo } from "react";

type Props = {
  baseNum: number;
  coOccurrence: [string, number][]; // [[상대번호, 횟수], ...]
};

function getBallClass(n: number): string {
  if (n <= 10) return "ballYellow";
  if (n <= 20) return "ballBlue";
  if (n <= 30) return "ballRed";
  if (n <= 40) return "ballGray";
  return "ballGreen";
}

export default function NumberComboSets({ baseNum, coOccurrence }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const sets = useMemo(() => {
    if (!coOccurrence || coOccurrence.length < 5) return [];

    const top20 = coOccurrence.slice(0, 20).map(([n]) => Number(n));
    const result: number[][] = [];

    // Generate 3 sets
    for (let setIdx = 0; setIdx < 3; setIdx++) {
      const set = new Set<number>([baseNum]);

      // Add top picks based on set index
      const startIdx = setIdx * 2;
      for (let i = startIdx; i < startIdx + 2 && i < top20.length; i++) {
        if (!set.has(top20[i])) set.add(top20[i]);
      }

      // Fill remaining with random from top 20
      let attempts = 0;
      while (set.size < 6 && attempts < 50) {
        const randIdx = Math.floor((Math.sin(setIdx * 100 + attempts) * 10000) % top20.length);
        const absIdx = Math.abs(randIdx);
        if (!set.has(top20[absIdx])) {
          set.add(top20[absIdx]);
        }
        attempts++;
      }

      // If still not enough, add from remaining top20
      for (const n of top20) {
        if (set.size >= 6) break;
        if (!set.has(n)) set.add(n);
      }

      const sorted = Array.from(set).sort((a, b) => a - b);
      if (sorted.length === 6) {
        result.push(sorted);
      }
    }

    return result;
  }, [baseNum, coOccurrence]);

  const handleCopy = async (idx: number, nums: number[]) => {
    const text = nums.map((n) => String(n).padStart(2, "0")).join(" ");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      alert(`복사됨: ${text}`);
    }
  };

  if (sets.length === 0) return null;

  return (
    <section className="card" style={{ background: "rgba(255, 209, 102, 0.1)", borderColor: "var(--warning)" }}>
      <h2 className="sectionTitle" style={{ color: "var(--warning)" }}>
        {baseNum}번과 함께 추천 3세트
      </h2>
      <p className="subtle">
        {baseNum}번 포함 + 자주 같이 나온 번호 조합 (통계 기반 참고용)
      </p>
      <p className="subtle" style={{ marginTop: 4, fontSize: 12, fontStyle: "italic" }}>
        이 번호를 포함해 자주 함께 나온 조합 기준입니다.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-md)",
          marginTop: "var(--space-md)",
        }}
      >
        {sets.map((nums, idx) => (
          <div
            key={idx}
            className="statCard"
            style={{
              padding: "var(--space-md)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-sm)",
              minHeight: 120,
              background: "var(--card)",
            }}
          >
            <div className="subtle" style={{ fontSize: 12 }}>
              세트 {idx + 1}
            </div>
            <div className="ballRow" style={{ justifyContent: "center" }}>
              {nums.map((n) => (
                <span
                  key={n}
                  className={`ball ballSmall ${getBallClass(n)}`}
                  style={{
                    border: n === baseNum ? "2px solid var(--warning)" : undefined,
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
            <button
              onClick={() => handleCopy(idx, nums)}
              className="btn btnSecondary"
              style={{
                marginTop: "auto",
                fontSize: 13,
                padding: "6px 12px",
              }}
            >
              {copiedIdx === idx ? "복사됨!" : "번호 복사"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
