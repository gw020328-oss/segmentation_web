
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import font_manager
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
import warnings, os, re, json
warnings.filterwarnings('ignore')

# ── 한글 폰트 ──────────────────────────────────────────────────────────────────
def set_korean_font():
    candidates = [
        '/System/Library/Fonts/AppleSDGothicNeo.ttc',
        '/Library/Fonts/NanumGothic.ttf',
        '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
    ]
    for p in candidates:
        if os.path.exists(p):
            font_manager.fontManager.addfont(p)
            prop = font_manager.FontProperties(fname=p)
            plt.rcParams['font.family'] = prop.get_name()
            break
    plt.rcParams['axes.unicode_minus'] = False

set_korean_font()

OUT = '/Users/ohgyuwon/Desktop/이미지 전처리'

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 · 동적 데이터 탐색 & 전처리
# ══════════════════════════════════════════════════════════════════════════════
df = pd.read_csv(f'{OUT}/cafe_reviews_sample.csv', quotechar='"', on_bad_lines='skip', engine='python')
print("=== STEP 1: 데이터 탐색 ===")
print(df.dtypes)
print(df.head(3))

# 컬럼 자동 분류 (pandas 2.x: object or StringDtype)
text_cols   = [c for c in df.columns if str(df[c].dtype) in ('object','string') and c.lower() not in ('id','reviewer')]
meta_cols   = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c]) and c.lower() != 'id']
print(f"\n텍스트 컬럼: {text_cols}")
print(f"메타 컬럼 : {meta_cols}")

def preprocess(text):
    if not isinstance(text, str): return ''
    text = re.sub(r'[^\w\s가-힣]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip().lower()

df['clean_text'] = df['text'].apply(preprocess)

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 · 다차원 속성-감성 매트릭스
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== STEP 2: 속성-감성 매트릭스 ===")

ASPECTS = {
    '맛·음료': {
        'pos': ['맛있','맛있어','진해','부드럽','깔끔','퀄리티','원두','핸드드립','바리스타','라떼','콜드브루'],
        'neg': ['달아','약해','평범','보통']
    },
    '가격·가성비': {
        'pos': ['가성비','저렴','할인','리필','저렴해','세트'],
        'neg': ['비싸','비싸요','아쉬워']
    },
    '공간·환경': {
        'pos': ['조용','넓은','넓고','테라스','루프탑','정원','뷰','야경','전망','콘센트','와이파이'],
        'neg': ['좁아','불편','추웠','시끄러','딱딱']
    },
    '인테리어·감성': {
        'pos': ['인테리어','감성','예쁘','빈티지','조명','sns','핫플','사진'],
        'neg': []
    },
    '디저트·푸드': {
        'pos': ['케이크','디저트','마카롱','크로플','와플','티라미수','스콘','브런치','당근케이크'],
        'neg': []
    },
    '작업·공부': {
        'pos': ['공부','작업','노트북','스터디','집중','타이머','1인','무한리필','긴 영업'],
        'neg': []
    },
    '서비스': {
        'pos': ['친절','직접'],
        'neg': ['불친절','대기','웨이팅','30분']
    },
}

rows = []
for _, row in df.iterrows():
    t = row['clean_text']
    feat = {'id': row['id'], 'reviewer': row['reviewer'], 'rating': row['rating']}
    for asp, kw in ASPECTS.items():
        pos = sum(1 for w in kw['pos'] if w in t)
        neg = sum(1 for w in kw['neg'] if w in t)
        feat[f'{asp}_score'] = pos - neg
        feat[f'{asp}_mentioned'] = int(pos > 0 or neg > 0)
    rows.append(feat)

feat_df = pd.DataFrame(rows)
score_cols = [c for c in feat_df.columns if c.endswith('_score')]
print(feat_df[score_cols].describe().round(2))

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 · 최적 군집 수 결정 & 클러스터링
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== STEP 3: Smart Clustering ===")

X = feat_df[score_cols].values
X_scaled = StandardScaler().fit_transform(X)

sil_scores = {}
for k in range(2, 7):
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(X_scaled)
    sil_scores[k] = silhouette_score(X_scaled, labels)
    print(f"  k={k} → silhouette={sil_scores[k]:.4f}")

best_k = max(sil_scores, key=sil_scores.get)
print(f"\n최적 k = {best_k}")

km_final = KMeans(n_clusters=best_k, random_state=42, n_init=10)
feat_df['cluster'] = km_final.fit_predict(X_scaled)

pca = PCA(n_components=2, random_state=42)
X_pca = pca.fit_transform(X_scaled)
feat_df['pc1'] = X_pca[:, 0]
feat_df['pc2'] = X_pca[:, 1]

# 실루엣 점수 그래프
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
axes[0].plot(list(sil_scores.keys()), list(sil_scores.values()), 'o-', color='#6C63FF', lw=2)
axes[0].axvline(best_k, color='#FF6584', ls='--', label=f'최적 k={best_k}')
axes[0].set_xlabel('클러스터 수 (k)'); axes[0].set_ylabel('실루엣 점수')
axes[0].set_title('최적 클러스터 수 탐색'); axes[0].legend(); axes[0].grid(alpha=.3)

# PCA 산점도
PALETTE = ['#6C63FF','#FF6584','#43D9AD','#FFB347','#4FC3F7','#F97316','#A78BFA','#34D399']
for c in range(best_k):
    mask = feat_df['cluster'] == c
    axes[1].scatter(feat_df.loc[mask,'pc1'], feat_df.loc[mask,'pc2'],
                    color=PALETTE[c], s=90, alpha=.85, edgecolors='white', lw=.5, label=f'Cluster {c}')
axes[1].set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]*100:.1f}%)')
axes[1].set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]*100:.1f}%)')
axes[1].set_title('PCA 군집 시각화'); axes[1].legend(); axes[1].grid(alpha=.2)
plt.tight_layout()
plt.savefig(f'{OUT}/cluster_pca.png', dpi=150, bbox_inches='tight')
plt.close()
print("✓ cluster_pca.png 저장")

