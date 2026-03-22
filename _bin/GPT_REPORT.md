# WP 드래프트 자동 발행 시스템 - 현황 보고서
**작성일**: 2026-02-20
**작성**: Claude Code (Opus 4.6)
**대상**: GPT에게 의견 요청

---

## 1. 프로젝트 개요

로또 당첨번호 분석 블로그 글을 **매주 자동으로 드래프트 발행**하는 시스템.
- **발행 사이트**: fazr.co.kr (WordPress)
- **데이터 소스**: lotto.newsforgreens.com의 크론이 수집한 JSON (lotto_cache.json, store_data.json)
- **스크립트**: `_bin/wp_lotto_draft.py`
- **AI**: Claude Sonnet (텍스트), Gemini 3 Pro (이미지)

---

## 2. 유저 요구사항 및 수정 과정

### 2-1. 초기 구현 (GPT 지시서 기반)
- GPT가 작성한 상세 지시서를 기반으로 초기 구현
- WP REST API + Claude + Gemini 파이프라인 구축
- 첫 테스트: `--draw 1211 --no-image` → draft ID 6311 생성 성공

### 2-2. Rank Math SEO 최적화 (60점대 → 개선)
**유저 피드백**: Rank Math 점수 60점대, 여러 항목 미달

| 항목 | 문제 | 수정 |
|------|------|------|
| 콘텐츠 길이 | 309단어 (600 미만) | AI 프롬프트를 700단어 이상으로 확대, max_tokens 3000 |
| 슬러그 | `lotto-1211` (키워드 없음) | → `1211회-로또-당첨-판매점-명당-분석` |
| 키워드 밀도 | 0.97% (3회) | AI 프롬프트에 키워드 사용 횟수 지정 |
| 이미지 | 없음 | Gemini 이미지 생성 + featured + body 삽입 |
| 내부 링크 | 없음 | 이전 회차 글 자동 링크 (fazr.co.kr 내) |
| 리치 미디어 | 없음 | CTA 버튼, 분석 테이블 추가 |
| 태그 | 회차 없음 | `{회차}회 로또 당첨번호` 자동 생성 |

### 2-3. 포커스 키워드 변경
**유저 피드백**: "로또 명당"은 너무 일반적. 회차를 넣어야 한다.

| 항목 | Before | After |
|------|--------|-------|
| 포커스 키워드 | `로또 명당` | `{회차}회 로또 당첨 판매점` |
| 메타 설명 | 키워드 불일치 | 포커스 키워드 포함 |
| 제목 | 고정 템플릿 | AI가 매회 다르게 생성 (포커스 키워드 맨앞) |

### 2-4. 이미지 생성 과정
**최초 시도**: `gemini-2.0-flash-exp` → 404 에러
**두 번째**: `gemini-2.0-flash-exp-image-generation` → 작동하나 품질 낮음
**유저 지적**: 지시서에 `gemini-3-pro-image-preview`로 명시되어 있었음

**프롬프트 변천**:
1. ❌ 숫자 없는 추상적 볼 이미지 (유저: "번호도 없구만 장난하나")
2. ❌ 스튜디오 배경 깔끔한 화면 (유저: "구글스튜디오에서 제목만 쳐도 이렇게 나오는데...")
3. ✅ **판매점 축하 장면** (GPT 지시서의 첫 번째 템플릿) - 유저 승인

**최종 이미지 프롬프트**:
```
A candid, wide-angle documentary photograph inside a bustling, celebratory
South Korean lottery retailer shop. Confetti is flying in the air, and a crowd
of excited people are cheering and holding lottery tickets. Hanging prominently
from the ceiling is a large red banner with white Korean text that reads EXACTLY:
"제{draw_no}회 로또 당첨 판매점 - {date} 추첨". Below the banner, a large, bright
digital screen clearly displays the winning numbers as lotto balls: six yellow
circular balls with black numbers "{n1}", "{n2}", "{n3}", "{n4}", "{n5}", "{n6}",
followed by a plus sign "+" and one red circular ball with the number "{bonus}".
The shop is brightly lit with fluorescent lights. Image size 1024x612 pixels wide format.
```

### 2-5. 버튼 스타일
**유저 피드백**: 인라인 CSS 버튼 → WordPress 네이티브 블록 버튼으로 변경
```html
<div class="wp-block-buttons is-layout-flex">
  <div class="wp-block-button">
    <a class="wp-block-button__link wp-element-button" href="...">텍스트</a>
  </div>
</div>
```

### 2-6. 기타 수정
- 캡션 가운데 정렬 (`text-align:center`)
- AI 제목 파싱 시 마크다운 `#` 자동 제거 처리

---

## 3. 현재 시스템 구조

