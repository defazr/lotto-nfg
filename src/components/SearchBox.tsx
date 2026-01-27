"use client";

import { useState } from "react";

type Props = {
  latestRound: number;
};

export default function SearchBox({ latestRound }: Props) {
  const [searchRound, setSearchRound] = useState("");
  const [searchNumber, setSearchNumber] = useState("");

  const handleRoundSearch = () => {
    const round = parseInt(searchRound);
    if (round >= 1 && round <= latestRound) {
      window.location.href = `/draw/${round}/`;
    }
  };

  const handleNumberSearch = () => {
    const num = parseInt(searchNumber);
    if (num >= 1 && num <= 45) {
      window.location.href = `/number/${num}/`;
    }
  };

  return (
    <div className="grid2">
      <section className="card">
        <h2 className="sectionTitle">회차 검색</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            placeholder={`1~${latestRound}`}
            value={searchRound}
            onChange={(e) => setSearchRound(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRoundSearch()}
            className="input"
            style={{ flex: 1 }}
            min={1}
            max={latestRound}
          />
          <button onClick={handleRoundSearch} className="btn btnPrimary">
            이동
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="sectionTitle">번호 분석</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            placeholder="1~45"
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNumberSearch()}
            className="input"
            style={{ flex: 1 }}
            min={1}
            max={45}
          />
          <button onClick={handleNumberSearch} className="btn btnPrimary">
            분석
          </button>
        </div>
      </section>
    </div>
  );
}
