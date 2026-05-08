import { useState, useMemo } from "react";
import * as d3 from "d3";
import _ from "lodash";

// ── Sample Data: 40 Korean café reviews ──
const REVIEWS = [
  { id: 1, reviewer: "유저A", rating: 5, text: "분위기가 정말 좋고 인테리어가 예뻐요. 사진 찍기 딱 좋은 곳!" },
  { id: 2, reviewer: "유저B", rating: 3, text: "커피 맛은 괜찮은데 가격이 너무 비싸요. 아메리카노가 6천원이라니..." },
  { id: 3, reviewer: "유저C", rating: 5, text: "디저트가 정말 맛있어요! 크로플이랑 케이크 다 훌륭합니다." },
  { id: 4, reviewer: "유저D", rating: 4, text: "조용해서 공부하기 좋아요. 콘센트도 많고 와이파이 빠릅니다." },
  { id: 5, reviewer: "유저E", rating: 2, text: "주차가 너무 불편하고 자리가 좁아요. 커피 맛은 보통." },
  { id: 6, reviewer: "유저F", rating: 5, text: "뷰가 최고! 창가 자리에서 보는 야경이 너무 아름다워요." },
  { id: 7, reviewer: "유저G", rating: 4, text: "라떼 아트가 예쁘고 원두 퀄리티가 좋아요. 핸드드립 추천합니다." },
  { id: 8, reviewer: "유저H", rating: 3, text: "분위기는 좋은데 음료가 너무 달아요. 당도 조절이 안 돼요." },
  { id: 9, reviewer: "유저I", rating: 5, text: "작업하기 최고의 카페! 넓은 테이블, 조용한 음악, 긴 영업시간." },
  { id: 10, reviewer: "유저J", rating: 4, text: "케이크 종류가 다양하고 다 맛있어요. 딸기 케이크 강추!" },
  { id: 11, reviewer: "유저K", rating: 2, text: "서비스가 불친절하고 대기 시간이 너무 길어요." },
  { id: 12, reviewer: "유저L", rating: 5, text: "인테리어가 독특하고 감성적이에요. SNS 핫플레이스 답습니다." },
  { id: 13, reviewer: "유저M", rating: 4, text: "가성비 좋아요! 아메리카노 3,500원에 리필도 됩니다." },
  { id: 14, reviewer: "유저N", rating: 3, text: "스콘이 맛있는데 커피가 좀 약해요. 에스프레소 샷 추가 필요." },
  { id: 15, reviewer: "유저O", rating: 5, text: "노트북 작업하기 완벽해요. 1인 좌석에 개인 콘센트까지!" },
  { id: 16, reviewer: "유저P", rating: 4, text: "핸드드립 커피가 진짜 맛있어요. 원두도 직접 로스팅한다고 합니다." },
  { id: 17, reviewer: "유저Q", rating: 2, text: "음료 양이 적고 가격 대비 아쉬워요. 빙수는 괜찮았습니다." },
  { id: 18, reviewer: "유저R", rating: 5, text: "테라스가 넓고 펫 동반 가능해서 좋아요! 뷰도 좋고." },
  { id: 19, reviewer: "유저S", rating: 4, text: "마카롱이 유명한 곳인데 역시 맛있어요. 포장도 예쁩니다." },
  { id: 20, reviewer: "유저T", rating: 3, text: "주말엔 너무 붐비고 시끄러워요. 평일에 가면 좋을 듯." },
  { id: 21, reviewer: "유저U", rating: 5, text: "분위기 맛집! 빈티지 인테리어에 LP판 틀어주는 감성 카페." },
  { id: 22, reviewer: "유저V", rating: 4, text: "콜드브루가 깔끔하고 좋아요. 텀블러 할인도 됩니다." },
  { id: 23, reviewer: "유저W", rating: 5, text: "공부 카페로 최고예요. 스터디룸도 있고 음료 무한리필!" },
  { id: 24, reviewer: "유저X", rating: 2, text: "에어컨이 너무 세서 추웠어요. 맛은 그냥 평범합니다." },
  { id: 25, reviewer: "유저Y", rating: 5, text: "티라미수가 인생 디저트! 케이크도 다 수제라 맛있어요." },
  { id: 26, reviewer: "유저Z", rating: 4, text: "루프탑에서 보는 전망이 좋아요. 데이트 코스로 추천합니다." },
  { id: 27, reviewer: "유저AA", rating: 3, text: "커피는 맛있는데 자리가 불편해요. 의자가 딱딱합니다." },
  { id: 28, reviewer: "유저BB", rating: 5, text: "가격 대비 양이 많고 맛있어요. 세트 메뉴가 가성비 최고!" },
  { id: 29, reviewer: "유저CC", rating: 4, text: "조용한 분위기에서 책 읽기 좋아요. 독서 모임에 딱입니다." },
  { id: 30, reviewer: "유저DD", rating: 5, text: "라떼가 부드럽고 진해요. 바리스타가 직접 내려주는 퀄리티!" },
  { id: 31, reviewer: "유저EE", rating: 3, text: "브런치 메뉴는 맛있는데 대기가 30분 이상이에요." },
  { id: 32, reviewer: "유저FF", rating: 5, text: "정원이 있는 카페! 꽃이 예쁘고 사진 찍기 좋아요." },
  { id: 33, reviewer: "유저GG", rating: 4, text: "와플이 바삭하고 아이스크림이랑 잘 어울려요. 디저트 맛집!" },
  { id: 34, reviewer: "유저HH", rating: 2, text: "웨이팅이 길고 좌석이 불편합니다. 회전율 안 좋아요." },
  { id: 35, reviewer: "유저II", rating: 5, text: "스터디 카페처럼 집중하기 좋아요. 타이머도 있고 조용합니다." },
  { id: 36, reviewer: "유저JJ", rating: 4, text: "싱글오리진 커피가 다양해요. 에티오피아 예가체프 추천!" },
  { id: 37, reviewer: "유저KK", rating: 5, text: "야외 테라스에서 석양 보면서 커피 마시는 게 힐링이에요." },
  { id: 38, reviewer: "유저LL", rating: 3, text: "당근케이크가 맛있는데 커피는 평범해요. 디저트 위주로 주문하세요." },
  { id: 39, reviewer: "유저MM", rating: 4, text: "학생 할인 되고 아메리카노가 저렴해서 자주 와요." },
  { id: 40, reviewer: "유저NN", rating: 5, text: "감성 인테리어에 조명이 예뻐요. 데이트 장소로 완벽!" },
];

