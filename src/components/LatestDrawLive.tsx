"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type LatestDraw = {
  draw_no: number;
  date?: string;
  draw_date?: string;
  numbers: number[];
  bonus: number;
};

type CacheData = {
  latest_draw: LatestDraw;
};

function formatDate(dateString?: string | null): string {
  if (!dateString) return "";
  return dateString.replaceAll("-", ".");
}

function getBallClass(n: number): string {
  if (n <= 10) return "ballYellow";
  if (n <= 20) return "ballBlue";
  if (n <= 30) return "ballRed";
  if (n <= 40) return "ballGray";
  return "ballGreen";
}

type Props = {
  fallback: LatestDraw;
};

export default function LatestDrawLive({ fallback }: Props) {
  const [latest, setLatest] = useState<LatestDraw>(fallback);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch(`/data/lotto_cache.json?v=${Date.now()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data: CacheData = await res.json();
          if (data.latest_draw && data.latest_draw.draw_no >= fallback.draw_no) {
            setLatest(data.latest_draw);
            setIsLive(true);
          }
        }
      } catch {
        // 실패 시 fallback 유지
      }
    };
    fetchLatest();
  }, [fallback.draw_no]);

  const latestRound = latest.draw_no;
  const sum = latest.numbers.reduce((a, b) => a + b, 0);
  const oddCount = latest.numbers.filter((n) => n % 2 === 1).length;

  const sorted = [...latest.numbers].sort((a, b) => a - b);
  const hasConsecutive = sorted.some((n, i) => i > 0 && n === sorted[i - 1] + 1);

  const zones = [0, 0, 0, 0, 0];
  latest.numbers.forEach((n) => {
    if (n <= 10) zones[0]++;
    else if (n <= 20) zones[1]++;
    else if (n <= 30) zones[2]++;
    else if (n <= 40) zones[3]++;
    else zones[4]++;
  });

  return (
    <section className="card cardClickable" style={{ position: "relative" }}>
      {/* 카드 전체 클릭 영역 */}
      <Link
        href={`/draw/${latestRound}/`}
        aria-label={`${latestRound}회 상세 보기`}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
      />
      <div className="flexBetween" style={{ flexWrap: "wrap" }}>
        <div>
          <span className="badge badgeAccent">
            {isLive ? "LIVE" : "최신"}
          </span>
          <h2 style={{ marginTop: 8 }}>제 {latestRound}회 당첨번호</h2>
          <p className="subtle" style={{ marginTop: 4 }}>
            {formatDate(latest.date || latest.draw_date)} 추첨
          </p>
        </div>
        <Link
          href={`/draw/${latestRound}/`}
          className="btn btnSecondary btnSmall"
          style={{ position: "relative", zIndex: 2 }}
        >
          상세 분석 →
        </Link>
      </div>

      <div className="ballRow" style={{ marginTop: "var(--space-lg)", position: "relative", zIndex: 2 }}>
        {latest.numbers.map((n) => (
          <Link
            key={n}
            href={`/number/${n}/`}
            className={`ball ${getBallClass(n)}`}
          >
            {n}
          </Link>
        ))}
        <span className="ballPlus">+</span>
        <Link
          href={`/number/${latest.bonus}/`}
          className={`ball ballBonus ${getBallClass(latest.bonus)}`}
        >
          {latest.bonus}
        </Link>
      </div>

      {/* Zone Distribution Bar */}
      <div style={{ marginTop: "var(--space-lg)" }}>
        <div className="subtle" style={{ marginBottom: 8 }}>
          구간 분포
        </div>
        <div className="zoneBar">
          {zones.map((count, idx) => (
            <div
              key={idx}
              className={`zoneSegment zoneSegment${idx + 1}`}
              style={{ width: `${(count / 6) * 100}%` }}
            />
          ))}
        </div>
        <div
          className="subtle"
          style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}
        >
          <span>1~10: {zones[0]}개</span>
          <span>11~20: {zones[1]}개</span>
          <span>21~30: {zones[2]}개</span>
          <span>31~40: {zones[3]}개</span>
          <span>41~45: {zones[4]}개</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid3" style={{ marginTop: "var(--space-lg)" }}>
        <div className="statCard" style={{ padding: "var(--space-md)" }}>
          <div className="statValue" style={{ fontSize: 24 }}>
            {sum}
          </div>
          <div className="statLabel">합계</div>
        </div>
        <div className="statCard" style={{ padding: "var(--space-md)" }}>
          <div className="statValue" style={{ fontSize: 24 }}>
            {oddCount}:{6 - oddCount}
          </div>
          <div className="statLabel">홀/짝</div>
        </div>
        <div className="statCard" style={{ padding: "var(--space-md)" }}>
          <div className="statValue" style={{ fontSize: 24 }}>
            {hasConsecutive ? "O" : "X"}
          </div>
          <div className="statLabel">연속수</div>
        </div>
      </div>
    </section>
  );
}
