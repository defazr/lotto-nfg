#!/usr/bin/env python3
"""
로또 당첨번호 분석 글 자동 드래프트 발행 (fazr.co.kr)
- 데이터: lotto_cache.json + store_data.json (단일 진실 소스)
- AI: Claude (도입/분석/마무리만), 숫자/리스트는 템플릿
- 이미지: Gemini 3 Pro
- 발행: WP REST API → draft
"""

import json
import os
import sys
import re
import base64
import argparse
from datetime import datetime

import requests
import anthropic
from google import genai
from google.genai import types

# ===== 환경변수 로드 =====
def load_env(env_path=None):
    """간단한 .env 로더"""
    if env_path is None:
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip())

load_env()

# 서버용 .env 경로
load_env("/home/master/lotto_ops/.env")

WP_URL = os.environ.get("WORDPRESS_URL_FAZR", "").rstrip("/")
WP_USER = os.environ.get("WORDPRESS_USERNAME_FAZR", "")
WP_PASS = os.environ.get("WORDPRESS_PASSWORD_FAZR", "")
WP_CATEGORY = int(os.environ.get("WORDPRESS_CATEGORY_ID_FAZR", "5093"))
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")

# ===== 데이터 경로 =====
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)

# 로컬 또는 서버 경로 자동 감지
if os.path.exists(os.path.join(PROJECT_DIR, "public/data/lotto_cache.json")):
    DATA_DIR = os.path.join(PROJECT_DIR, "public/data")
elif os.path.exists("/home/master/lotto_ops/data/lotto_cache.json"):
    DATA_DIR = "/home/master/lotto_ops/data"
else:
    DATA_DIR = os.path.join(PROJECT_DIR, "public/data")


def load_lotto_data(draw_no=None):
    """lotto_cache.json + store_data.json에서 데이터 로드"""
    with open(os.path.join(DATA_DIR, "lotto_cache.json"), "r", encoding="utf-8") as f:
        cache = json.load(f)

    latest = cache.get("latest_draw", {})
    if draw_no is None:
        draw_no = latest.get("draw_no")

    # 히스토리에서 해당 회차 데이터 가져오기
    history_path = os.path.join(DATA_DIR, "lotto_history.json")
    draw_data = None
    if os.path.exists(history_path):
        with open(history_path, "r", encoding="utf-8") as f:
            history = json.load(f)
        draw_data = history.get("data", {}).get(str(draw_no))

    if draw_data is None and draw_no == latest.get("draw_no"):
        draw_data = latest
    elif draw_data is None:
        print(f"[X] {draw_no}회 데이터가 존재하지 않습니다. 수집이 완료됐는지 확인하세요.")
        sys.exit(1)

    # 판매점 데이터
    store_path = os.path.join(DATA_DIR, "store_data.json")
    stores = None
    if os.path.exists(store_path):
        with open(store_path, "r", encoding="utf-8") as f:
            store_all = json.load(f)
        stores = store_all.get(str(draw_no))

    return {
        "draw_no": draw_no,
        "numbers": draw_data.get("numbers", []),
        "bonus": draw_data.get("bonus"),
        "date": draw_data.get("draw_date") or draw_data.get("date", ""),
        "stores": stores,
    }


def build_focus_keyword():
    """포커스 키워드 (회차 제외, 트래픽형)"""
    return "로또 명당"


def build_title(data):
    """폴백 제목: 로또 명당으로 시작 + 회차"""
    draw_no = data["draw_no"]
    rank1_count = 0
    if data["stores"]:
        rank1_count = len(data["stores"].get("rank1", []))
    numbers_str = ", ".join(map(str, data["numbers"]))
    return f"로또 명당 {draw_no}회 당첨번호 {numbers_str} 판매점 {rank1_count}곳 분석"


def build_slug(data):
    draw_no = data["draw_no"]
    return f"{draw_no}회-로또-명당-당첨-판매점-분석"


def build_tags(data):
    draw_no = data["draw_no"]
    return [
        "로또", "로또 명당", "당첨 판매점", "로또 1등", "복권",
        f"{draw_no}회 로또 당첨번호",
    ]