# 히트맵
cluster_profile = feat_df.groupby('cluster')[score_cols].mean().round(2)
cluster_profile.columns = [c.replace('_score','') for c in score_cols]
fig, ax = plt.subplots(figsize=(10, best_k + 1))
sns.heatmap(cluster_profile, annot=True, fmt='.2f', cmap='RdYlGn',
            center=0, linewidths=.5, ax=ax, cbar_kws={'label':'감성 점수'})
ax.set_title('클러스터별 속성 감성 히트맵')
ax.set_ylabel('클러스터'); ax.set_xlabel('속성')
plt.tight_layout()
plt.savefig(f'{OUT}/cluster_heatmap.png', dpi=150, bbox_inches='tight')
plt.close()
print("✓ cluster_heatmap.png 저장")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 · 페르소나 설계 & 시스템 프롬프트 생성
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== STEP 4: 페르소나 설계 ===")

PERSONA_TEMPLATES = {
    # 각 클러스터를 프로파일링할 때 사용할 매핑
}

def build_persona(cid, profile_series, members):
    scores = profile_series.to_dict()
    sorted_asp = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_pos = [a for a, v in sorted_asp if v > 0][:3]
    top_neg = [a for a, v in sorted_asp if v < 0][:2]
    avg_rating = feat_df[feat_df['cluster']==cid]['rating'].mean()
    n = len(members)

    # 페르소나 이름 규칙
    label_map = {'맛·음료':'커피 미식가','가격·가성비':'가성비 추구형',
                 '공간·환경':'공간 중시형','인테리어·감성':'감성 탐험가',
                 '디저트·푸드':'디저트 러버','작업·공부':'생산성 추구형','서비스':'서비스 민감형'}
    persona_name = label_map.get(top_pos[0], '복합 니즈형') if top_pos else '복합 니즈형'

    pain_points = [f"{a} 부정 경험" for a in top_neg] if top_neg else ["없음 (전반적 만족)"]
    key_values  = top_pos if top_pos else ["다양한 요소 균형"]

    system_prompt = f"""[System Persona Instruction – Cluster {cid}: {persona_name}]

당신은 '{persona_name}' 유형의 카페 이용자입니다.

▶ 핵심 특성
- 평균 평점: {avg_rating:.1f}/5.0 | 리뷰어 수: {n}명
- 가장 중시하는 가치: {', '.join(key_values)}
- 주요 Pain Point: {', '.join(pain_points)}

▶ 행동 패턴
- 카페를 선택할 때 {top_pos[0] if top_pos else '전반적 경험'}을 가장 먼저 고려합니다.
- 리뷰를 남길 때 {top_pos[1] if len(top_pos)>1 else '방문 경험'}에 대해 구체적으로 언급합니다.
- {'가격 민감도가 높아 가성비를 꼼꼼히 따집니다.' if '가격·가성비' in top_pos else '가격보다 경험의 질을 우선합니다.'}

▶ 커뮤니케이션 지침
- 이 페르소나에게 말할 때는 {top_pos[0] if top_pos else '전반적 만족도'}와 관련된 구체적 정보를 제공하세요.
- Pain Point({', '.join(pain_points)})를 해결하는 솔루션을 강조하세요.
- 추천 마케팅 채널: {'SNS/인스타그램' if '인테리어·감성' in top_pos else '커뮤니티/블로그 리뷰'}
"""
    return {
        'cluster_id': cid,
        'persona_name': persona_name,
        'size': n,
        'avg_rating': round(avg_rating, 2),
        'key_values': key_values,
        'pain_points': pain_points,
        'system_prompt': system_prompt,
    }

