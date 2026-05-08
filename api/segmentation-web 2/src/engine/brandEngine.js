// ──────────────────────────────────────────────────────────────────────────────
// Brand Engine  – 다중 브랜드 분석 오케스트레이터
// 역할: 브랜드별 라벨링, 통합 데이터셋 구성, 브랜드별 ABSA 집계, 군집 브랜드 분포 계산
// ──────────────────────────────────────────────────────────────────────────────

import { extractABSA, buildMatrix, kMeans, findBestK, project2D, buildPersonas } from "./pipeline.js";

// 브랜드별 색상 팔레트 (최대 6개 브랜드)
export const BRAND_PALETTE = [
  { primary: "#6c63ff", light: "#6c63ff22", label: "Brand A" },
  { primary: "#f59e0b", light: "#f59e0b22", label: "Brand B" },
  { primary: "#10b981", light: "#10b98122", label: "Brand C" },
  { primary: "#f43f5e", light: "#f43f5e22", label: "Brand D" },
  { primary: "#06b6d4", light: "#06b6d422", label: "Brand E" },
  { primary: "#8b5cf6", light: "#8b5cf622", label: "Brand F" },
];

/**
 * 여러 브랜드 리뷰를 통합한 뒤 ABSA + 클러스터링 파이프라인 실행
 * @param {Array<{brand, reviewer, text, rating}>} allRows  – 통합 rows (brand 필드 포함)
 * @param {Object} aspects   – 도메인 속성 사전
 * @param {string[]} aspectKeys
 * @param {string[]} colors  – 도메인 색상
 * @param {number|null} manualK
 * @returns {Object} 분석 결과 전체
 */
export function runBrandPipeline(allRows, aspects, aspectKeys, colors, manualK = null) {
  if (!allRows.length || !aspectKeys.length) {
    return { absa: [], matrix: [], labels: [], centroids: [], points2D: [], personas: [], bestK: 2, silScores: [] };
  }

  // 1. ABSA 추출
  const absa = extractABSA(allRows, "text", aspects);

  // 2. 매트릭스 구성
  const matrix = buildMatrix(absa, aspectKeys);

  // 3. 최적 K 탐색
  const { best: bestK, scores: silScores } = matrix.length >= 4
    ? findBestK(matrix, 2, Math.min(7, Math.floor(matrix.length / 2)))
    : { best: 2, scores: [] };

  const k = manualK ?? bestK;

  // 4. K-Means
  const { labels, centroids } = matrix.length >= k
    ? kMeans(matrix, k)
    : { labels: [], centroids: [] };

  // 5. PCA 2D 투영
  const points2D = project2D(matrix, aspectKeys);

  // 6. 페르소나 빌드 (brand 정보 포함)
  const personas = labels.length
    ? buildPersonasWithBrand(labels, centroids, matrix, allRows, aspectKeys, colors)
    : [];

  return { absa, matrix, labels, centroids, points2D, personas, bestK, silScores, k };
}

/**
 * 브랜드 분포 정보를 포함한 페르소나 빌더
 */