def numbers_to_html(numbers, bonus):
    """당첨번호를 HTML 테이블로"""
    def ball_color(n):
        if n <= 10: return "#fbc400"
        if n <= 20: return "#69c8f2"
        if n <= 30: return "#ff7272"
        if n <= 40: return "#aaa"
        return "#b0d840"

    balls_html = ""
    for n in numbers:
        color = ball_color(n)
        balls_html += (
            f'<span style="display:inline-block;width:38px;height:38px;'
            f'line-height:38px;border-radius:50%;background:{color};'
            f'color:#fff;text-align:center;font-weight:700;font-size:16px;'
            f'margin:0 3px;">{n}</span>'
        )
    balls_html += (
        f' <span style="font-size:20px;margin:0 6px;">+</span> '
        f'<span style="display:inline-block;width:38px;height:38px;'
        f'line-height:38px;border-radius:50%;background:{ball_color(bonus)};'
        f'color:#fff;text-align:center;font-weight:700;font-size:16px;'
        f'margin:0 3px;">{bonus}</span>'
    )
    return f'<div style="text-align:center;margin:20px 0;">{balls_html}</div>'


def store_card_html(s, show_map=True):
    """판매점 1개를 카드 HTML로 변환"""
    clean_addr = re.sub(r'\([^)]*\)', '', s['address']).strip()
    map_url = f"https://map.kakao.com/?q={requests.utils.quote(clean_addr)}"
    method = s.get("method", "")
    count_str = f" ({s['count']}건)" if s.get("count", 1) > 1 else ""

    # 배지 색상
    badge_colors = {"자동": "#4a90d9", "수동": "#e67e22", "반자동": "#27ae60"}
    badge_bg = badge_colors.get(method, "#888")

    card = (
        f'<div style="background:#1a1a2e;border-radius:10px;padding:16px;margin:0 0 12px 0;">'
        f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        f'<strong style="font-size:15px;color:#fff;">{s["name"]}{count_str}</strong>'
    )
    if method:
        card += (
            f'<span style="display:inline-block;background:{badge_bg};color:#fff;'
            f'font-size:12px;padding:3px 10px;border-radius:12px;">{method}</span>'
        )
    card += '</div>'
    card += (
        f'<p style="font-size:13px;color:#ccc;margin:0 0 12px 0;'
        f'line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;'
        f'-webkit-box-orient:vertical;overflow:hidden;">{s["address"]}</p>'
    )
    if show_map:
        card += (
            f'<a href="{map_url}" target="_blank" rel="noopener noreferrer" '
            f'style="display:block;background:#e74c3c;color:#fff;text-align:center;'
            f'padding:12px 0;border-radius:8px;font-size:14px;font-weight:700;'
            f'text-decoration:none;min-height:44px;line-height:20px;">'
            f'📍 지도 열기</a>'
        )
    card += '</div>'
    return card


def stores_to_html(stores):
    """판매점 리스트를 카드형 HTML로"""
    if not stores:
        return ""

    rank1 = stores.get("rank1", [])
    rank2 = stores.get("rank2", [])

    # 중복 제거
    def dedupe(store_list):
        seen = {}
        for s in store_list:
            key = f"{s['name']}|{s['address']}"
            if key in seen:
                seen[key]["count"] = seen[key].get("count", 1) + 1
            else:
                seen[key] = {**s, "count": 1}
        return list(seen.values())

    # 온라인 판매점 제외
    def is_physical(s):
        return s["name"] != "인터넷 복권판매사이트"

    html = ""

    if rank1:
        physical = [s for s in dedupe(rank1) if is_physical(s)]
        online_count = len([s for s in rank1 if not is_physical(s)])

        html += f"<h3>1등 당첨 판매점 ({len(rank1)}곳)</h3>\n"
        for s in sorted(physical, key=lambda x: x["address"]):
            html += store_card_html(s, show_map=True) + "\n"

        if online_count > 0:
            html += f'<p style="font-size:13px;color:#888;">+ 인터넷 복권판매사이트(동행복권) {online_count}건</p>\n'

    if rank2:
        physical2 = [s for s in dedupe(rank2) if is_physical(s)]
        html += f"\n<h3>2등 당첨 판매점 ({len(rank2)}곳)</h3>\n"
        if len(physical2) > 10:
            html += f'<p>2등 당첨 판매점은 총 {len(rank2)}곳입니다. '
            html += f'<a href="https://www.dhlottery.co.kr/wnprchsplcsrch/home" target="_blank" rel="noopener noreferrer">동행복권에서 전체 목록 확인</a></p>\n'
        else:
            for s in sorted(physical2, key=lambda x: x["address"]):
                html += store_card_html(s, show_map=False) + "\n"

    return html


