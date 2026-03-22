type Store = {
  name: string;
  address: string;
  rank: number;
  tel?: string;
  method?: string;
};

type StoreData = {
  draw_no: number;
  rank1: Store[];
  rank2: Store[];
};

type Props = {
  drawNo: number;
  stores?: StoreData | null;
};

function isOnlineStore(s: Store): boolean {
  return s.name === "인터넷 복권판매사이트" || s.address.includes("dhlottery.co.kr");
}

function cleanAddress(address: string): string {
  return address.replace(/\([^)]*\)/g, "").trim();
}

function mapSearchUrl(address: string): string {
  return `https://map.kakao.com/?q=${encodeURIComponent(cleanAddress(address))}`;
}

type GroupedStore = Store & { count: number };

function dedupeAndSort(stores: Store[]): GroupedStore[] {
  const map = new Map<string, GroupedStore>();
  for (const s of stores) {
    const key = `${s.name}||${s.address}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      if (!existing.method && s.method) existing.method = s.method;
    } else {
      map.set(key, { ...s, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => a.address.localeCompare(b.address, "ko"));
}

function renderStoreList(stores: Store[]) {
  const physical = dedupeAndSort(stores.filter((s) => !isOnlineStore(s)));
  const onlineCount = stores.filter((s) => isOnlineStore(s)).length;

  return (
    <>
      <div style={{ display: "grid", gap: "var(--space-xs)" }}>
        {physical.map((s, i) => (
          <a
            key={i}
            href={mapSearchUrl(s.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="statCard"
            style={{
              padding: "var(--space-sm) var(--space-md)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--space-sm)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div className="subtle" style={{ fontSize: 12, marginTop: 2 }}>
                {s.address}
                {s.method && <span style={{ marginLeft: 8, color: "var(--accent)" }}>({s.method})</span>}
                {s.count > 1 && <span style={{ marginLeft: 8, color: "#f87171", fontWeight: 600 }}>{s.count}건</span>}
              </div>
            </div>
            <span className="subtle" style={{ fontSize: 13, flexShrink: 0 }}>지도 →</span>
          </a>
        ))}
      </div>
      {onlineCount > 0 && (
        <div className="subtle" style={{ fontSize: 12, marginTop: "var(--space-xs)" }}>
          + 인터넷 복권판매사이트(동행복권) {onlineCount}건
        </div>
      )}
    </>
  );
}

export default function StoreLinks({ drawNo, stores }: Props) {
  const hasData = stores && (stores.rank1.length > 0 || stores.rank2.length > 0);

  return (
    <section className="card">
      <h2 className="sectionTitle">{drawNo}회 당첨 판매점</h2>

      {hasData ? (
        <div style={{ display: "grid", gap: "var(--space-md)" }}>
          {stores.rank1.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: "var(--space-sm)", color: "#fbbf24" }}>
                1등 판매점 ({stores.rank1.length}곳)
              </div>
              {renderStoreList(stores.rank1)}
            </div>
          )}

          {stores.rank2.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: "var(--space-sm)", color: "#60a5fa" }}>
                2등 판매점 ({stores.rank2.length}곳)
              </div>
              {renderStoreList(stores.rank2)}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="subtle" style={{ marginBottom: "var(--space-md)" }}>
            판매점 데이터가 아직 수집되지 않았습니다.
          </p>
          <a
            href="https://www.dhlottery.co.kr/wnprchsplcsrch/home"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btnSecondary"
            style={{ fontSize: 13, padding: "8px 14px" }}
          >
            동행복권에서 당첨 판매점 조회 →
          </a>
        </div>
      )}
    </section>
  );
}