function buildPersonasWithBrand(labels, centroids, matrix, rows, aspectKeys, domainColors) {
  const k = Math.max(...labels) + 1;
  const allBrands = [...new Set(rows.map(r => r.brand).filter(Boolean))];

  return Array.from({ length: k }, (_, ci) => {
    const memberIdx = labels.map((l, i) => i).filter(i => labels[i] === ci);
    const members = memberIdx.map(i => rows[i]);
    const centroid = centroids[ci] ?? aspectKeys.map(() => 0);

    const aspectScores = aspectKeys.map((asp, ai) => ({ asp, score: centroid[ai] ?? 0 }));
    const sorted = [...aspectScores].sort((a, b) => b.score - a.score);
    const topPos = sorted.filter(a => a.score > 0).slice(0, 3).map(a => a.asp);
    const topNeg = sorted.filter(a => a.score < 0).slice(0, 2).map(a => a.asp);

    const avgRating = members.length
      ? members.reduce((s, r) => s + (parseFloat(r.rating) || 0), 0) / members.filter(r => r.rating).length
      : null;

    // 브랜드별 분포 계산
    const brandDist = {};
    allBrands.forEach(b => {
      const cnt = members.filter(r => r.brand === b).length;
      if (cnt > 0) brandDist[b] = { count: cnt, pct: Math.round((cnt / members.length) * 100) };
    });

    // 키워드 추출 (TF-IDF 간이)
    const wordFreq = {};
    members.forEach(r => {
      const words = (r.text || "").split(/\s+/).filter(w => w.length >= 2);
      words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    });
    const keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w]) => w);

    const color = domainColors[ci % domainColors.length];
    const personaAutoName = topPos[0] ? `${topPos[0]} 중심 그룹` : `클러스터 ${ci + 1}`;

    return {
      id: ci,
      name: personaAutoName,
      color,
      members,
      memberIdx,
      avgRating: isNaN(avgRating) ? null : avgRating,
      aspectScores,
      topPos,
      topNeg,
      brandDist,
      keywords,
      sampleReviews: members.slice(0, 5),
      size: members.length,
      // Gemini 페르소나 (API 호출 후 채워짐)
      geminiPersona: null,
    };
  });
}

/**
 * 브랜드별 평균 ABSA 점수 계산 (레이더 차트용)
 * @param {Array} rows  표준화된 rows (brand 필드 포함)
 * @param {Array} absa  extractABSA 결과
 * @param {string[]} aspectKeys
 * @param {string[]} brandNames
 * @returns {Object} { brandName: { asp: score, ... }, ... }
 */
export function computeBrandRadar(rows, absa, aspectKeys, brandNames) {
  const result = {};

  brandNames.forEach(brand => {
    const brandIndices = rows.map((r, i) => i).filter(i => rows[i]?.brand === brand);
    if (!brandIndices.length) { result[brand] = {}; return; }

    const brandAbsa = brandIndices.map(i => absa[i]).filter(Boolean);
    const scores = {};

    aspectKeys.forEach(asp => {
      const vals = brandAbsa.map(r => r.aspects[asp]).filter(v => v !== undefined);
      scores[asp] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    });

    result[brand] = scores;
  });

  return result;
}

/**
 * API 백엔드에서 크롤링한 데이터를 표준화
 */
export function normalizeApiReviews(apiRows) {
  return apiRows.map((r, idx) => ({
    id: idx + 1,
    brand: r.brand || "Unknown",
    reviewer: r.reviewer || `User_${idx + 1}`,
    text: r.text || "",
    rating: r.rating,
    date: r.date || "",
  })).filter(r => r.text.trim());
}

/**
 * 백엔드 상태 체크
 */
export async function checkBackend() {
  try {
    const res = await fetch("/api/health", { signal: AbortSignal.timeout(2000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * 서버 파일 업로드 (인코딩 방어 + Multi-CSV/Excel)
 * @param {Array<{name: string, file: File}>} brands
 * @returns {{ reviews, total, brand_stats, errors }}
 */
export async function uploadToServer(brands) {
  const formData = new FormData();
  brands.forEach(b => {
    // 파일명을 브랜드명으로 바꿔서 업로드
    const ext = b.file.name.split(".").pop();
    const renamedFile = new File([b.file], `${b.name}.${ext}`, { type: b.file.type });
    formData.append("files", renamedFile);
  });

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `업로드 실패 (${res.status})`);
  }
  return res.json();
}

/**
 * Gemini 페르소나 생성 API 호출
 */
export async function generateGeminiPersonas(clusters, domain, brandNames) {
  const res = await fetch("/api/generate-personas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clusters: clusters.map(c => ({
        id: c.id,
        name: c.name,
        topPos: c.topPos,
        topNeg: c.topNeg,
        keywords: c.keywords,
        sampleReviews: c.sampleReviews,
        avgRating: c.avgRating,
        size: c.size,
        brandDist: c.brandDist,
      })),
      domain,
      brand_names: brandNames,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Gemini API 오류 (${res.status})`);
  }
  return res.json();
}
