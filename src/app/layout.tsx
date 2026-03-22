import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Link from "next/link";
import HeaderLogo from "../components/HeaderLogo";
import HeaderSearch from "../components/HeaderSearch";
import MobileNav from "../components/MobileNav";
import { getHistory } from "@/lib/lotto";

export const metadata: Metadata = {
  title: "로또 당첨번호 조회 | 1회~최신 회차 통계 분석",
  description: "로또 6/45 당첨번호 조회, 번호별 출현 통계, 최근 트렌드 분석. 2002년 1회부터 최신 회차까지 모든 데이터를 무료로 확인하세요.",
  metadataBase: new URL("https://lotto.newsforgreens.com"),
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "로또 당첨번호 조회 | 통계 분석",
    description: "역대 모든 로또 당첨번호와 통계를 한눈에",
    type: "website",
    locale: "ko_KR",
    siteName: "LOTTO NFG",
    images: [
      {
        url: "https://lotto.newsforgreens.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "로또 당첨번호 조회",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://lotto.newsforgreens.com/og-image.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const history = getHistory();
  const latestDraw = history.meta.latest_draw;

  return (
    <html lang="ko">
      <body>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7976139023602789"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-E4LERXXF49" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-E4LERXXF49');`}
        </Script>
        {/* Header */}
        <header className="siteHeader">
          <div className="container headerInner">
            <HeaderLogo />
            <HeaderSearch latestDraw={latestDraw} />
            <MobileNav />
          </div>
        </header>

        {/* Main Content */}
        <main className="container pageContent">
          {children}
        </main>

        {/* Footer */}
        <footer className="siteFooter">
          <div className="container footerInner">
            <p className="footerText">
              본 사이트는 정보 제공 목적으로 운영됩니다.
              공식 결과는 <a href="https://dhlottery.co.kr" target="_blank" rel="noopener noreferrer">동행복권</a>을 참고하세요.
            </p>
            <div className="footerLinks">
              <a href="/sitemap.xml">Sitemap</a>
              <a href="/robots.txt">Robots</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
