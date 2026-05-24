# Session Handoff - Lotto NFG

> 마지막 업데이트: 2026-05-24
> 마지막 작업: 교차검증 강화 (회차 비교 + 단독 강화검증) + 1225회 복구

## 프로젝트 현재 상태: 정상 운영 (관찰 기간)

### 자동화 파이프라인
```
크론 (토 23:00~일 01:30 KST, 6라운드)
  → update_lotto_cache.py v1.3 (번호+판매점 수집, 강화검증)
  → build_and_deploy.sh (빌드+배포)
  → wp_lotto_draft.py (fazr.co.kr WP 드래프트)
```
- 수집: **강화검증 적용** — 교차검증 실패 시 단독 소스 채택 가능
- 빌드/배포: 정상
- WP 드래프트: 정상

### 인프라
- **호스팅**: Cloudways (178.128.19.99, user: jnsko37)
- **DNS/CDN**: Cloudflare (fazr.co.kr, Free 플랜, 규칙 5/5)
- **Varnish**: lotto 사이트 배포 후 Purge 필수
- **Hummingbird Pro**: fazr.co.kr WP 캐시 — 글 발행 시 수동 클리어 필요 (자동 퍼지 미동작)
- **서버 리소스**: 디스크 65%, 메모리 960Mi(가용 170Mi), Swap 705Mi

### 데이터 소스 현황
| 소스 | 상태 | 비고 |
|------|------|------|
| dhlottery (동행복권) | 차단 | IP 차단 지속 |
| lotto.co.kr | **1224회 정체** | 1주일째 업데이트 안 됨, 2~3주 관찰 중 |
| lottorich | 정상 | 1225회 단독 강화검증으로 채택됨 |

### 최근 해결된 이슈
| 날짜 | 이슈 | 해결 |
|------|------|------|
| 2026-05-24 | 교차검증 회차 무시 → 6라운드 실패 | cross_validate draw_no 비교 + enhanced_validate 폴백 |
| 2026-05-24 | 1225회 사이트/WP 미갱신 | 수동 실행으로 복구, 빌드+배포+WP 드래프트 완료 |
| 2026-05-24 | WP 글 발행 후 미노출 | Hummingbird Pro 캐시 클리어로 해결 |

### 미해결/보류
- lotto.co.kr 관찰 중 (2~3주 후 판단)
- Hummingbird "Clear cache on publish" 설정 확인 필요
- 1212~1220회 WP 드래프트 누락 (수동 보충 미정)
- 도메인/서버 이전 검토 중 (유저 검토, Claude UI 미인지)
- 서버 메모리 모니터링 (960Mi, Swap 활발)

## 새 세션 시작 시 확인사항
1. `ssh jnsko37@178.128.19.99 "tail -20 /home/master/lotto_ops/log/update.log"` — 최근 수집 + 강화검증 동작 확인
2. `ssh jnsko37@178.128.19.99 "tail -5 /home/master/lotto_ops/wp_draft.log"` — 최근 WP 발행 상태
3. `curl -s https://lotto.newsforgreens.com/data/lotto_cache.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['latest_draw']['draw_no'])"` — 최신 회차
4. `ssh jnsko37@178.128.19.99 "df -h / ; free -h"` — 서버 리소스