def analyze_numbers(numbers):
    """번호 기본 분석 (템플릿)"""
    odd = sum(1 for n in numbers if n % 2 == 1)
    even = 6 - odd

    ranges = {"1~10": 0, "11~20": 0, "21~30": 0, "31~40": 0, "41~45": 0}
    for n in numbers:
        if n <= 10: ranges["1~10"] += 1
        elif n <= 20: ranges["11~20"] += 1
        elif n <= 30: ranges["21~30"] += 1
        elif n <= 40: ranges["31~40"] += 1
        else: ranges["41~45"] += 1

    total = sum(numbers)
    consecutive = []
    for i in range(len(numbers) - 1):
        if numbers[i + 1] - numbers[i] == 1:
            consecutive.append((numbers[i], numbers[i + 1]))

    range_summary = ", ".join(f"{k}: {v}개" for k, v in ranges.items() if v > 0)

    return {
        "odd": odd,
        "even": even,
        "total": total,
        "ranges": range_summary,
        "consecutive": consecutive,
    }


def generate_ai_text(data, analysis):
    """Claude로 도입/분석/마무리 생성"""
    if not ANTHROPIC_KEY:
        return generate_fallback_text(data, analysis)

    draw_no = data["draw_no"]
    numbers = data["numbers"]
    bonus = data["bonus"]
    date = data["date"]
    rank1 = data["stores"].get("rank1", []) if data["stores"] else []
    physical_stores = [s for s in rank1 if s["name"] != "인터넷 복권판매사이트"]

    # 지역 요약
    regions = {}
    for s in physical_stores:
        region = s["address"].split()[0] if s["address"] else "기타"
        regions[region] = regions.get(region, 0) + 1
    region_summary = ", ".join(f"{k} {v}곳" for k, v in sorted(regions.items(), key=lambda x: -x[1]))

    auto_count = sum(1 for s in physical_stores if s.get("method") == "자동")
    manual_count = sum(1 for s in physical_stores if s.get("method") == "수동")
    semi_count = sum(1 for s in physical_stores if s.get("method") == "반자동")

    prompt = f"""로또 당첨번호 분석 블로그 글의 제목과 본문을 작성해주세요. 본문은 700단어 이상이어야 합니다.

데이터 (절대 변경 금지, 이 숫자 그대로 사용):
- 회차: {draw_no}회
- 추첨일: {date}
- 당첨번호: {numbers} + 보너스 {bonus}
- 홀짝: 홀수 {analysis['odd']}개, 짝수 {analysis['even']}개
- 번호 합계: {analysis['total']}
- 구간별: {analysis['ranges']}
- 연속번호: {analysis['consecutive'] if analysis['consecutive'] else '없음'}
- 1등 판매점: {len(physical_stores)}곳 (자동 {auto_count}, 수동 {manual_count}, 반자동 {semi_count})
- 판매점 지역: {region_summary}

아래 3개 섹션을 작성하세요.

[도입]
3~4문단, 문단당 2-3문장. 이번 회차 추첨 결과를 자연스럽게 소개합니다. 추첨일과 분위기를 묘사하고, 당첨번호를 명시하세요. 로또 명당에 대한 관심을 자연스럽게 언급하세요. 이번 회차의 특징을 간략히 예고하세요.

[분석]
3~4문단, 문단당 2-3문장. 번호 패턴(홀짝, 구간, 연속번호)을 상세히 해석합니다. 숫자는 위 데이터를 그대로 인용하세요. 각 번호의 구간 분포를 설명하고, 연속번호 여부와 의미를 분석하세요. 번호 합계가 평균 범위(100-175) 대비 어떤지 언급하세요. 이전 회차와의 차이점이나 흥미로운 점을 덧붙이세요.

[마무리]
3~4문단, 문단당 2-3문장. 판매점 지역 분포를 상세히 다루세요. 자동/수동 비율과 그 의미를 설명하세요. 로또 명당이 특정 지역에 집중되는 경향이 있는지 언급하세요. 다음 회차에 대한 기대감으로 마무리하세요.

규칙:
- 각 섹션을 [도입], [분석], [마무리]로 시작하세요
- 문단 사이에 빈 줄을 넣으세요
- "로또 명당"을 전체에서 5~8회 자연스럽게 사용 (같은 문단에서 2회 반복 금지)
- 서브 키워드도 자연스럽게: "로또 당첨 판매점", "로또 1등 판매점", "로또 당첨번호", "당첨번호 분석"
- "{draw_no}회"는 본문에서 자연스럽게 2~3회 사용
- 숫자를 절대 만들거나 변경하지 마세요
- 존댓말로 작성하세요
- 풍부하고 자연스러운 문체로 작성하세요"""

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text

        sections = {"intro": "", "analysis": "", "closing": ""}
        current = None
        for line in text.split("\n"):
            if "[도입]" in line:
                current = "intro"
                line = line.replace("[도입]", "").strip()
            elif "[분석]" in line:
                current = "analysis"
                line = line.replace("[분석]", "").strip()
            elif "[마무리]" in line:
                current = "closing"
                line = line.replace("[마무리]", "").strip()
            if current and line.strip():
                stripped = line.strip()
                # 1단: ## 또는 ### 또는 빈 #만 있는 라인 제거
                if re.match(r'^#{1,6}\s*$', stripped):
                    continue
                # 문단 시작에 붙은 ## 제거
                clean = re.sub(r'^#{1,6}\s+', '', stripped).strip()
                # ** 볼드 마크다운도 제거
                clean = clean.lstrip("*").strip()
                if clean:
                    sections[current] += clean + "\n\n"

        return {k: v.strip() for k, v in sections.items()}
    except Exception as e:
        print(f"  [!] Claude API 오류: {e}")
        return generate_fallback_text(data, analysis)