personas = []
for cid in range(best_k):
    members = feat_df[feat_df['cluster']==cid]
    profile = cluster_profile.loc[cid]
    p = build_persona(cid, profile, members)
    personas.append(p)
    print(f"\n{'='*60}")
    print(p['system_prompt'])

# JSON 저장
with open(f'{OUT}/personas.json', 'w', encoding='utf-8') as f:
    json.dump(personas, f, ensure_ascii=False, indent=2)
print(f"\n✓ personas.json 저장 ({best_k}개 페르소나)")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 · 확장성 로드맵 출력
# ══════════════════════════════════════════════════════════════════════════════
roadmap = """
╔══════════════════════════════════════════════════════════════════════════════╗
║           STEP 5 · 시스템 확장성 로드맵 (Automation & Scaling)              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Phase 1 · 신규 리뷰 데이터 자동 통합
  ├─ pipeline.py의 ASPECTS 사전만 업데이트 → 새 도메인 즉시 대응
  ├─ CSV / JSON / DB 커넥터 추상화 (DataLoader 클래스 분리)
  └─ 클러스터 라벨 재학습 없이 기존 모델에 predict() 적용 가능

Phase 2 · 이미지 데이터(인테리어 사진) 연동
  ├─ ResNet/CLIP으로 이미지 임베딩 추출 → 512-dim 벡터
  ├─ 텍스트 TF-IDF/SBERT 임베딩과 Concat → 멀티모달 피처 행렬
  └─ 동일 KMeans/HDBSCAN 파이프라인에 투입 → 시각적 감성까지 포함한 페르소나

Phase 3 · LLM 연동 고도화
  ├─ personas.json → GPT/Gemini System Prompt 자동 주입
  ├─ 페르소나별 챗봇 에이전트 분기 라우팅
  └─ A/B 테스트: 페르소나 맞춤 마케팅 카피 자동 생성 & 성과 측정

Phase 4 · MLOps & 실시간 파이프라인
  ├─ Apache Airflow DAG: 주 1회 데이터 수집 → 전처리 → 재클러스터링
  ├─ MLflow로 모델 버전 관리 (실루엣 점수 트래킹)
  └─ FastAPI 엔드포인트: POST /segment → 실시간 단일 리뷰 페르소나 분류

핵심 재사용 원칙
  · ASPECTS 사전 교체만으로 식당 / 호텔 / 쇼핑몰 등 타 도메인 전환
  · X_scaled, pca, km_final 객체를 joblib.dump()로 직렬화 → 서빙 재사용
  · personas.json 포맷 고정으로 타 에이전트와 계약(Contract) 유지
"""
print(roadmap)

print("\n✅ 파이프라인 완료! 생성 파일:")
print(f"  · {OUT}/cluster_pca.png")
print(f"  · {OUT}/cluster_heatmap.png")
print(f"  · {OUT}/personas.json")
