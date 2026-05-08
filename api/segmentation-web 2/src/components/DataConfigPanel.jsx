import { useState, useCallback } from "react";
import { autoDetectMapping, getMappingExplanation } from "../engine/dataAdapter.js";

const STD_LABELS = {
  id:       { label: "🔢 ID 컬럼",    desc: "각 리뷰의 고유 번호" },
  reviewer: { label: "👤 작성자 컬럼", desc: "리뷰어 이름 / 닉네임" },
  rating:   { label: "⭐ 평점 컬럼",   desc: "별점 / 점수 (숫자)" },
  text:     { label: "📝 리뷰내용 컬럼", desc: "분석할 본문 텍스트" },
};

const CONFIDENCE_STYLE = {
  high:   { color: "#34d399", label: "✓ 고신뢰" },
  medium: { color: "#fbbf24", label: "~ 중신뢰" },
  low:    { color: "#f87171", label: "! 저신뢰" },
  none:   { color: "#6b7280", label: "— 미감지" },
};

export default function DataConfigPanel({ availableCols, mapping, setMapping, stats }) {
  const [expanded, setExpanded] = useState(true);
  const explanations = getMappingExplanation(mapping, availableCols);

  const explanationMap = Object.fromEntries(explanations.map(e => [e.std, e]));

  const handleChange = useCallback((std, value) => {
    setMapping(prev => ({ ...prev, [std]: value || null }));
  }, [setMapping]);

  const handleAutoDetect = useCallback(() => {
    const detected = autoDetectMapping(availableCols);
    setMapping(detected);
  }, [availableCols, setMapping]);

  return (
    <div style={{
      background: "linear-gradient(135deg, #1a1d2e 0%, #0f111a 100%)",
      border: "1px solid #2d3056",
      borderRadius: 12,
      marginBottom: 20,
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(108,99,255,0.08)",
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", background: "none", border: "none", cursor: "pointer",
          color: "var(--text)", fontFamily: "var(--font)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            background: "linear-gradient(135deg,#6c63ff,#a78bfa)", borderRadius: 8,
            padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: 1,
          }}>STEP 0</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Data Configuration — 컬럼 매핑</span>
          {stats && (
            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>
              {stats.originalRows}행 → 표준화 후 {stats.standardizedRows}행
              {stats.nullDropped > 0 && (
                <span style={{ color: "#f87171", marginLeft: 4 }}>({stats.nullDropped}건 결측 제거)</span>
              )}
              {stats.dropped?.length > 0 && (
                <span style={{ color: "#fbbf24", marginLeft: 4 }}>({stats.dropped.length}개 컬럼 제거)</span>
              )}
            </span>
          )}
        </div>
        <span style={{
          transition: "transform .2s", display: "inline-block",
          transform: expanded ? "rotate(180deg)" : "", color: "var(--muted)", fontSize: 12,
        }}>▼</span>
      </button>

      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid #2d3056" }} className="fade-in">
          {/* Auto-detect button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 16px" }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              실제 데이터의 컬럼명을 아래 표준 항목에 매핑하세요.<br />
              <strong style={{ color: "var(--accent2)" }}>자동 감지</strong>를 누르면 유사도 기반으로 컬럼을 자동 매칭합니다.
            </p>
            <button
              onClick={handleAutoDetect}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#6c63ff,#a78bfa)",
                color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                whiteSpace: "nowrap", marginLeft: 16,
                boxShadow: "0 2px 12px rgba(108,99,255,0.35)",
              }}
            >
              🤖 자동 감지
            </button>
          </div>

          {/* Mapping grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {Object.entries(STD_LABELS).map(([std, { label, desc }]) => {
              const exp = explanationMap[std];
              const cs = CONFIDENCE_STYLE[exp?.confidence || "none"];
              return (
                <div key={std} style={{
                  background: "#12141f", borderRadius: 10, padding: "14px 16px",
                  border: mapping[std]
                    ? `1px solid ${cs.color}44`
                    : "1px solid #2a2d3a",
                  position: "relative", transition: "border .2s",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: cs.color, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>{desc}</div>
                  <select
                    value={mapping[std] || ""}
                    onChange={e => handleChange(std, e.target.value)}
                    style={{
                      width: "100%", padding: "7px 10px", borderRadius: 6,
                      background: "#0f111a", border: "1px solid #2a2d3a",
                      color: "var(--text)", fontSize: 12, fontFamily: "var(--font)",
                    }}
                  >
                    <option value="">— 선택 안 함 —</option>
                    {availableCols.filter(c => c !== "_rowId").map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>

                  {/* Confidence badge */}
                  {mapping[std] && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: cs.color, fontWeight: 600 }}>{cs.label}</span>
                      {exp?.method && (
                        <span style={{ fontSize: 10, color: "var(--muted)" }}>· {exp.method}</span>
                      )}
                    </div>
                  )}

                  {/* Required indicator */}
                  {std === "text" && !mapping[std] && (
                    <div style={{ marginTop: 4, fontSize: 10, color: "#f87171" }}>
                      ⚠ 필수 — 리뷰 본문이 없으면 분석 불가
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dropped columns preview */}
          {stats?.dropped?.length > 0 && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#1e1a0e", borderRadius: 8, border: "1px solid #fbbf2430" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>
                ⚡ 제거되는 컬럼 ({stats.dropped.length}개)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {stats.dropped.map(col => (
                  <span key={col} style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    background: "#fbbf2415", color: "#fbbf24", border: "1px solid #fbbf2430",
                    textDecoration: "line-through", opacity: 0.75,
                  }}>{col}</span>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
                메모리 효율 및 분석 정확도를 위해 표준 4컬럼 외 불필요한 컬럼은 자동 제거됩니다.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