def generate_ai_title(data):
    """Claude로 제목만 별도 호출"""
    if not ANTHROPIC_KEY:
        return None

    draw_no = data["draw_no"]
    rank1 = data["stores"].get("rank1", []) if data["stores"] else []
    physical = [s for s in rank1 if s["name"] != "인터넷 복권판매사이트"]
    regions = {}
    for s in physical:
        region = s["address"].split()[0] if s["address"] else "기타"
        regions[region] = regions.get(region, 0) + 1
    top_region = max(regions, key=regions.get) if regions else ""
    auto_count = sum(1 for s in physical if s.get("method") == "자동")
    analysis = analyze_numbers(data["numbers"])

    numbers_str = ", ".join(map(str, data["numbers"]))
    prompt = (
        f"로또 블로그 글 제목을 1개만 작성하세요.\n\n"
        f"데이터: {draw_no}회, 당첨번호 {numbers_str} + {data['bonus']}, "
        f"1등 {len(physical)}곳, 최다 지역 {top_region} {regions.get(top_region, 0)}곳, "
        f"자동 {auto_count}곳, 홀수 {analysis['odd']}개 짝수 {analysis['even']}개, 합계 {analysis['total']}\n\n"
        f"규칙:\n"
        f"- 반드시 \"로또 명당\"으로 시작\n"
        f"- 제목에 다음 키워드 반드시 포함: 로또 명당, {draw_no}회, 당첨번호, 판매점\n"
        f"- \"당첨점\" 금지, 반드시 \"판매점\" 사용\n"
        f"- 55자 이내, 한 줄\n"
        f"- 순수 텍스트만 (마크다운 금지, # 금지)\n"
        f"- 이번 회차 데이터 특징을 반영해 매력적으로\n\n"
        f"제목만 출력하세요."
    )

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )
        title = response.content[0].text.strip().lstrip("#*").strip()
        required = ["로또 명당", f"{draw_no}회", "당첨번호", "판매점"]
        if title and all(kw in title for kw in required):
            return title
        elif title and "로또 명당" in title:
            print(f"  [!] 필수 키워드 누락, 폴백 사용 (AI: {title})")
            return None
    except Exception as e:
        print(f"  [!] 제목 생성 오류: {e}")

    return None


def generate_fallback_text(data, analysis):
    """AI 실패 시 템플릿 텍스트"""
    draw_no = data["draw_no"]
    numbers = data["numbers"]
    bonus = data["bonus"]
    date = data["date"]

    intro = (
        f"{draw_no}회 로또 추첨이 {date}에 진행되었습니다. "
        f"이번 회차 당첨번호와 함께 로또 명당으로 주목받는 1등 판매점을 정리했습니다.\n\n"
        f"당첨번호는 {', '.join(map(str, numbers))}이며 보너스 번호는 {bonus}입니다."
    )

    analysis_text = (
        f"이번 회차는 홀수 {analysis['odd']}개, 짝수 {analysis['even']}개 조합이 나왔습니다. "
        f"번호 합계는 {analysis['total']}이며, 구간별 분포는 {analysis['ranges']}입니다.\n\n"
    )
    if analysis["consecutive"]:
        pairs = ", ".join(f"{a}-{b}" for a, b in analysis["consecutive"])
        analysis_text += f"연속번호 {pairs}가 포함되어 있습니다."
    else:
        analysis_text += "이번 회차에는 연속번호가 없었습니다."

    closing = (
        f"{draw_no}회 당첨 판매점 정보를 확인하고 로또 명당을 참고해보세요.\n\n"
        f"다음 회차에도 좋은 결과가 있기를 바랍니다."
    )

    return {"intro": intro, "analysis": analysis_text, "closing": closing}


