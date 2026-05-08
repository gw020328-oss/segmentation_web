import { useState } from "react";

export default function Step3Scatter({ points2D, labels, personas, silScores, bestK, k, setManualK, rows, cols, aspectKeys }) {
  const [hov, setHov] = useState(null);
  if (!points2D.length) return <div style={{ color: "var(--muted)", padding: 40, textAlign: "center" }}>데이터가 부족합니다.</div>;

  const maxSil = Math.max(...silScores.map(s => Math.abs(s.score)), 0.01);
  const axis1 = points2D[0]?.label1 || aspectKeys[0] || "축1";
  const axis2 = points2D[0]?.label2 || aspectKeys[1] || "축2";

  // normalize points to SVG coords [20, 280]
  const xs = points2D.map(p => p.x);
  const ys = points2D.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs) || 1;
  const minY = Math.min(...ys), maxY = Math.max(...ys) || 1;
  const norm = (v, min, max) => 20 + ((v - min) / (max - min + 0.001)) * 260;

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🎯 K-Means 클러스터링 (k={k})</h2>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        {aspectKeys.length}차원 속성감성 벡터를 2차원으로 투영한 산점도입니다.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Scatter */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>PCA 군집 시각화</div>
          <svg viewBox="0 0 300 300" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
            <line x1={0} y1={150} x2={300} y2={150} stroke="var(--border2)" strokeWidth={1} />
            <line x1={150} y1={0} x2={150} y2={300} stroke="var(--border2)" strokeWidth={1} />
            <text x={240} y={165} fontSize={8} fill="var(--muted)">{axis1} →</text>
            <text x={155} y={12} fontSize={8} fill="var(--muted)">{axis2} →</text>
            {points2D.map((pt, i) => {
              const p = personas[labels[i]];
              const color = p?.color || "#6c63ff";
              const cx = norm(pt.x, minX, maxX);
              const cy = 300 - norm(pt.y, minY, maxY);
              return (
                <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
                  <circle cx={cx} cy={cy} r={hov === i ? 9 : 6} fill={color} opacity={0.85} stroke="#fff" strokeWidth={hov === i ? 2 : 0} style={{ transition: "all .15s" }} />
                  {hov === i && (
                    <text x={cx + 10} y={cy + 4} fontSize={8} fill="#fff">{rows[i]?.[cols.reviewerCol] || `#${i+1}`}</text>
                  )}
                </g>
              );
            })}
          </svg>
          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 12 }}>
            {personas.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                <span>{p.name}</span>
                <span style={{ color: "var(--muted)" }}>({p.members.length})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Silhouette */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>실루엣 점수 (최적 k 탐색)</div>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>높을수록 군집 간 분리가 명확합니다.</p>
          {silScores.map(({ k: ki, score }) => (
            <div key={ki} className="sil-bar">
              <span className="sil-label">k={ki}</span>
              <div style={{ flex: 1, height: 20, background: "var(--card2)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                <div style={{
                  height: "100%", width: `${(Math.abs(score) / maxSil) * 100}%`,
                  background: ki === bestK ? "var(--accent)" : "var(--border2)",
                  borderRadius: 4, transition: "width .5s",
                  display: "flex", alignItems: "center", paddingLeft: 8,
                }}>
                  {ki === bestK && <span style={{ fontSize: 10, color: "#fff", whiteSpace: "nowrap" }}>✓ 자동 선택</span>}
                </div>
              </div>
              <span className="sil-val">{score.toFixed(4)}</span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>수동으로 k 선택:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className={`btn ${k === bestK && !false ? "btn-primary" : "btn-ghost"}`} style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setManualK(null)}>자동 (k={bestK})</button>
              {silScores.map(({ k: ki }) => (
                <button key={ki} className={`btn ${k === ki ? "btn-primary" : "btn-ghost"}`} style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setManualK(ki)}>{ki}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip on hover */}
      {hov !== null && (
        <div className="card" style={{ marginTop: 16, fontSize: 12 }}>
          <strong style={{ color: personas[labels[hov]]?.color }}>{personas[labels[hov]]?.name} 세그먼트</strong>
          {" — "}{rows[hov]?.[cols.textCol]?.slice(0, 80)}...
        </div>
      )}
    </div>
  );
}
