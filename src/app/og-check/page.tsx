"use client";

import { useState } from "react";
import Link from "next/link";

type OgData = {
  title: string;
  description: string;
  image: string;
  url: string;
};

export default function OgCheckPage() {
  const [inputUrl, setInputUrl] = useState("https://lotto.newsforgreens.com/draw/1205/");
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<"loading" | "success" | "error" | null>(null);

  const fetchOgData = async () => {
    setLoading(true);
    setError(null);
    setOgData(null);
    setImageStatus(null);

    try {
      const res = await fetch(inputUrl);
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setLoading(false);
        return;
      }

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const getMeta = (property: string): string => {
        const el = doc.querySelector(`meta[property="${property}"]`) ||
                   doc.querySelector(`meta[name="${property}"]`);
        return el?.getAttribute("content") || "";
      };

      const data: OgData = {
        title: getMeta("og:title") || doc.querySelector("title")?.textContent || "",
        description: getMeta("og:description") || getMeta("description") || "",
        image: getMeta("og:image") || "",
        url: getMeta("og:url") || inputUrl,
      };

      setOgData(data);
      if (data.image) {
        setImageStatus("loading");
      }
    } catch (e) {
      setError("fetch 실패 (CORS 또는 네트워크 에러)");
    } finally {
      setLoading(false);
    }
  };

  const quickCheck = (url: string) => {
    setInputUrl(url);
    setTimeout(() => {
      setLoading(true);
      setError(null);
      setOgData(null);
      setImageStatus(null);
      fetch(url)
        .then(res => res.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const getMeta = (property: string): string => {
            const el = doc.querySelector(`meta[property="${property}"]`) ||
                       doc.querySelector(`meta[name="${property}"]`);
            return el?.getAttribute("content") || "";
          };
          const data: OgData = {
            title: getMeta("og:title") || doc.querySelector("title")?.textContent || "",
            description: getMeta("og:description") || getMeta("description") || "",
            image: getMeta("og:image") || "",
            url: getMeta("og:url") || url,
          };
          setOgData(data);
          if (data.image) setImageStatus("loading");
        })
        .catch(() => setError("fetch 실패"))
        .finally(() => setLoading(false));
    }, 100);
  };

  return (
    <>
      <meta name="robots" content="noindex,nofollow" />
      <div style={{ display: "grid", gap: "var(--space-lg)" }}>
        <section className="card">
          <h1>OG 태그 디버그</h1>
          <p className="subtle">URL의 Open Graph 메타 태그를 확인합니다. (운영자용)</p>
        </section>

        <section className="card">
          <h2 className="sectionTitle">URL 입력</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="input"
              style={{ flex: 1, minWidth: 200 }}
              placeholder="https://lotto.newsforgreens.com/draw/1205/"
            />
            <button onClick={fetchOgData} className="btn btnPrimary" disabled={loading}>
              {loading ? "확인 중..." : "확인"}
            </button>
          </div>

          <div className="chipRow" style={{ marginTop: "var(--space-md)" }}>
            <button onClick={() => quickCheck("https://lotto.newsforgreens.com/draw/1205/")} className="chip">
              /draw/1205/ (슬래시O)
            </button>
            <button onClick={() => quickCheck("https://lotto.newsforgreens.com/draw/1205")} className="chip">
              /draw/1205 (슬래시X)
            </button>
            <button onClick={() => quickCheck("https://lotto.newsforgreens.com/")} className="chip">
              홈
            </button>
          </div>
        </section>

        {error && (
          <section className="card" style={{ borderColor: "var(--danger)" }}>
            <p style={{ color: "var(--danger)" }}>{error}</p>
          </section>
        )}

        {ogData && (
          <section className="card">
            <h2 className="sectionTitle">OG 태그 결과</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", width: 120 }}>
                    <strong>og:title</strong>
                  </td>
                  <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    {ogData.title || <span style={{ color: "var(--danger)" }}>없음</span>}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <strong>og:description</strong>
                  </td>
                  <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    {ogData.description || <span style={{ color: "var(--danger)" }}>없음</span>}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <strong>og:url</strong>
                  </td>
                  <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    {ogData.url || <span style={{ color: "var(--danger)" }}>없음</span>}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0" }}>
                    <strong>og:image</strong>
                  </td>
                  <td style={{ padding: "8px 0" }}>
                    {ogData.image ? (
                      <a href={ogData.image} target="_blank" rel="noopener" style={{ wordBreak: "break-all" }}>
                        {ogData.image}
                      </a>
                    ) : (
                      <span style={{ color: "var(--danger)" }}>없음</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {ogData?.image && (
          <section className="card">
            <h2 className="sectionTitle">이미지 미리보기</h2>
            <div style={{
              background: "var(--bg-alt)",
              padding: "var(--space-md)",
              borderRadius: 8,
              textAlign: "center",
            }}>
              <img
                src={ogData.image}
                alt="og:image preview"
                style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8 }}
                onLoad={() => setImageStatus("success")}
                onError={() => setImageStatus("error")}
              />
              <p style={{ marginTop: "var(--space-sm)" }}>
                {imageStatus === "loading" && <span style={{ color: "var(--warning)" }}>로딩 중...</span>}
                {imageStatus === "success" && <span style={{ color: "var(--accent-2)" }}>이미지 로드 성공</span>}
                {imageStatus === "error" && <span style={{ color: "var(--danger)" }}>이미지 로드 실패</span>}
              </p>
            </div>
          </section>
        )}

        <div className="chipRow">
          <Link href="/" className="btn btnPrimary">홈으로</Link>
          <Link href="/status/" className="btn btnSecondary">운영 현황</Link>
        </div>
      </div>
    </>
  );
}
