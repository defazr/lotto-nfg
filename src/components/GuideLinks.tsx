"use client";

import Link from "next/link";
import { inc } from "@/lib/metrics";

export default function GuideLinks() {
  const handleClick = () => {
    inc("guide_link_click");
  };

  return (
    <div className="guideQuickLinks">
      <Link
        href="/guide/lotto-probability/"
        className="guideLink"
        onClick={handleClick}
      >
        로또 당첨 확률 계산
      </Link>
      <Link
        href="/guide/lotto-number-pattern/"
        className="guideLink"
        onClick={handleClick}
      >
        자주 나오는 번호 패턴
      </Link>
      <Link
        href="/guide/lotto-hot-cold/"
        className="guideLink"
        onClick={handleClick}
      >
        많이 나온 번호 vs 안 나온 번호
      </Link>
    </div>
  );
}
