"use client";

import { useState } from "react";
import { inc } from "@/lib/metrics";

type Props = {
  numbers: number[];
  drawNo: number;
};

export default function DrawActions({ numbers, drawNo }: Props) {
  const [copied, setCopied] = useState<"numbers" | "url" | null>(null);

  const numbersText = numbers.map((n) => String(n).padStart(2, "0")).join(" ");
  const pageUrl = `https://lotto.newsforgreens.com/draw/${drawNo}/`;

  const handleCopyNumbers = async () => {
    inc("draw_copy_click");
    try {
      await navigator.clipboard.writeText(numbersText);
      setCopied("numbers");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      alert(`복사됨: ${numbersText}`);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `로또 ${drawNo}회 당첨번호`,
      text: `${drawNo}회 당첨번호: ${numbersText}`,
      url: pageUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or error
      }
    } else {
      try {
        await navigator.clipboard.writeText(pageUrl);
        setCopied("url");
        setTimeout(() => setCopied(null), 1500);
      } catch {
        alert(`URL: ${pageUrl}`);
      }
    }
  };

  return (
    <div style={{ marginTop: "var(--space-md)" }}>
      <div className="chipRow">
        <button
          onClick={handleCopyNumbers}
          className="btn btnSecondary"
          style={{ fontSize: 13, padding: "8px 16px" }}
        >
          {copied === "numbers" ? "복사됨!" : "번호 복사"}
        </button>
        <button
          onClick={handleShare}
          className="btn btnSecondary"
          style={{ fontSize: 13, padding: "8px 16px" }}
        >
          {copied === "url" ? "URL 복사됨!" : "공유하기"}
        </button>
      </div>
      <p className="subtle" style={{ marginTop: "var(--space-sm)", fontSize: 12, fontStyle: "italic" }}>
        메모·카톡으로 공유해 두면 다음 회차 비교가 쉬워요.
      </p>
    </div>
  );
}
