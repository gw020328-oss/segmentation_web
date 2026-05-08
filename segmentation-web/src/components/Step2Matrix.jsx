import { useState, useMemo } from "react";

const BRAND_PALETTE = [
  "#a78bfa", "#06b6d4", "#34d399", "#f97316", "#f472b6", "#fbbf24", "#60a5fa",
];

export default function Step2Matrix({ matrix, rows, cols, aspectKeys, labels, domainCfg }) {
  const [activeTab, setActiveTab] = useState("__all__");

  // 브랜드 목록
  const brandNames = useMemo(() => {
    return [...new Set(rows.map(r => r.brand).filter(Boolean))];
  }, [rows]);

  // 탭 기반으로 (matrix row, rows row, label) 필터링
  const filtered = useMemo(() => {
    if (activeTab === "__all__" || !activeTab) {
      return matrix.map((m, i) => ({ m, row: rows[i] || {}, label: labels[i] }));
    }
    return matrix.map((m, i) => ({ m, row: rows[i] || {}, label: labels[i] }))
      .filter(({ row }) => row.brand === activeTab);
  }, [matrix, rows, labels, activeTab]);

  const display = filtered.slice(0, 50);
  const clusterColors = domainCfg.colors;

  // 속성별 평균 감성 (필터된 데이터 기반)
  const aspectAvgs = useMemo(() => {
    if (!filtered.length) return [];
    return aspectKeys.map((asp, ai) => {
      const avg = filtered.reduce((s, { m }) => s + (m[ai] || 0), 0) / filtered.length;
      return { asp, avg };
    });
  }, [filtered, aspectKeys]);

  return (
    <div className="fade-in">

      {/* ── 브랜드 탭 ── */}
      {brandNames.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {["__all__", ...brandNames].map((b, i) => {
            const isAll = b === "__all__";
            const count = isAll ? matrix.length : rows.filter(r => r.brand === b).length;
            const label = isAll ? `전체 (${count}건)` : `${b} (${count}건)`;
            const color = isAll ? "#6c63ff" : BRAND_PALETTE[(i - 1) % BRAND_PALETTE.length];
            const active = activeTab === b;
            return (
              <button key={b}
                onClick={() => setActiveTab(b)}
                style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${color}`,
                  background: active ? color : "transparent",
                  color: active ? "#fff" : color,
                  cursor: "pointer", fontFamily: "var(--font)",
                  transition: "all .2s",
                }}
              >
                {isAll ? "🗂 " : "🏢 "}{label}
              </button>
            );
          })}
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        📊 리뷰어 × 속성감성 매트릭스
        {activeTab !== "__all__" && brandNames.length > 1 ? ` — ${activeTab}` : ""}
      </h2>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        ABSA 결과를 수치 매트릭스로 변환합니다. +1=긍정, 0=언급 없음·중립, −1=부정. 이 매트릭스가 클러스터링의 입력이 됩니다.
      </p>

      {/* Aspect summary bars */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {aspectAvgs.map(({ asp, avg }, ai) => {
          const color = domainCfg.colors[ai % domainCfg.colors.length];
          return (
            <div key={asp} className="card2" style={{ minWidth: 100, flex: 1, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 4 }}>{asp}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: avg > 0 ? "var(--green)" : avg < 0 ? "var(--red)" : "var(--muted)" }}>
                {avg > 0 ? "+" : ""}{avg.toFixed(2)}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>평균 감성</div>
            </div>
          );
        })}
      </div>

      <div className="table-wrap" style={{ maxHeight: 420 }}>
        <table style={{ minWidth: 500 }}>
          <thead>
            <tr>
              <th>클러스터</th>
              {brandNames.length > 1 && activeTab === "__all__" && <th style={{ color: "#f472b6" }}>🏢 브랜드</th>}
              <th>리뷰어</th>
              {aspectKeys.map((a, i) => (
                <th key={a} style={{ color: domainCfg.colors[i % domainCfg.colors.length], textAlign: "center" }}>{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map(({ m, row, label }, i) => {
              const brandIdx = brandNames.indexOf(String(row.brand));
              const brandColor = brandIdx >= 0 ? BRAND_PALETTE[brandIdx % BRAND_PALETTE.length] : "#f472b6";
              return (
                <tr key={i}>
                  <td>
                    <span className="pill" style={{ background: (clusterColors[label % clusterColors.length] || "#6c63ff") + "22", color: clusterColors[label % clusterColors.length] || "var(--accent)" }}>
                      C{label ?? "?"}
                    </span>
                  </td>
                  {brandNames.length > 1 && activeTab === "__all__" && (
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, color: brandColor }}>{row.brand || "—"}</span>
                    </td>
                  )}
                  <td style={{ fontWeight: 500 }}>{row[cols.reviewerCol] || `#${i + 1}`}</td>
                  {m.map((v, j) => (
                    <td key={j} style={{
                      textAlign: "center", fontWeight: 700,
                      color: v > 0 ? "var(--green)" : v < 0 ? "var(--red)" : "#4b5563",
                      background: v > 0 ? "#34d39910" : v < 0 ? "#f8717110" : "transparent",
                    }}>{v > 0 ? "+1" : v < 0 ? "−1" : "0"}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > 50 && (
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>※ 상위 50건만 표시 (전체 {filtered.length}건)</p>
      )}
    </div>
  );
}
