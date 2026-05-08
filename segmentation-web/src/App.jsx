import { useState, useMemo, useCallback, useEffect } from "react";
import { DOMAIN_TEMPLATES } from "./engine/domains.js";
import { parseCSV } from "./engine/pipeline.js";
import { autoDetectMapping, standardizeRows, STANDARD_COLS } from "./engine/dataAdapter.js";
import { CAFE_SAMPLE } from "./engine/sample.js";
import {
  BRAND_PALETTE,
  runBrandPipeline,
  computeBrandRadar,
  normalizeApiReviews,
  checkBackend,
  uploadToServer,
  generateGeminiPersonas,
} from "./engine/brandEngine.js";

import StepNav from "./components/StepNav.jsx";
import CrawlerPanel from "./components/CrawlerPanel.jsx";
import Step0Data from "./components/Step0Data.jsx";
import Step1ABSA from "./components/Step1ABSA.jsx";
import Step2Matrix from "./components/Step2Matrix.jsx";
import BrandPCA from "./components/BrandPCA.jsx";
import Step5BrandComparison from "./components/Step5BrandComparison.jsx";
import HyperPersonaView from "./components/HyperPersonaView.jsx";
import DataConfigPanel from "./components/DataConfigPanel.jsx";
import SetupPanel from "./components/SetupPanel.jsx";
import "./index.css";

const STEPS = ["데이터 수집", "ABSA", "매트릭스", "클러스터 PCA", "경쟁 비교", "페르소나"];

