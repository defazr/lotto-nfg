"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAll } from "@/lib/metrics";

interface CacheMeta {
  latest_draw: number;
  total_draws: number;
  last_updated: string;
}

export default function StatusPage() {
  const [cacheMeta, setCacheMeta] = useState<CacheMeta | null>(null);
  const [updateLog, setUpdateLog] = useState<string>("");
  const [buildLog, setBuildLog] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const ts = Date.now();
      try {
        const [cacheRes, updateRes, buildRes] = await Promise.all([
          fetch(`/data/lotto_cache.json?v=${ts}`, { cache: "no-store" }),
          fetch(`/ops/update.log.tail.txt?v=${ts}`, { cache: "no-store" }),
          fetch(`/ops/build.log.tail.txt?v=${ts}`, { cache: "no-store" }),
        ]);

        if (cacheRes.ok) {
          const cacheData = await cacheRes.json();
          setCacheMeta(cacheData.meta);
        }

        if (updateRes.ok) {
          setUpdateLog(await updateRes.text());
        }

        if (buildRes.ok) {
          setBuildLog(await buildRes.text());
        }
      } catch (e) {
        setError("데이터 로드 실패");
      } finally {
        setLoading(false);
      }

      // Load metrics
      setMetrics(getAll());
    };

    fetchAll();
  }, []);

  const extractLastTimestamp = (log: string): string => {
    if (!log.trim()) return "-";
    const lines = log.trim().split("\n");
    const lastLine = lines[lines.length - 1];
    const match = lastLine.match(/^\[([^\]]+)\]/);
    return match ? match[1] : lastLine.slice(0, 30);
  };

  const extractSkipReason = (log: string): string => {
    if (!log.trim()) return "-";
    const match = log.match(/SKIP_BUILD_REASON=(\S+)/g);
    if (!match) return "-";
    const last = match[match.length - 1];
    return last.replace("SKIP_BUILD_REASON=", "");
  };

  const extractUpdateSkipReason = (log: string): string => {
    if (!log.trim()) return "-";
    const match = log.match(/UPDATE_SKIP_REASON=(\S+)/g);
    if (!match) return "-";
    const last = match[match.length - 1];
    return last.replace("UPDATE_SKIP_REASON=", "");
  };

  if (loading) {
    return (
      <div className="card">
        <h1>운영 현황</h1>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      <section className="card">
        <h1>운영 현황 (Status)</h1>
        <p className="subtle">토요일 자동 수집/빌드 정상 실행 여부 확인용</p>
      </section>

      {error && (
        <section className="card" style={{ borderColor: "var(--danger)" }}>
          <p style={{ color: "var(--danger)" }}>{error}</p>
        </section>
      )}

      {/* 핵심 지표 */}
      <section className="card">
        <h2 className="sectionTitle">핵심 지표</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <strong>최신 회차</strong>
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                {cacheMeta?.latest_draw ?? "-"}회
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <strong>총 회차 수</strong>
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                {cacheMeta?.total_draws ?? "-"}회
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <strong>캐시 갱신 시각</strong>
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                {cacheMeta?.last_updated ?? "-"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <strong>마지막 데이터 수집</strong>
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                {extractLastTimestamp(updateLog)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <strong>이번 주 데이터 수집 스킵 사유</strong>
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right", color: extractUpdateSkipReason(updateLog) === "none" ? "var(--accent-2)" : "var(--warning)" }}>
                {extractUpdateSkipReason(updateLog)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <strong>마지막 빌드/배포</strong>
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                {extractLastTimestamp(buildLog)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <strong>이번 주 빌드/배포 스킵 사유</strong>
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right", color: extractSkipReason(buildLog) === "none" ? "var(--accent-2)" : "var(--warning)" }}>
                {extractSkipReason(buildLog)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0" }}>
                <strong>다음 자동 실행 예정</strong>
              </td>
              <td style={{ padding: "8px 0", textAlign: "right", color: "var(--accent-2)" }}>
                토요일 21:20 / 21:35 / 22:10 KST
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 브라우저 클릭 통계 */}
      <section className="card">
        <h2 className="sectionTitle">내 브라우저 클릭 통계</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                저장 버튼 클릭
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                {metrics.save_reco_click || 0}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                추천 복사 클릭
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                {metrics.reco_copy_click || 0}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                회차 복사 클릭
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right" }}>
                {metrics.draw_copy_click || 0}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0" }}>
                가이드 링크 클릭
              </td>
              <td style={{ padding: "8px 0", textAlign: "right" }}>
                {metrics.guide_link_click || 0}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="subtle" style={{ marginTop: "var(--space-sm)", fontSize: 11 }}>
          이 수치는 이 브라우저에서의 누적 (서버 전송 없음)
        </p>
      </section>

      {/* 바로가기 */}
      <section className="card">
        <h2 className="sectionTitle">주요 페이지 확인</h2>
        <div className="chipRow">
          <Link href="/stats/" className="btn btnPrimary">통계 페이지</Link>
          <Link href="/draws/" className="btn btnSecondary">전체 회차</Link>
          {cacheMeta && (
            <Link href={`/draw/${cacheMeta.latest_draw}/`} className="btn btnSecondary">
              최신 {cacheMeta.latest_draw}회
            </Link>
          )}
        </div>
      </section>

      {/* 로그 상세 */}
      <section className="card">
        <h2 className="sectionTitle">update.log (최근 40줄)</h2>
        <pre style={{
          background: "var(--bg-alt)",
          padding: "var(--space-md)",
          borderRadius: 8,
          overflow: "auto",
          maxHeight: 300,
          fontSize: 12,
          lineHeight: 1.4,
        }}>
          {updateLog || "(로그 없음)"}
        </pre>
      </section>

      <section className="card">
        <h2 className="sectionTitle">build.log (최근 60줄)</h2>
        <pre style={{
          background: "var(--bg-alt)",
          padding: "var(--space-md)",
          borderRadius: 8,
          overflow: "auto",
          maxHeight: 300,
          fontSize: 12,
          lineHeight: 1.4,
        }}>
          {buildLog || "(로그 없음)"}
        </pre>
      </section>

      {/* 네비게이션 */}
      <div className="chipRow">
        <Link href="/" className="btn btnPrimary">홈으로</Link>
      </div>
    </div>
  );
}
