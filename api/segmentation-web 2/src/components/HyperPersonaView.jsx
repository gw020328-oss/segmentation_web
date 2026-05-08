import { useState } from "react";

const LTV_COLOR = { high: "#10b981", medium: "#f59e0b", low: "#f87171" };
const LTV_LABEL = { high: "높음 💎", medium: "중간 📈", low: "낮음 ⚠️" };

/**
 * GeminiPersonaCard – AI 생성 페르소나를 시각적으로 매력적인 카드로 렌더링
 */
function GeminiPersonaCard({ persona: g, clusterPersona: p, isSelected, onClick }) {
  const color = p?.color || "#6c63ff";
  const ltv = g?.ltv_potential || "medium";

  return (
    <div onClick={onClick} style={{
      background: `linear-gradient(135deg, var(--card) 0%, ${color}0a 100%)`,
      border: `1.5px solid ${isSelected ? color : color + "44"}`,
      borderRadius: 16, padding: 20, cursor: "pointer",
      transition: "all .25s",
      transform: isSelected ? "translateY(-3px)" : "none",
      boxShadow: isSelected ? `0 8px 32px ${color}33` : "none",
      position: "relative", overflow: "hidden",
    }}>
      {/* 배경 장식 */}
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80,
        borderRadius: "50%", background: color + "15",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${color}, ${color}88)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, boxShadow: `0 4px 16px ${color}44`,
        }}>
          {g?.emoji || "🧑"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color }}>
            {g?.persona_name || p?.name || "페르소나"}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {g?.age_range || ""}{g?.age_range && g?.lifestyle ? " · " : ""}{g?.lifestyle?.slice(0, 35) || ""}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10,
              background: LTV_COLOR[ltv] + "20", color: LTV_COLOR[ltv], fontWeight: 700 }}>
              LTV {LTV_LABEL[ltv]}
            </span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10,
              background: "var(--card2)", color: "var(--muted)" }}>
              {p?.size || 0}명
            </span>
            {p?.avgRating && (
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10,
                background: "#fbbf2420", color: "#fbbf24" }}>
                ★{p.avgRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cluster strengths */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {p?.topPos?.slice(0, 3).map(asp => (
          <span key={asp} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10,
            background: "#10b98118", color: "#10b981", border: "1px solid #10b98130" }}>
            ✓ {asp}
          </span>
        ))}
        {p?.topNeg?.slice(0, 2).map(asp => (
          <span key={asp} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10,
            background: "#f8717118", color: "#f87171", border: "1px solid #f8717130" }}>
            ✗ {asp}
          </span>
        ))}
      </div>

      {/* Marketing message preview */}
      {g?.marketing_message && (
        <div style={{
          fontSize: 11, fontStyle: "italic", color: color,
          background: color + "0f", border: `1px solid ${color}30`,
          borderRadius: 8, padding: "8px 12px", lineHeight: 1.5,
        }}>
          "{g.marketing_message}"
        </div>
      )}

      {/* Brand distribution mini-bar */}
      {p?.brandDist && Object.keys(p.brandDist).length > 1 && (
        <div style={{ marginTop: 10, display: "flex", gap: 2, height: 4, borderRadius: 2, overflow: "hidden" }}>
          {Object.entries(p.brandDist).map(([brand, { pct }], i) => (
            <div key={brand} title={`${brand}: ${pct}%`}
              style={{ flex: pct, background: `hsl(${i * 60 + 240}, 70%, 60%)`, transition: "flex .3s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * PersonaDetailPanel – 선택된 페르소나의 전체 Gemini 분석 결과
 */
function PersonaDetailPanel({ persona: g, clusterPersona: p, onClose }) {
  const [activeTab, setActiveTab] = useState("journey"); // journey | hypothesis | prompt
  const color = p?.color || "#6c63ff";
  const [copied, setCopied] = useState(false);

  const copyPrompt = () => {
    const text = p?.systemPrompt || JSON.stringify(g, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="card fade-in" style={{
      borderColor: color, borderWidth: 2, marginTop: 20,
      background: `linear-gradient(135deg, var(--card) 0%, ${color}08 100%)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{g?.emoji || "🧑"}</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color }}>{g?.persona_name || p?.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{g?.age_range} · {g?.lifestyle}</div>
          </div>
        </div>
        <button onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer" }}>
          ×
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
        {[
          { key: "journey", label: "🗺 구매 여정" },
          { key: "hypothesis", label: "💡 이탈 가설" },
          { key: "psycho", label: "🧠 심리 프로필" },
          { key: "prompt", label: "🤖 AI 프롬프트" },
        ].map(({ key, label }) => (
          <button key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: "8px 14px", border: "none", background: "none", cursor: "pointer",
              fontSize: 12, fontFamily: "var(--font)", fontWeight: activeTab === key ? 700 : 400,
              color: activeTab === key ? color : "var(--muted)",
              borderBottom: activeTab === key ? `2px solid ${color}` : "2px solid transparent",
              transition: "all .2s",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "journey" && g?.customer_journey && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {Object.entries(g.customer_journey).map(([stage, desc], i) => (
            <div key={stage} style={{
              padding: "12px 14px", borderRadius: 10,
              background: color + "12", border: `1px solid ${color}30`,
            }}>
              <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 4 }}>
                {["①", "②", "③", "④"][i] || "●"} {stage}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "hypothesis" && (
        <div>
          <div style={{
            padding: "16px 18px", borderRadius: 10,
            background: "linear-gradient(135deg, #6c63ff12, #f59e0b08)",
            border: "1px solid var(--border)", marginBottom: 14, lineHeight: 1.7, fontSize: 13,
          }}>
            {g?.brand_switching_hypothesis || "데이터 기반 가설을 생성하려면 Gemini API를 연결하세요."}
          </div>
          {/* Brand distribution */}
          {p?.brandDist && Object.keys(p.brandDist).length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--muted)" }}>
                이 클러스터의 브랜드 분포
              </div>
              {Object.entries(p.brandDist).map(([brand, { count, pct }]) => (
                <div key={brand} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, width: 80, fontWeight: 600 }}>{brand}</span>
                  <div style={{ flex: 1, height: 16, background: "var(--card2)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color + "bb", borderRadius: 4, transition: "width .4s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)", width: 50, textAlign: "right" }}>
                    {pct}% ({count})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "psycho" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { title: "심리적 특성", items: g?.psychographic, icon: "🧠", col: color },
            { title: "Pain Points", items: g?.pain_points, icon: "⚠️", col: "#f87171" },
            { title: "구매 트리거", items: g?.purchase_triggers, icon: "🎯", col: "#10b981" },
            { title: "선호 채널", items: g?.preferred_channels, icon: "📱", col: "#06b6d4" },
          ].map(({ title, items, icon, col }) => (
            <div key={title} style={{ padding: "12px 14px", borderRadius: 10, background: col + "0e", border: `1px solid ${col}30` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: col, marginBottom: 8 }}>{icon} {title}</div>
              {Array.isArray(items) ? items.map((item, i) => (
                <div key={i} style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "flex", gap: 6 }}>
                  <span style={{ color: col }}>·</span> {item}
                </div>
              )) : <div style={{ fontSize: 11, color: "var(--muted)" }}>{items || "—"}</div>}
            </div>
          ))}
        </div>
      )}

      {activeTab === "prompt" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent2)" }}>🤖 AI 시스템 프롬프트</div>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 12px" }} onClick={copyPrompt}>
              {copied ? "✓ 복사됨" : "📋 복사"}
            </button>
          </div>
          <div className="prompt-box">{p?.systemPrompt || JSON.stringify(g, null, 2)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            GPT / Gemini의 System Instruction으로 활용하여 해당 페르소나로 시뮬레이션하세요.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * HyperPersonaView – 메인 페르소나 뷰 (Gemini 카드 그리드 + 상세 패널)
 */
export default function HyperPersonaView({
  personas, geminiPersonas, isGenerating,
  onGenerateGemini, onExport, selectedBrands, brandColors,
}) {
  const [selectedId, setSelectedId] = useState(null);

  const getGeminiPersona = (clusterId) =>
    geminiPersonas?.find(gp => gp.clusterId === clusterId)?.persona;

  const selectedPersona = selectedId !== null ? personas[selectedId] : null;
  const selectedGemini = selectedId !== null ? getGeminiPersona(selectedId) : null;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            🧬 하이퍼-페르소나 ({personas.length}개 세그먼트)
          </h2>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
            Gemini AI가 데이터 기반으로 생성한 도메인 특화 고객 페르소나
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!isGenerating && (
            <button className="btn btn-primary" onClick={onGenerateGemini}
              style={{ fontSize: 12, background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}>
              ✨ Gemini 페르소나 생성
            </button>
          )}
          {isGenerating && (
            <button className="btn btn-ghost" disabled style={{ fontSize: 12 }}>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 6 }}>⟳</span>
              AI 생성 중...
            </button>
          )}
          <button className="btn btn-ghost" onClick={onExport} style={{ fontSize: 12 }}>
            ⬇ JSON 내보내기
          </button>
        </div>
      </div>

      {/* Persona card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 20 }}>
        {personas.map(p => {
          const g = getGeminiPersona(p.id);
          return (
            <GeminiPersonaCard
              key={p.id}
              persona={g}
              clusterPersona={p}
              isSelected={selectedId === p.id}
              onClick={() => setSelectedId(prev => prev === p.id ? null : p.id)}
            />
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedId !== null && selectedPersona && (
        <PersonaDetailPanel
          persona={selectedGemini}
          clusterPersona={selectedPersona}
          onClose={() => setSelectedId(null)}
        />
      )}

      {!geminiPersonas?.length && !isGenerating && (
        <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✨</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
            Gemini AI 페르소나를 생성해보세요
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>
            각 클러스터의 키워드·감성·대표 리뷰를 Gemini 2.0 Flash에 전달하여<br />
            가상 이름 · 구매 여정 · 브랜드 이탈 가설이 포함된 페르소나를 자동 생성합니다.
          </div>
          <button className="btn btn-primary" onClick={onGenerateGemini}
            style={{ fontSize: 13 }}>
            ✨ AI 페르소나 생성 시작
          </button>
        </div>
      )}
    </div>
  );
}
