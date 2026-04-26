# Session Handoff - Lotto NFG

> 마지막 업데이트: 2026-04-26
> 마지막 작업: Cloudflare WP REST API 차단 해결 + 크론 6차 추가

## 프로젝트 현재 상태: 정상 운영

### 자동화 파이프라인
```
크론 (토 23:00~일 01:30 KST, 6라운드)
  → update_lotto_cache.py (번호+판매점 수집)
  → build_and_deploy.sh (빌드+배포)
  → wp_lotto_draft.py (fazr.co.kr WP 드래프트)
```
- 수집: 정상 (lotto.co.kr + lottorich 교차검증)
- 빌드/배포: 정상
- WP 드래프트: **정상화 (2026-04-26)** — Cloudflare Skip Rule 적용

### 인프라
- **호스팅**: Cloudways (178.128.19.99, user: jnsko37)
- **DNS/CDN**: Cloudflare (fazr.co.kr, Free 플랜)
- **Cloudflare 규칙**: 5/5 한도 (추가 불가)
- **Varnish**: 배포 후 Purge 필수

### 최근 해결된 이슈
| 날짜 | 이슈 | 해결 |
|------|------|------|
| 2026-04-26 | WP REST API 403 (Cloudflare Bot Fight Mode) | Skip Rule: /wp-json/ 경로 건너뛰기 |
| 2026-04-26 | 크론 안전망 부족 | 6차 라운드 추가 (일 01:30 KST) |

### 미해결/보류
- 1212~1220회 WP 드래프트 누락 (수동 보충 여부 미정)
- DEPLOY.md GitHub 버전 구버전 (동기화 보류)
- 동행복권 API 차단 지속 (lotto.co.kr + lottorich로 우회 중)

## 새 세션 시작 시 확인사항
1. `ssh jnsko37@178.128.19.99 "tail -5 /home/master/lotto_ops/wp_draft.log"` — 최근 WP 발행 상태
2. `ssh jnsko37@178.128.19.99 "tail -5 /home/master/lotto_ops/log/update.log"` — 최근 수집 상태
3. `curl -sI https://lotto.newsforgreens.com/ | head -1` — 사이트 정상 여부
