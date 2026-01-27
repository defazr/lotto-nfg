"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  latestDraw: number;
};

export default function HeaderSearch({ latestDraw }: Props) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    const raw = query.trim();
    if (!raw) {
      setError("숫자를 입력하세요");
      return;
    }

    const q = raw.toLowerCase();

    // 키워드 기반 이동
    if (q === "통계" || q === "stats" || q === "stat") {
      router.push("/stats/");
      setQuery("");
      setError("");
      return;
    }

    if (q === "전체" || q === "회차" || q === "draws" || q === "전체회차") {
      router.push("/draws/");
      setQuery("");
      setError("");
      return;
    }

    // 숫자 추출 (첫 번째 정수)
    const numMatch = raw.match(/\d+/);
    if (!numMatch) {
      setError("`1205` 또는 `7`처럼 숫자만 입력하면 바로 이동돼요.");
      return;
    }

    const num = parseInt(numMatch[0], 10);

    // "회차" 키워드 포함 시 회차로 우선 처리
    const hasRoundKeyword = /회차|회|draw|round/i.test(q);

    if (hasRoundKeyword) {
      // 회차로 이동
      if (num >= 1 && num <= latestDraw) {
        router.push(`/draw/${num}/`);
        setQuery("");
        setError("");
        return;
      } else {
        setError(`회차는 1~${latestDraw} 범위만 가능`);
        return;
      }
    }

    // "번호" 키워드 포함 시 번호로 우선 처리
    const hasNumberKeyword = /번호|번|num|number/i.test(q);

    if (hasNumberKeyword) {
      if (num >= 1 && num <= 45) {
        router.push(`/number/${num}/`);
        setQuery("");
        setError("");
        return;
      } else {
        setError("번호는 1~45 범위만 가능");
        return;
      }
    }

    // 키워드 없으면 숫자 범위로 판단
    // 1~45: 번호 페이지
    if (num >= 1 && num <= 45) {
      router.push(`/number/${num}/`);
      setQuery("");
      setError("");
      return;
    }

    // 46~latestDraw: 회차 페이지
    if (num <= latestDraw) {
      router.push(`/draw/${num}/`);
      setQuery("");
      setError("");
      return;
    }

    // 범위 초과
    setError(`1~${latestDraw} 범위만 가능`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="headerSearch">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setError("");
        }}
        onKeyDown={handleKeyDown}
        placeholder="회차/번호"
        className="headerSearchInput"
      />
      <button onClick={handleSearch} className="headerSearchBtn">
        이동
      </button>
      {error && <span className="headerSearchError">{error}</span>}
    </div>
  );
}
