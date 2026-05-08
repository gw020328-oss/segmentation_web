// ──────────────────────────────────────────────────────────────────────────────
// Universal ABSA + Clustering Engine (runs entirely in browser)
// ──────────────────────────────────────────────────────────────────────────────
import { PERSONA_NAME_MAP } from "./domains.js";

/* ── 1. CSV Parser ── */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line, idx) => {
    // handle quoted fields with embedded commas
    const fields = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    fields.push(cur.trim());
    const obj = { _rowId: idx + 1 };
    headers.forEach((h, i) => { obj[h] = fields[i] ?? ""; });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ""));
}

/* ── 2. Adaptive Column Detector ── */
export function detectColumns(rows) {
  if (!rows.length) return { textCol: null, ratingCol: null, reviewerCol: null };
  const keys = Object.keys(rows[0]).filter(k => k !== "_rowId");
  const textCandidates = ["text", "review", "content", "comment", "후기", "리뷰", "내용", "본문"];
  const ratingCandidates = ["rating", "score", "star", "별점", "평점", "점수"];
  const reviewerCandidates = ["reviewer", "user", "author", "name", "유저", "작성자", "닉네임"];

  const textCol = keys.find(k => textCandidates.some(c => k.toLowerCase().includes(c)))
    || keys.find(k => rows.slice(0, 5).every(r => typeof r[k] === "string" && r[k].length > 20));
  const ratingCol = keys.find(k => ratingCandidates.some(c => k.toLowerCase().includes(c)));
  const reviewerCol = keys.find(k => reviewerCandidates.some(c => k.toLowerCase().includes(c)));
  return { textCol, ratingCol, reviewerCol };
}

/* ── 3. Text Preprocessor ── */
function preprocess(t) {
  if (!t) return "";
  return t.toLowerCase().replace(/[^\w\s가-힣]/g, " ").replace(/\s+/g, " ").trim();
}

/* ── 4. ABSA Keyword Extractor ── */
export function extractABSA(rows, textCol, aspects) {
  const aspectKeys = Object.keys(aspects);
  return rows.map(row => {
    const t = preprocess(row[textCol] || "");
    const scores = {};
    aspectKeys.forEach(asp => {
      const { pos, neg } = aspects[asp];
      const posHits = pos.filter(w => t.includes(w)).length;
      const negHits = neg.filter(w => t.includes(w)).length;
      // 키워드 히트가 전혀 없으면 해당 속성은 미언급으로 처리 (0 포함 안 함)
      if (posHits === 0 && negHits === 0) return;
      const raw = posHits - negHits;
      scores[asp] = raw > 0 ? 1 : raw < 0 ? -1 : 0;
    });
    return { id: row._rowId, aspects: scores };
  });
}

/* ── 5. Feature Matrix ── */
export function buildMatrix(absaResults, aspectKeys) {
  return absaResults.map(r => aspectKeys.map(a => r.aspects[a] ?? 0));
}

/* ── 6. K-Means ── */
function euclidean(a, b) {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

export function kMeans(data, k, maxIter = 100) {
  const n = data.length;
  const dim = data[0]?.length ?? 0;
  if (n < k) return { labels: data.map((_, i) => i % k), centroids: [] };

  // k-means++ init
  const centroids = [data[Math.floor(Math.random() * n)].slice()];
  while (centroids.length < k) {
    const dists = data.map(pt => Math.min(...centroids.map(c => euclidean(pt, c) ** 2)));
    const total = dists.reduce((s, d) => s + d, 0);
    let r = Math.random() * total, cumul = 0;
    for (let i = 0; i < n; i++) { cumul += dists[i]; if (cumul >= r) { centroids.push(data[i].slice()); break; } }
    if (centroids.length < k) centroids.push(data[Math.floor(Math.random() * n)].slice());
  }

  let labels = new Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    const newLabels = data.map(pt => {
      let best = 0, bestD = Infinity;
      centroids.forEach((c, ci) => { const d = euclidean(pt, c); if (d < bestD) { bestD = d; best = ci; } });
      return best;
    });
    const sums = centroids.map(() => new Array(dim).fill(0));
    const counts = new Array(k).fill(0);
    newLabels.forEach((l, i) => { counts[l]++; data[i].forEach((v, d) => { sums[l][d] += v; }); });
    const newCentroids = sums.map((s, ci) => s.map(v => counts[ci] ? v / counts[ci] : 0));
    if (newLabels.every((l, i) => l === labels[i])) break;
    labels = newLabels;
    newCentroids.forEach((c, i) => { centroids[i] = c; });
  }
  return { labels, centroids };
}

