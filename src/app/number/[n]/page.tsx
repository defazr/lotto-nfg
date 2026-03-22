import Link from "next/link";
import { getHistory, getNumberIndex, findDraw, formatDate, getBallClass, LottoDraw } from "@/lib/lotto";
import { getBreadcrumbJsonLd } from "@/lib/seo";
import AdBanner from "@/components/AdBanner";
import type { Metadata } from "next";
import NumberComboSets from "@/components/NumberComboSets";
import coOccurrenceData from "../../../../public/data/co_occurrence.json";

type Props = {
  params: Promise<{ n: string }>;
};

export async function generateStaticParams() {
  return Array.from({ length: 45 }, (_, i) => ({ n: String(i + 1) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  const num = Number(n);
  const numberIndex = getNumberIndex();
  const stat = numberIndex.numbers[n];

  const title = `로또 번호 ${num} 분석 | 출현횟수·최근출현·역대회차`;
  const description = `로또 번호 ${num}의 역대 출현횟수(${stat?.count || 0}회), 최근 출현 회차, 첫 출현 회차와 함께 많이 나온 번호를 확인하세요.`;
  const url = `https://lotto.newsforgreens.com/number/${num}/`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: "ko_KR",
      siteName: "LOTTO NFG",
      images: [
        {
          url: "https://lotto.newsforgreens.com/og-image.jpg",
          width: 1200,
          height: 630,
          alt: `로또 번호 ${num} 분석`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: ["https://lotto.newsforgreens.com/og-image.jpg"],
    },
  };
}

export default async function NumberPage({ params }: Props) {
  const { n: nStr } = await params;
  const num = Number(nStr);
  const history = getHistory();
  const numberIndex = getNumberIndex();
  const stat = numberIndex.numbers[nStr];
  const latestDraw = numberIndex.meta.latest_draw;

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", url: "/" },
    { name: "번호 목록", url: "/numbers/" },
    { name: `${num}번`, url: `/number/${num}/` },
  ]);

  if (!stat) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <div className="card">
          <h1>번호 {num} 데이터 없음</h1>
          <Link href="/numbers/" className="btn btnPrimary" style={{ marginTop: 16 }}>전체 번호 목록으로</Link>
        </div>
      </>
    );
  }

  const recentDrawDetails: LottoDraw[] = [];
  for (const round of stat.recent_draws) {
    const draw = findDraw(history, round);
    if (draw) recentDrawDetails.push(draw);
  }

  // Calculate co-occurrence (최근 200회 기반 - 성능 최적화)
  const draws: LottoDraw[] = Array.isArray(history.data) ? history.data : Object.values(history.data);
  const recent200 = draws.slice(-200);
  const coCount = new Map<number, number>();
  for (const d of recent200) {
    if (d.numbers.includes(num)) {
      for (const n of d.numbers) {
        if (n !== num) {
          coCount.set(n, (coCount.get(n) || 0) + 1);
        }
      }
    }
  }
  const topCoNumbers = Array.from(coCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // TOP3 조합 생성 (상위 5개 번호 중 3개씩 조합)
  const top5CoNums = topCoNumbers.slice(0, 5).map(([n]) => n);
  const comboSets = [
    [num, top5CoNums[0], top5CoNums[1]].sort((a, b) => a - b),
    [num, top5CoNums[1], top5CoNums[2]].sort((a, b) => a - b),
    [num, top5CoNums[2], top5CoNums[3]].sort((a, b) => a - b),
  ].filter(set => set.every(n => n !== undefined));

  // Calculate gap (how long since last appearance)
  const gap = latestDraw - stat.last_seen;

  // Get all number stats for rankings
  const allStats = Object.entries(numberIndex.numbers)
    .map(([k, v]) => ({ num: Number(k), ...v }))
    .sort((a, b) => b.count - a.count);

  const rank = allStats.findIndex(s => s.num === num) + 1;
  const avgCount = Math.round(allStats.reduce((acc, s) => acc + s.count, 0) / 45);

  const top10 = allStats.slice(0, 10);
  const similarFreq = allStats
    .filter((s) => s.num !== num)
    .sort((a, b) => Math.abs(a.count - stat.count) - Math.abs(b.count - stat.count))
    .slice(0, 5);

  // Same zone numbers
  const getZone = (n: number) => Math.ceil(n / 10);
  const zone = getZone(num);
  const zoneStart = (zone - 1) * 10 + 1;
  const zoneEnd = zone === 5 ? 45 : zone * 10;
  const sameZoneNumbers = allStats.filter(s => s.num >= zoneStart && s.num <= zoneEnd && s.num !== num);

  const ballClass = getBallClass(num);

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div style={{ display: "grid", gap: "var(--space-lg)" }}>
        {/* Header */}
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <span className={`ball ballLarge ${ballClass}`}>{num}</span>
            <div>
              <h1>로또 번호 {num} 분석</h1>
              <p className="subtle" style={{ marginTop: 4 }}>
                역대 {stat.count}회 출현 · 전체 {rank}위 · 평균 대비 {stat.count - avgCount >= 0 ? "+" : ""}{stat.count - avgCount}
              </p>
            </div>
          </div>

          {/* Quick Nav */}
          <div className="chipRow" style={{ marginTop: "var(--space-lg)" }}>
            <a href="#recent-list" className="chip">최근 출현 회차</a>
            <a href="#co-occur" className="chip">함께 나온 번호</a>
            <a href="#zone" className="chip">같은 구간 번호</a>
            <Link href={`/draw/${latestDraw}/`} className="btn btnSecondary btnSmall">
              최신 {latestDraw}회 보기
            </Link>
          </div>
        </section>

        {/* 요약 배지 */}
        <div style={{ background: "rgba(47, 125, 99, 0.1)", borderLeft: "3px solid var(--accent)", padding: "var(--space-md)", borderRadius: "var(--radius-sm)" }}>
          <strong style={{ color: "var(--accent-2)" }}>출현 흐름 요약 · 참고용</strong>
          <p className="subtle" style={{ marginTop: 4 }}>통계적 경향을 정리한 자료입니다.</p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-md)" }}>
          <div className="statCard">
            <div className="statValue">{stat.count}</div>
            <div className="statLabel">출현 횟수</div>
          </div>
          <div className="statCard">
            <div className="statValue" style={{ color: "var(--accent-2)" }}>{rank}위</div>
            <div className="statLabel">전체 순위</div>
          </div>
          <div className="statCard">
            <div className="statValue" style={{ color: gap > 10 ? "var(--danger)" : "var(--ball-blue)" }}>
              {gap}회
            </div>
            <div className="statLabel">{gap > 10 ? "미출현" : "마지막 출현"}</div>
          </div>
          <div className="statCard">
            <div className="statValue" style={{ color: "var(--warning)" }}>{stat.first_seen}</div>
            <div className="statLabel">첫 출현</div>
          </div>
          <div className="statCard">
            <div className="statValue">{stat.last_seen}</div>
            <div className="statLabel">최근 출현</div>
          </div>
        </div>

        {/* Ad Banner - Upper Mid */}
        <AdBanner slot="4183035275" format="auto" />

        {/* Combo Sets with Copy */}
        <NumberComboSets
          baseNum={num}
          coOccurrence={(coOccurrenceData as unknown as Record<string, [string, number][]>)[nStr] || []}
        />

        {/* TOP3 조합 카드 */}
        {comboSets.length > 0 && (
          <section className="card" style={{ background: "rgba(47, 125, 99, 0.08)", borderColor: "var(--accent)" }}>
            <h2 className="sectionTitle" style={{ color: "var(--accent-2)" }}>{num}번 포함 추천 조합 TOP 3</h2>
            <p className="subtle">최근 200회에서 {num}번과 함께 자주 나온 번호 조합 (참고용)</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
              {comboSets.map((set, idx) => (
                <div key={idx} className="statCard" style={{ padding: "var(--space-md)" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>조합 {idx + 1}</div>
                  <div className="ballRow" style={{ justifyContent: "center" }}>
                    {set.map((n) => (
                      <span key={n} className={`ball ballSmall ${getBallClass(n)}`}>{n}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Link href="/" className="btn btnSecondary" style={{ marginTop: "var(--space-md)", display: "inline-block" }}>
              이번주 추천 6개 번호 보러가기
            </Link>
          </section>
        )}

        {/* Co-occurrence */}
        <section id="co-occur" className="card">
          <h2 className="sectionTitle">함께 많이 나온 번호 TOP 6</h2>
          <p className="subtle">{num}번과 최근 200회에서 가장 자주 함께 등장한 번호들</p>
          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            {topCoNumbers.map(([n, count]) => (
              <Link key={n} href={`/number/${n}/`} className="statCard cardClickable" style={{
                padding: "var(--space-md)",
                minWidth: 70,
              }}>
                <div className={`ball ballSmall ${getBallClass(n)}`} style={{ margin: "0 auto 8px" }}>{n}</div>
                <div className="subtle">{count}회 동반</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Same Zone Numbers */}
        <section id="zone" className="card" style={{ background: "rgba(47, 125, 99, 0.08)", borderColor: "var(--accent)" }}>
          <h2 className="sectionTitle" style={{ color: "var(--accent-2)" }}>같은 구간 번호 ({zoneStart}~{zoneEnd})</h2>
          <p className="subtle">{num}번과 같은 구간에 속한 번호들</p>
          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            <Link href={`/number/${num}/`} className={`ball ${ballClass}`} style={{ opacity: 0.5 }}>
              {num}
            </Link>
            {sameZoneNumbers.slice(0, 9).map((s) => (
              <Link key={s.num} href={`/number/${s.num}/`} className={`ball ${getBallClass(s.num)}`}>
                {s.num}
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Draws */}
        <section id="recent-list" className="card">
          <h2 className="sectionTitle">최근 출현 회차 (최대 50개)</h2>
          <p className="subtle">번호 {num}이 당첨번호에 포함된 최근 회차들</p>

          <div className="tableWrap" style={{ marginTop: "var(--space-md)" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>회차</th>
                  <th>추첨일</th>
                  <th>당첨번호</th>
                </tr>
              </thead>
              <tbody>
                {recentDrawDetails.map((draw) => (
                  <tr key={draw.draw_no}>
                    <td>
                      <Link href={`/draw/${draw.draw_no}/`} style={{ fontWeight: 600 }}>
                        {draw.draw_no}회
                      </Link>
                    </td>
                    <td className="subtle">{formatDate(draw.draw_date || draw.date)}</td>
                    <td>
                      <div className="ballRow">
                        {draw.numbers.map((n) => (
                          <span key={n} className={`ball ballSmall ${n === num ? ballClass : ""}`} style={{
                            background: n === num ? undefined : "var(--surface)",
                            color: n === num ? "#fff" : "var(--text)",
                            fontWeight: n === num ? 700 : 400,
                          }}>
                            {n}
                          </span>
                        ))}
                        <span className="ballPlus" style={{ fontSize: 14 }}>+</span>
                        <span className="ball ballSmall" style={{ background: "var(--surface)", color: "var(--muted)", border: "1px dashed var(--muted)" }}>
                          {draw.bonus}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Ad Banner - Lower Mid */}
        <AdBanner slot="2668974755" format="auto" />

        {/* Top 10 */}
        <section className="card">
          <h2 className="sectionTitle">역대 최다 출현 번호 TOP 10</h2>
          <div className="chipRow">
            {top10.map((s) => (
              <Link key={s.num} href={`/number/${s.num}/`} className={`chip ${s.num === num ? "chipActive" : ""}`}>
                {s.num}번 ({s.count}회)
              </Link>
            ))}
          </div>
        </section>

        {/* Similar Frequency */}
        <section className="card">
          <h2 className="sectionTitle">비슷한 빈도 번호</h2>
          <p className="subtle">{num}번({stat.count}회)과 출현 횟수가 비슷한 번호들</p>
          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            {similarFreq.map((s) => (
              <Link key={s.num} href={`/number/${s.num}/`} className={`ball ${getBallClass(s.num)}`}>
                {s.num}
              </Link>
            ))}
          </div>
        </section>

        {/* Prev/Next Number */}
        <section className="card">
          <h2 className="sectionTitle">다른 번호 보기</h2>
          <div className="chipRow">
            {num > 1 && (
              <Link href={`/number/${num - 1}/`} className="chip">← {num - 1}번</Link>
            )}
            {num < 45 && (
              <Link href={`/number/${num + 1}/`} className="chip">{num + 1}번 →</Link>
            )}
          </div>
        </section>

        {/* All Numbers Grid */}
        <section className="card">
          <h2 className="sectionTitle">1~45 전체 번호</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 8 }}>
            {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={`/number/${n}/`} className={`chip ${n === num ? "chipActive" : ""}`} style={{
                justifyContent: "center",
                padding: "8px 0",
              }}>
                {n}
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="card">
          <h2 className="sectionTitle">자주 묻는 질문 ({num}번 기준)</h2>

          <div style={{ display: "grid", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
          <details className="faqItem">
            <summary className="faqQuestion">{num}번은 얼마나 자주 나왔나?</summary>
            <div className="faqAnswer">
              {num}번은 1회부터 {latestDraw}회까지 총 {stat.count}회 출현했으며, 45개 번호 중 {rank}위입니다.
              {rank <= 15 ? " 상위권에 속하는 자주 나오는 번호입니다." : rank >= 31 ? " 하위권에 속하는 상대적으로 덜 나온 번호입니다." : " 중간 빈도의 번호입니다."}
              평균 출현 횟수({avgCount}회) 대비 {stat.count >= avgCount ? `${stat.count - avgCount}회 더 많이` : `${avgCount - stat.count}회 적게`} 나왔습니다.
            </div>
          </details>

          <details className="faqItem">
            <summary className="faqQuestion">{num}번과 같이 자주 나온 번호는?</summary>
            <div className="faqAnswer">
              {num}번과 가장 많이 동반 출현한 번호는 {topCoNumbers.slice(0, 3).map(([n]) => n).join(", ")}번입니다.
              위의 &quot;함께 추천 3세트&quot;는 이 동반 출현 데이터를 기반으로 생성되었습니다.
              물론 과거 통계가 미래 당첨을 보장하지는 않으며, 참고용으로만 활용하세요.
            </div>
          </details>
          </div>
        </section>

        {/* Internal Links */}
        <section className="card">
          <h2 className="sectionTitle">관련 통계 더 보기</h2>
          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            <Link href="/stats/" className="btn btnPrimary">{num}번 출현 통계 전체 보기</Link>
            <Link href="/draws/" className="btn btnSecondary">최근 30회 로또 당첨번호 확인</Link>
          </div>
        </section>

        {/* SEO 롱테일 텍스트 */}
        <section className="card" style={{ background: "var(--surface)" }}>
          <h3 className="sectionTitle">{num}번 로또 번호 출현 흐름</h3>
          <p className="subtle" style={{ lineHeight: 1.8 }}>
            {num}번은 전체 {latestDraw}회 중 {stat.count}회 출현하여 45개 번호 중 {rank}위에 해당합니다.
            최근 100회 기준 출현 빈도와 함께 다른 번호와의 조합 패턴을 참고용으로 확인할 수 있습니다.
            통계 기반 참고용 데이터이며, 당첨을 보장하지 않습니다.
          </p>
        </section>

        {/* 다음 행동 */}
        <div style={{ textAlign: "center", padding: "var(--space-md)" }}>
          <Link href="/stats/" style={{ fontSize: 15, fontWeight: 600 }}>
            로또 번호 전체 출현 통계 보러가기 →
          </Link>
        </div>

        {/* Ad Banner */}
        <AdBanner slot="7515989289" format="horizontal" />

        {/* Navigation */}
        <div className="chipRow">
          <Link href="/" className="btn btnPrimary">이번주 추천 3세트 보러가기</Link>
          <Link href="/numbers/" className="btn btnSecondary">1~45 번호별 출현 빈도</Link>
          <Link href={`/draw/${latestDraw}/`} className="btn btnSecondary">최신 {latestDraw}회 당첨번호</Link>
        </div>
      </div>
    </>
  );
}
