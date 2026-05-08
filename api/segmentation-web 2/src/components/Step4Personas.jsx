import { useState } from "react";

export default function Step4Personas({ personas, rows, cols, onExport }) {
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(null);

  const copyPrompt = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>🧩 세그먼트 페르소나 ({personas.length}개)</h2>
        <button className="btn btn-primary" onClick={onExport} style={{ fontSize: 12 }}>⬇ personas.json 내보내기</button>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {personas.map(p => (
          <div key={p.id} onClick={() => setSelected(selected === p.id ? null : p.id)}
            className={`card2${selected === p.id ? " glow" : ""}`}
            style={{ cursor: "pointer", borderColor: selected === p.id ? p.color : "var(--border2)", borderWidth: selected === p.id ? 2 : 1, transition: "all .2s" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: p.color, marginBottom: 4 }}>{p.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{p.members.length}<span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>명</span></div>
              </div>
              {p.avgRating !== null && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: p.avgRating >= 4 ? "var(--green)" : p.avgRating <= 2.5 ? "var(--red)" : "var(--yellow)" }}>★{p.avgRating.toFixed(1)}</div>
                </div>
              )}
            </div>
            {p.topPos.length > 0 && <div style={{ fontSize: 10, color: "var(--green)", marginTop: 4 }}>+{p.topPos[0]}</div>}
            {p.topNeg.length > 0 && <div style={{ fontSize: 10, color: "var(--red)" }}>−{p.topNeg[0]}</div>}
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selected !== null && (() => {
        const p = personas[selected];
        if (!p) return null;
        return (
          <div className="card fade-in" style={{ borderColor: p.color, borderWidth: 2 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Left: aspect bars + members */}
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: p.color, marginBottom: 12 }}>{p.name}</div>
                <div style={{ fontSize: 12, marginBottom: 16 }}>
                  <strong>핵심 가치:</strong> {p.topPos.join(" · ") || "—"}<br />
                  <strong>Pain Point:</strong> <span style={{ color: "var(--red)" }}>{p.topNeg.join(" · ") || "없음"}</span>
                </div>

                {/* Aspect bars */}
                <div style={{ marginBottom: 16 }}>
                  {p.aspectScores.map(({ asp, score }) => (
                    <div key={asp} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, width: 70, textAlign: "right", color: "var(--muted)" }}>{asp}</span>
                      <div className="bar-track">
                        {score > 0 && <div className="bar-pos" style={{ width: `${Math.abs(score) * 50}%` }} />}
                        {score < 0 && <div className="bar-neg" style={{ width: `${Math.abs(score) * 50}%` }} />}
                        <div className="bar-mid" />
                      </div>
                      <span style={{ fontSize: 10, width: 32, color: score > 0 ? "var(--green)" : score < 0 ? "var(--red)" : "var(--muted)" }}>
                        {score > 0 ? "+" : ""}{score.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Member reviews */}
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--muted)" }}>소속 리뷰 (최대 5건):</div>
                {p.members.slice(0, 5).map((r, i) => (
                  <div key={i} style={{ marginBottom: 8, padding: "8px 10px", background: "var(--bg)", borderRadius: 6, fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: p.color }}>{r[cols.reviewerCol] || `#${i+1}`}</span>
                    {cols.ratingCol && <span style={{ color: "var(--yellow)", marginLeft: 6 }}>{"★".repeat(Math.min(5, parseInt(r[cols.ratingCol])||0))}</span>}
                    <div style={{ color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>"{r[cols.textCol]?.slice(0, 80)}..."</div>
                  </div>
                ))}
              </div>

              {/* Right: System prompt */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent2)" }}>🤖 AI 시스템 프롬프트</div>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => copyPrompt(p.id, p.systemPrompt)}>
                    {copied === p.id ? "✓ 복사됨" : "📋 복사"}
                  </button>
                </div>
                <div className="prompt-box">{p.systemPrompt}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                  이 프롬프트를 GPT/Gemini의 System Instruction으로 붙여넣으면 해당 페르소나처럼 응답합니다.
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {selected === null && (
        <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 13 }}>
          위의 페르소나 카드를 클릭하면 상세 분석과 AI 시스템 프롬프트를 확인할 수 있습니다.
        </div>
      )}
    </div>
  );
}