def generate_image(data):
    """Gemini로 대표 이미지 생성"""
    if not GEMINI_KEY:
        print("  [!] Gemini API 키 없음, 이미지 생략")
        return None

    draw_no = data["draw_no"]
    numbers = data["numbers"]
    nums = numbers
    date_str = data.get("date", "").replace("-", ".")
    bonus = data["bonus"]

    # 공통 번호 표시 부분
    balls_desc = (
        f'a large, bright digital screen clearly displays the winning numbers as lotto balls: '
        f'six yellow circular balls with black numbers '
        f'"{nums[0]}", "{nums[1]}", "{nums[2]}", "{nums[3]}", "{nums[4]}", "{nums[5]}", '
        f'followed by a plus sign "+" and one red circular ball with the number "{bonus}".'
    )
    banner_desc = (
        f'a large red banner with white Korean text that reads EXACTLY: '
        f'"제{draw_no}회 로또 당첨 판매점 - {date_str} 추첨".'
    )

    templates = [
        # 0: 전통 복권방 실내, 축하 분위기
        (
            f'A candid, wide-angle documentary photograph inside a bustling, celebratory '
            f'South Korean lottery retailer shop. Confetti is flying in the air, and a crowd '
            f'of excited people are cheering and holding lottery tickets. Hanging prominently '
            f'from the ceiling is {banner_desc} Below the banner, {balls_desc} '
            f'The shop is brightly lit with fluorescent lights.'
        ),
        # 1: 밤 거리 네온, 복권방 간판, 군중
        (
            f'A cinematic night street photograph in a vibrant South Korean city. Colorful neon signs '
            f'glow along a busy street. In the center, a lottery shop with a bright illuminated sign '
            f'reading "로또 명당". Above the entrance, {banner_desc} Inside the shop window, '
            f'{balls_desc} A small crowd gathers outside, some holding lottery tickets excitedly.'
        ),
        # 2: 신문 1면 느낌 그래픽 스타일
        (
            f'A dramatic front-page newspaper style graphic photograph. Bold headline banner at the top '
            f'with {banner_desc} Below the headline, {balls_desc} '
            f'The background shows a montage of celebrating Korean people and a lottery shop exterior. '
            f'Professional press photography style with high contrast and vivid colors.'
        ),
        # 3: 깔끔한 인포그래픽, 볼+배너+키워드
        (
            f'A clean, polished studio photograph of an official lottery results display. '
            f'At the top, {banner_desc} In the center on a reflective dark surface, {balls_desc} '
            f'The background is a smooth gradient of deep navy blue and gold bokeh lights. '
            f'Premium advertisement quality, ultra sharp focus.'
        ),
        # 4: 당첨 인증 게시판 클로즈업
        (
            f'A close-up documentary photograph of a Korean lottery shop bulletin board covered with '
            f'winner certificates and congratulation notes. Prominently displayed at the center is '
            f'{banner_desc} Next to the banner, a digital display shows {balls_desc} '
            f'Red and gold decorations surround the board. Warm indoor lighting.'
        ),
    ]

    template_idx = draw_no % 5
    prompt = templates[template_idx] + " Image size 1024x612 pixels wide format."

    try:
        client = genai.Client(api_key=GEMINI_KEY)
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )

        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data and part.inline_data.mime_type.startswith("image/"):
                return {
                    "data": part.inline_data.data,
                    "mime_type": part.inline_data.mime_type,
                }
    except Exception as e:
        print(f"  [!] Gemini 이미지 생성 실패: {e}")

    return None


def upload_wp_image(image_data, filename, mime_type, caption=""):
    """WP 미디어 라이브러리에 이미지 업로드"""
    url = f"{WP_URL}/wp-json/wp/v2/media"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": mime_type,
    }
    resp = requests.post(
        url,
        data=image_data,
        headers=headers,
        auth=(WP_USER, WP_PASS),
    )
    if resp.status_code in (200, 201):
        media = resp.json()
        media_id = media["id"]
        media_url = media.get("source_url", "")

        # 캡션 + alt에 포커스 키워드 포함
        if caption:
            requests.post(
                f"{url}/{media_id}",
                json={"caption": caption, "alt_text": caption},
                auth=(WP_USER, WP_PASS),
            )
        return media_id, media_url
    else:
        print(f"  [!] 이미지 업로드 실패: {resp.status_code} {resp.text[:200]}")
        return None, None


def get_or_create_tag(tag_name):
    """WP 태그 조회 또는 생성"""
    url = f"{WP_URL}/wp-json/wp/v2/tags"
    resp = requests.get(url, params={"search": tag_name}, auth=(WP_USER, WP_PASS))
    if resp.status_code == 200:
        tags = resp.json()
        for t in tags:
            if t["name"].lower() == tag_name.lower():
                return t["id"]

    # 생성
    resp = requests.post(url, json={"name": tag_name}, auth=(WP_USER, WP_PASS))
    if resp.status_code in (200, 201):
        return resp.json()["id"]
    return None