// ── ABSA Extraction (simulated NLP results) ──
const ASPECTS = ["커피맛", "디저트", "분위기", "가격", "편의성", "서비스", "공간"];
const ASPECT_COLORS = {
  "커피맛": "#d97706", "디저트": "#db2777", "분위기": "#7c3aed",
  "가격": "#059669", "편의성": "#2563eb", "서비스": "#dc2626", "공간": "#0891b2"
};

// Each review's ABSA result: aspect -> sentiment score (-1, 0, 1)
const ABSA_RESULTS = [
  { id:1, aspects: { "분위기":1, "공간":1 } },
  { id:2, aspects: { "커피맛":0, "가격":-1 } },
  { id:3, aspects: { "디저트":1 } },
  { id:4, aspects: { "편의성":1, "공간":1 } },
  { id:5, aspects: { "편의성":-1, "공간":-1, "커피맛":0 } },
  { id:6, aspects: { "분위기":1, "공간":1 } },
  { id:7, aspects: { "커피맛":1 } },
  { id:8, aspects: { "분위기":1, "커피맛":-1 } },
  { id:9, aspects: { "편의성":1, "공간":1 } },
  { id:10, aspects: { "디저트":1 } },
  { id:11, aspects: { "서비스":-1 } },
  { id:12, aspects: { "분위기":1 } },
  { id:13, aspects: { "가격":1 } },
  { id:14, aspects: { "디저트":1, "커피맛":-1 } },
  { id:15, aspects: { "편의성":1, "공간":1 } },
  { id:16, aspects: { "커피맛":1 } },
  { id:17, aspects: { "가격":-1, "디저트":0 } },
  { id:18, aspects: { "분위기":1, "공간":1 } },
  { id:19, aspects: { "디저트":1 } },
  { id:20, aspects: { "공간":-1, "서비스":-1 } },
  { id:21, aspects: { "분위기":1 } },
  { id:22, aspects: { "커피맛":1, "가격":1 } },
  { id:23, aspects: { "편의성":1, "공간":1 } },
  { id:24, aspects: { "공간":-1, "커피맛":0 } },
  { id:25, aspects: { "디저트":1 } },
  { id:26, aspects: { "분위기":1, "공간":1 } },
  { id:27, aspects: { "커피맛":1, "공간":-1 } },
  { id:28, aspects: { "가격":1, "디저트":1 } },
  { id:29, aspects: { "분위기":1, "편의성":1 } },
  { id:30, aspects: { "커피맛":1 } },
  { id:31, aspects: { "디저트":1, "서비스":-1 } },
  { id:32, aspects: { "분위기":1, "공간":1 } },
  { id:33, aspects: { "디저트":1 } },
  { id:34, aspects: { "서비스":-1, "공간":-1 } },
  { id:35, aspects: { "편의성":1, "공간":1 } },
  { id:36, aspects: { "커피맛":1 } },
  { id:37, aspects: { "분위기":1, "공간":1 } },
  { id:38, aspects: { "디저트":1, "커피맛":0 } },
  { id:39, aspects: { "가격":1 } },
  { id:40, aspects: { "분위기":1 } },
];

