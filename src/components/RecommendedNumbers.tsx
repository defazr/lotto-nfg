"use client";

import { useState, useMemo } from "react";
import { inc } from "@/lib/metrics";

type NumberStat = {
  num: number;
  count: number;
  last_seen: number;
};

type Props = {
  numberStats: NumberStat[];
  latestDraw: number;
};

function getBallClass(n: number): string {
  if (n <= 10) return "ballYellow";
  if (n <= 20) return "ballBlue";
  if (n <= 30) return "ballRed";
  if (n <= 40) return "ballGray";
  return "ballGreen";
}

function generateSet(
  hot: number[],
  cold: number[],
  mid: number[],
  seed: number,
  excludeKeys: Set<string> = new Set()
): number[] | null {
  // LCG-based seeded random with state
  let state = seed | 0;
  const nextRandom = () => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };

  // Fisher-Yates shuffle
  const shuffle = <T,>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  for (let attempt = 0; attempt < 50; attempt++) {
    state = seed + attempt * 137;
    const pick: number[] = [];

    // Pick 2 from hot
    const hotShuffled = shuffle(hot);
    pick.push(hotShuffled[0], hotShuffled[1]);

    // Pick 2 from cold
    const coldShuffled = shuffle(cold);
    pick.push(coldShuffled[0], coldShuffled[1]);

    // Pick 2 from mid
    const midShuffled = shuffle(mid);
    pick.push(midShuffled[0], midShuffled[1]);

    // Check uniqueness
    if (new Set(pick).size !== 6) continue;

    const sorted = [...pick].sort((a, b) => a - b);
    const key = sorted.join(",");
    if (excludeKeys.has(key)) continue;

    const oddCount = pick.filter((n) => n % 2 === 1).length;
    const sum = pick.reduce((a, b) => a + b, 0);

    // Progressive relaxation: strict → relaxed → no constraint
    if (attempt < 20) {
      if (oddCount !== 3) continue;
      if (sum < 110 || sum > 160) continue;
    } else if (attempt < 35) {
      if (oddCount < 2 || oddCount > 4) continue;
      if (sum < 90 || sum > 180) continue;
    }
    // attempt >= 35: accept any valid unique set

    return sorted;
  }

  // Fallback
  state = seed;
  const fallback: number[] = [];
  const hotShuffled = shuffle(hot);
  const coldShuffled = shuffle(cold);
  const midShuffled = shuffle(mid);
  fallback.push(hotShuffled[0], hotShuffled[1]);
  fallback.push(coldShuffled[0], coldShuffled[1]);
  fallback.push(midShuffled[0], midShuffled[1]);
  return [...new Set(fallback)].slice(0, 6).sort((a, b) => a - b);
}

export default function RecommendedNumbers({ numberStats, latestDraw }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const sets = useMemo(() => {
    // Sort by count
    const sorted = [...numberStats].sort((a, b) => b.count - a.count);
    const hot = sorted.slice(0, 15).map((s) => s.num);
    const cold = sorted.slice(-15).map((s) => s.num);
    const mid = sorted.slice(15, 30).map((s) => s.num);

    // Use date-based seed for variety
    const today = new Date();
    const baseSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    const result: number[][] = [];
    const usedKeys = new Set<string>();

    for (let i = 0; i < 3; i++) {
      const seed = baseSeed * (i + 1) + i * 123456;
      const set = generateSet(hot, cold, mid, seed, usedKeys);
      if (set && set.length === 6) {
        usedKeys.add(set.join(","));
        result.push(set);
      }
    }

    return result;
  }, [numberStats]);

  const handleCopy = async (idx: number, nums: number[]) => {
    inc("reco_copy_click");
    const text = nums.map((n) => String(n).padStart(2, "0")).join(" ");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      alert(`복사됨: ${text}`);
    }
  };

  const handleSave = () => {
    inc("save_reco_click");
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const data = {
      date: dateStr,
      latestDraw,
      numbers: sets,
    };
    localStorage.setItem("saved_recommendation", JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (sets.length === 0) return null;

  return (
    <section className="card">
      <h2 className="sectionTitle">이번주 추천 3세트</h2>
      <p className="subtle" style={{ marginBottom: "var(--space-md)" }}>
        통계 기반 참고용 (확률 보장 아님) · 1~{latestDraw}회 데이터 기준
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-md)",
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
            }}
          >
            <div className="subtle" style={{ fontSize: 12 }}>
              세트 {idx + 1}
            </div>
            <div className="ballRow" style={{ justifyContent: "center" }}>
              {nums.map((n) => (
                <span key={n} className={`ball ballSmall ${getBallClass(n)}`}>
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

      {/* 저장 버튼 */}
      <div style={{ marginTop: "var(--space-md)", textAlign: "center" }}>
        <button
          onClick={handleSave}
          className="btn btnPrimary"
          style={{ minWidth: 200 }}
        >
          {saved ? "저장됨!" : "이번주 추천번호 저장하기"}
        </button>
        <p className="subtle" style={{ marginTop: "var(--space-sm)", fontSize: 12 }}>
          다음 회차 참고용으로 브라우저에 저장됩니다
        </p>
        <p className="subtle" style={{ marginTop: "var(--space-sm)", fontSize: 12, fontStyle: "italic" }}>
          참고용으로 저장해 두면 다음 회차 확인할 때 비교하기 편합니다.
        </p>
      </div>
    </section>
  );
}
