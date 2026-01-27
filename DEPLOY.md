# 로또 사이트 배포 가이드

## 자동 배포 (크론)
매주 토요일 자동 실행됨.
- 21:20 KST: 데이터 수집
- 21:35 KST: 빌드/배포

**주의:** 자동 배포 후에도 Varnish 캐시 때문에 404 발생 가능.
- 토요일 22:00 KST 이후 사이트 확인
- 404 보이면 Cloudways → Varnish → **Purge** 클릭

---

## 수동 배포 절차 (반드시 순서대로!)

### 1. 서버에서 최신 데이터 가져오기 (필수!)
```bash
rsync -avz jnsko37@178.128.19.99:/home/master/lotto_ops/data/lotto_cache.json ~/work/lotto-next/lotto-next/public/data/
rsync -avz jnsko37@178.128.19.99:/home/master/lotto_ops/data/lotto_history.json ~/work/lotto-next/lotto-next/public/data/
```

### 2. number_index 생성 + 빌드
```bash
cd ~/work/lotto-next/lotto-next
node scripts/build_number_index.mjs && npm run build
```

### 3. 배포 (data, ops 폴더 제외!)
```bash
rsync -avz --delete --exclude 'data' --exclude 'ops' ~/work/lotto-next/lotto-next/out/ jnsko37@178.128.19.99:/home/master/applications/mtwpxgbeus/public_html/
```

### 4. 권한 수정 (필수!)
```bash
ssh jnsko37@178.128.19.99 "chmod 644 /home/master/applications/mtwpxgbeus/public_html/robots.txt /home/master/applications/mtwpxgbeus/public_html/sitemap.xml"
```

### 5. 소스 동기화 (코드 변경 시)
```bash
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'out' ~/work/lotto-next/lotto-next/ jnsko37@178.128.19.99:~/repo/lotto-next/
```

### 6. Varnish 캐시 퍼지 (필수!)
Cloudways 제어판에서:
1. **Server** → 해당 서버 선택
2. **Manage Services** → Varnish → **Purge** 클릭

### 7. 배포 확인 (5개 URL HEAD 체크)
```bash
curl -I https://lotto.newsforgreens.com/ 2>/dev/null | head -1
curl -I https://lotto.newsforgreens.com/draws/ 2>/dev/null | head -1
curl -I https://lotto.newsforgreens.com/stats/ 2>/dev/null | head -1
curl -I https://lotto.newsforgreens.com/number/7/ 2>/dev/null | head -1
curl -I https://lotto.newsforgreens.com/robots.txt 2>/dev/null | head -1
```
- 모두 `HTTP/2 200` 이면 정상
- `404` 나오면 → 6번(Varnish Purge) 다시 실행

---

## 주의사항

| 실수 | 결과 | 해결 |
|------|------|------|
| 데이터 안 가져옴 | 구버전 회차 표시 | 1번부터 다시 |
| --exclude 'data' 또는 'ops' 빠짐 | 서버 데이터/로그 삭제됨 | 크론 돌때까지 대기 또는 수동 수집 |
| 권한 안 고침 | robots.txt 403 | 4번 실행 |
| Varnish 캐시 안 지움 | 404 계속 뜸 | 6번(Cloudways Purge) 실행 |

---

## 서버 경로 정리

| 용도 | 경로 |
|------|------|
| 웹서버 루트 | /home/master/applications/mtwpxgbeus/public_html/ |
| 데이터 저장소 | /home/master/lotto_ops/data/ |
| 소스 코드 | /home/master/repo/lotto-next/ |
| 빌드 스크립트 | ~/repo/lotto-next/_bin/build_and_deploy.sh |
| 데이터 수집 스크립트 | ~/lotto_ops/bin/update_lotto_cache.py |

---

## 광고 슬롯

| 위치 | 파일 | 슬롯 ID |
|------|------|---------|
| 홈페이지 | src/app/page.tsx | 2914313572 |
| 회차 상세 | src/app/draw/[round]/page.tsx | 7281720411 |

---

## 확인 URL

- 홈: https://lotto.newsforgreens.com/
- 운영현황: https://lotto.newsforgreens.com/status/
- robots: https://lotto.newsforgreens.com/robots.txt
- sitemap: https://lotto.newsforgreens.com/sitemap.xml
- 최신회차: https://lotto.newsforgreens.com/draw/1205/

---

## 검색엔진 재수집 체크리스트

**주의:** 재등록 금지! 이미 소유권 인증 완료됨. sitemap 재제출/재수집만.

### Google Search Console
1. https://search.google.com/search-console 접속
2. `lotto.newsforgreens.com` 속성 선택
3. **색인 생성** → **Sitemaps** → `sitemap.xml` 재제출
4. (선택) **URL 검사** → 주요 URL 개별 색인 요청

### 네이버 서치어드바이저
1. https://searchadvisor.naver.com 접속
2. 사이트 선택 → **요청** → **사이트맵 제출**
3. `https://lotto.newsforgreens.com/sitemap.xml` 입력
4. (선택) **웹 페이지 수집** → 주요 URL 개별 요청

### 다음 검색등록
1. https://register.search.daum.net 접속
2. **신규등록** 아닌 **등록정보수정** 선택
3. sitemap URL 확인/갱신