// ── K-Means Clustering (simplified) ──
function buildMatrix(absaResults) {
  return absaResults.map(r => ASPECTS.map(a => r.aspects[a] || 0));
}

function euclidean(a, b) {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

function kMeans(data, k, maxIter = 50) {
  const n = data.length, dim = data[0].length;
  // deterministic seed centroids
  const seedIdx = [0, 2, 3, 6]; // pick diverse starting points
  let centroids = seedIdx.slice(0, k).map(i => [...data[i]]);
  let labels = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // assign
    const newLabels = data.map(pt => {
      let best = 0, bestD = Infinity;
      centroids.forEach((c, ci) => { const d = euclidean(pt, c); if (d < bestD) { bestD = d; best = ci; } });
      return best;
    });
    // update centroids
    const sums = centroids.map(() => new Array(dim).fill(0));
    const counts = new Array(k).fill(0);
    newLabels.forEach((l, i) => { counts[l]++; data[i].forEach((v, d) => sums[l][d] += v); });
    centroids = sums.map((s, ci) => s.map(v => counts[ci] ? v / counts[ci] : 0));
    if (newLabels.every((l, i) => l === labels[i])) break;
    labels = newLabels;
  }
  return { labels, centroids };
}

// ── Segment Definitions ──
const SEGMENT_META = [
  { name: "☕ 커피 품질 추구형", color: "#b45309", desc: "원두, 로스팅, 핸드드립 등 커피 자체의 맛과 품질을 중시" },
  { name: "🍰 디저트 탐험형", color: "#be185d", desc: "케이크, 마카롱 등 디저트 메뉴의 다양성과 맛을 우선시" },
  { name: "📸 분위기 감성형", color: "#6d28d9", desc: "인테리어, 뷰, 사진촬영 등 공간의 감성과 비주얼을 중시" },
  { name: "💻 작업/스터디형", color: "#1d4ed8", desc: "콘센트, 와이파이, 조용한 환경 등 작업 편의성을 우선시" },
];

const K = 4;

// ── PCA-like 2D projection for scatter ──
function project2D(matrix) {
  // use first two principal-ish axes: "분위기+공간" vs "커피맛+디저트"
  return matrix.map(row => ({
    x: (row[2] + row[6]) * 50 + (Math.random() - 0.5) * 20, // 분위기 + 공간
    y: (row[0] + row[1]) * 50 + (Math.random() - 0.5) * 20, // 커피맛 + 디저트
  }));
}

// ── Components ──
const STEPS = ["데이터 수집", "ABSA 추출", "매트릭스 구성", "클러스터링", "세그먼트 분석"];

function Badge({ children, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 11, fontWeight: 600, background: color + "22", color: color, marginRight: 4,
    }}>{children}</span>
  );
}

function SentBadge({ val }) {
  const map = { "1": ["긍정", "#059669"], "-1": ["부정", "#dc2626"], "0": ["중립", "#6b7280"] };
  const [label, color] = map[String(val)] || ["?", "#999"];
  return <Badge color={color}>{label}</Badge>;
}

