import { getFAQJsonLd } from "@/lib/seo";

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
  title?: string;
}

export default function FAQ({ items, title = "자주 묻는 질문" }: FAQProps) {
  const jsonLd = getFAQJsonLd(items);

  return (
    <section className="card" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h2 className="sectionTitle">{title}</h2>
      <div style={{ display: "grid", gap: "var(--space-md)" }}>
        {items.map((item, idx) => (
          <details key={idx} className="faqItem">
            <summary className="faqQuestion">{item.question}</summary>
            <div className="faqAnswer">{item.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
