r"""
╔══════════════════════════════════════════════════════════════════════════════╗
║   Google Maps Review Crawler v6.0 (Hyper-Fast JS Injection)                  ║
║   Engine: Standard Selenium + JS  |  Target: 빈스얼랏 4,000건                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import time
import random
import logging
import sys
import os
import re
import pandas as pd

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.common.exceptions import StaleElementReferenceException
from webdriver_manager.chrome import ChromeDriverManager

TARGET_COUNT    = 4_000
CHROME_PORT     = 9222
OUTPUT_CSV      = os.path.join(os.path.dirname(os.path.abspath(__file__)), "beans_allot_final.csv")

SCROLL_MIN_PX, SCROLL_MAX_PX = 300, 1200
PAUSE_MIN_SEC, PAUSE_MAX_SEC = 0.5, 1.2
MAX_STALL       = 8
LOG_INTERVAL    = 100

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("HyperFastCrawler")

def connect_driver(port: int = CHROME_PORT) -> webdriver.Chrome:
    options = Options()
    options.add_experimental_option("debuggerAddress", f"127.0.0.1:{port}")
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        log.info(f"✅ 기존 브라우저 연결 성공 | 현재 탭: {driver.title[:50]}")
        return driver
    except Exception as e:
        log.critical(f"❌ 연결 실패. 디버깅 모드로 크롬이 켜져 있는지 확인하세요.\n오류: {e}")
        sys.exit(1)

def find_scrollbox(driver: webdriver.Chrome):
    XPATH_CANDIDATES = [
        "//div[@aria-label='리뷰']", "//div[@aria-label='Reviews']", 
        "//div[contains(@aria-label,'리뷰')]", "//div[@role='main']//div[@tabindex='-1']"
    ]
    for xpath in XPATH_CANDIDATES:
        try:
            els = driver.find_elements(By.XPATH, xpath)
            for el in els:
                sh = driver.execute_script("return arguments[0].scrollHeight", el)
                if sh and sh > 400: return el
        except: continue
    
    for sel in ["div.m6QErb.DxyBCb.kA9KIf.dS8AEf", "div.m6QErb"]:
        try:
            els = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in els:
                if driver.execute_script("return arguments[0].scrollHeight", el) > 400: return el
        except: continue
    return None

def human_scroll(driver: webdriver.Chrome, scrollbox) -> None:
    try:
        driver.execute_script(f"arguments[0].scrollBy(0, {random.randint(SCROLL_MIN_PX, SCROLL_MAX_PX)});", scrollbox)
    except:
        driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", scrollbox)
    time.sleep(random.uniform(PAUSE_MIN_SEC, PAUSE_MAX_SEC))

# ══════════════════════════════════════════════════════════════════════════════
#  🚀 핵심: JS Injection으로 파이썬 병목 완벽 제거
# ══════════════════════════════════════════════════════════════════════════════
def parse_reviews_js(driver: webdriver.Chrome, seen_ids: set) -> list[dict]:
    # 1. 브라우저 단에서 '더보기' 버튼 순식간에 광클
    driver.execute_script("""
        document.querySelectorAll("button.w8nwRe, button[aria-label*='더보기'], button[aria-label*='more']").forEach(b => b.click());
    """)
    time.sleep(0.3)

    # 2. 브라우저 내부 엔진(V8)을 이용해 데이터 한 번에 추출 (0.1초 컷)
    js_extractor = """
        let results = [];
        let cards = document.querySelectorAll("div.jftiEf, div[data-review-id], div.GHT2ce");
        for(let card of cards) {
            let id = card.getAttribute("data-review-id") || "";
            let reviewer = (card.querySelector("div.d4r55, span.X43Kjb") || {}).innerText || "";
            let r_el = card.querySelector("span[role='img'][aria-label], span.kvMYJc");
            let rating = r_el ? (r_el.getAttribute("aria-label") || r_el.innerText || "") : "";
            let text = (card.querySelector("span.wiI7pd, div.Jtu6Td, span[data-expandable-section]") || {}).innerText || "";
            
            if(id || reviewer || text) {
                results.push({id: id, reviewer: reviewer.trim(), rating: rating, text: text.trim()});
            }
        }
        return results;
    """
    
    raw_data = driver.execute_script(js_extractor)
    
    # 3. 파이썬에서는 중복 필터링만 빠르게 수행
    new_reviews = []
    for item in raw_data:
        rid = item.get('id', '')
        reviewer = item.get('reviewer', '')
        text = item.get('text', '')
        
        unique_key = f"id:{rid}" if rid else f"fb:{hash(reviewer + text[:30])}"
        if unique_key in seen_ids: continue
        
        seen_ids.add(unique_key)
        
        # 별점 숫자만 깔끔하게 정제
        rating_match = re.findall(r"\d+", item.get('rating', ''))
        rating = rating_match[0] if rating_match else ""
        
        new_reviews.append({
            "id": rid,
            "reviewer": reviewer,
            "rating": rating,
            "text": text.replace("\n", " ")
        })
        
    return new_reviews

def save_csv(reviews: list[dict]) -> None:
    if not reviews: return
    df = pd.DataFrame(reviews, columns=["id", "reviewer", "rating", "text"])
    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

# ══════════════════════════════════════════════════════════════════════════════
#  메인 루프
# ══════════════════════════════════════════════════════════════════════════════
def crawl(driver: webdriver.Chrome) -> list[dict]:
    all_reviews = []
    seen_ids = set()
    stall_count = 0
    start_time = time.time()

    scrollbox = find_scrollbox(driver)
    if not scrollbox: return []

    log.info(f"🚀 초고속 수집 시작 | 목표: {TARGET_COUNT:,}건")

    while len(all_reviews) < TARGET_COUNT:
        try: human_scroll(driver, scrollbox)
        except StaleElementReferenceException:
            scrollbox = find_scrollbox(driver)
            if not scrollbox: break

        new = parse_reviews_js(driver, seen_ids)
        all_reviews.extend(new)
        found = len(new)
        total = len(all_reviews)

        if total % LOG_INTERVAL < found or found > 0:
            log.info(f"⚡ {total:>5,} / {TARGET_COUNT}건 수집 완료 (+{found}건 추가됨)")

        if found == 0:
            stall_count += 1
            if stall_count >= MAX_STALL:
                log.warning(f"🔄 스크롤 갱신 대기 중... (바닥 도달 또는 지연)")
                driver.execute_script("arguments[0].scrollTop -= 500;", scrollbox)
                time.sleep(1)
                driver.execute_script("arguments[0].scrollTo(0, arguments[0].scrollHeight);", scrollbox)
                
                if stall_count > MAX_STALL * 2:
                    log.error("더 이상 새로운 데이터가 로드되지 않습니다. 종료합니다.")
                    break
        else:
            stall_count = 0

        if total > 0 and total % 500 == 0 and found > 0:
            save_csv(all_reviews)
            log.info(f"💾 중간 저장 완료: {total:,}건")

    log.info(f"🏁 크롤링 완료: 총 {len(all_reviews):,}건 수집 (소요시간: {(time.time() - start_time)/60:.1f}분)")
    return all_reviews

def main():
    print("="*60)
    print(" 🚀 Google Maps Review Crawler v6.0 (Hyper-Fast JS Engine) ")
    print("="*60)

    driver = connect_driver(CHROME_PORT)

    log.info("올바른 구글 지도 탭을 찾는 중입니다...")
    for handle in driver.window_handles:
        driver.switch_to.window(handle)
        if "빈스얼랏" in driver.title or "Google" in driver.title or "지도" in driver.title:
            log.info(f"🎯 탭 전환 완료: {driver.title}")
            break

    try:
        reviews = crawl(driver)
        if reviews:
            save_csv(reviews)
            print(f"\n✅ 최종 완료! 데이터 위치: {OUTPUT_CSV}")
    except KeyboardInterrupt:
        log.warning("⚠️ 사용자 중단 (Ctrl+C). 현재 데이터 저장 중...")
        save_csv(reviews)
    finally:
        log.info("세션 종료")

if __name__ == "__main__":
    main()