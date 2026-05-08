import { useState, useCallback } from "react";
import { DOMAIN_TEMPLATES } from "../engine/domains.js";

export default function SetupPanel({ domain, setDomain, customAspects, setCustomAspects,
  cols, setCols, rows, fileName, manualK, setManualK, bestK, k, loading, onFile, onSample }) {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const [newAsp, setNewAsp] = useState({ name: "", pos: "", neg: "" });

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  const addCustomAspect = () => {
    if (!newAsp.name.trim()) return;
    setCustomAspects(prev => [...prev, {
      name: newAsp.name.trim(),
      pos: newAsp.pos.split(",").map(s => s.trim()).filter(Boolean),
      neg: newAsp.neg.split(",").map(s => s.trim()).filter(Boolean),
    }]);
    setNewAsp({ name: "", pos: "", neg: "" });
  };

  return (
    <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 28px" }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 0", background: "none", border: "none", cursor: "pointer",
          color: "var(--muted)", fontSize: 12, fontFamily: "var(--font)",
        }}>
          <span>⚙️ 설정 — 도메인: <strong style={{ color: "var(--text)" }}>{DOMAIN_TEMPLATES[domain]?.label}</strong>
            {fileName && <> · 파일: <strong style={{ color: "var(--accent2)" }}>{fileName}</strong></>}
            {" "}· 데이터 {rows.length}건 · k={k}{manualK ? " (수동)" : " (자동)"}
          </span>
          <span style={{ transition: "transform .2s", display: "inline-block", transform: open ? "rotate(180deg)" : "" }}>▼</span>
        </button>

        {open && (
          <div style={{ paddingBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }} className="fade-in">
            {/* Upload */}
            <div className="card2">
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--accent2)" }}>📂 데이터 업로드</div>
              <div className={`dropzone${drag ? " drag" : ""}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("csv-input").click()}
              >
                <input id="csv-input" type="file" accept=".csv" style={{ display: "none" }}
                  onChange={e => onFile(e.target.files[0])} />
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>CSV 파일을 드래그하거나 클릭하세요</div>
                {loading && <div style={{ marginTop: 8, fontSize: 11, color: "var(--accent)" }}>⏳ 파싱 중...</div>}
              </div>
              <button className="btn btn-ghost" onClick={onSample} style={{ width: "100%", marginTop: 8, fontSize: 11 }}>
                ☕ 카페 샘플 데이터 사용
              </button>
            </div>

            {/* Domain */}
            <div className="card2">
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--accent2)" }}>🏷 도메인 선택</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(DOMAIN_TEMPLATES).map(([key, cfg]) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 8px", borderRadius: 6, background: domain === key ? "#6c63ff18" : "transparent", border: domain === key ? "1px solid #6c63ff44" : "1px solid transparent" }}>
                    <input type="radio" name="domain" value={key} checked={domain === key} onChange={() => setDomain(key)} style={{ accentColor: "var(--accent)" }} />
                    <span style={{ fontSize: 13 }}>{cfg.label}</span>
                    {domain === key && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--accent)" }}>{Object.keys(cfg.aspects).length}개 속성</span>}
                  </label>
                ))}
              </div>
            </div>


            {/* K control */}
            <div className="card2">
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--accent2)" }}>🎯 클러스터 수 (k)</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>자동 감지: k={bestK} (실루엣 최적화)</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className={`btn ${manualK === null ? "btn-primary" : "btn-ghost"}`} style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => setManualK(null)}>자동</button>
                {[2, 3, 4, 5, 6, 7].map(n => (
                  <button key={n} className={`btn ${manualK === n ? "btn-primary" : "btn-ghost"}`}
                    style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => setManualK(n)}>{n}</button>
                ))}
              </div>
            </div>

            {/* Custom aspects */}
            {domain === "custom" && (
              <div className="card2" style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--accent2)" }}>✏️ 커스텀 속성 정의</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
                  {[["속성명", newAsp.name, v => setNewAsp(a => ({...a, name: v}))],
                    ["긍정 키워드 (쉼표 구분)", newAsp.pos, v => setNewAsp(a => ({...a, pos: v}))],
                    ["부정 키워드 (쉼표 구분)", newAsp.neg, v => setNewAsp(a => ({...a, neg: v}))]
                  ].map(([ph, val, fn]) => (
                    <input key={ph} placeholder={ph} value={val} onChange={e => fn(e.target.value)}
                      style={{ padding: "7px 10px", borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 12, fontFamily: "var(--font)" }} />
                  ))}
                  <button className="btn btn-primary" onClick={addCustomAspect} style={{ fontSize: 12, padding: "7px 14px" }}>추가</button>
                </div>
                {customAspects.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "var(--card)", borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                    <strong style={{ color: "var(--accent2)", minWidth: 60 }}>{a.name}</strong>
                    <span style={{ color: "var(--green)" }}>+{a.pos.join(", ")}</span>
                    {a.neg.length > 0 && <span style={{ color: "var(--red)" }}>−{a.neg.join(", ")}</span>}
                    <button onClick={() => setCustomAspects(p => p.filter((_, j) => j !== i))} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 14 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