def build_html_body(data, ai_text, image_id=None, image_url=None):
    """최종 HTML 본문 조립"""
    draw_no = data["draw_no"]
    numbers = data["numbers"]
    bonus = data["bonus"]
    analysis = analyze_numbers(numbers)
    focus_kw = build_focus_keyword()
    lotto_url = f"https://lotto.newsforgreens.com/draw/{draw_no}/"
    lotto_home = "https://lotto.newsforgreens.com/"

    html = ""

    # 도입
    for para in ai_text["intro"].split("\n\n"):
        if para.strip():
            html += f"<p>{para.strip()}</p>\n\n"

    # 대표 이미지 본문 삽입 (alt + 캡션에 포커스 키워드)
    if image_id and image_url:
        html += f'<figure class="wp-block-image size-large" style="text-align:center;">'
        html += f'<img src="{image_url}" alt="{draw_no}회 로또 당첨 판매점 명당 위치 안내" />'
        html += f'<figcaption style="text-align:center;">{draw_no}회 로또 당첨 판매점 - 1등 {focus_kw} 위치 안내</figcaption>'
        html += f'</figure>\n\n'

    # 당첨번호
    html += f"<h2>{draw_no}회 로또 당첨번호</h2>\n"
    html += numbers_to_html(numbers, bonus) + "\n"
    nums_str = ", ".join(map(str, numbers))
    html += f"<p>{draw_no}회 로또 당첨번호는 <strong>{nums_str}</strong>이며, 보너스 번호는 <strong>{bonus}</strong>입니다. "
    html += f'자세한 회차별 통계는 <a href="{lotto_url}" target="_blank" rel="noopener noreferrer">{draw_no}회 상세 분석 페이지</a>에서 확인할 수 있습니다.</p>\n\n'

    # 번호 분석
    html += f"<h2>{draw_no}회 번호 패턴 분석</h2>\n"
    for para in ai_text["analysis"].split("\n\n"):
        if para.strip():
            html += f"<p>{para.strip()}</p>\n\n"

    # 번호 분석 요약 — 2열 다크 카드 (판매점 카드 톤 통일)
    consec_str = ", ".join(f"{a}-{b}" for a, b in analysis["consecutive"]) if analysis["consecutive"] else "없음"
    items = [
        ("홀짝 비율", f"홀수 {analysis['odd']} : 짝수 {analysis['even']}"),
        ("번호 합계", str(analysis["total"])),
        ("구간 분포", analysis["ranges"]),
        ("연속번호", consec_str),
    ]
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:16px 0;">\n'
    for label, value in items:
        html += (
            f'<div style="background:#1a1a2e;border-radius:12px;padding:16px;">'
            f'<div style="font-size:12px;font-weight:500;color:#9ca3af;margin-bottom:6px;">{label}</div>'
            f'<div style="font-size:18px;font-weight:800;color:#fff;">{value}</div>'
            f'</div>\n'
        )
    html += '</div>\n\n'

    # 판매점
    stores_html = stores_to_html(data["stores"])
    if stores_html:
        html += f"<h2>{draw_no}회 로또 당첨 판매점: 1등 {focus_kw}은 어디?</h2>\n"
        html += f"<p>이번 {draw_no}회 {focus_kw}은 어디일까요? 아래에서 1등 배출 매장의 위치와 자동/수동 정보를 확인하세요.</p>\n\n"
        html += stores_html + "\n"

    # 내부 링크 (WP REST API로 카테고리 최근 글 검색)
    prev_link_html = ""
    try:
        resp = requests.get(
            f"{WP_URL}/wp-json/wp/v2/posts",
            params={"categories": WP_CATEGORY, "per_page": 5, "status": "publish,draft"},
            auth=(WP_USER, WP_PASS),
            timeout=10,
        )
        if resp.status_code == 200:
            posts = resp.json()
            for p in posts:
                title_text = p["title"]["rendered"].strip()
                # 빈 제목, #만 있는 제목 스킵
                clean_title = title_text.lstrip("#* ").strip()
                if not clean_title or clean_title in ["#", "##"]:
                    continue
                # 현재 회차가 아닌 글 중 첫 번째
                if str(draw_no) not in clean_title:
                    # 제목에서 회차 번호 추출해 짧은 링크 텍스트 생성
                    import re as _re
                    m = _re.search(r'(\d{4})회', clean_title)
                    short_label = f"{m.group(1)}회 로또 명당 분석글" if m else "이전 회차 분석글"
                    prev_link_html = f'지난 <a href="{p["link"]}">{short_label}</a>과 비교해보면 이번 회차의 당첨 판매점 분포가 어떻게 달라졌는지 확인할 수 있습니다. '
                    break
    except Exception:
        pass

    html += f"<h2>로또 당첨번호 더 알아보기</h2>\n"
    html += f'<p>{prev_link_html}'
    html += f'매주 업데이트되는 <a href="{lotto_home}" target="_blank" rel="noopener noreferrer">로또 당첨번호 조회</a>에서 '
    html += f'전체 회차 통계와 번호별 출현 빈도도 확인해보세요.</p>\n\n'

    # CTA 버튼들 (WP Gutenberg 블록 버튼, 풀폭 + medium 폰트)
    buttons = [
        (lotto_url, f"{draw_no}회 상세 분석 보기"),
        (lotto_home, "로또 당첨번호 조회"),
        ("https://lotto.newsforgreens.com/calculator/", "로또 실수령액 계산기"),
    ]
    for href, text in buttons:
        html += '<!-- wp:buttons -->\n'
        html += '<div class="wp-block-buttons"><!-- wp:button {"width":100,"fontSize":"medium"} -->\n'
        html += f'<div class="wp-block-button has-custom-width wp-block-button__width-100">'
        html += f'<a class="wp-block-button__link has-medium-font-size has-custom-font-size wp-element-button" href="{href}">{text}</a></div>\n'
        html += '<!-- /wp:button --></div>\n'
        html += '<!-- /wp:buttons -->\n\n'

    # 마무리
    html += f"<h2>{draw_no}회 {focus_kw} 총평</h2>\n"
    for para in ai_text["closing"].split("\n\n"):
        if para.strip():
            html += f"<p>{para.strip()}</p>\n\n"

    # 인코딩 깨짐 문자 제거
    if "\ufffd" in html:
        print("  [WARN] replacement char \ufffd found, removing")
        html = html.replace("\ufffd", "")

    # 2단: 마크다운 찌꺼기 최종 제거
    # p 태그가 #, ##, ###, *, ** 같은 것만 담고 있으면 삭제
    html = re.sub(r'<p>\s*[#*]+\s*</p>', '', html)
    # p 태그 내용 앞뒤에 남은 # 제거 (예: <p>## 본문텍스트</p>)
    html = re.sub(r'<p>\s*#{1,6}\s+', '<p>', html)
    # 빈 p 태그 제거
    html = re.sub(r'<p>\s*</p>', '', html)

    return html