// 브랜드 색상 매핑 생성
function buildBrandColors(brandNames) {
  return Object.fromEntries(
    brandNames.map((b, i) => [b, BRAND_PALETTE[i % BRAND_PALETTE.length].primary])
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);

  // ── Backend status ──
  const [backendOnline, setBackendOnline] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState("idle"); // idle | uploading | done | error

  // ── Brand config ──
  const [brandUrls, setBrandUrls] = useState([
    { url: "", name: "브랜드 A", file: null },
    { url: "", name: "브랜드 B", file: null },
  ]);

  // ── Domain / Analysis config ──
  const [domain, setDomain] = useState("cafe");
  const [customAspects, setCustomAspects] = useState([]);
  const [manualK, setManualK] = useState(null);

  // ── Unified multi-brand rows ──
  const [allRows, setAllRows] = useState([]);          // brand 필드 포함
  const [fileName, setFileName] = useState("");

  // ── Column mapping (for CSV upload) ──
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({ id: null, reviewer: null, rating: null, text: null });
  const [adapterStats, setAdapterStats] = useState(null);
  const cols = STANDARD_COLS;

  // ── Brand filter state ──
  const [selectedBrands, setSelectedBrands] = useState([]);

  // ── Gemini personas ──
  const [geminiPersonas, setGeminiPersonas] = useState([]);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);

  // ── Backend health check ──
  useEffect(() => {
    checkBackend().then(status => setBackendOnline(!!status));
  }, []);

  // ── Computed: domain config ──
  const domainCfg = DOMAIN_TEMPLATES[domain];
  const aspects = domain === "custom"
    ? Object.fromEntries(customAspects.map(a => [a.name, { pos: a.pos, neg: a.neg }]))
    : domainCfg.aspects;
  const aspectKeys = Object.keys(aspects);
  const colors = domainCfg.colors;

  // ── Brand names (deduplicated from allRows) ──
  const brandNames = useMemo(
    () => [...new Set(allRows.map(r => r.brand).filter(Boolean))],
    [allRows]
  );
  const brandColors = useMemo(() => buildBrandColors(brandNames), [brandNames]);

  // ── Pipeline: ABSA → Matrix → KMeans → PCA → Personas ──
  const { absa, matrix, labels, centroids, points2D, personas, bestK, silScores, k } = useMemo(() => {
    return runBrandPipeline(allRows, aspects, aspectKeys, colors, manualK);
  }, [allRows, domain, customAspects, manualK]);

  // ── Radar data: brand × aspect scores ──
  const radarData = useMemo(() => {
    if (!absa.length || !brandNames.length) return {};
    return computeBrandRadar(allRows, absa, aspectKeys, brandNames);
  }, [allRows, absa, aspectKeys, brandNames]);

  // ── Initialize selectedBrands when brands change ──
  useEffect(() => {
    if (brandNames.length) setSelectedBrands(brandNames);
  }, [brandNames]);

  // ── Server Upload Handler (인코딩 방어) ──
  const handleServerUpload = useCallback(async (brands) => {
    const withFiles = brands.filter(b => b.file);
    if (!withFiles.length) return;
    setCrawlStatus("uploading");
    setLoading(true);
    try {
      const result = await uploadToServer(withFiles);
      const normalized = normalizeApiReviews(result.reviews);
      setAllRows(normalized);
      setFileName(`서버분석 ${withFiles.map(b => b.name).join(" vs ")}`);
      setAnalysisReady(true);
      setCrawlStatus("done");
      setStep(0);
    } catch (err) {
      console.error(err);
      setCrawlStatus("error");
      alert(`서버 업로드 실패: ${err.message}\n프론트엔드 분석을 사용하세요.`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Manual CSV upload handler (multi-brand) ──
  const handleManualUpload = useCallback(async (brands) => {
    setLoading(true);
    const allParsed = [];

    await Promise.all(brands.map(brand => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const parsed = parseCSV(e.target.result);
        const detectedMapping = autoDetectMapping(Object.keys(parsed[0] || {}));
        const { standardized } = standardizeRows(parsed, detectedMapping);
        // brand 레이블 추가
        standardized.forEach(row => { row.brand = brand.name; });
        allParsed.push(...standardized);
        resolve();
      };
      reader.readAsText(brand.file, "utf-8");
    })));

    // 단일 파일일 경우 adapterStats도 설정
    if (brands.length === 1) {
      const parsed = parseCSV(await brands[0].file.text());
      const det = autoDetectMapping(Object.keys(parsed[0] || {}));
      const { standardized, dropped, nullDropped } = standardizeRows(parsed, det);
      setRawRows(parsed);
      setMapping(det);
      setAdapterStats({ originalRows: parsed.length, standardizedRows: standardized.length, dropped, nullDropped });
    }

    setAllRows(allParsed);
    setFileName(brands.map(b => b.name).join(" + "));
    setAnalysisReady(true);
    setLoading(false);
    setStep(0);
  }, []);

  // ── Single CSV upload (legacy, 단일 브랜드) ──
  const handleSingleFile = useCallback((file) => {
    if (!file) return;
    setLoading(true);
    const brandName = brandUrls[0]?.name || "브랜드 A";
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      const det = autoDetectMapping(Object.keys(parsed[0] || {}));
      const { standardized, dropped, nullDropped } = standardizeRows(parsed, det);
      standardized.forEach(row => { row.brand = brandName; });
      setRawRows(parsed);
      setMapping(det);
      setAdapterStats({ originalRows: parsed.length, standardizedRows: standardized.length, dropped, nullDropped });
      setAllRows(standardized);
      setFileName(file.name);
      setManualK(null);
      setAnalysisReady(true);
      setLoading(false);
      setStep(0);
    };
    reader.readAsText(file, "utf-8");
  }, [brandUrls]);

  // ── Load sample ──
  const loadSample = useCallback(() => {
    const sampleMapping = { id: "id", reviewer: "reviewer", rating: "rating", text: "text" };
    const { standardized, dropped, nullDropped } = standardizeRows(CAFE_SAMPLE, sampleMapping);
    // 샘플: 절반을 "스타벅스", 절반을 "빈스얼랏"으로 레이블
    const mid = Math.floor(standardized.length / 2);
    standardized.forEach((row, i) => {
      row.brand = i < mid ? "스타벅스" : "빈스얼랏";
    });
    setBrandUrls([
      { url: "", name: "스타벅스", file: null },
      { url: "", name: "빈스얼랏", file: null },
    ]);
    setRawRows(CAFE_SAMPLE);
    setMapping(sampleMapping);
    setAdapterStats({ originalRows: CAFE_SAMPLE.length, standardizedRows: standardized.length, dropped, nullDropped });
    setAllRows(standardized);
    setFileName("카페 샘플 (다중 브랜드 시뮬레이션)");
    setDomain("cafe");
    setManualK(null);
    setGeminiPersonas([]);
    setAnalysisReady(true);
    setStep(0);
  }, []);

  // ── Gemini persona generation ──
  const handleGenerateGemini = useCallback(async () => {
    if (!backendOnline) {
      alert("Gemini 페르소나 생성을 위해 백엔드 서버(localhost:8000)가 필요합니다.\nGEMINI_API_KEY를 설정하고 백엔드를 시작해주세요.");
      return;
    }
    setIsGeneratingPersona(true);
    try {
      const result = await generateGeminiPersonas(personas, domain, brandNames);
      setGeminiPersonas(result.personas || []);
    } catch (err) {
      console.error(err);
      alert(`페르소나 생성 실패: ${err.message}`);
    } finally {
      setIsGeneratingPersona(false);
    }
  }, [personas, domain, brandNames, backendOnline]);

  // ── Export ──
  const handleExport = useCallback(() => {
    const out = personas.map(p => ({
      cluster: p.id,
      autoName: p.name,
      size: p.members.length,
      avgRating: p.avgRating,
      brandDistribution: p.brandDist,
      topStrengths: p.topPos,
      painPoints: p.topNeg,
      keywords: p.keywords,
      geminiPersona: geminiPersonas.find(gp => gp.clusterId === p.id)?.persona || null,
    }));
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "brand-personas.json";
    a.click();
  }, [personas, geminiPersonas]);

  // ── Mapping change ──
  const handleMappingChange = useCallback((newMapping) => {
    setMapping(newMapping);
    if (rawRows.length) {
      const { standardized, dropped, nullDropped } = standardizeRows(rawRows, newMapping);
      const existingBrand = allRows[0]?.brand || brandUrls[0]?.name || "브랜드 A";
      standardized.forEach(row => { row.brand = existingBrand; });
      setAllRows(standardized);
      setAdapterStats({ originalRows: rawRows.length, standardizedRows: standardized.length, dropped, nullDropped });
    }
  }, [rawRows, allRows, brandUrls]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Header ── */}
      <header style={{ padding: "20px 28px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "var(--muted)", textTransform: "uppercase", marginBottom: 3 }}>
              Antigravity · Multi-Brand Intelligence
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: -0.5,
              background: "linear-gradient(90deg, #a78bfa, #6c63ff, #06b6d4)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              다중 브랜드 세분화 대시보드
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 11, margin: "3px 0 0" }}>
              파일 업로드 → ABSA 비교 → PCA 군집 → Gemini 하이퍼-페르소나
            </p>
          </div>

          {/* Header actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Brand toggles (compact) */}
            {brandNames.length > 1 && (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {brandNames.map((b, i) => {
                  const color = brandColors[b];
                  const active = selectedBrands.includes(b);
                  return (
                    <button key={b}
                      onClick={() => setSelectedBrands(prev =>
                        prev.includes(b)
                          ? prev.length > 1 ? prev.filter(x => x !== b) : prev
                          : [...prev, b]
                      )}
                      style={{
                        padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 700,
                        border: `1.5px solid ${color}`,
                        background: active ? color : "transparent",
                        color: active ? "#fff" : color,
                        cursor: "pointer", fontFamily: "var(--font)",
                        transition: "all .2s",
                      }}>
                      {b}
                    </button>
                  );
                })}
              </div>
            )}
            <button className="btn btn-ghost" onClick={loadSample} style={{ fontSize: 11 }}>
              ☕ 샘플
            </button>
            {analysisReady && personas.length > 0 && (
              <button className="btn btn-primary" onClick={handleExport} style={{ fontSize: 11 }}>
                ⬇ JSON 내보내기
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Setup Panel ── */}
      <SetupPanel
        domain={domain} setDomain={setDomain}
        customAspects={customAspects} setCustomAspects={setCustomAspects}
        cols={cols} setCols={() => {}}
        rows={allRows} fileName={fileName}
        manualK={manualK} setManualK={setManualK}
        bestK={bestK} k={k} loading={loading}
        onFile={handleSingleFile} onSample={loadSample}
      />

      {/* ── Main ── */}
      {!analysisReady ? (
        /* Landing: Crawler Panel */
        <div style={{ flex: 1, padding: "32px 28px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <CrawlerPanel
            brandUrls={brandUrls}
            setBrandUrls={setBrandUrls}
            onCrawl={() => {}}
            onManualUpload={handleManualUpload}
            onServerUpload={handleServerUpload}
            crawlStatus={crawlStatus}
            backendOnline={backendOnline}
          />

          {/* Empty state */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 14, padding: "60px 40px", color: "var(--muted)", textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>🏢</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
              경쟁 브랜드를 함께 분석하세요
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.8, maxWidth: 560 }}>
              브랜드별 <strong style={{ color: "var(--accent2)" }}>CSV/Excel 파일을 업로드</strong>하여 즉시 분석을 시작할 수 있습니다.<br />
              파일명이 브랜드명으로 자동 지정됩니다. (cp949/utf-8 인코딩 자동 감지)<br />
              <span style={{ color: "var(--accent)" }}>Gemini 2.0 Flash</span>가 각 고객군의 페르소나와 브랜드 이탈 가설을 자동 생성합니다.
            </div>
            <button className="btn btn-primary" onClick={loadSample} style={{ marginTop: 8, fontSize: 13 }}>
              ☕ 카페 샘플로 먼저 체험하기 →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Step Nav ── */}
          <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <StepNav steps={STEPS} current={step} onChange={setStep} />
            </div>
          </div>

          {/* ── Crawler Panel (always visible on step 0) ── */}
          <div style={{ flex: 1, padding: "24px 28px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>

            {step === 0 && (
              <>
                <CrawlerPanel
                  brandUrls={brandUrls}
                  setBrandUrls={setBrandUrls}
                  onCrawl={() => {}}
                  onManualUpload={handleManualUpload}
                  onServerUpload={handleServerUpload}
                  crawlStatus={crawlStatus}
                  backendOnline={backendOnline}
                />
                {rawRows.length > 0 && (
                  <DataConfigPanel
                    availableCols={Object.keys(rawRows[0] || {})}
                    mapping={mapping}
                    setMapping={handleMappingChange}
                    stats={adapterStats}
                  />
                )}
                <Step0Data
                  rows={allRows}
                  cols={{ ...cols, brandCol: "brand" }}
                  fileName={fileName}
                  adapterStats={adapterStats}
                  mapping={mapping}
                />
              </>
            )}

            {step === 1 && (
              <Step1ABSA
                absa={absa}
                rows={allRows}
                cols={cols}
                aspects={aspects}
                aspectKeys={aspectKeys}
                domainCfg={domainCfg}
              />
            )}

            {step === 2 && (
              <Step2Matrix
                matrix={matrix}
                rows={allRows}
                cols={cols}
                aspectKeys={aspectKeys}
                labels={labels}
                domainCfg={domainCfg}
              />
            )}

            {step === 3 && (
              <BrandPCA
                points2D={points2D}
                labels={labels}
                personas={personas}
                rows={allRows}
                silScores={silScores}
                bestK={bestK}
                k={k}
                setManualK={setManualK}
                aspectKeys={aspectKeys}
                selectedBrands={selectedBrands}
                brandColors={brandColors}
              />
            )}

            {step === 4 && (
              <Step5BrandComparison
                radarData={radarData}
                aspectKeys={aspectKeys}
                personas={personas}
                rows={allRows}
                brandNames={brandNames}
                selectedBrands={selectedBrands}
                setSelectedBrands={setSelectedBrands}
              />
            )}

            {step === 5 && (
              <HyperPersonaView
                personas={personas}
                geminiPersonas={geminiPersonas}
                isGenerating={isGeneratingPersona}
                onGenerateGemini={handleGenerateGemini}
                onExport={handleExport}
                selectedBrands={selectedBrands}
                brandColors={brandColors}
              />
            )}
          </div>

          {/* ── Nav buttons ── */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 28px 28px",
            maxWidth: 1200, margin: "0 auto", width: "100%" }}>
            <button className="btn btn-ghost"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}>← 이전</button>
            <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>
              {step + 1} / {STEPS.length} — {STEPS[step]}
            </span>
            <button className="btn btn-primary"
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              disabled={step === STEPS.length - 1}>다음 →</button>
          </div>
        </>
      )}
    </div>
  );
}
