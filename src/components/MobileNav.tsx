"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/draws/", label: "회차" },
  { href: "/numbers/", label: "번호" },
  { href: "/stats/", label: "통계" },
  { href: "/calculator/", label: "계산기" },
  { href: "/check/", label: "당첨체크" },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // 페이지 이동 시 닫기
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // active 판정
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* 데스크탑: 가로 메뉴 */}
      <nav className="headerNav headerNavDesktop">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`navLink ${isActive(item.href) ? "navLinkActive" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 모바일: 토글 버튼 + 드롭다운 */}
      <div className="mobileNavWrap" ref={menuRef}>
        <button
          className="mobileNavToggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="mobile-nav-menu"
          aria-label="메뉴 열기"
        >
          <span className="mobileNavIcon">{isOpen ? "✕" : "☰"}</span>
          <span className="mobileNavText">메뉴</span>
        </button>

        {isOpen && (
          <>
            <div className="mobileNavOverlay" onClick={() => setIsOpen(false)} />
            <nav id="mobile-nav-menu" className="mobileNavDropdown">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobileNavItem ${isActive(item.href) ? "mobileNavItemActive" : ""}`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </>
        )}
      </div>
    </>
  );
}
