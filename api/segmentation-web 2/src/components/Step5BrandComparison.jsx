import { useState } from "react";
import { BRAND_PALETTE } from "../engine/brandEngine.js";
import RadarChart from "./RadarChart.jsx";

/**
 * Step5BrandComparison – 브랜드 선택 토글 + 레이더 차트 + 브랜드별 핵심 지표
 */
export default function Step5BrandComparison({
  radarData, aspectKeys, personas, rows, brandNames,
  selectedBrands, setSelectedBrands,
}) {
  const allBrands = brandNames || Object.keys(radarData || {});

  // 브랜드 색상 매핑
  const brandColors = Object.fromEntries(
    allBrands.map((b, i) => [b, BRAND_PALETTE[i % BRAND_PALETTE.length].primary])
  );

  const toggleBrand = (brand) => {
    setSelectedBrands(prev =>
      prev.includes(brand)
        ? prev.length > 1 ? prev.filter(b => b !== brand) : prev
        : [...prev, brand]
    );
  };

  if (!allBrands.length || !aspectKeys.length) {
    return (
      <div style={{ color: "var(--muted)", padding: 40, textAlign: "center" }}>
        다중 브랜드 데이터가 필요합니다.
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
        ⚔️ 브랜드 경쟁 포지셔닝 분석
      </h2>
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 20 }}>
        ABSA 기반 속성별 감성 점수로 각 브랜드의 시장 포지셔닝을 비교합니다.
      </p>

      {/* Brand Toggle Bar */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap",
        padding: "12px 16px", background: "var(--card2)",
        borderRadius: 12, marginBottom: 20, alignItems: "center",
      }}>
        <span style={{ fontSize: 11, color: "var(--muted)", marginRight: 4 }}>브랜드 필터:</span>
        {allBrands.map((brand, i) => {
          const color = brandColors[brand];
          const active = selectedBrands.includes(brand);
          return (
            <button key={brand} onClick={() => toggleBrand(brand)}
              style={{
                padding: "6px 14px", borderRadius: 20, border: `2px solid ${color}`,
                background: active ? color : "transparent",
                color: active ? "#fff" : color,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "var(--font)",
                transition: "all .2s",
                boxShadow: active ? `0 0 12px ${color}44` : "none",
              }}>
              {brand}
            </button>
          );
        })}
        <button onClick={() => setSelectedBrands(allBrands)}
          style={{ marginLeft: "auto", fontSize: 11, padding: "4px 10px", borderRadius: 16,
            background: "none", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer" }}>
          전체 선택
        </button>
      </div>

      {/* Main grid: Radar + Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Radar Chart */}
        <RadarChart
          radarData={radarData}
          aspectKeys={aspectKeys}
          brandColors={brandColors}
          selectedBrands={selectedBrands}
        />

        {/* Attribute comparison table */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📊 속성별 감성 점수 비교</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: "6px 10px", textAlign: "left", color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                    속성
                  </th>
                  {selectedBrands.map(b => (
                    <th key={b} style={{ padding: "6px 10px", textAlign: "center", color: brandColors[b], borderBottom: "1px solid var(--border)" }}>
                      {b}
                    </th>
                  ))}
                  {selectedBrands.length > 1 && (
                    <th style={{ padding: "6px 10px", textAlign: "center", color: "var(--muted)", borderBottom: "1px solid var(--border)", fontSize: 10 }}>
                      격차
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {aspectKeys.map(asp => {
                  const scores = selectedBrands.map(b => radarData[b]?.[asp] ?? 0);
                  const maxScore = Math.max(...scores);
                  const minScore = Math.min(...scores);
                  const gap = selectedBrands.length > 1 ? (maxScore - minScore) : 0;

                  return (
                    <tr key={asp} style={{ borderBottom: "1px solid var(--border)10" }}>
                      <td style={{ padding: "7px 10px", fontWeight: 600 }}>{asp}</td>
                      {selectedBrands.map(b => {
                        const score = radarData[b]?.[asp] ?? 0;
                        const isMax = score === maxScore && selectedBrands.length > 1;
                        return (
                          <td key={b} style={{ padding: "7px 10px", textAlign: "center" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <span style={{
                                fontWeight: 800, fontSize: 13,
                                color: score > 0.1 ? "var(--green)" : score < -0.1 ? "var(--red)" : "var(--muted)",
                              }}>
                                {score > 0 ? "+" : ""}{score.toFixed(2)}
                              </span>
                              {isMax && (
                                <span style={{ fontSize: 9, background: "#10b98120", color: "#10b981",
                                  padding: "1px 5px", borderRadius: 6 }}>최고</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      {selectedBrands.length > 1 && (
                        <td style={{ padding: "7px 10px", textAlign: "center" }}>
                          <span style={{ fontSize: 11,
                            color: gap > 0.4 ? "#f87171" : gap > 0.2 ? "#fbbf24" : "var(--muted)" }}>
                            {gap.toFixed(2)}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Brand KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {selectedBrands.map((brand, i) => {
          const color = brandColors[brand];
          const scores = radarData[brand] || {};
          const vals = Object.values(scores);
          const avgScore = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
          const brandRows = rows.filter(r => r.brand === brand);
          const avgRating = brandRows.length
            ? brandRows.filter(r => r.rating).reduce((s, r) => s + (parseFloat(r.rating) || 0), 0) / brandRows.filter(r => r.rating).length
            : null;
          const topAspect = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
          const weakAspect = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];

          // 브랜드 속한 클러스터 분포
          const brandPersonas = personas.filter(p => p.brandDist?.[brand]);

          return (
            <div key={brand} style={{
              background: `linear-gradient(135deg, var(--card), ${color}0a)`,
              border: `1.5px solid ${color}44`,
              borderRadius: 14, padding: 18,
              transition: "transform .2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
                <div style={{ fontSize: 15, fontWeight: 800, color }}>{brand}</div>
              </div>

              {/* KPI metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ background: "var(--card2)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: avgScore > 0 ? "var(--green)" : "var(--red)" }}>
                    {avgScore > 0 ? "+" : ""}{avgScore.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--muted)" }}>평균 감성</div>
                </div>
                <div style={{ background: "var(--card2)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  {avgRating != null ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24" }}>★{avgRating.toFixed(1)}</div>
                      <div style={{ fontSize: 9, color: "var(--muted)" }}>평균 평점</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--muted)" }}>{brandRows.length}</div>
                      <div style={{ fontSize: 9, color: "var(--muted)" }}>리뷰 수</div>
                    </>
                  )}
                </div>
              </div>

              {/* Strengths / Weaknesses */}
              {topAspect && (
                <div style={{ fontSize: 11, marginBottom: 6, display: "flex", gap: 6 }}>
                  <span style={{ color: "var(--green)" }}>💪</span>
                  <span><strong>{topAspect[0]}</strong> <span style={{ color: "var(--green)" }}>+{topAspect[1].toFixed(2)}</span></span>
                </div>
              )}
              {weakAspect && weakAspect[1] < 0 && (
                <div style={{ fontSize: 11, marginBottom: 10, display: "flex", gap: 6 }}>
                  <span style={{ color: "var(--red)" }}>⚠️</span>
                  <span><strong>{weakAspect[0]}</strong> <span style={{ color: "var(--red)" }}>{weakAspect[1].toFixed(2)}</span></span>
                </div>
              )}

              {/* Customer persona distribution */}
              {brandPersonas.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4 }}>주요 고객군</div>
                  {brandPersonas.slice(0, 3).map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
                      <span style={{ fontSize: 10 }}>{p.name.slice(0, 10)}</span>
                      <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
                        {p.brandDist[brand]?.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