def build_meta_description(data):
    """Rank Math 메타 설명 (150-160자, 포커스 키워드 포함)"""
    draw_no = data["draw_no"]
    numbers = data["numbers"]
    bonus = data["bonus"]
    nums_str = ", ".join(map(str, numbers))
    rank1_count = 0
    if data["stores"]:
        rank1_count = len(data["stores"].get("rank1", []))
    desc = f"{draw_no}회 로또 명당 분석. 당첨번호 {nums_str} + {bonus}. 1등 당첨 판매점 {rank1_count}곳 위치와 자동 수동 정보를 확인하세요."
    return desc[:160]


def create_wp_draft(title, content, excerpt, slug, tag_ids, focus_keyword, featured_image_id=None):
    """WP REST API로 드래프트 생성"""
    url = f"{WP_URL}/wp-json/wp/v2/posts"

    payload = {
        "title": title,
        "content": content,
        "excerpt": excerpt,
        "slug": slug,
        "status": "draft",
        "categories": [WP_CATEGORY],
        "tags": tag_ids,
        "meta": {
            "rank_math_focus_keyword": focus_keyword,
            "rank_math_description": excerpt,
        },
    }

    if featured_image_id:
        payload["featured_media"] = featured_image_id

    resp = requests.post(url, json=payload, auth=(WP_USER, WP_PASS))
    if resp.status_code in (200, 201):
        post = resp.json()
        return post
    else:
        print(f"  [!] 드래프트 생성 실패: {resp.status_code}")
        print(f"      {resp.text[:300]}")
        return None


