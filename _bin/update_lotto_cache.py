#!/usr/bin/env python3
"""
LOTTO CACHE v1.2 - 영구 경로 버전
/home/master/lotto_ops/ 에서 실행
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import sys
import os
import shutil
import tempfile
from datetime import datetime
import time

# 파일 생성 시 644 권한 보장 (웹서버 읽기 가능)
os.umask(0o022)

# ===== 영구 경로 설정 =====
OPS_DIR = "/home/master/lotto_ops"
DATA_DIR = f"{OPS_DIR}/data"
LOG_DIR = f"{OPS_DIR}/log"

# 웹 경로 (배포 대상)
WEB_DATA_DIR = "/home/master/applications/mtwpxgbeus/public_html/data"

CACHE_FILE = f"{DATA_DIR}/lotto_cache.json"
HISTORY_FILE = f"{DATA_DIR}/lotto_history.json"
WEB_CACHE_FILE = f"{WEB_DATA_DIR}/lotto_cache.json"
WEB_HISTORY_FILE = f"{WEB_DATA_DIR}/lotto_history.json"

DEBUG_HTML = os.environ.get("DEBUG_HTML", "0") == "1"

HEADERS_MOBILE = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
}

HEADERS_DESKTOP = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

STORE_FILE = f"{DATA_DIR}/store_data.json"
WEB_STORE_FILE = f"{WEB_DATA_DIR}/store_data.json"


def retry_request(url, headers, max_retries=3):
    """재시도 로직 (1s, 2s, 4s backoff)"""
    for i in range(max_retries):
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                return resp
        except Exception as e:
            print(f"  [!] 요청 실패 ({i+1}/{max_retries}): {e}")
        time.sleep(2 ** i)
    return None


def fetch_winning_stores(draw_no, rank=1):
    """동행복권 API로 당첨 판매점 조회 (rank: 1=1등, 2=2등)"""
    url = "https://www.dhlottery.co.kr/wnprchsplcsrch/selectLtWnShp.do"
    params = {
        "srchWnShpRnk": str(rank),
        "srchLtEpsd": str(draw_no),
        "srchShpLctn": "",
        "srchLtGdsCd": "LO40",
    }
    headers = {
        **HEADERS_DESKTOP,
        "Referer": "https://www.dhlottery.co.kr/wnprchsplcsrch/home",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
    }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("data", {}).get("list", [])
            stores = []
            for item in items:
                store = {
                    "name": (item.get("shpNm") or "").strip(),
                    "address": (item.get("shpAddr") or "").strip(),
                    "rank": rank,
                }
                method = (item.get("atmtPsvYnTxt") or "").strip()
                if method:
                    store["method"] = method
                if store["name"]:
                    stores.append(store)
            return stores
    except Exception as e:
        print(f"  [!] 판매점 조회 실패 (rank={rank}): {e}")
    return []


def update_store_data(draw_no):
    """회차별 1등/2등 당첨 판매점 데이터 수집 및 저장"""
    print(f"\n[판매점] {draw_no}회 당첨 판매점 조회...")

    store_data = {}
    if os.path.exists(STORE_FILE):
        try:
            with open(STORE_FILE, "r", encoding="utf-8") as f:
                store_data = json.load(f)
        except:
            pass

    rank1 = fetch_winning_stores(draw_no, rank=1)
    rank2 = fetch_winning_stores(draw_no, rank=2)

    if rank1 or rank2:
        store_data[str(draw_no)] = {
            "draw_no": draw_no,
            "rank1": rank1,
            "rank2": rank2,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        _atomic_write_json(STORE_FILE, store_data)
        print(f"  [O] 1등 판매점 {len(rank1)}곳, 2등 판매점 {len(rank2)}곳")

        # 웹 폴더로 복사
        if os.path.exists(STORE_FILE):
            shutil.copy2(STORE_FILE, WEB_STORE_FILE)
            os.chmod(WEB_STORE_FILE, 0o644)
            print(f"  [O] 웹 복사: {WEB_STORE_FILE}")
    else:
        print("  [X] 판매점 데이터 없음")


def save_debug_html(source, html):
    """디버그용 HTML 저장"""
    if DEBUG_HTML or html:
        filename = f"{DATA_DIR}/last_response_{source}.html"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  [D] {filename} 저장됨")


def save_bad_response(source, html):
    """파싱 실패 시 원문 HTML 저장 (디버깅용)"""
    filename = f"{DATA_DIR}/last_bad_response_{source}.html"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  [!] 파싱 실패 HTML 저장: {filename}")


def parse_dhlottery(draw_no=None):
    """동행복권 파싱 (현재 자동요청 차단으로 사용 불가, 참고용으로만 유지)"""
    print("[참고] 동행복권 파싱 시도... (자동요청 차단 예상)")

    if draw_no:
        url = f"https://www.dhlottery.co.kr/gameResult.do?method=byWin&drwNo={draw_no}"
    else:
        url = "https://www.dhlottery.co.kr/gameResult.do?method=byWin"

    resp = retry_request(url, HEADERS_DESKTOP, max_retries=1)
    if not resp:
        print("  [X] 동행복권 접속 실패")
        return None

    html = resp.text
    save_debug_html("dhlottery", html)

    if "errorPage" in resp.url or "gameResult.do" not in html:
        print("  [X] 동행복권: 정상 응답 아님 (차단 추정)")
        save_bad_response("dhlottery", html)
        return None

    soup = BeautifulSoup(html, "html.parser")

    try:
        parsed_draw_no = None
        draw_info = soup.find("span", class_="key_clr1")
        if draw_info:
            draw_no_match = re.search(r"(\d+)", draw_info.text)
            if draw_no_match:
                parsed_draw_no = int(draw_no_match.group(1))

        balls = soup.find_all("span", class_=re.compile(r"ball_645"))
        numbers = []
        for ball in balls:
            num_text = ball.text.strip()
            if num_text.isdigit():
                num = int(num_text)
                if 1 <= num <= 45:
                    numbers.append(num)

        if len(numbers) >= 7:
            main_numbers = sorted(numbers[:6])
            bonus = numbers[6]

            date_elem = soup.find("span", class_="desc")
            draw_date = None
            if date_elem:
                date_match = re.search(r"(\d{4})\.(\d{2})\.(\d{2})", date_elem.text)
                if date_match:
                    draw_date = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"

            return {
                "draw_no": parsed_draw_no,
                "draw_date": draw_date,
                "numbers": main_numbers,
                "bonus": bonus,
                "source": "dhlottery"
            }
    except Exception as e:
        print(f"  [X] 파싱 에러: {e}")

    return None


def parse_lotto_co_kr():
    """2순위: lotto.co.kr 메인 페이지 파싱"""
    print("[2순위] lotto.co.kr 파싱...")

    url = "https://www.lotto.co.kr/"
    resp = retry_request(url, HEADERS_DESKTOP)
    if not resp:
        print("  [X] lotto.co.kr 접속 실패")
        return None

    html = resp.text
    save_debug_html("lotto_co_kr", html)

    soup = BeautifulSoup(html, "html.parser")

    try:
        text = soup.get_text()
        draw_match = re.search(r"(\d{4})회\s*당첨결과", text)
        draw_no = int(draw_match.group(1)) if draw_match else None

        date_match = re.search(r"(\d{4}-\d{2}-\d{2})\s*추첨", text)
        draw_date = date_match.group(1) if date_match else None

        ball_imgs = soup.find_all("img", class_="ball")
        numbers = []
        bonus = None

        for img in ball_imgs:
            src = img.get("src", "")
            main_match = re.search(r"/on/(\d+)\.png", src)
            if main_match:
                num = int(main_match.group(1))
                if 1 <= num <= 45:
                    numbers.append(num)
                continue
            bonus_match = re.search(r"/bonus/(\d+)\.png", src)
            if bonus_match:
                bonus = int(bonus_match.group(1))

        if len(numbers) >= 6 and bonus:
            main_numbers = sorted(numbers[:6])
            return {
                "draw_no": draw_no,
                "draw_date": draw_date,
                "numbers": main_numbers,
                "bonus": bonus,
                "source": "lotto_co_kr"
            }
        save_bad_response("lotto_co_kr", html)
    except Exception as e:
        print(f"  [X] 파싱 에러: {e}")
        save_bad_response("lotto_co_kr", html)

    return None


def parse_lottorich():
    """3순위: lottorich.co.kr 파싱"""
    print("[3순위] lottorich.co.kr 파싱...")

    url = "https://www.lottorich.co.kr/"
    resp = retry_request(url, HEADERS_DESKTOP)
    if not resp:
        print("  [X] lottorich.co.kr 접속 실패")
        return None

    html = resp.text
    save_debug_html("lottorich", html)

    soup = BeautifulSoup(html, "html.parser")

    try:
        thistime = soup.find("p", class_="thistime")
        draw_no = None
        if thistime:
            span = thistime.find("span")
            if span and span.text.strip().isdigit():
                draw_no = int(span.text.strip())

        date_elem = soup.find("p", class_="date")
        draw_date = None
        if date_elem:
            date_match = re.search(r"(\d{4})\.(\d{2})\.(\d{2})", date_elem.text)
            if date_match:
                draw_date = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"

        times_number = soup.find("ul", class_="times_number")
        numbers = []
        bonus = None

        if times_number:
            balls = times_number.find_all("li", class_="ball")
            for i, ball in enumerate(balls):
                img = ball.find("img")
                if img and img.get("alt"):
                    alt = img.get("alt").strip()
                    if alt.isdigit():
                        num = int(alt)
                        if 1 <= num <= 45:
                            if i < 6:
                                numbers.append(num)
                            else:
                                bonus = num

        if len(numbers) >= 6 and bonus:
            main_numbers = sorted(numbers[:6])
            return {
                "draw_no": draw_no,
                "draw_date": draw_date,
                "numbers": main_numbers,
                "bonus": bonus,
                "source": "lottorich"
            }
        save_bad_response("lottorich", html)
    except Exception as e:
        print(f"  [X] 파싱 에러: {e}")
        save_bad_response("lottorich", html)

    return None


def validate_data(data):
    """데이터 유효성 검증"""
    if not data:
        return False

    numbers = data.get("numbers", [])
    bonus = data.get("bonus")

    if len(numbers) != 6:
        return False
    if not all(1 <= n <= 45 for n in numbers):
        return False
    if len(set(numbers)) != 6:
        return False
    if not bonus or not (1 <= bonus <= 45):
        return False
    if bonus in numbers:
        return False

    return True


def cross_validate(primary, backup):
    """교차 검증"""
    if not primary or not backup:
        return False

    return (
        sorted(primary["numbers"]) == sorted(backup["numbers"]) and
        primary["bonus"] == backup["bonus"]
    )


def _atomic_write_json(path: str, obj: dict):
    """원자적 JSON 저장 (tempfile + fsync)"""
    d = os.path.dirname(path) or "."
    os.makedirs(d, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=".tmp_", suffix=".json", dir=d)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
        os.chmod(path, 0o644)
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except:
            pass


def copy_to_web():
    """lotto_ops/data -> public_html/data 웹 폴더로 복사"""
    os.makedirs(WEB_DATA_DIR, exist_ok=True)

    if os.path.exists(CACHE_FILE):
        shutil.copy2(CACHE_FILE, WEB_CACHE_FILE)
        os.chmod(WEB_CACHE_FILE, 0o644)
        print(f"  [O] 웹 복사: {WEB_CACHE_FILE}")

    if os.path.exists(HISTORY_FILE):
        shutil.copy2(HISTORY_FILE, WEB_HISTORY_FILE)
        os.chmod(WEB_HISTORY_FILE, 0o644)
        print(f"  [O] 웹 복사: {WEB_HISTORY_FILE}")


def update_history(draw_data, sources_used):
    """히스토리 파일에 회차 데이터 누적 저장 (upsert)"""
    draw_no = int(draw_data["draw_no"])
    key = str(draw_no)

    history = {"meta": {}, "data": {}}
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except:
            pass

    if "data" not in history or not isinstance(history["data"], dict):
        history["data"] = {}

    updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    history["data"][key] = {
        "draw_no": draw_no,
        "draw_date": draw_data.get("draw_date"),
        "numbers": draw_data["numbers"],
        "bonus": draw_data["bonus"],
        "sources": sources_used,
        "updated_at_kst": updated_at
    }

    history["meta"]["updated_at_kst"] = updated_at
    history["meta"]["latest_draw"] = max(int(k) for k in history["data"].keys())
    history["meta"]["total_draws"] = len(history["data"])

    _atomic_write_json(HISTORY_FILE, history)

    print(f"[history] upsert OK: draw={draw_no} total={history['meta']['total_draws']}")


def update_cache(draw_no=None):
    """캐시 업데이트 메인 함수"""
    print(f"\n{'='*50}")
    print(f"로또 캐시 업데이트 시작: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*50}\n")

    # 디렉토리 생성
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(LOG_DIR, exist_ok=True)
    os.makedirs(WEB_DATA_DIR, exist_ok=True)

    # 1순위: 동행복권
    primary = parse_dhlottery(draw_no)

    if primary and validate_data(primary):
        print(f"  [O] 동행복권: {primary['numbers']} + {primary['bonus']}")
    else:
        print("  [X] 동행복권 데이터 없음 또는 유효하지 않음")
        primary = None

    # 2순위: lotto.co.kr
    backup1 = parse_lotto_co_kr()

    if backup1 and validate_data(backup1):
        print(f"  [O] lotto.co.kr: {backup1['numbers']} + {backup1['bonus']}")
    else:
        print("  [X] lotto.co.kr 데이터 없음")
        backup1 = None

    # 3순위: lottorich
    backup2 = parse_lottorich()

    if backup2 and validate_data(backup2):
        print(f"  [O] lottorich: {backup2['numbers']} + {backup2['bonus']}")
    else:
        print("  [X] lottorich 데이터 없음")
        backup2 = None

    # 교차 검증
    print(f"\n{'='*50}")
    print("교차 검증 중...")

    final_data = None
    sources_used = []

    if primary and backup1 and cross_validate(primary, backup1):
        print("  [O] 동행복권 + lotto.co.kr 일치!")
        final_data = primary
        sources_used = ["dhlottery", "lotto_co_kr"]
    elif primary and backup2 and cross_validate(primary, backup2):
        print("  [O] 동행복권 + lottorich 일치!")
        final_data = primary
        sources_used = ["dhlottery", "lottorich"]
    elif backup1 and backup2 and cross_validate(backup1, backup2):
        print("  [O] lotto.co.kr + lottorich 일치!")
        final_data = backup1
        sources_used = ["lotto_co_kr", "lottorich"]
    else:
        print("  [X] 교차검증 실패! 2개 소스 일치 필요.")
        if backup1:
            print(f"      lotto.co.kr: {backup1['numbers']} + {backup1['bonus']}")
        if backup2:
            print(f"      lottorich:   {backup2['numbers']} + {backup2['bonus']}")

    if not final_data:
        print("\n[X] 모든 소스 실패! 캐시 갱신 중단.")
        return False

    # 캐시 파일 저장
    cache_data = {
        "draw_no": final_data["draw_no"],
        "draw_date": final_data.get("draw_date"),
        "numbers": final_data["numbers"],
        "bonus": final_data["bonus"],
        "updated_at_kst": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sources": sources_used
    }

    output = {
        "meta": {
            "total_draws": cache_data["draw_no"],
            "latest_draw": cache_data["draw_no"],
            "generated_at": cache_data["updated_at_kst"],
            "version": "4.0"
        },
        "latest_draw": {
            "draw_no": cache_data["draw_no"],
            "date": cache_data["draw_date"] or datetime.now().strftime("%Y-%m-%d"),
            "numbers": cache_data["numbers"],
            "bonus": cache_data["bonus"],
            "total_sales": 0,
            "first_prize_amount": 0,
            "first_winners": 0
        },
        "statistics": {
            "number_frequency": {},
            "most_frequent_numbers": [],
            "least_frequent_numbers": []
        },
        "_meta": {
            "sources": sources_used,
            "updated_at": cache_data["updated_at_kst"]
        }
    }

    _atomic_write_json(CACHE_FILE, output)

    # 히스토리에도 누적 저장
    update_history(final_data, sources_used)

    # 웹 폴더로 복사
    copy_to_web()

    # 당첨 판매점 수집
    update_store_data(cache_data["draw_no"])

    print(f"\n{'='*50}")
    print(f"[O] 캐시 저장 완료: {CACHE_FILE}")
    print(f"    회차: {cache_data['draw_no']}")
    print(f"    번호: {cache_data['numbers']} + {cache_data['bonus']}")
    print(f"    소스: {', '.join(sources_used)}")
    print(f"{'='*50}\n")

    return True


if __name__ == "__main__":
    draw_no = None
    if len(sys.argv) > 1:
        try:
            draw_no = int(sys.argv[1])
            print(f"특정 회차 갱신: {draw_no}회")
        except ValueError:
            print("사용법: python3 update_lotto_cache.py [회차번호]")
            sys.exit(1)

    success = update_cache(draw_no)
    sys.exit(0 if success else 1)
