/**
 * RadarChart – 브랜드별 ABSA 속성 점수 방사형 차트 (순수 SVG)
 * props:
 *   radarData   : { brandName: { asp: score } }
 *   aspectKeys  : string[]
 *   brandColors : { brandName: string }
 *   selectedBrands: string[]   (선택된 브랜드만 표시)
 */
export default function RadarChart({ radarData, aspectKeys, brandColors, selectedBrands }) {
  if (!aspectKeys.length) return null;

  const SIZE = 280;
  const CX = SIZE / 2, CY = SIZE / 2;
  const R = 110;
  const LEVELS = 4; // 동심원 개수
  const n = aspectKeys.length;

  // 각도 계산
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const polar = (i, r) => ({
    x: CX + r * Math.cos(angle(i)),
    y: CY + r * Math.sin(angle(i)),
  });

  // 점수 [-1, 1] → 반지름 [0, R]
  const scoreToR = (s) => ((s + 1) / 2) * R;

  // 다각형 포인트 문자열
  const polyPoints = (brand) =>
    aspectKeys.map((asp, i) => {
      const score = radarData[brand]?.[asp] ?? 0;
      const pt = polar(i, scoreToR(score));
      return `${pt.x},${pt.y}`;
    }).join(" ");

  const visibleBrands = (selectedBrands || Object.keys(radarData)).filter(b => radarData[b]);

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
        📡 브랜드별 속성 레이더 차트
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
        점수 범위: −1(부정) ↔ 0(중립) ↔ +1(긍정)
      </div>

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: "100%", maxWidth: SIZE, display: "block", margin: "0 auto" }}>
        {/* 동심원 */}
        {Array.from({ length: LEVELS }, (_, li) => {
          const r = R * ((li + 1) / LEVELS);
          return (
            <circle key={li} cx={CX} cy={CY} r={r}
              fill="none" stroke="var(--border2)" strokeWidth={1} strokeDasharray="3,3" />
          );
        })}

        {/* 레벨 레이블 */}
        {Array.from({ length: LEVELS }, (_, li) => {
          const r = R * ((li + 1) / LEVELS);
          const score = ((r / R) * 2 - 1).toFixed(1);
          return (
            <text key={li} x={CX + 4} y={CY - r + 10}
              fontSize={7} fill="var(--muted)" opacity={0.7}>{score}</text>
          );
        })}

        {/* 중심선 (축) */}
        {aspectKeys.map((_, i) => {
          const end = polar(i, R);
          return (
            <line key={i} x1={CX} y1={CY} x2={end.x} y2={end.y}
              stroke="var(--border2)" strokeWidth={1} />
          );
        })}

        {/* 축 레이블 */}
        {aspectKeys.map((asp, i) => {
          const pt = polar(i, R + 18);
          const textAnchor = pt.x < CX - 5 ? "end" : pt.x > CX + 5 ? "start" : "middle";
          return (
            <text key={i} x={pt.x} y={pt.y + 4}
              fontSize={8.5} fill="var(--text)" textAnchor={textAnchor} fontWeight="600">
              {asp}
            </text>
          );
        })}

        {/* 브랜드별 폴리곤 */}
        {visibleBrands.map((brand) => {
          const color = brandColors[brand] || "#6c63ff";
          const pts = polyPoints(brand);
          return (
            <g key={brand}>
              <polygon points={pts}
                fill={color + "28"} stroke={color} strokeWidth={2}
                strokeLinejoin="round"
                style={{ transition: "all .3s" }} />
              {/* 꼭짓점 dot */}
              {aspectKeys.map((asp, i) => {
                const score = radarData[brand]?.[asp] ?? 0;
                const pt = polar(i, scoreToR(score));
                return (
                  <circle key={i} cx={pt.x} cy={pt.y} r={3}
                    fill={color} stroke="#fff" strokeWidth={1} />
                );
              })}
            </g>
          );
        })}

        {/* 0 기준선 (중간 반지름) */}
        <circle cx={CX} cy={CY} r={R / 2}
          fill="none" stroke="var(--accent)" strokeWidth={1} strokeDasharray="6,3" opacity={0.4} />
        <text x={CX + 4} y={CY - R / 2 + 10} fontSize={7} fill="var(--accent)" opacity={0.7}>0</text>
      </svg>

      {/* 범례 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 14 }}>
        {visibleBrands.map(brand => (
          <div key={brand} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <div style={{ width: 12, height: 3, borderRadius: 2, background: brandColors[brand] }} />
            <span>{brand}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
