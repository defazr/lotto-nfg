import { MetadataRoute } from "next";
import { getHistory, getAllRounds } from "@/lib/lotto";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://lotto.newsforgreens.com";
  const history = getHistory();
  const rounds = getAllRounds(history);

  // Draw pages (priority 0.8)
  const drawUrls = rounds.map((r) => ({
    url: `${base}/draw/${r}/`,
    lastModified: new Date(),
    priority: 0.8,
  }));

  // Number pages 1-45 (priority 0.7)
  const numberUrls = Array.from({ length: 45 }, (_, i) => ({
    url: `${base}/number/${i + 1}/`,
    lastModified: new Date(),
    priority: 0.7,
  }));

  return [
    { url: `${base}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${base}/stats/`, lastModified: new Date(), priority: 0.6 },
    { url: `${base}/draws/`, lastModified: new Date(), priority: 0.6 },
    { url: `${base}/numbers/`, lastModified: new Date(), priority: 0.6 },
    ...drawUrls,
    ...numberUrls,
  ];
}
