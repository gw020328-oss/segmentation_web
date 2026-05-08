import { useState, useCallback, useRef } from "react";
import { BRAND_PALETTE } from "../engine/brandEngine.js";

/**
 * CrawlerPanel v2 – 파일 업로드 전용 다중 브랜드 패널
 * 크롤링 제거, Multi-CSV/Excel 업로드, 인코딩 방어
 */
export default function CrawlerPanel({
  brandUrls, setBrandUrls,
  onCrawl, onManualUpload, onServerUpload,
  crawlStatus, backendOnline,
}) {
  const [dragging, setDragging] = useState(null);
  const globalDropRef = useRef(null);

  const addBrand = () => {
    if (brandUrls.length >= 6) return;
    setBrandUrls(prev => [...prev, { url: "", name: `브랜드 ${prev.length + 1}`, file: null }]);
  };

  const removeBrand = (i) => {
    setBrandUrls(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateBrand = (i, field, value) => {
    setBrandUrls(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b));
  };

  const handleFileDrop = useCallback((i, e) => {
    e.preventDefault();
    setDragging(null);
    const f = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
      updateBrand(i, "file", f);
      if (!brandUrls[i].name || brandUrls[i].name.startsWith("브랜드")) {
        updateBrand(i, "name", f.name.replace(/\.(csv|xlsx|xls)$/i, ""));
      }
    }
  }, [brandUrls]);

  // 글로벌 드롭: 여러 파일을 한번에 드롭하면 브랜드 슬롯 자동 생성
  const handleGlobalDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(null);
    const fileList = Array.from(e.dataTransfer?.files || []);
    const valid = fileList.filter(f =>
      f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );
    if (!valid.length) return;

    const newBrands = valid.map(f => ({
      url: "",
      name: f.name.replace(/\.(csv|xlsx|xls)$/i, ""),
      file: f,
    }));
    setBrandUrls(newBrands.slice(0, 6));
  }, []);

  const hasFiles = brandUrls.some(b => b.file);
  const fileCount = brandUrls.filter(b => b.file).length;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            📊 다중 브랜드 파일 업로드
          </h2>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
            브랜드별 CSV/Excel 파일 업로드 → 파일명이 브랜드명으로 자동 지정 → 통합 분석
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 11,
            padding: "5px 12px", borderRadius: 20,
            background: backendOnline ? "#10b98118" : "#f59e0b18",
            border: `1px solid ${backendOnline ? "#10b98140" : "#f59e0b40"}`,
            color: backendOnline ? "#10b981" : "#f59e0b",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
            {backendOnline ? "백엔드 연결됨 (서버 업로드 가능)" : "프론트엔드 분석 모드"}
          </div>
          <button onClick={addBrand} disabled={brandUrls.length >= 6}
            className="btn btn-ghost" style={{ fontSize: 12 }}>
            + 브랜드 추가
          </button>
        </div>
      </div>

      {/* Global drop zone */}
      <div
        ref={globalDropRef}
        onDragOver={(e) => { e.preventDefault(); setDragging("global"); }}
        onDragLeave={() => setDragging(null)}
        onDrop={handleGlobalDrop}
        style={{
          border: `2px dashed ${dragging === "global" ? "var(--accent)" : "var(--border2)"}`,
          borderRadius: "var(--radius)",
          padding: "18px 24px",
          marginBottom: 14,
          textAlign: "center",
          transition: "all .2s",
          background: dragging === "global" ? "rgba(108,99,255,.06)" : "transparent",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 13, color: "var(--muted)" }}>
          {dragging === "global" ? "📂 파일을 놓으세요!" : "💡 여러 CSV/Excel 파일을 여기에 한번에 드래그 & 드롭 (파일명 → 브랜드명)"}
        </span>
      </div>

      {/* Brand rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {brandUrls.map((brand, i) => {
          const palette = BRAND_PALETTE[i % BRAND_PALETTE.length];
          return (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "auto 140px 1fr auto",
              gap: 10, alignItems: "center",
              padding: "12px 16px",
              background: "var(--card2)",
              border: `1px solid ${palette.primary}44`,
              borderRadius: 10,
              transition: "border-color .2s",
            }}>
              {/* Color dot */}
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                background: palette.primary, flexShrink: 0,
                boxShadow: `0 0 8px ${palette.primary}88`,
              }} />

              {/* Brand name */}
              <input
                value={brand.name}
                onChange={e => updateBrand(i, "name", e.target.value)}
                placeholder="브랜드명"
                style={{
                  padding: "6px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700,
                  background: "var(--card)", border: `1px solid ${palette.primary}44`,
                  color: palette.primary, fontFamily: "var(--font)", width: "100%",
                }}
              />

              {/* File area */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {brand.file ? (
                  <div style={{
                    flex: 1, padding: "6px 12px", borderRadius: 6, fontSize: 12,
                    background: "#10b98112", border: "1px solid #10b98140",
                    color: "#10b981", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    📄 {brand.file.name}
                    <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 4 }}>
                      ({(brand.file.size / 1024).toFixed(0)} KB)
                    </span>
                    <button onClick={() => updateBrand(i, "file", null)}
                      style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 14 }}>×</button>
                  </div>
                ) : (
                  <div style={{
                    flex: 1, padding: "10px 16px", borderRadius: 6, fontSize: 12,
                    border: `1px dashed ${dragging === i ? "var(--accent)" : "var(--border2)"}`,
                    color: "var(--muted)", textAlign: "center",
                    background: dragging === i ? "rgba(108,99,255,.04)" : "var(--card)",
                    transition: "all .2s",
                  }}
                    onDragOver={e => { e.preventDefault(); setDragging(i); }}
                    onDragLeave={() => setDragging(null)}
                    onDrop={e => handleFileDrop(i, e)}
                  >
                    파일을 드래그하거나 →
                  </div>
                )}
                {/* File picker */}
                <label style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                  background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted)",
                  whiteSpace: "nowrap", fontWeight: 600,
                }}>
                  <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
                    onChange={e => handleFileDrop(i, { dataTransfer: null, target: e.target, preventDefault: () => {} })} />
                  📂 파일 선택
                </label>
              </div>

              {/* Remove */}
              {brandUrls.length > 1 && (
                <button onClick={() => removeBrand(i)}
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
        {hasFiles && (
          <>
            <button
              className="btn btn-primary"
              onClick={() => onManualUpload(brandUrls.filter(b => b.file))}
              style={{ fontSize: 13 }}
            >
              🧠 프론트엔드 분석 ({fileCount}개 파일)
            </button>
            {backendOnline && onServerUpload && (
              <button
                className="btn btn-success"
                onClick={() => onServerUpload(brandUrls.filter(b => b.file))}
                style={{ fontSize: 13 }}
              >
                🖥 서버 업로드 분석 (인코딩 방어)
              </button>
            )}
          </>
        )}
        {!hasFiles && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            💡 브랜드별 CSV 또는 Excel 파일을 업로드하면 분석이 시작됩니다
          </span>
        )}
        {crawlStatus === "done" && (
          <span style={{ fontSize: 12, color: "var(--green)", alignSelf: "center" }}>
            ✓ 업로드 완료 — 아래에서 분석 결과를 확인하세요
          </span>
        )}
      </div>
    </div>
  );
}
