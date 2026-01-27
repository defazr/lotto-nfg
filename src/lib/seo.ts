/**
 * SEO utilities for JSON-LD structured data
 */

const SITE_URL = "https://lotto.newsforgreens.com";
const SITE_NAME = "LOTTO NFG";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generate WebSite JSON-LD (for homepage)
 */
export function getWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: "로또 6/45 당첨번호 조회, 번호별 출현 통계, 회차별 분석을 제공하는 무료 서비스",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/draw/{search_term}/`,
      "query-input": "required name=search_term",
    },
  };
}

/**
 * Generate BreadcrumbList JSON-LD
 */
export function getBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * Generate FAQPage JSON-LD
 */
export function getFAQJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Combine multiple JSON-LD objects into a graph
 */
export function combineJsonLd(...items: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": items.map((item) => {
      // Remove @context from individual items when combining
      const { "@context": _, ...rest } = item as { "@context"?: string };
      return rest;
    }),
  };
}
