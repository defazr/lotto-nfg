"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HeaderLogo() {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      className="siteLogo"
      aria-label="홈으로"
      onClick={(e) => {
        if (pathname === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
    >
      <span className="logoText">LOTTO NFG</span>
      <span className="logoSub">회차·번호·통계 분석</span>
    </Link>
  );
}
