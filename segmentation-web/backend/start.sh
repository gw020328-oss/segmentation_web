#!/bin/bash
# ──────────────────────────────────────────────────────────────
# Antigravity · Backend 시작 스크립트
# M5 MacBook 최적화: Python 가상환경 자동 설정 + Playwright 설치
# ──────────────────────────────────────────────────────────────

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Antigravity Backend 시작..."

# 1. 가상환경 생성 (없으면)
if [ ! -d ".venv" ]; then
  echo "📦 Python 가상환경 생성..."
  python3 -m venv .venv
fi

# 2. 활성화
source .venv/bin/activate

# 3. 의존성 설치
echo "📦 패키지 설치..."
pip install -q -r requirements.txt

# 4. Playwright 브라우저 설치
echo "🌐 Playwright Chromium 설치..."
playwright install chromium --with-deps 2>/dev/null || playwright install chromium

# 5. .env 로드 우선순위: .env > .env.example
if [ -f ".env" ]; then
  echo "🔑 .env 파일에서 환경변수 로드..."
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
elif [ -f ".env.example" ]; then
  echo "🔑 .env.example 파일에서 환경변수 로드 (.env 파일이 없어 example 사용)..."
  # .env.example을 .env로 복사하여 이후에도 사용할 수 있게 함
  cp .env.example .env
  export $(grep -v '^#' .env.example | grep -v '^$' | xargs)
  echo "   ✅ .env.example → .env 복사 완료"
else
  echo "⚠️  .env 또는 .env.example 파일이 없습니다. GEMINI 기능이 비활성화됩니다."
fi

# 6. API 키 확인
if [ -n "$GEMINI_API_KEY" ]; then
  echo "   ✅ GEMINI_API_KEY 로드됨: ${GEMINI_API_KEY:0:12}..."
else
  echo "   ⚠️  GEMINI_API_KEY가 설정되지 않음. 6단계 페르소나 생성 불가."
fi

# 7. 서버 시작
echo "✅ 백엔드 시작: http://localhost:8000"
echo "   API 문서: http://localhost:8000/docs"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
