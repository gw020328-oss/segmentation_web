import { useState, useMemo } from "react";

const STANDARD_DISPLAY = {
  id:       { icon: "🔢", label: "id", color: "#6c63ff" },
  reviewer: { icon: "👤", label: "reviewer", color: "#43D9AD" },
  rating:   { icon: "⭐", label: "rating",   color: "#fbbf24" },
  text:     { icon: "📝", label: "text",     color: "#a78bfa" },
  brand:    { icon: "🏢", label: "brand",    color: "#f472b6" },
};

const BRAND_PALETTE = [
  "#a78bfa", "#06b6d4", "#34d399", "#f97316", "#f472b6", "#fbbf24", "#60a5fa",
];

export default function Step0Data({ rows, cols, fileName, adapterStats, mapping }) {
  const [hovered, setHovered] = useState(null);
  const [activeTab, setActiveTab] = useState("__all__");

  // 브랜드 목록
  const brandNames = useMemo(() => {
    const brands = [...new Set(rows.map(r => r.brand).filter(Boolean))];
    return brands;
  }, [rows]);

  // 탭 기반 필터링
  const filteredRows = useMemo(() => {
    if (activeTab === "__all__" || !activeTab) return rows;
    return rows.filter(r => r.brand === activeTab);
  }, [rows, activeTab]);

  const displayCols = ["id", "reviewer", "rating", "text"].filter(c =>
    rows.length > 0 && rows[0][c] !== undefined
  );

  const ratingVal = (r) => {
    const v = parseInt(r[cols.ratingCol]);
    if (!cols.ratingCol || isNaN(v)) return null;
    return v;
  };

  const displayCols2 = ["id", "reviewer", "rating", "text", brandNames.length > 1 ? "brand" : null].filter(c =>
    c && filteredRows.length > 0 && filteredRows[0][c] !== undefined
  );

  return (
    <div className="fade-in">

      {/* ── 브랜드 탭 ── */}
      {brandNames.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {["__all__", ...brandNames].map((b, i) => {
            const isAll = b === "__all__";
            const label = isAll ? `전체 (${rows.length}건)` : `${b} (${rows.filter(r => r.brand === b).length}건)`;
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

      {/* ── Standardization summary bar ── */}
      {adapterStats && (
        <div style={{
          background: "linear-gradient(135deg,#0d1117,#12141f)",
          border: "1px solid #1e2336",
          borderRadius: 10,
          padding: "14px 20px",
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
        }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, minWidth: 120 }}>
            🔄 데이터 표준화 결과
          </div>

          {/* Column rename badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1 }}>
            {Object.entries(mapping).filter(([, orig]) => orig).map(([std, orig]) => {
              const meta = STANDARD_DISPLAY[std];
              return (
                <div key={std} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: meta.color + "12",
                  border: `1px solid ${meta.color}30`,
                  borderRadius: 6, padding: "4px 10px", fontSize: 11,
                }}>
                  <span style={{ color: "var(--muted)" }}>{orig}</span>
                  <span style={{ color: "#4b5563" }}>→</span>
                  <span style={{ fontWeight: 700, color: meta.color }}>{meta.icon} {meta.label}</span>
                </div>
              );
            })}
          </div>

          {/* Row / column stats */}
          <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
            <span style={{ color: "#34d399" }}>✓ {adapterStats.standardizedRows}행 유효</span>
            {adapterStats.nullDropped > 0 && (
              <span style={{ color: "#f87171" }}>✗ {adapterStats.nullDropped}행 결측 제거</span>
            )}
            {adapterStats.dropped?.length > 0 && (
              <span style={{ color: "#fbbf24" }}>⊖ {adapterStats.dropped.length}개 불필요 컬럼 제거</span>
            )}
          </div>
        </div>
      )}

      {/* ── Header stats ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>📋 표준화된 데이터 ({filteredRows.length}건{activeTab !== "__all__" && brandNames.length > 1 ? ` — ${activeTab}` : ""})</h2>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            ["총 리뷰", filteredRows.length],
            brandNames.length > 1 && activeTab === "__all__" && ["브랜드 수", brandNames.length],
            cols.ratingCol && filteredRows.some(r => r[cols.ratingCol]) && [
              "평균 평점",
              (filteredRows.reduce((s, r) => s + (parseFloat(r[cols.ratingCol]) || 0), filteredRows.length ? 0 : 1) / filteredRows.length).toFixed(1) + "★"
            ],
            ["표준 컬럼", displayCols2.length],
          ].filter(Boolean).map(([l, v]) => (
            <div key={l} className="card2" style={{ textAlign: "center", padding: "8px 16px" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent2)" }}>{v}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Standard columns legend ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {displayCols2.map(col => {
          const meta = STANDARD_DISPLAY[col] || { icon: "📌", label: col, color: "#6b72a0" };
          return (
            <span key={col} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20,
              background: meta.color + "18", border: `1px solid ${meta.color}44`,
              color: meta.color, fontWeight: 600,
            }}>
              {meta.icon} {meta.label}
            </span>
          );
        })}
        <span style={{ fontSize: 10, color: "var(--muted)", alignSelf: "center", marginLeft: 4 }}>
          — 표준 컬럼으로 정규화됨
        </span>
      </div>

      {/* ── Data table ── */}
      <div className="table-wrap" style={{ maxHeight: 500 }}>
        <table>
          <thead>
            <tr>
              {displayCols.map(col => {
                const meta = STANDARD_DISPLAY[col];
                return (
                  <th key={col} style={{ color: meta.color }}>
                    {meta.icon} {meta.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, i) => (
              <tr key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                {displayCols2.map(col => {
                  let content = r[col] ?? "—";
                  let cellColor = "inherit";
                  let cellWeight = 400;

                  if (col === "rating" && !isNaN(parseInt(r[col]))) {
                    const v = parseInt(r[col]);
                    cellColor = v >= 4 ? "var(--green)" : v <= 2 ? "var(--red)" : "var(--yellow)";
                    cellWeight = 700;
                    content = `${"★".repeat(Math.min(5, v))}${"☆".repeat(Math.max(0, 5 - v))} ${r[col]}`;
                  }

                  if (col === "brand") {
                    const bIdx = brandNames.indexOf(String(r[col]));
                    cellColor = BRAND_PALETTE[bIdx % BRAND_PALETTE.length] || "#f472b6";
                    cellWeight = 700;
                  }

                  return (
                    <td key={col} style={{
                      maxWidth: col === "text" ? 380 : col === "brand" ? 120 : 140,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      color: cellColor, fontWeight: cellWeight,
                    }}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adapterStats?.dropped?.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
          💡 원본 파일의 <strong style={{ color: "#fbbf24" }}>{adapterStats.dropped.join(", ")}</strong> 컬럼은 분석에 사용되지 않아 제거되었습니다.
        </p>
      )}
    </div>
  );
}