def main():
    parser = argparse.ArgumentParser(description="로또 분석 드래프트 발행")
    parser.add_argument("--draw", type=int, help="특정 회차 지정 (기본: 최신)")
    parser.add_argument("--dry-run", action="store_true", help="WP 발행 없이 HTML만 출력")
    parser.add_argument("--no-image", action="store_true", help="이미지 생성 생략")
    args = parser.parse_args()

    print(f"\n{'='*50}")
    print(f"로또 드래프트 발행 시작: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*50}\n")

    # 1. 데이터 로드
    data = load_lotto_data(args.draw)
    print(f"[1] 데이터 로드: {data['draw_no']}회")
    print(f"    번호: {data['numbers']} + {data['bonus']}")
    print(f"    날짜: {data['date']}")

    if not data["numbers"] or not data["bonus"]:
        print("[X] 당첨번호 데이터 없음. 중단.")
        sys.exit(1)

    # 중복 발행 방지: 같은 회차 글이 이미 있는지 확인
    if not args.dry_run and WP_URL and WP_USER:
        try:
            dup_resp = requests.get(
                f"{WP_URL}/wp-json/wp/v2/posts",
                params={"categories": WP_CATEGORY, "search": f"{data['draw_no']}회", "status": "publish,draft", "per_page": 5},
                auth=(WP_USER, WP_PASS),
                timeout=10,
            )
            if dup_resp.status_code == 200:
                for p in dup_resp.json():
                    if str(data['draw_no']) in p["title"]["rendered"]:
                        print(f"[X] {data['draw_no']}회 글이 이미 존재합니다 (ID={p['id']}, status={p['status']})")
                        print(f"    제목: {p['title']['rendered'][:60]}")
                        print(f"    중복 발행 방지를 위해 중단합니다.")
                        sys.exit(1)
        except Exception:
            pass

    stores = data.get("stores")
    if stores:
        print(f"    판매점: 1등 {len(stores.get('rank1', []))}곳, 2등 {len(stores.get('rank2', []))}곳")
    else:
        print("    판매점: 데이터 없음")

    # 2. 번호 분석
    analysis = analyze_numbers(data["numbers"])
    print(f"\n[2] 번호 분석")
    print(f"    홀짝: {analysis['odd']}:{analysis['even']}")
    print(f"    합계: {analysis['total']}")

    # 3. AI 텍스트 생성
    print(f"\n[3] AI 텍스트 생성...")
    ai_text = generate_ai_text(data, analysis)
    print(f"    도입: {ai_text['intro'][:50]}...")
    print(f"    분석: {ai_text['analysis'][:50]}...")
    print(f"    마무리: {ai_text['closing'][:50]}...")

    # 4. 이미지 생성
    image_id = None
    image_url = None
    if not args.no_image and not args.dry_run:
        print(f"\n[4] 이미지 생성...")
        image = generate_image(data)
        if image:
            filename = f"lotto-{data['draw_no']}.png"
            caption = f"{data['draw_no']}회 로또 명당 당첨 판매점"
            result = upload_wp_image(image["data"], filename, image["mime_type"], caption)
            if result and result[0]:
                image_id, image_url = result
                print(f"    이미지 업로드 완료: media_id={image_id}")
                print(f"    이미지 URL: {image_url}")
            else:
                print(f"    이미지 업로드 실패")
        else:
            print(f"    이미지 생성 실패")
    else:
        print(f"\n[4] 이미지 생략")

    # 5. HTML 조립
    print(f"\n[5] HTML 본문 조립...")
    html = build_html_body(data, ai_text, image_id, image_url)
    # AI 제목 별도 호출, 실패하면 폴백
    print(f"\n[5-1] AI 제목 생성...")
    title = generate_ai_title(data) or build_title(data)
    print(f"    → {title}")
    slug = build_slug(data)
    focus_kw = build_focus_keyword()
    meta_desc = build_meta_description(data)

    print(f"    제목: {title}")
    print(f"    슬러그: {slug}")
    print(f"    포커스KW: {focus_kw}")
    print(f"    메타설명: {meta_desc[:60]}...")

    if args.dry_run:
        print(f"\n{'='*50}")
        print("[DRY RUN] HTML 출력:")
        print(f"{'='*50}")
        print(f"제목: {title}")
        print(f"슬러그: {slug}")
        print(f"{'='*50}")
        print(html)
        print(f"{'='*50}")
        return

    # 6. 태그 생성
    print(f"\n[6] 태그 생성...")
    tag_names = build_tags(data)
    tag_ids = []
    for tag in tag_names:
        tid = get_or_create_tag(tag)
        if tid:
            tag_ids.append(tid)
            print(f"    태그: {tag} (id={tid})")

    # 7. WP 드래프트 생성
    print(f"\n[7] WP 드래프트 생성...")
    post = create_wp_draft(title, html, meta_desc, slug, tag_ids, focus_kw, image_id)
    if post:
        print(f"\n{'='*50}")
        print(f"[O] 드래프트 생성 완료!")
        print(f"    ID: {post['id']}")
        print(f"    제목: {post['title']['rendered']}")
        print(f"    링크: {post['link']}")
        print(f"    편집: {WP_URL}/wp-admin/post.php?post={post['id']}&action=edit")
        print(f"{'='*50}\n")
    else:
        print(f"\n[X] 드래프트 생성 실패!")
        sys.exit(1)


if __name__ == "__main__":
    main()