/* ── 7. Silhouette Score (simplified) ── */
export function silhouetteScore(data, labels, k) {
  const n = data.length;
  if (n <= k) return 0;
  let totalS = 0;
  for (let i = 0; i < n; i++) {
    const myCluster = labels[i];
    const sameCluster = data.filter((_, j) => j !== i && labels[j] === myCluster);
    const a = sameCluster.length ? sameCluster.reduce((s, p) => s + euclidean(data[i], p), 0) / sameCluster.length : 0;
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === myCluster) continue;
      const otherCluster = data.filter((_, j) => labels[j] === c);
      if (!otherCluster.length) continue;
      const avg = otherCluster.reduce((s, p) => s + euclidean(data[i], p), 0) / otherCluster.length;
      if (avg < b) b = avg;
    }
    const maxAB = Math.max(a, b === Infinity ? 0 : b);
    totalS += maxAB ? (b - a) / maxAB : 0;
  }
  return totalS / n;
}

/* ── 8. Auto K Selection ── */
export function findBestK(matrix, minK = 2, maxK = 7) {
  const results = [];
  for (let k = minK; k <= Math.min(maxK, matrix.length - 1); k++) {
    const { labels } = kMeans(matrix, k);
    const score = silhouetteScore(matrix, labels, k);
    results.push({ k, score });
  }
  results.sort((a, b) => b.score - a.score);
  return { best: results[0]?.k ?? 3, scores: results.sort((a, b) => a.k - b.k) };
}

/* ── 9. PCA-like 2D Projection ── */
export function project2D(matrix, aspectKeys) {
  // Simple: use variance-weighted first two axes
  const n = matrix.length, dim = matrix[0]?.length ?? 0;
  if (n === 0 || dim < 2) return matrix.map(() => ({ x: 0, y: 0 }));

  const means = Array.from({ length: dim }, (_, d) => matrix.reduce((s, r) => s + r[d], 0) / n);
  const vars = Array.from({ length: dim }, (_, d) => matrix.reduce((s, r) => s + (r[d] - means[d]) ** 2, 0) / n);
  const ranked = vars.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const [ax1, ax2] = [ranked[0]?.i ?? 0, ranked[1]?.i ?? 1];

  return matrix.map(row => ({
    x: (row[ax1] - means[ax1]) * 80 + (Math.random() - 0.5) * 18,
    y: (row[ax2] - means[ax2]) * 80 + (Math.random() - 0.5) * 18,
    label1: aspectKeys[ax1], label2: aspectKeys[ax2],
  }));
}

/* ── 10. Persona Builder ── */
export function buildPersonas(labels, centroids, matrix, rows, textCol, ratingCol, reviewerCol, aspectKeys, domainColors) {
  const k = Math.max(...labels) + 1;
  return Array.from({ length: k }, (_, ci) => {
    const memberIdx = labels.map((l, i) => i).filter(i => labels[i] === ci);
    const members = memberIdx.map(i => rows[i]);
    const centroid = centroids[ci] ?? aspectKeys.map(() => 0);
    const aspectScores = aspectKeys.map((asp, ai) => ({ asp, score: centroid[ai] ?? 0 }));
    const sorted = [...aspectScores].sort((a, b) => b.score - a.score);
    const topPos = sorted.filter(a => a.score > 0).slice(0, 3).map(a => a.asp);
    const topNeg = sorted.filter(a => a.score < 0).slice(0, 2).map(a => a.asp);
    const avgRating = ratingCol && members.length
      ? members.reduce((s, r) => s + (parseFloat(r[ratingCol]) || 0), 0) / members.length : null;

    const personaName = PERSONA_NAME_MAP[topPos[0]] || topPos[0] || `그룹 ${ci + 1}`;
    const color = domainColors[ci % domainColors.length];

    const systemPrompt = `[System Persona Instruction – Cluster ${ci}: ${personaName}]

당신은 '${personaName}' 유형의 고객입니다.
${avgRating !== null ? `▶ 평균 평점: ${avgRating.toFixed(1)}/5.0 | ` : ""}세그먼트 크기: ${members.length}명

▶ 핵심 가치: ${topPos.length ? topPos.join(", ") : "다양한 요소 균형"}
▶ Pain Point: ${topNeg.length ? topNeg.map(a => `${a} 부정 경험`).join(", ") : "없음 (전반적 만족)"}

▶ 행동 패턴
- 선택 시 ${topPos[0] || "전반적 경험"}을 가장 먼저 고려합니다.
- ${topNeg.length ? `${topNeg[0]} 관련 불만을 명확히 표현합니다.` : "대체로 긍정적 리뷰를 남깁니다."}

▶ 커뮤니케이션 지침
- ${topPos[0] ? `${topPos[0]}와 관련된 구체적 정보를 제공하세요.` : "전반적인 경험 품질을 강조하세요."}
- Pain Point 해결 솔루션을 명확히 전달하세요.`;

    return { id: ci, name: personaName, color, members, avgRating, aspectScores, topPos, topNeg, systemPrompt };
  });
}