```
[매주 토요일 크론 실행]
    ↓
update_lotto_cache.py (번호 + 판매점 수집)
    ↓
wp_lotto_draft.py
    ├── [1] 데이터 로드 (lotto_cache.json + store_data.json)
    ├── [2] 번호 분석 (홀짝, 구간, 연속번호, 합계)
    ├── [3] AI 텍스트 생성 (Claude Sonnet)
    │       → [제목] + [도입] + [분석] + [마무리]
    ├── [4] 이미지 생성 (Gemini 3 Pro) → WP 미디어 업로드
    ├── [5] HTML 본문 조립
    │       → 도입 → 이미지 → 당첨번호(볼) → 분석 → 테이블 → 판매점 → 내부링크 → CTA버튼 → 마무리
    ├── [6] 태그 생성/조회
    └── [7] WP REST API → draft 생성
```

### 현재 설정값
| 항목 | 값 |
|------|------|
| AI 텍스트 모델 | claude-sonnet-4-5-20250929 |
| 이미지 모델 | gemini-3-pro-image-preview |
| 이미지 크기 | 1024x612 |
| 포커스 키워드 | `{회차}회 로또 당첨 판매점` |
| 슬러그 | `{회차}회-로또-당첨-판매점-명당-분석` |
| 제목 | AI 생성 (포커스 키워드 맨앞 시작) |
| 내부 링크 | 이전 회차 글 자동 링크 |
| 버튼 | WP 블록 버튼 (테마 스타일) |
| 태그 | 로또, 로또 명당, 당첨 판매점, 로또 1등, 복권, {회차}회 로또 당첨번호 |
| max_tokens | 3000 |
| 단어 수 타겟 | 700+ |

---

## 4. 테스트 결과

| 회차 | Draft ID | 제목 | 이미지 | 상태 |
|------|----------|------|--------|------|
| 1210 | 6342 | 1210회 로또 당첨 판매점 24곳 명당 분석 총정리 (폴백) | media_id=6341 | draft |
| 1211 | 미실행 | - | - | 대기 |

**1210회 이슈**: AI가 `[제목]` 응답 시 마크다운 `#`만 반환하여 폴백 제목 사용됨. 파싱 로직에 `lstrip("#")` 처리 완료했으나, AI가 제목을 빈 줄로 반환하는 경우가 간헐적으로 발생 가능.

---

## 5. 미해결 과제 (GPT 의견 요청)

### 5-1. 이미지 다양성 부족 ⭐
현재 프롬프트가 고정이라 매회 비슷한 이미지가 생성됨.
- 같은 "판매점 축하 장면" 구도
- 배경, 사람 배치, 분위기가 거의 동일

**필요한 것**: 매회 다른 배경/분위기가 나오도록 프롬프트에 변화를 주는 방법
- 방법 A: 프롬프트 템플릿을 여러 개 만들어 랜덤 선택
- 방법 B: AI가 매회 데이터 기반으로 프롬프트 변형 생성
- 방법 C: 고정 프롬프트에 시드/스타일 변수를 추가

### 5-2. AI 제목 안정성
Claude가 `[제목]` 섹션에서 마크다운 헤더(`#`)로 응답하거나, 빈 줄을 반환하는 경우가 있음.
- 현재 폴백 처리는 되어 있으나, AI 제목이 의도대로 나오는 비율을 높이고 싶음.

### 5-3. 서버 크론 연결
아직 서버에 배포되지 않음:
- .env 파일 배포
- pip install anthropic google-genai
- 크론에 wp_lotto_draft.py 연결

### 5-4. Rank Math 최종 점수
1210회 드래프트 기준 아직 Rank Math 점수 미확인. 유저가 확인 후 추가 조정 필요할 수 있음.

---

## 6. 현재 코드 핵심 함수 요약

```python
# 포커스 키워드 (회차 포함)
def build_focus_keyword(data):
    return f"{data['draw_no']}회 로또 당첨 판매점"

# 슬러그
def build_slug(data):
    return f"{draw_no}회-로또-당첨-판매점-명당-분석"

# 제목 (AI 생성, 폴백)
def build_title(data):
    return f"{draw_no}회 로또 당첨 판매점 {rank1_count}곳 명당 분석 총정리"

# AI 프롬프트에 [제목] 섹션 추가
# → "{draw_no}회 로또 당첨 판매점"으로 시작 필수
# → 매회 데이터 특징을 반영한 매력적인 문구

# 내부 링크
prev_url = f"{WP_URL}/로또-명당-{draw_no-1}회/"  # ← 이전 슬러그 형식 주의
```

**주의**: 내부 링크의 이전 회차 URL이 현재 슬러그 형식(`{회차}회-로또-당첨-판매점-명당-분석`)과 다를 수 있음. 1210회부터 새 슬러그이므로, 1209회 이전 글이 없으면 404 발생.

---

*이 보고서를 GPT에게 전달하여 이미지 다양성, AI 제목 안정성, 추가 SEO 개선에 대한 의견을 요청합니다.*
