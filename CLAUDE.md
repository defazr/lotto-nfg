# LOTTO NFG - Claude Code Project Guide

## Overview
- **사이트**: https://lotto.newsforgreens.com
- **스택**: Next.js 16.1.1 + React 19 + TypeScript, 정적 export (output: 'export')
- **테마**: Deep Green 다크 모드, globals.css 디자인 시스템
- **데이터**: 로또 6/45 1회~최신 회차, JSON 기반 (서버 크론 수집)

## Architecture
```
[크론 수집] update_lotto_cache.py
    → lotto_ops/data/*.json
    → public_html/data/*.json (직접 복사)

[크론 빌드] build_and_deploy.sh
    → server repo에서 npm run build
    → rsync --exclude data out/ → public_html/
    → 코드만 배포, 데이터는 수집 스크립트가 관리

[로컬 배포] (수동)
    1. scp 서버 data → local public/data/
    2. npm run build && rsync --exclude data out/ → server public_html/
    3. rsync --delete src/ → server repo src/ (재발 방지)
    4. Cloudways Varnish Purge
```

## Key Paths

### Local
- Project: `/Users/dapala.corp/work/lotto-next/lotto-next/`
- Data: `public/data/` (lotto_cache.json, lotto_history.json, number_index.json, co_occurrence.json)

### Server (Cloudways - 178.128.19.99, user: jnsko37)
- Repo: `/home/master/repo/lotto-next/`
- Public: `/home/master/applications/mtwpxgbeus/public_html/`
- Data: `/home/master/lotto_ops/data/`
- Scripts: `/home/master/lotto_ops/bin/` (update_lotto_cache.py, build_and_deploy.sh)
- Logs: `/home/master/lotto_ops/log/` (update.log, build.log)

## File Structure
```
src/
├── app/
│   ├── layout.tsx          # 루트 레이아웃 (헤더/푸터)
│   ├── page.tsx            # 홈 (325줄) - 최신회차, 추천번호, FAQ, 검색
│   ├── globals.css         # 디자인 시스템 (1082줄)
│   ├── sitemap.ts          # 동적 사이트맵
│   ├── draw/[round]/page.tsx   # 회차 상세 (475줄)
│   ├── check/page.tsx      # 번호 당첨 체크 시뮬레이터
│   ├── draws/page.tsx      # 전체 회차 목록
│   ├── number/[n]/page.tsx # 번호 상세 (1~45)
│   ├── numbers/page.tsx    # 번호별 통계 개요
│   ├── stats/page.tsx      # 전체 통계
│   ├── guide/              # 교육 콘텐츠 3개
│   ├── status/page.tsx     # 상태 확인
│   └── og-check/page.tsx   # OG 메타 디버그
├── components/
│   ├── RecommendedNumbers.tsx  # 추천 3세트 (LCG seeded random)
│   ├── LatestDrawLive.tsx      # 최신 회차 라이브 위젯
│   ├── HeaderSearch.tsx        # 검색 (회차/번호 자동 분기)
│   ├── DrawActions.tsx         # 복사/공유 버튼
│   ├── NumberComboSets.tsx     # 동반출현 조합
│   ├── CheckWinning.tsx        # 번호 당첨 체크 클라이언트
│   ├── MobileNav.tsx           # 모바일 드롭다운 네비
│   ├── HeaderLogo.tsx          # 로고
│   ├── GuideLinks.tsx          # 가이드 링크
│   ├── AdBanner.tsx            # AdSense
│   └── SearchBox.tsx           # 홈 검색
└── lib/
    ├── lotto.ts            # 코어 라이브러리 (데이터 로드, 통계, 볼 색상)
    ├── metrics.ts          # localStorage 기반 클라이언트 분석
    └── seo.ts              # JSON-LD 스키마 생성
```

## Data Files (public/data/)
- **lotto_cache.json**: latest_draw 정보 (크론이 매주 갱신)
- **lotto_history.json**: 전체 회차 데이터 (meta + data)
- **number_index.json**: 번호별 사전계산 통계 (prebuild 생성)
- **co_occurrence.json**: 동반출현 쌍 매트릭스

## Build Commands
```bash
npm run dev              # 개발 서버
npm run build            # 정적 빌드 (out/)
npm run build:static     # prebuild + build + postexport
```

## CSS Design System (globals.css)
- 볼 색상: Yellow(1-10), Blue(11-20), Red(21-30), Gray(31-40), Green(41-45)
- 주요 클래스: .card, .ballRow, .ballLarge, .chipRow, .chip, .btn, .statCard, .badge
- 모바일 브레이크포인트: 640px, 400px, 767px (네비)
- grid 오버플로우 방지: `gridTemplateColumns: "minmax(0, 1fr)"`

## Known Issues & Fixes
1. **CSS Grid 모바일 오버플로우**: grid 아이템 min-width: auto 문제 → `gridTemplateColumns: "minmax(0, 1fr)"`
2. **LCG 정수 오버플로우**: `state * 1103515245` → `Math.imul(state, 1103515245)`, seed `| 0`
3. **Varnish 캐시**: 신규 페이지 404 캐시 → 배포 후 Purge 필수
4. **데이터 덮어쓰기 위험**: rsync 배포 시 반드시 `--exclude data`
5. **재발 방지**: out/ 배포만 하면 서버 repo는 구코드 → src/ 동기화 필수

## Rules
- 서버 data (public_html/data)는 절대 로컬에서 덮어쓰지 않는다
- 배포 후 서버 repo src/ 동기화를 반드시 한다
- 코드 수정 후 `npm run build`로 빌드 확인
- 배포 후 Varnish Purge + 검증 curl
- official_not_confirmed 상태에서는 데이터 강제 업데이트 금지

## Deploy Checklist
```bash
# 1. 서버 데이터 가져오기
scp "jnsko37@178.128.19.99:~/applications/mtwpxgbeus/public_html/data/*.json" public/data/

# 2. 빌드 + 배포
npm run build && rsync -avz --delete --exclude 'data' out/ jnsko37@178.128.19.99:~/applications/mtwpxgbeus/public_html/

# 3. 서버 repo 동기화
rsync -avz --delete src/ jnsko37@178.128.19.99:~/repo/lotto-next/src/

# 4. Cloudways Varnish Purge

# 5. 검증
curl -sI https://lotto.newsforgreens.com/draw/최신회차/ | head -5
curl -s https://lotto.newsforgreens.com/data/lotto_cache.json | grep latest_draw
```

## Upcoming Tasks
- 매주 토요일 자동 블로그 글 발행 (fazr.co.kr + newsforgreens.com)
- 추천번호 결과 비교 기능 (저장된 번호 vs 실제 당첨번호)
- SEO 포커스 키워드: "{round}회 로또 당첨번호"
