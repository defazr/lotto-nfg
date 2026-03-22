"use client";

import { useState } from "react";

const TAX_THRESHOLD = 300_000_000; // 3억원
const TAX_RATE_LOW = 0.22; // 소득세 20% + 지방소득세 2%
const TAX_RATE_HIGH = 0.33; // 소득세 30% + 지방소득세 3%
const TAX_FREE_LIMIT = 50_000; // 5만원 이하 비과세

const RANK_DEFAULTS: { label: string; amount: number }[] = [
  { label: "1등 (평균)", amount: 2_000_000_000 },
  { label: "2등 (평균)", amount: 50_000_000 },
  { label: "3등 (평균)", amount: 1_500_000 },
  { label: "4등", amount: 50_000 },
  { label: "5등", amount: 5_000 },
];

function calculateTax(prize: number) {
  if (prize <= TAX_FREE_LIMIT) {
    return { tax: 0, net: prize, taxRate: "0%", breakdown: "비과세 (5만원 이하)" };
  }

  let tax: number;
  let breakdown: string;

  if (prize <= TAX_THRESHOLD) {
    tax = Math.floor(prize * TAX_RATE_LOW);
    breakdown = `${formatWon(prize)} × 22%`;
  } else {
    const taxLow = Math.floor(TAX_THRESHOLD * TAX_RATE_LOW);
    const taxHigh = Math.floor((prize - TAX_THRESHOLD) * TAX_RATE_HIGH);
    tax = taxLow + taxHigh;
    breakdown = `3억 × 22% = ${formatWon(taxLow)} + ${formatWon(prize - TAX_THRESHOLD)} × 33% = ${formatWon(taxHigh)}`;
  }

  const net = prize - tax;
  const effectiveRate = ((tax / prize) * 100).toFixed(1) + "%";

  return { tax, net, taxRate: effectiveRate, breakdown };
}

function formatWon(n: number): string {
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000);
    const remainder = n % 100_000_000;
    if (remainder === 0) return `${eok}억원`;
    const man = Math.floor(remainder / 10_000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  if (n >= 10_000) {
    const man = Math.floor(n / 10_000);
    const remainder = n % 10_000;
    return remainder === 0 ? `${man.toLocaleString()}만원` : `${man.toLocaleString()}만 ${remainder.toLocaleString()}원`;
  }
  return `${n.toLocaleString()}원`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

export default function PrizeCalculator() {
  const [input, setInput] = useState("");

  const prizeAmount = parseInt(input.replace(/[^0-9]/g, ""), 10) || 0;
  const result = calculateTax(prizeAmount);

  const handleInput = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits === "") {
      setInput("");
      return;
    }
    const num = parseInt(digits, 10);
    setInput(num.toLocaleString("ko-KR"));
  };

  const handleQuick = (amount: number) => {
    setInput(amount.toLocaleString("ko-KR"));
  };

  return (
    <>
      {/* Calculator Input */}
      <section className="card">
        <h2 className="sectionTitle">당첨금 입력</h2>

        <div style={{ marginBottom: "var(--space-md)" }}>
          <label className="subtle" style={{ display: "block", marginBottom: "var(--space-xs)", fontSize: 13 }}>
            당첨금액 (원)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="당첨금을 입력하세요"
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 18,
              fontWeight: 600,
              border: "2px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              color: "var(--fg)",
              textAlign: "right",
              boxSizing: "border-box",
            }}
          />
          {prizeAmount > 0 && (
            <div className="subtle" style={{ marginTop: 4, fontSize: 13, textAlign: "right" }}>
              {formatWon(prizeAmount)}
            </div>
          )}
        </div>

        {/* Quick select buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)" }}>
          {RANK_DEFAULTS.map((r) => (
            <button
              key={r.label}
              onClick={() => handleQuick(r.amount)}
              className="btn btnSecondary"
              style={{ fontSize: 13, padding: "6px 12px" }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      {/* Result */}
      {prizeAmount > 0 && (
        <section className="card">
          <h2 className="sectionTitle">계산 결과</h2>

          <div style={{ display: "grid", gap: "var(--space-md)" }}>
            {/* Net amount - highlighted */}
            <div
              className="statCard"
              style={{
                padding: "var(--space-lg)",
                textAlign: "center",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>실수령액</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{formatNumber(result.net)}원</div>
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>{formatWon(result.net)}</div>
            </div>

            {/* Breakdown grid */}
            <div className="grid2">
              <div className="statCard" style={{ padding: "var(--space-md)", textAlign: "center" }}>
                <div className="subtle" style={{ fontSize: 13 }}>당첨금</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{formatNumber(prizeAmount)}원</div>
              </div>
              <div className="statCard" style={{ padding: "var(--space-md)", textAlign: "center" }}>
                <div className="subtle" style={{ fontSize: 13 }}>세금 합계</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "#f87171" }}>
                  -{formatNumber(result.tax)}원
                </div>
              </div>
            </div>

            {/* Detail breakdown */}
            <div className="statCard" style={{ padding: "var(--space-md)" }}>
              <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                <div className="flexBetween">
                  <span className="subtle">실효세율</span>
                  <span style={{ fontWeight: 600 }}>{result.taxRate}</span>
                </div>
                <div className="flexBetween">
                  <span className="subtle">세금 계산</span>
                  <span style={{ fontSize: 13 }}>{result.breakdown}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tax info */}
      <section className="card">
        <h2 className="sectionTitle">로또 세금 안내</h2>
        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          <div className="statCard" style={{ padding: "var(--space-md)" }}>
            <div className="flexBetween" style={{ flexWrap: "wrap", gap: "var(--space-sm)" }}>
              <div>
                <div style={{ fontWeight: 600 }}>5만원 이하</div>
                <div className="subtle" style={{ fontSize: 13 }}>4등, 5등</div>
              </div>
              <div style={{ fontWeight: 700, color: "var(--accent)" }}>비과세 (0%)</div>
            </div>
          </div>
          <div className="statCard" style={{ padding: "var(--space-md)" }}>
            <div className="flexBetween" style={{ flexWrap: "wrap", gap: "var(--space-sm)" }}>
              <div>
                <div style={{ fontWeight: 600 }}>5만원 초과 ~ 3억원</div>
                <div className="subtle" style={{ fontSize: 13 }}>소득세 20% + 지방소득세 2%</div>
              </div>
              <div style={{ fontWeight: 700, color: "#fbbf24" }}>22%</div>
            </div>
          </div>
          <div className="statCard" style={{ padding: "var(--space-md)" }}>
            <div className="flexBetween" style={{ flexWrap: "wrap", gap: "var(--space-sm)" }}>
              <div>
                <div style={{ fontWeight: 600 }}>3억원 초과분</div>
                <div className="subtle" style={{ fontSize: 13 }}>소득세 30% + 지방소득세 3%</div>
              </div>
              <div style={{ fontWeight: 700, color: "#f87171" }}>33%</div>
            </div>
          </div>
        </div>
      </section>

      {/* Note */}
      <section className="card" style={{ background: "var(--surface)", borderLeft: "3px solid var(--accent)" }}>
        <div className="subtle" style={{ lineHeight: 1.8 }}>
          <strong>참고사항</strong><br />
          세율은 소득세법 기준이며, 실제 수령액은 지급 방식이나 기타 공제에 따라 다를 수 있습니다.
          정확한 세금 계산은 국세청 또는 세무사에게 문의하세요.
        </div>
      </section>
    </>
  );
}
