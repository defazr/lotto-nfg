import type { Metadata } from "next";
import { getHistory, getAllRounds, findDraw } from "@/lib/lotto";
import CheckWinning from "@/components/CheckWinning";
import AdBanner from "@/components/AdBanner";

export const metadata: Metadata = {
  title: "로또 번호 당첨 체크 | 내 번호 시뮬레이션",
  description:
    "내 로또 번호가 역대 전체 회차에서 몇 등이었는지 확인하세요. 1회부터 최신 회차까지 무료 시뮬레이션.",
  alternates: {
    canonical: "https://lotto.newsforgreens.com/check/",
  },
  openGraph: {
    title: "로또 번호 당첨 체크 | 내 번호 시뮬레이션",
    description:
      "내 로또 번호가 역대 전체 회차에서 몇 등이었는지 확인하세요.",
    url: "https://lotto.newsforgreens.com/check/",
    type: "website",
    locale: "ko_KR",
    siteName: "LOTTO NFG",
    images: [
      {
        url: "https://lotto.newsforgreens.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "로또 번호 당첨 체크",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://lotto.newsforgreens.com/og-image.jpg"],
  },
};

type SimpleDraw = {
  draw_no: number;
  date: string;
  numbers: number[];
  bonus: number;
};

export default function CheckPage() {
  const history = getHistory();
  const rounds = getAllRounds(history);

  const draws: SimpleDraw[] = rounds.map((r) => {
    const d = findDraw(history, r)!;
    return {
      draw_no: d.draw_no,
      date: (d.draw_date || d.date || "") as string,
      numbers: d.numbers,
      bonus: d.bonus,
    };
  });

  return (
    <div
      style={{
        display: "grid",
        gap: "var(--space-lg)",
        gridTemplateColumns: "minmax(0, 1fr)",
      }}
    >
      <section className="card">
        <h1 className="pageTitle">로또 번호 당첨 체크</h1>
        <p className="pageDesc">
          내 번호가 역대 로또 추첨에서 몇 등이었는지 확인해보세요.
        </p>
      </section>

      <CheckWinning draws={draws} />

      <AdBanner slot="2668974755" format="horizontal" />
    </div>
  );
}
