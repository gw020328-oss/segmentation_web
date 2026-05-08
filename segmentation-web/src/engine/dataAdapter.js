// ──────────────────────────────────────────────────────────────────────────────
// Intelligent Data Adapter  (browser-only, no deps)
// 역할: 임의 규격의 CSV rows를 시스템 표준 4컬럼으로 표준화합니다.
//   표준 컬럼: id | reviewer | rating | text
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 각 표준 컬럼에 대한 후보 키워드 (소문자 부분 일치)
 * 우선순위 순서대로 나열
 */
const COLUMN_CANDIDATES = {
  id:       ["id", "_id", "번호", "index", "no", "num", "순번", "rowid"],
  reviewer: ["reviewer", "user", "author", "name", "writer", "nick",
             "작성자", "리뷰어", "유저", "닉네임", "사용자", "username"],
  rating:   ["rating", "score", "star", "grade", "rate", "point",
             "별점", "평점", "점수", "만족도", "stars"],
  text:     ["text", "review", "content", "comment", "body", "description",
             "후기", "리뷰", "내용", "본문", "댓글", "의견", "review_text"],
};

/**
 * Levenshtein distance (간단 구현 – 짧은 컬럼명에 충분)
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

/**
 * 컬럼명 하나와 후보 키워드 목록 사이의 최소 유사도 거리를 반환
 * (낮을수록 더 유사)
 */
function bestScore(colName, candidates) {
  const lower = colName.toLowerCase().replace(/[_\-\s]/g, "");
  let min = Infinity;
  for (const cand of candidates) {
    const c = cand.replace(/[_\-\s]/g, "");
    // 완전 포함이면 즉시 0점
    if (lower.includes(c) || c.includes(lower)) return 0;
    const dist = levenshtein(lower, c);
    if (dist < min) min = dist;
  }
  return min;
}

/**
 * 실제 컬럼 목록에서 표준 4컬럼에 가장 가까운 컬럼을 자동 추론합니다.
 * @param {string[]} keys  CSV에서 얻은 실제 컬럼명 배열
 * @returns {{ id, reviewer, rating, text }}  각 표준 컬럼 → 실제 컬럼명 매핑
 */
export function autoDetectMapping(keys) {
  const available = keys.filter(k => k !== "_rowId");
  const result = { id: null, reviewer: null, rating: null, text: null };

  // 텍스트 컬럼은 길이 휴리스틱도 추가 활용
  const stdCols = ["id", "reviewer", "rating", "text"];

  for (const std of stdCols) {
    const scored = available.map(col => ({
      col,
      score: bestScore(col, COLUMN_CANDIDATES[std]),
    })).sort((a, b) => a.score - b.score);

    // 이미 다른 표준 컬럼에 할당된 컬럼은 재사용하지 않음
    const assigned = Object.values(result).filter(Boolean);
    const best = scored.find(s => !assigned.includes(s.col) && s.score <= 4);
    if (best) result[std] = best.col;
  }

  // text 컬럼을 못 찾은 경우 가장 긴 문자열 컬럼으로 fallback
  if (!result.text) {
    const assigned = Object.values(result).filter(Boolean);
    const fallback = available
      .filter(k => !assigned.includes(k))
      .sort((a, b) => {
        // 컬럼명 길이로 정렬 (긴 이름 = 내용 컬럼일 가능성)
        return b.length - a.length;
      })[0];
    if (fallback) result.text = fallback;
  }

  return result;
}

/**
 * 자동 감지 결과의 신뢰도를 설명 문자열로 반환합니다 (UI 표시용)
 */
export function getMappingExplanation(mapping, originalKeys) {
  return Object.entries(mapping).map(([std, orig]) => {
    if (!orig) return { std, orig: null, method: "미감지", confidence: "none" };
    const score = bestScore(orig, COLUMN_CANDIDATES[std]);
    return {
      std,
      orig,
      method: score === 0 ? "키워드 일치" : `유사도 (거리:${score})`,
      confidence: score === 0 ? "high" : score <= 2 ? "medium" : "low",
    };
  });
}

/**
 * 사용자가 설정한 매핑(또는 자동 감지 매핑)을 적용하여 rows를 표준화합니다.
 *
 * @param {Object[]} rows      parseCSV()가 반환한 원본 rows
 * @param {{ id, reviewer, rating, text }} mapping  표준명 → 실제 컬럼명
 * @returns {{ standardized: Object[], dropped: string[], nullDropped: number }}
 */
export function standardizeRows(rows, mapping) {
  const { id: idCol, reviewer: reviewerCol, rating: ratingCol, text: textCol } = mapping;

  // 어떤 컬럼이 삭제(drop)되는지 추적
  const usedCols = Object.values(mapping).filter(Boolean);
  const allCols  = Object.keys(rows[0] || {}).filter(k => k !== "_rowId");
  const dropped  = allCols.filter(c => !usedCols.includes(c));

  let nullDropped = 0;

  const standardized = rows
    .map((row, idx) => {
      const newRow = {
        id:       idCol       ? row[idCol]       : (row._rowId ?? idx + 1),
        reviewer: reviewerCol ? row[reviewerCol] : `User_${idx + 1}`,
        rating:   ratingCol   ? row[ratingCol]   : null,
        text:     textCol     ? row[textCol]      : null,
      };
      return newRow;
    })
    // 결측치(NaN/null/빈 문자열) 행 제거 — text는 필수
    .filter(row => {
      const valid = row.text !== null && row.text !== undefined && String(row.text).trim() !== "";
      if (!valid) nullDropped++;
      return valid;
    });

  return { standardized, dropped, nullDropped };
}

/**
 * 표준화된 rows에서 pipeline.js가 기대하는 컬럼명(textCol="text" etc.)을 반환합니다.
 */
export const STANDARD_COLS = {
  textCol:     "text",
  ratingCol:   "rating",
  reviewerCol: "reviewer",
};
