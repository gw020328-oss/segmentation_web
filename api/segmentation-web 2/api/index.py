"""
Vercel Serverless Function — Antigravity Brand Intelligence API
FastAPI app exported as ASGI handler for Vercel Python runtime.
"""
from __future__ import annotations

import asyncio
import io
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import chardet
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Gemini ────────────────────────────────────────────────────────────────────
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if HAS_GEMINI and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(title="Antigravity Brand Intelligence API", version="2.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
executor = ThreadPoolExecutor(max_workers=2)

# ═════════════════════════════════════════════════════════════════════════════
#  컬럼 정규화
# ═════════════════════════════════════════════════════════════════════════════
TEXT_ALIASES = [
    "text", "본문", "리뷰", "review", "내용", "body", "comment",
    "텍스트", "review_text", "content", "후기", "의견", "댓글",
]
RATING_ALIASES = [
    "rating", "별점", "star", "stars", "score", "평점", "rate",
    "grade", "점수", "만족도",
]
BRAND_ALIASES = ["brand", "브랜드", "가게", "store", "shop", "place"]


def _match_alias(col_lower: str, aliases: list[str]) -> bool:
    return any(a in col_lower for a in aliases)


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    col_map = {}
    for col in df.columns:
        cl = col.lower().strip()
        if "text" not in col_map.values() and _match_alias(cl, TEXT_ALIASES):
            col_map[col] = "text"
        elif "rating" not in col_map.values() and _match_alias(cl, RATING_ALIASES):
            col_map[col] = "rating"
        elif "brand" not in col_map.values() and _match_alias(cl, BRAND_ALIASES):
            col_map[col] = "brand"
    return df.rename(columns=col_map)


# ═════════════════════════════════════════════════════════════════════════════
#  인코딩 방어 파일 리더
# ═════════════════════════════════════════════════════════════════════════════
def safe_read_file(content: bytes, filename: str) -> pd.DataFrame:
    ext = Path(filename).suffix.lower()
    if ext in (".xlsx", ".xls"):
        return pd.read_excel(io.BytesIO(content))

    detected = chardet.detect(content[:10000])
    encodings = []
    if detected.get("encoding"):
        encodings.append(detected["encoding"])
    encodings += ["utf-8-sig", "utf-8", "cp949", "euc-kr", "latin-1"]

    seen = set()
    for enc in encodings:
        key = enc.lower().replace("-", "").replace("_", "")
        if key in seen:
            continue
        seen.add(key)
        try:
            df = pd.read_csv(io.BytesIO(content), encoding=enc, on_bad_lines="skip")
            if not df.empty:
                return df
        except Exception:
            continue
    raise ValueError(f"인코딩 감지 실패: {filename}")


# ═════════════════════════════════════════════════════════════════════════════
#  파일 업로드 API
# ═════════════════════════════════════════════════════════════════════════════
@app.post("/api/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(400, "파일을 업로드해주세요.")

    all_rows: list[dict] = []
    brand_stats: dict[str, int] = {}
    errors: list[str] = []

    for f in files:
        brand_name = Path(f.filename).stem
        try:
            raw = await f.read()
            df = safe_read_file(raw, f.filename)
            df = normalize_columns(df)

            if "text" not in df.columns:
                obj_cols = df.select_dtypes(include="object").columns.tolist()
                if obj_cols:
                    df = df.rename(columns={obj_cols[0]: "text"})
                else:
                    errors.append(f"{f.filename}: 텍스트 컬럼 없음")
                    continue

            if "rating" in df.columns:
                df["rating"] = pd.to_numeric(df["rating"], errors="coerce")
            else:
                df["rating"] = None

            df["brand"] = brand_name
            df["text"] = df["text"].fillna("").astype(str).str.strip()
            df = df[df["text"].str.len() > 2]

            rows = df.to_dict("records")
            for i, r in enumerate(rows):
                rows[i] = {
                    "brand": r.get("brand", brand_name),
                    "reviewer": r.get("reviewer", r.get("author", r.get("작성자", f"User_{i+1}"))),
                    "text": r["text"],
                    "rating": r.get("rating"),
                    "date": r.get("date", r.get("날짜", "")),
                }
            all_rows.extend(rows)
            brand_stats[brand_name] = len(rows)

        except Exception as e:
            errors.append(f"{f.filename}: {e}")

    if not all_rows:
        raise HTTPException(400, f"처리 가능한 데이터 없음. {'; '.join(errors)}")

    return {
        "reviews": all_rows,
        "total": len(all_rows),
        "brand_stats": brand_stats,
        "errors": errors,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  Gemini 페르소나 생성
# ═════════════════════════════════════════════════════════════════════════════
PERSONA_PROMPT = """
당신은 세계 최고의 소비자 행동 분석가이자 마케팅 전략가입니다.
아래 고객 클러스터 데이터를 바탕으로 **도메인 특화 페르소나 카드**를 생성해주세요.

## 클러스터 정보
- 클러스터 ID: {cluster_id}
- 자동 분류명: {cluster_name}
- 세그먼트 크기: {size}명
- 평균 평점: {avg_rating}/5.0
- 도메인: {domain}
- 브랜드 분포: {brand_dist}

## 핵심 속성 감성 점수
긍정 강점: {top_pos}
부정 Pain Point: {top_neg}

## 대표 리뷰 샘플 (최대 5건)
{sample_reviews}

## 요청 사항
다음 JSON 형식으로 정확하게 응답해주세요. 다른 텍스트 없이 JSON만:

{{
  "persona_name": "가상 이름",
  "age_range": "연령대",
  "lifestyle": "라이프스타일 한 문장",
  "psychographic": ["심리적 특성 1", "심리적 특성 2"],
  "pain_points": ["불만 1", "불만 2"],
  "purchase_triggers": ["구매 트리거 1", "구매 트리거 2"],
  "customer_journey": {{"인지": "...", "탐색": "...", "방문": "...", "재방문": "..."}},
  "brand_switching_hypothesis": "브랜드 이탈/선택 가설",
  "marketing_message": "마케팅 카피 1문장",
  "preferred_channels": ["채널 1", "채널 2"],
  "ltv_potential": "high/medium/low",
  "emoji": "대표 이모지"
}}
"""


class PersonaRequest(BaseModel):
    clusters: list[dict]
    domain: str = "cafe"
    brand_names: list[str] = []


@app.post("/api/generate-personas")
async def generate_personas(req: PersonaRequest):
    if not HAS_GEMINI or not GEMINI_API_KEY:
        raise HTTPException(503, "GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")

    model = genai.GenerativeModel("gemini-2.0-flash")

    async def _gen(cluster: dict) -> dict:
        bd = json.dumps(cluster.get("brandDist", {}), ensure_ascii=False)
        samples = "\n".join(
            f'  [{r.get("brand","?")}] "{r.get("text","")[:100]}"'
            for r in cluster.get("sampleReviews", [])[:5]
        )
        prompt = PERSONA_PROMPT.format(
            cluster_id=cluster.get("id", "?"),
            cluster_name=cluster.get("name", "Unknown"),
            size=cluster.get("size", 0),
            avg_rating=f"{cluster.get('avgRating', 0):.1f}" if cluster.get("avgRating") else "N/A",
            domain=req.domain,
            brand_dist=bd,
            top_pos=", ".join(cluster.get("topPos", [])),
            top_neg=", ".join(cluster.get("topNeg", [])),
            sample_reviews=samples or "  (없음)",
        )
        try:
            loop = asyncio.get_event_loop()
            resp = await loop.run_in_executor(
                executor, lambda: model.generate_content(prompt)
            )
            raw = resp.text.strip()
            m = re.search(r"\{[\s\S]*\}", raw)
            if m:
                return {"clusterId": cluster["id"], "persona": json.loads(m.group())}
            return {"clusterId": cluster["id"], "persona": None, "raw": raw}
        except Exception as e:
            return {"clusterId": cluster["id"], "persona": None, "error": str(e)}

    results = await asyncio.gather(*[_gen(c) for c in req.clusters])
    return {"personas": list(results)}


# ═════════════════════════════════════════════════════════════════════════════
#  Health Check
# ═════════════════════════════════════════════════════════════════════════════
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "gemini": bool(GEMINI_API_KEY),
        "mode": "vercel-serverless",
    }
