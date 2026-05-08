import { useState } from "react";
import { BRAND_PALETTE } from "../engine/brandEngine.js";

/**
 * BrandPCA – 브랜드별 군집 분포도 (Faceted PCA 시각화)
 * 기존 Step3Scatter를 확장: 브랜드 선택 토글 + 브랜드별 영역 표시
 */
export default function BrandPCA({
  points2D, labels, personas, rows,
  silScores, bestK, k, setManualK,
  aspectKeys, selectedBrands, brandColors,
}) {
  const [hov, setHov] = useState(null);
  const [viewMode, setViewMode] = useState("cluster"); // "cluster" | "brand"

  if (!points2D.length) return (
    <div style={{ color: "var(--muted)", padding: 40, textAlign: "center" }}>
      데이터가 부족합니다.
    </div>
  );

  const maxSil = Math.max(...silScores.map(s => Math.abs(s.score)), 0.01);
  const axis1 = points2D[0]?.label1 || aspectKeys[0] || "축1";
  const axis2 = points2D[0]?.label2 || aspectKeys[1] || "축2";

  const xs = points2D.map(p => p.x);
  const ys = points2D.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs) || 1;
  const minY = Math.min(...ys), maxY = Math.max(...ys) || 1;
  const norm = (v, min, max) => 20 + ((v - min) / (max - min + 0.001)) * 260;

  const allBrands = [...new Set(rows.map(r => r.brand).filter(Boolean))];
  const activeBrands = selectedBrands?.length ? selectedBrands : allBrands;

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🎯 브랜드별 군집 분포도 (k={k})</h2>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            {aspectKeys.length}차원 → PCA 2D 투영 | 각 브랜드의 고객군 점유 영역 시각화
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["cluster", "brand"].map(mode => (
            <button key={mode}
              className={`btn ${viewMode === mode ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: 11, padding: "6px 14px" }}
              onClick={() => setViewMode(mode)}>
              {mode === "cluster" ? "🎨 클러스터 뷰" : "🏢 브랜드 뷰"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        {/* ── PCA Scatter ── */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            {viewMode === "brand" ? "브랜드별 고객군 분포" : "클러스터별 군집 시각화"}
          </div>
          <svg viewBox="0 0 300 300" style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}>
            {/* Grid */}
            <line x1={0} y1={150} x2={300} y2={150} stroke="var(--border2)" strokeWidth={0.8} />
            <line x1={150} y1={0} x2={150} y2={300} stroke="var(--border2)" strokeWidth={0.8} />
            <text x={235} y={163} fontSize={7.5} fill="var(--muted)">{axis1} →</text>
            <text x={155} y={12} fontSize={7.5} fill="var(--muted)">{axis2} →</text>

            {/* 클러스터 헐(convex hull 근사: 타원) */}
            {viewMode === "cluster" && personas.map((p) => {
              const clusterPts = points2D
                .map((pt, i) => ({ ...pt, label: labels[i] }))
                .filter(pt => pt.label === p.id);
              if (clusterPts.length < 3) return null;
              const cxs = clusterPts.map(pt => norm(pt.x, minX, maxX));
              const cys = clusterPts.map(pt => 300 - norm(pt.y, minY, maxY));
              const mcx = cxs.reduce((s, v) => s + v, 0) / cxs.length;
              const mcy = cys.reduce((s, v) => s + v, 0) / cys.length;
              const rx = Math.max(18, Math.min(60, (Math.max(...cxs) - Math.min(...cxs)) / 2 + 10));
              const ry = Math.max(18, Math.min(60, (Math.max(...cys) - Math.min(...cys)) / 2 + 10));
              return (
                <ellipse key={p.id} cx={mcx} cy={mcy} rx={rx} ry={ry}
                  fill={p.color + "12"} stroke={p.color} strokeWidth={1.5}
                  strokeDasharray="5,3" />
              );
            })}

            {/* 점 */}
            {points2D.map((pt, i) => {
              const row = rows[i];
              const brand = row?.brand;
              if (activeBrands.length && !activeBrands.includes(brand)) return null;

              const p = personas[labels[i]];
              const clusterColor = p?.color || "#6c63ff";
              const brandColor = brandColors[brand] || clusterColor;
              const fill = viewMode === "brand" ? brandColor : clusterColor;

              const cx = norm(pt.x, minX, maxX);
              const cy = 300 - norm(pt.y, minY, maxY);
              const isHov = hov === i;

              return (
                <g key={i}
                  onMouseEnter={() => setHov(i)}
                  onMouseLeave={() => setHov(null)}>
                  <circle cx={cx} cy={cy}
                    r={isHov ? 10 : 5.5}
                    fill={fill} opacity={isHov ? 1 : 0.78}
                    stroke="#fff" strokeWidth={isHov ? 2 : 0}
                    style={{ transition: "all .15s", cursor: "pointer" }} />
                  {viewMode === "brand" && (
                    <circle cx={cx} cy={cy} r={isHov ? 10 : 5.5}
                      fill="none" stroke={clusterColor} strokeWidth={1} opacity={0.5} />
                  )}
                  {isHov && (
                    <text x={cx + 11} y={cy + 4} fontSize={8} fill="#fff"
                      style={{ pointerEvents: "none" }}>
                      {brand ? `[${brand}]` : ""} {row?.reviewer || `#${i + 1}`}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* 범례 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 14 }}>
            {viewMode === "cluster" ? personas.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                <span>{p.name}</span>
                <span style={{ color: "var(--muted)" }}>({p.members.length})</span>
              </div>
            )) : allBrands.filter(b => activeBrands.includes(b)).map((brand) => (
              <div key={brand} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: brandColors[brand] }} />
                <span>{brand}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel: Silhouette + Brand distribution ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Silhouette */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>실루엣 점수 (최적 k)</div>
            <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>높을수록 군집 분리가 명확합니다.</p>
            {silScores.map(({ k: ki, score }) => (
              <div key={ki} className="sil-bar">
                <span className="sil-label">k={ki}</span>
                <div style={{ flex: 1, height: 18, background: "var(--card2)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                  <div style={{
                    height: "100%", width: `${(Math.abs(score) / maxSil) * 100}%`,
                    background: ki === bestK ? "var(--accent)" : "var(--border2)",
                    borderRadius: 4, transition: "width .5s",
                    display: "flex", alignItems: "center", paddingLeft: 6,
                  }}>
                    {ki === bestK && <span style={{ fontSize: 9, color: "#fff", whiteSpace: "nowrap" }}>✓ 자동 선택</span>}
                  </div>
                </div>
                <span className="sil-val">{score.toFixed(3)}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className={`btn ${k === bestK ? "btn-primary" : "btn-ghost"}`}
                style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setManualK(null)}>
                자동 (k={bestK})
              </button>
              {silScores.map(({ k: ki }) => (
                <button key={ki} className={`btn ${k === ki ? "btn-primary" : "btn-ghost"}`}
                  style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setManualK(ki)}>
                  {ki}
                </button>
              ))}
            </div>
          </div>

          {/* Brand-cluster cross distribution */}
          {allBrands.length > 1 && (
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📊 클러스터 × 브랜드 분포</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ fontSize: 11, width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "4px 8px", textAlign: "left", color: "var(--muted)" }}>클러스터</th>
                      {allBrands.map(b => (
                        <th key={b} style={{ padding: "4px 8px", textAlign: "center", color: brandColors[b] || "var(--text)" }}>
                          {b}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {personas.map(p => (
                      <tr key={p.id}>
                        <td style={{ padding: "4px 8px", fontWeight: 700, color: p.color }}>
                          {p.name.slice(0, 8)}
                        </td>
                        {allBrands.map(b => {
                          const bd = p.brandDist?.[b];
                          return (
                            <td key={b} style={{ padding: "4px 8px", textAlign: "center" }}>
                              {bd ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                  <div style={{ width: `${Math.max(4, bd.pct)}%`, minWidth: 24, height: 12,
                                    background: (brandColors[b] || "#6c63ff") + "88", borderRadius: 3,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 9, color: "#fff", fontWeight: 700 }}>
                                    {bd.pct}%
                                  </div>
                                </div>
                              ) : <span style={{ color: "var(--border2)" }}>—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hover tooltip */}
      {hov !== null && (
        <div className="card fade-in" style={{ marginTop: 14, fontSize: 12 }}>
          <strong style={{ color: personas[labels[hov]]?.color }}>
            [{rows[hov]?.brand}] {personas[labels[hov]]?.name} 세그먼트
          </strong>
          {" — "}{rows[hov]?.text?.slice(0, 100)}...
        </div>
      )}
    </div>
  );
}
