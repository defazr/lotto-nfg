# GPT Handoff - 2026-04-26

## 이번 세션 작업 요약

### 문제: fazr.co.kr WP 자동 발행 중단 (약 4주)
- **원인**: 2026-04-22 fazr.co.kr 도메인 가비아 → Cloudflare 네임서버 이전 후, Bot Fight Mode가 WP REST API 호출을 차단
- **증상**: wp_lotto_draft.py에서 이미지 업로드, 태그 생성, 드래프트 생성 모두 403 (Cloudflare "Just a moment..." 챌린지 페이지)
- **영향 범위**: 1212회~1220회 자동 발행 누락 (수동 발행도 안 됨)

### 해결: Cloudflare Skip Rule (옵션 A)
- **규칙명**: Allow WordPress REST API
- **표현식**: `(http.host eq "fazr.co.kr" and starts_with(http.request.uri.path, "/wp-json/"))`
- **작업**: 건너뛰기 (모든 보안 기능 skip)
- **위치**: 사용자 지정 규칙 1번 (최우선)
- **코드 수정**: 없음 (UA 위장 불필요)
- **테스트 결과**: 1221회 드래프트 생성 성공 (ID=8171, 이미지 media_id=8170)

### 크론 6차 추가
- 기존 5라운드 (토 23:00~일 00:20 KST) + **6차 일 01:30 KST** 안전망 추가
- 중복 방지 로직으로 이미 발행된 회차는 자동 스킵

## 현재 상태

### Cloudflare 사용자 지정 규칙 (5/5 한도)
| 순서 | 이름 | 대상 | 작업 |
|------|------|------|------|
| 1 | Allow WordPress REST API | fazr.co.kr + /wp-json/ | 건너뛰기 |
| 2 | Allow cron API requests | headlines.fazr.co.kr + /api/ | 건너뛰기 |
| 3 | Block datacenter ASNs | AS 16509 등 9개 | 관리 챌린지 |
| 4 | Block bot regions | SG, HK, ID, VN 비봇 | 관리 챌린지 |
| 5 | Block SG bots | SG 비봇 | 관리 챌린지 |

> 5/5 한도 도달. 추가 규칙 필요 시 기존 합치기 또는 Pro 업그레이드.

### 크론 스케줄 (6라운드)
| 라운드 | KST | UTC | 비고 |
|--------|-----|-----|------|
| 1차 | 토 23:00 | 14:00 | |
| 2차 | 토 23:20 | 14:20 | |
| 3차 | 토 23:40 | 14:40 | |
| 4차 | 일 00:00 | 15:00 | |
| 5차 | 일 00:20 | 15:20 | |
| 6차 | 일 01:30 | 16:30 | 안전망 (신규) |

### WP 드래프트 발행 현황
- 자동 발행 정상화 확인 (다음 토요일 1222회부터 자동 발행 예상)
- 1212~1220회 누락분: 수동 보충 필요 여부 검토 필요

## 의사결정 기록

### "옵션 A만 먼저" (Cloudflare Skip Rule only)
- Claude 제안: 옵션 C (Skip Rule + UA 위장 둘 다)
- 사용자 결정: 옵션 A만 (근본 해결 1개 먼저, 작동 확인 후 추가 조치 판단)
- 결과: 옵션 A만으로 완전 해결, 옵션 B 불필요 확정

### Headlines Fazr 동일 패턴 참고
- headlines.fazr.co.kr에서도 같은 사고 발생 → Skip Rule + UA 위장으로 해결
- fazr.co.kr은 Skip Rule만으로 충분 (WP REST API는 /wp-json/ 경로가 명확)

## 후속 작업 (미정)
- [ ] 1212~1220회 누락 드래프트 수동 보충 여부 결정
- [ ] DEPLOY.md GitHub 버전 동기화 (현재 구버전 — 광고 슬롯 2개만, .htaccess exclude 누락)
- [ ] 다음 토요일 (2026-05-02) 1222회 자동 발행 정상 확인
