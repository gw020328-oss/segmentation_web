import { useState, useMemo } from "react";

const BRAND_PALETTE = [
  "#a78bfa", "#06b6d4", "#34d399", "#f97316", "#f472b6", "#fbbf24", "#60a5fa",
];

export default function Step1ABSA({ absa, rows, cols, aspects, aspectKeys, domainCfg }) {
  const [activeTab, setActiveTab] = useState("__all__");

  const sentStyle = (v) => ({
    1:  { bg: "#34d39918", border: "#34d39944", color: "#34d399", label: "긍정 +" },
    "-1": { bg: "#f8717118", border: "#f8717144", color: "#f87171", label: "부정 −" },
    0:  { bg: "#6b72a018", border: "#6b72a044", color: "#6b72a0", label: "중립"  },
  }[String(v)] || { bg: "#6b72a018", border: "#6b72a044", color: "#6b72a0", label: "?" });

  // 브랜드 목록 (rows에서 추출)
  const brandNames = useMemo(() => {
    return [...new Set(rows.map(r => r.brand).filter(Boolean))];
  }, [rows]);

  // absa와 rows를 함께 인덱스로 연결한 뒤 탭 필터링
  const pairedFiltered = useMemo(() => {
    const paired = absa.map((a, i) => ({ absa: a, row: rows[i] || {} }));
    if (activeTab === "__all__" || !activeTab) return paired;
    return paired.filter(({ row }) => row.brand === activeTab);
  }, [absa, rows, activeTab]);

  const posCount = pairedFiltered.reduce((s, { absa: r }) => s + Object.values(r.aspects).filter(v => v === 1).length, 0);
  const negCount = pairedFiltered.reduce((s, { absa: r }) => s + Object.values(r.aspects).filter(v => v === -1).length, 0);

  return (
    <div className="fade-in">

      {/* ── 브랜드 탭 ── */}
      {brandNames.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {["__all__", ...brandNames].map((b, i) => {
            const isAll = b === "__all__";
            const count = isAll ? absa.length : rows.filter(r => r.brand === b).length;
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

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>
          🔍 ABSA 속성·감성 추출 ({pairedFiltered.length}건
          {activeTab !== "__all__" && brandNames.length > 1 ? ` — ${activeTab}` : ""})
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="pill" style={{ background: "#34d39918", color: "#34d399" }}>긍정 {posCount}건</span>
          <span className="pill" style={{ background: "#f8717118", color: "#f87171" }}>부정 {negCount}건</span>
        </div>
      </div>

      {/* Aspect legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {aspectKeys.map((a, i) => (
          <span key={a} className="badge" style={{ background: domainCfg.colors[i % domainCfg.colors.length] + "22", color: domainCfg.colors[i % domainCfg.colors.length] }}>
            {a}
          </span>
        ))}
      </div>

      <div style={{ maxHeight: 460, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {pairedFiltered.map(({ absa: r, row }, idx) => {
          const mentions = Object.entries(r.aspects).filter(([, v]) => v !== 0);
          const brandIdx = brandNames.indexOf(String(row.brand));
          const brandColor = brandIdx >= 0 ? BRAND_PALETTE[brandIdx % BRAND_PALETTE.length] : null;
          return (
            <div key={`${r.id}-${idx}`} className="card2">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{row[cols.reviewerCol] || `#${r.id}`}</span>
                  {brandColor && brandNames.length > 1 && activeTab === "__all__" && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: brandColor + "20", color: brandColor, border: `1px solid ${brandColor}44`,
                    }}>
                      🏢 {row.brand}
                    </span>
                  )}
                </div>
                {cols.ratingCol && <span style={{ fontSize: 12, color: "var(--yellow)" }}>{"★".repeat(Math.min(5, parseInt(row[cols.ratingCol]) || 0))}</span>}
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.6 }}>"{row[cols.textCol]}"</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {mentions.length === 0
                  ? <span style={{ fontSize: 11, color: "var(--muted)" }}>언급된 속성 없음</span>
                  : mentions.map(([asp, v]) => {
                    const s = sentStyle(v);
                    const ci = aspectKeys.indexOf(asp);
                    const aspColor = domainCfg.colors[ci % domainCfg.colors.length];
                    return (
                      <span key={asp} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 12, background: aspColor + "18", border: `1px solid ${aspColor}44` }}>
                        <span style={{ color: aspColor, fontWeight: 600 }}>{asp}</span>
                        <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, padding: "1px 6px", borderRadius: 10, fontSize: 10 }}>{s.label}</span>
                      </span>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