export default function App() {
  const [step, setStep] = useState(0);
  const [hoveredReview, setHoveredReview] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);

  const matrix = useMemo(() => buildMatrix(ABSA_RESULTS), []);
  const { labels, centroids } = useMemo(() => kMeans(matrix, K), [matrix]);
  const points2D = useMemo(() => project2D(matrix), [matrix]);

  // Segment stats
  const segmentData = useMemo(() => {
    return SEGMENT_META.map((meta, si) => {
      const members = labels.map((l, i) => i).filter(i => labels[i] === si);
      const avgRating = members.length ? _.mean(members.map(i => REVIEWS[i].rating)) : 0;
      const aspectAvg = ASPECTS.map((a, ai) => ({
        aspect: a,
        avg: members.length ? _.mean(members.map(i => matrix[i][ai])) : 0,
      }));
      return { ...meta, members, avgRating, aspectAvg, centroid: centroids[si] };
    });
  }, [labels, centroids, matrix]);

  const font = "'Pretendard', 'Noto Sans KR', -apple-system, sans-serif";

  return (
    <div style={{
      fontFamily: font, minHeight: "100vh", background: "var(--bg, #0f1117)",
      color: "var(--text, #e2e4e9)", padding: 0,
      "--bg": "#0f1117", "--card": "#181b24", "--border": "#2a2d38",
      "--text": "#e2e4e9", "--muted": "#7a7f8e", "--accent": "#6d28d9",
    }}>
      <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
      
      {/* Header */}
      <div style={{ padding: "32px 24px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>
          Big Data Marketing · ABSA Pipeline
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
          온라인 후기 기반 시장 세분화
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0 0" }}>
          카페 후기 40건 → ABSA 속성·감성 추출 → K-Means 클러스터링 → 4개 세그먼트 도출
        </p>
      </div>

      {/* Step Nav */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            flex: 1, padding: "14px 8px", border: "none", cursor: "pointer",
            background: step === i ? "var(--card)" : "transparent",
            color: step === i ? "#fff" : "var(--muted)",
            fontWeight: step === i ? 700 : 400, fontSize: 13, fontFamily: font,
            borderBottom: step === i ? "2px solid var(--accent)" : "2px solid transparent",
            minWidth: 90, transition: "all .2s",
          }}>
            <span style={{ fontSize: 10, color: "var(--accent)", display: "block", marginBottom: 2 }}>STEP {i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>

        {/* STEP 0: Data */}
        {step === 0 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📋 수집된 카페 후기 데이터 (40건)</h2>
            <div style={{ maxHeight: 480, overflowY: "auto", borderRadius: 8, border: "1px solid var(--border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#1e2130", position: "sticky", top: 0, zIndex: 1 }}>
                    {["#","리뷰어","별점","후기 내용"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REVIEWS.map(r => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)", background: hoveredReview === r.id ? "#1e2130" : "transparent" }}
                      onMouseEnter={() => setHoveredReview(r.id)} onMouseLeave={() => setHoveredReview(null)}>
                      <td style={{ padding: "8px 12px", color: "var(--muted)", width: 40 }}>{r.id}</td>
                      <td style={{ padding: "8px 12px", width: 70 }}>{r.reviewer}</td>
                      <td style={{ padding: "8px 12px", width: 60 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
                      <td style={{ padding: "8px 12px" }}>{r.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 1: ABSA */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🔍 ABSA 속성·감성 추출 결과</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
              각 후기에서 언급된 속성(Aspect)과 해당 감성(Sentiment)을 추출합니다.
              실제로는 KcELECTRA 파인튜닝 또는 LLM 프롬프트로 수행합니다.
            </p>
            {/* Aspect legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {ASPECTS.map(a => <Badge key={a} color={ASPECT_COLORS[a]}>{a}</Badge>)}
            </div>
            <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {ABSA_RESULTS.map(r => {
                const review = REVIEWS.find(rv => rv.id === r.id);
                return (
                  <div key={r.id} style={{
                    background: "var(--card)", borderRadius: 8, padding: "12px 16px",
                    border: "1px solid var(--border)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{review.reviewer}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{"★".repeat(review.rating)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>"{review.text}"</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {Object.entries(r.aspects).map(([asp, sent]) => (
                        <span key={asp} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "3px 10px", borderRadius: 20, fontSize: 12,
                          background: ASPECT_COLORS[asp] + "18", border: `1px solid ${ASPECT_COLORS[asp]}44`,
                        }}>
                          <span style={{ color: ASPECT_COLORS[asp], fontWeight: 600 }}>{asp}</span>
                          <SentBadge val={sent} />
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Matrix */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>📊 리뷰어 × 속성감성 매트릭스</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
              ABSA 결과를 수치 매트릭스로 변환합니다. 각 셀은 해당 속성에 대한 감성 점수(-1, 0, +1)이며,
              언급하지 않은 속성은 0으로 처리합니다. 이 매트릭스가 클러스터링의 입력이 됩니다.
            </p>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "#1e2130" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>리뷰어</th>
                    {ASPECTS.map(a => (
                      <th key={a} style={{
                        padding: "8px 6px", textAlign: "center", borderBottom: "1px solid var(--border)",
                        fontWeight: 600, color: ASPECT_COLORS[a],
                      }}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.slice(0, 20).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px 10px", fontWeight: 500 }}>{REVIEWS[i].reviewer}</td>
                      {row.map((v, j) => (
                        <td key={j} style={{
                          padding: "6px", textAlign: "center", fontWeight: 700,
                          color: v > 0 ? "#34d399" : v < 0 ? "#f87171" : "#4b5563",
                          background: v !== 0 ? (v > 0 ? "#34d39910" : "#f8717110") : "transparent",
                        }}>{v > 0 ? "+1" : v < 0 ? "-1" : "0"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>※ 상위 20명만 표시 (전체 40명)</p>
          </div>
        )}

        {/* STEP 3: Clustering Scatter */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🎯 K-Means 클러스터링 (K=4)</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
              7차원 속성감성 벡터를 2차원으로 투영한 산점도입니다. 각 점은 리뷰어이며, 색상이 세그먼트를 나타냅니다.
            </p>
            <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
              <svg viewBox="-80 -80 260 260" style={{ width: "100%", maxWidth: 500, display: "block", margin: "0 auto" }}>
                {/* axes */}
                <line x1={-60} y1={100} x2={180} y2={100} stroke="#2a2d38" strokeWidth={1} />
                <line x1={50} y1={-60} x2={50} y2={180} stroke="#2a2d38" strokeWidth={1} />
                <text x={170} y={118} fontSize={9} fill="#7a7f8e">분위기·공간 →</text>
                <text x={55} y={-50} fontSize={9} fill="#7a7f8e">커피·디저트 →</text>
                {/* points */}
                {points2D.map((pt, i) => {
                  const seg = labels[i];
                  const col = SEGMENT_META[seg].color;
                  return (
                    <g key={i}>
                      <circle cx={pt.x + 50} cy={100 - pt.y} r={6} fill={col} opacity={0.8}
                        stroke="#fff" strokeWidth={hoveredReview === i ? 2 : 0} />
                      {hoveredReview === i && (
                        <text x={pt.x + 60} y={97 - pt.y} fontSize={8} fill="#fff">{REVIEWS[i].reviewer}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
              {/* Legend */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 16 }}>
                {SEGMENT_META.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                    <span>{s.name}</span>
                    <span style={{ color: "var(--muted)" }}>({labels.filter(l => l === i).length}명)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Segment Profiles */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📈 세그먼트 프로파일</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {segmentData.map((seg, si) => (
                <div key={si} onClick={() => setSelectedSegment(selectedSegment === si ? null : si)}
                  style={{
                    background: "var(--card)", borderRadius: 12, padding: 20,
                    border: selectedSegment === si ? `2px solid ${seg.color}` : "1px solid var(--border)",
                    cursor: "pointer", transition: "all .2s",
                  }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: seg.color }}>{seg.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>{seg.desc}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{seg.members.length}명</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>세그먼트 크기</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{seg.avgRating.toFixed(1)}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>평균 별점</div>
                    </div>
                  </div>
                  {/* Aspect bar chart */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {seg.aspectAvg.map(a => (
                      <div key={a.aspect} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, width: 48, textAlign: "right", color: ASPECT_COLORS[a.aspect], fontWeight: 600 }}>{a.aspect}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#1e2130", position: "relative", overflow: "hidden" }}>
                          {a.avg >= 0 && <div style={{ position: "absolute", left: "50%", width: `${a.avg * 50}%`, height: "100%", background: "#34d399", borderRadius: 4 }} />}
                          {a.avg < 0 && <div style={{ position: "absolute", right: "50%", width: `${Math.abs(a.avg) * 50}%`, height: "100%", background: "#f87171", borderRadius: 4 }} />}
                          <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: "#4b5563" }} />
                        </div>
                        <span style={{ fontSize: 10, width: 30, color: a.avg >= 0 ? "#34d399" : "#f87171" }}>{a.avg >= 0 ? "+" : ""}{a.avg.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Member reviews on expand */}
                  {selectedSegment === si && (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>소속 리뷰어 후기:</div>
                      {seg.members.slice(0, 5).map(mi => (
                        <div key={mi} style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 600, color: "var(--text)" }}>{REVIEWS[mi].reviewer}</span>{" "}
                          "{REVIEWS[mi].text}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex", justifyContent: "space-between", padding: "16px 24px 32px",
        maxWidth: 900, margin: "0 auto",
      }}>
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "1px solid var(--border)",
            background: "transparent", color: step === 0 ? "#4b5563" : "var(--text)",
            cursor: step === 0 ? "default" : "pointer", fontFamily: font, fontSize: 13,
          }}>← 이전</button>
        <button onClick={() => setStep(Math.min(4, step + 1))} disabled={step === 4}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none",
            background: step === 4 ? "#4b5563" : "var(--accent)", color: "#fff",
            cursor: step === 4 ? "default" : "pointer", fontFamily: font, fontSize: 13, fontWeight: 600,
          }}>다음 →</button>
      </div>
    </div>
  );
}
