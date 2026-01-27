import Link from "next/link";
import { getHistory, findDraw, getAllRounds, formatDate, getBallClass, getNumberIndex, LottoDraw } from "@/lib/lotto";
import { getBreadcrumbJsonLd } from "@/lib/seo";
import type { Metadata } from "next";
import AdBanner from "@/components/AdBanner";
import DrawActions from "@/components/DrawActions";

type Props = {
  params: Promise<{ round: string }>;
};

export async function generateStaticParams() {
  const history = getHistory();
  const rounds = getAllRounds(history);
  return rounds.map((r) => ({ round: String(r) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { round } = await params;
  const roundNum = Number(round);
  const history = getHistory();
  const draw = findDraw(history, roundNum);

  if (!draw) {
    return { title: `${round}회 데이터 없음 | 로또 번호 조회` };
  }

  const title = `${draw.draw_no}회 로또 당첨번호 | ${draw.numbers.join(", ")} + ${draw.bonus}`;
  const description = `${draw.draw_no}회 로또 당첨번호: ${draw.numbers.join(", ")} 보너스 ${draw.bonus}. 추첨일: ${formatDate(draw.draw_date || draw.date)}. 합계, 홀짝, 구간 분석까지.`;
  const url = `https://lotto.newsforgreens.com/draw/${draw.draw_no}/`;

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
      images: [
        {
          url: "https://lotto.newsforgreens.com/og-image.jpg",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://lotto.newsforgreens.com/og-image.jpg"],
    },
  };
}

export default async function DrawPage({ params }: Props) {
  const { round: roundStr } = await params;
  const round = Number(roundStr);
  const history = getHistory();
  const draw = findDraw(history, round);
  const numberIndex = getNumberIndex();

  const rounds = getAllRounds(history);
  const idx = rounds.indexOf(round);
  const prev = idx > 0 ? rounds[idx - 1] : null;
  const next = idx >= 0 && idx < rounds.length - 1 ? rounds[idx + 1] : null;
  const latestDraw = history.meta.latest_draw;

  if (!draw) {
    return (
      <div className="card">
        <h1>제 {round}회 데이터 없음</h1>
        <p className="subtle" style={{ marginTop: 12 }}>해당 회차는 아직 데이터에 없습니다.</p>
        <Link href="/" className="btn btnPrimary" style={{ marginTop: 16 }}>홈으로 돌아가기</Link>
      </div>
    );
  }

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", url: "/" },
    { name: "회차 목록", url: "/draws/" },
    { name: `${draw.draw_no}회`, url: `/draw/${draw.draw_no}/` },
  ]);

  const dateStr = draw.draw_date || draw.date;
  const sum = draw.numbers.reduce((a, b) => a + b, 0);
  const oddCount = draw.numbers.filter(n => n % 2 === 1).length;
  const highCount = draw.numbers.filter(n => n >= 23).length;
  const sorted = [...draw.numbers].sort((a, b) => a - b);
  const hasConsecutive = sorted.some((n, i) => i > 0 && n === sorted[i - 1] + 1);

  const zones = [0, 0, 0, 0, 0];
  draw.numbers.forEach(n => {
    if (n <= 10) zones[0]++;
    else if (n <= 20) zones[1]++;
    else if (n <= 30) zones[2]++;
    else if (n <= 40) zones[3]++;
    else zones[4]++;
  });

  const draws: LottoDraw[] = Array.isArray(history.data) ? history.data : Object.values(history.data);
  const recent50 = draws.slice(-50);
  const recentFreq = new Map<number, number>();
  for (const d of recent50) {
    for (const n of d.numbers) recentFreq.set(n, (recentFreq.get(n) || 0) + 1);
  }

  // Calculate similarity score for each draw
  const getZones = (nums: number[]) => {
    const z = [0, 0, 0, 0, 0];
    nums.forEach(n => {
      if (n <= 10) z[0]++;
      else if (n <= 20) z[1]++;
      else if (n <= 30) z[2]++;
      else if (n <= 40) z[3]++;
      else z[4]++;
    });
    return z;
  };

  const getHasConsecutive = (nums: number[]) => {
    const s = [...nums].sort((a, b) => a - b);
    return s.some((n, i) => i > 0 && n === s[i - 1] + 1);
  };

  const similarPatternDraws = draws
    .filter(d => d.draw_no !== draw.draw_no)
    .map(d => {
      const dSum = d.numbers.reduce((a, b) => a + b, 0);
      const dOdd = d.numbers.filter(n => n % 2 === 1).length;
      const dZones = getZones(d.numbers);
      const dHasCons = getHasConsecutive(d.numbers);

      // Score calculation (higher = more similar)
      let score = 0;

      // Sum: max 40 points (0 diff = 40, 100+ diff = 0)
      score += Math.max(0, 40 - Math.abs(dSum - sum));

      // Odd/even: 20 points if same
      if (dOdd === oddCount) score += 20;

      // Zone distribution: max 20 points
      const zoneDiff = zones.reduce((acc, z, i) => acc + Math.abs(z - dZones[i]), 0);
      score += Math.max(0, 20 - zoneDiff * 5);

      // Consecutive: 10 points if same pattern
      if (dHasCons === hasConsecutive) score += 10;

      return {
        ...d,
        sum: dSum,
        oddCount: dOdd,
        zones: dZones,
        hasCons: dHasCons,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Get number stats for this draw's numbers
  const numberStats = draw.numbers.map(n => {
    const stat = numberIndex.numbers[String(n)];
    return {
      num: n,
      count: stat?.count || 0,
      gap: latestDraw - (stat?.last_seen || 0),
    };
  });

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
          <div className="flexBetween" style={{ flexWrap: "wrap" }}>
            <div>
              <p className="subtle">{formatDate(dateStr)} 추첨</p>
              <h1 style={{ marginTop: 4 }}>제 {draw.draw_no}회 당첨번호</h1>
            </div>
            <div className="chipRow">
              {prev && (
                <Link href={`/draw/${prev}/`} className="chip">← {prev}회</Link>
              )}
              {next && (
                <Link href={`/draw/${next}/`} className="chip">{next}회 →</Link>
              )}
            </div>
          </div>

          <div className="ballRow" style={{ marginTop: "var(--space-lg)" }}>
            {draw.numbers.map((n) => (
              <Link key={n} href={`/number/${n}/`} className={`ball ballLarge ${getBallClass(n)}`}>
                {n}
              </Link>
            ))}
            <span className="ballPlus">+</span>
            <Link href={`/number/${draw.bonus}/`} className={`ball ballLarge ballBonus ${getBallClass(draw.bonus)}`}>
              {draw.bonus}
            </Link>
          </div>

          {/* Copy/Share Actions */}
          <DrawActions numbers={draw.numbers} drawNo={draw.draw_no} />

          {/* Quick Nav */}
          <div className="chipRow" style={{ marginTop: "var(--space-lg)" }}>
            <a href="#stats" className="chip">요약 통계</a>
            <a href="#zones" className="chip">구간 분포</a>
            <a href="#recent" className="chip">최근 50회 비교</a>
            <a href="#similar" className="chip">유사 패턴</a>
          </div>
        </section>

        {/* 요약 배지 */}
        <div style={{ background: "rgba(47, 125, 99, 0.1)", borderLeft: "3px solid var(--accent)", padding: "var(--space-md)", borderRadius: "var(--radius-sm)" }}>
          <strong style={{ color: "var(--accent-2)" }}>최근 흐름 요약 · 참고용</strong>
          <p className="subtle" style={{ marginTop: 4 }}>과거 데이터 기반 분석이며, 당첨을 보장하지 않습니다.</p>
        </div>

        {/* Summary Stats */}
        <section id="stats" className="card">
          <h2 className="sectionTitle">이번 회차 요약</h2>
          <div className="grid3" style={{ marginBottom: "var(--space-lg)" }}>
            <div className="statCard">
              <div className="statValue">{sum}</div>
              <div className="statLabel">합계</div>
            </div>
            <div className="statCard">
              <div className="statValue">{oddCount}:{6 - oddCount}</div>
              <div className="statLabel">홀/짝</div>
            </div>
            <div className="statCard">
              <div className="statValue">{highCount}:{6 - highCount}</div>
              <div className="statLabel">고/저 (23기준)</div>
            </div>
          </div>
          <div className="chipRow">
            <span className={`badge ${hasConsecutive ? "badgeWarning" : "badgeMuted"}`}>
              연속수 {hasConsecutive ? "있음" : "없음"}
            </span>
            <span className="badge badgeMuted">정렬: {sorted.join(", ")}</span>
          </div>
        </section>

        {/* Zone Distribution with Bar */}
        <section id="zones" className="card">
          <h2 className="sectionTitle">번호 구간 분포</h2>

          {/* Zone Bar */}
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <div className="zoneBar">
              {zones.map((count, idx) => (
                <div
                  key={idx}
                  className={`zoneSegment zoneSegment${idx + 1}`}
                  style={{ width: `${(count / 6) * 100}%` }}
                />
              ))}
            </div>
          </div>

          <div className="grid3" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
            {["1~10", "11~20", "21~30", "31~40", "41~45"].map((label, i) => (
              <div key={label} className="statCard" style={{
                background: zones[i] > 0 ? "var(--accent)" : "var(--surface)",
                borderColor: zones[i] > 0 ? "var(--accent)" : undefined,
              }}>
                <div className="statValue" style={{ color: zones[i] > 0 ? "#fff" : "var(--muted)", fontSize: 24 }}>
                  {zones[i]}
                </div>
                <div className="statLabel" style={{ color: zones[i] > 0 ? "rgba(255,255,255,0.8)" : undefined }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent 50 Comparison */}
        <section id="recent" className="card">
          <h2 className="sectionTitle">최근 50회 대비</h2>
          <p className="subtle">이번 회차 번호들이 최근 50회에서 얼마나 자주 나왔는지 확인하세요.</p>
          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            {draw.numbers.map((n) => {
              const freq = recentFreq.get(n) || 0;
              const isHot = freq >= 8;
              const isCold = freq <= 4;
              return (
                <Link key={n} href={`/number/${n}/`} className="statCard cardClickable" style={{
                  padding: "var(--space-md)",
                  background: isHot ? "rgba(255,107,107,0.15)" : isCold ? "rgba(96,165,250,0.15)" : "var(--surface)",
                  borderColor: isHot ? "var(--danger)" : isCold ? "var(--ball-blue)" : undefined,
                }}>
                  <div className={`ball ballSmall ${getBallClass(n)}`} style={{ margin: "0 auto 8px" }}>{n}</div>
                  <div className={`subtle ${isHot ? "indicatorHot" : isCold ? "indicatorCold" : ""}`}>
                    {freq}회 {isHot && "HOT"}{isCold && "COLD"}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Number Stats (역대 출현 횟수) */}
        <section className="card">
          <h2 className="sectionTitle">각 번호 역대 출현 횟수</h2>
          <p className="subtle">1회~{latestDraw}회 전체 기준</p>
          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            {numberStats.map((s) => (
              <Link key={s.num} href={`/number/${s.num}/`} className="statCard cardClickable" style={{
                padding: "var(--space-md)",
              }}>
                <div className={`ball ballSmall ${getBallClass(s.num)}`} style={{ margin: "0 auto 8px" }}>{s.num}</div>
                <div style={{ fontWeight: 600 }}>{s.count}회</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Similar Pattern Draws TOP 5 */}
        {similarPatternDraws.length > 0 && (
          <section id="similar" className="card">
            <h2 className="sectionTitle">유사 패턴 TOP 5</h2>
            <p className="subtle">합계, 홀짝, 구간분포, 연속수 패턴이 비슷한 회차</p>
            <div style={{ display: "grid", gap: 8, marginTop: "var(--space-md)" }}>
              {similarPatternDraws.map((d, idx) => (
                <div key={d.draw_no} className="card" style={{
                  padding: "var(--space-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <span className="badge badgeMuted" style={{ marginRight: 8 }}>#{idx + 1}</span>
                      <span style={{ fontWeight: 700 }}>{d.draw_no}회</span>
                    </div>
                    <div className="ballRow">
                      {d.numbers.map((n) => (
                        <span key={n} className={`ball ballSmall ${getBallClass(n)}`}>{n}</span>
                      ))}
                    </div>
                  </div>
                  <div className="chipRow" style={{ fontSize: 12 }}>
                    <span className="badge badgeMuted">합계 {d.sum}</span>
                    <span className="badge badgeMuted">홀짝 {d.oddCount}:{6 - d.oddCount}</span>
                    <span className="badge badgeMuted">연속 {d.hasCons ? "O" : "X"}</span>
                  </div>
                  <Link href={`/draw/${d.draw_no}/`} className="btn btnSecondary" style={{ alignSelf: "flex-start", fontSize: 13, padding: "6px 12px" }}>
                    이 회차 분석 보기
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Rounds (prev/next 5) */}
        <section className="card">
          <h2 className="sectionTitle">주변 회차</h2>
          <div className="chipRow">
            {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
              .map(offset => round + offset)
              .filter(r => r >= 1 && r <= latestDraw)
              .map(r => (
                <Link
                  key={r}
                  href={`/draw/${r}/`}
                  className={`chip ${r === round ? "chipActive" : ""}`}
                >
                  {r}회 {r === round && "(현재)"}
                </Link>
              ))}
          </div>
        </section>

        {/* Number Links */}
        <section className="card">
          <h2 className="sectionTitle">이 번호 더 알아보기</h2>
          <div className="chipRow">
            {draw.numbers.map((n) => (
              <Link key={n} href={`/number/${n}/`} className={`ball ${getBallClass(n)}`}>
                {n}
              </Link>
            ))}
            <Link href={`/number/${draw.bonus}/`} className="chip">
              보너스 {draw.bonus}번 →
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="card">
          <h2 className="sectionTitle">자주 묻는 질문 ({draw.draw_no}회 기준)</h2>

          <div style={{ display: "grid", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
          <details className="faqItem">
            <summary className="faqQuestion">{draw.draw_no}회 번호 조합의 특징은?</summary>
            <div className="faqAnswer">
              이번 회차 번호의 합계는 {sum}이고, 홀짝 비율은 {oddCount}:{6 - oddCount}입니다.
              구간 분포를 보면 1~10번대 {zones[0]}개, 11~20번대 {zones[1]}개, 21~30번대 {zones[2]}개, 31~40번대 {zones[3]}개, 41~45번대 {zones[4]}개로 나타났습니다.
              {sum >= 100 && sum <= 170 ? " 합계가 평균 범위(100~170)에 속해 균형 잡힌 조합입니다." : sum < 100 ? " 합계가 평균보다 낮은 저합 조합입니다." : " 합계가 평균보다 높은 고합 조합입니다."}
            </div>
          </details>

          <details className="faqItem">
            <summary className="faqQuestion">연속번호가 있었나?</summary>
            <div className="faqAnswer">
              {hasConsecutive
                ? `이번 회차에는 연속번호가 포함되어 있습니다. 연속번호 조합은 역대 당첨번호에서 약 60% 이상 나타나는 흔한 패턴입니다.`
                : `이번 회차는 연속번호 없이 모두 떨어진 번호들로 구성되었습니다. 연속번호가 없는 경우는 전체의 약 40% 정도입니다.`
              }
            </div>
          </details>

          <details className="faqItem">
            <summary className="faqQuestion">다음 회차 번호 선택에 참고할 점?</summary>
            <div className="faqAnswer">
              로또 번호는 매 회차 독립적으로 추첨되므로 과거 결과가 미래를 예측하지 않습니다.
              다만 참고용으로, 홀짝 균형(3:3 또는 2:4)과 합계 100~170 사이를 유지하면 역대 당첨 패턴과 유사한 조합이 됩니다.
              번호 선택은 순전히 재미와 참고용으로만 활용하세요.
            </div>
          </details>
          </div>
        </section>

        {/* 분석 기준 안내 */}
        <p className="subtle" style={{ textAlign: "center", padding: "var(--space-md)", lineHeight: 1.7 }}>
          ※ 본 분석은 과거 데이터 기반 통계 요약이며, 각 회차 추첨은 <strong>독립적·무작위</strong>로 진행됩니다.
        </p>

        {/* SEO 요약 텍스트 */}
        <section className="card" style={{ background: "var(--surface)" }}>
          <h3 className="sectionTitle">{round}회 로또 당첨번호 분석 요약</h3>
          <p className="subtle" style={{ lineHeight: 1.8 }}>
            {round}회 로또 당첨번호는 {draw.numbers.join(", ")}번이며 보너스 번호는 {draw.bonus}번입니다.
            합계 {sum}, 홀짝 비율 {oddCount}:{6 - oddCount}의 조합으로, {hasConsecutive ? "연속번호가 포함된" : "연속번호가 없는"} 패턴입니다.
            최근 회차 흐름, 번호 분포, 연속번호 여부, 홀짝 비율을 기준으로 정리한 참고용 분석입니다.
          </p>
        </section>

        {/* 다음 행동 */}
        <div style={{ textAlign: "center", padding: "var(--space-md)" }}>
          <Link href="/draws/?range=10" style={{ fontSize: 15, fontWeight: 600 }}>
            최근 10회 로또 당첨번호 흐름 보기 →
          </Link>
        </div>

        {/* Ad Banner */}
        <AdBanner slot="7281720411" format="horizontal" />

        {/* Navigation */}
        <div className="chipRow">
          <Link href="/stats/" className="btn btnPrimary">로또 당첨번호 전체 통계 분석</Link>
          <Link href="/draws/" className="btn btnSecondary">전체 회차 당첨번호 목록</Link>
          <Link href="/numbers/" className="btn btnSecondary">번호별 출현 빈도 통계</Link>
          <Link href="/" className="btn btnSecondary">홈으로</Link>
        </div>
      </div>
    </>
  );
}
