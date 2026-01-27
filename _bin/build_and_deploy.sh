#!/bin/bash
#
# 로또 사이트 자동 빌드/배포 스크립트
# 크론: 35 12 * * 6 (토요일 12:35 UTC = 21:35 KST)
#
set -euo pipefail

# nvm 로드 (크론에서도 동작하게)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
else
    echo "[ERROR] nvm.sh not found!" >&2
    exit 1
fi

# node/npm 체크
if ! command -v node &> /dev/null; then
    echo "[ERROR] node not found!" >&2
    exit 1
fi

# 경로 설정
REPO_DIR="$HOME/repo/lotto-next"
PUBLIC_HTML="$HOME/applications/mtwpxgbeus/public_html"
LOG_FILE="$HOME/lotto_ops/log/build.log"

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "========== 빌드/배포 시작 =========="
log "Node: $(node -v)"
log "npm: $(npm -v)"

# 1. repo 이동
log "1. cd $REPO_DIR"
cd "$REPO_DIR"

# 2. 최신 데이터를 repo로 복사 (빌드에 반영)
log "2. 최신 데이터 복사"
cp "$HOME/lotto_ops/data/lotto_cache.json" "$REPO_DIR/public/data/" 2>/dev/null || true
cp "$HOME/lotto_ops/data/lotto_history.json" "$REPO_DIR/public/data/" 2>/dev/null || true

# 3. 의존성 설치
log "3. npm ci"
npm ci --silent

# 4. 데이터 인덱스 생성 + 빌드
log "4. 인덱스 생성 + 빌드"
node scripts/build_number_index.mjs
node scripts/build_co_occurrence.mjs
npm run build

# 5. 배포 (rsync)
log "5. rsync 배포"
rsync -avz --delete \
    --exclude 'data' \
    --exclude 'ops' \
    "$REPO_DIR/out/" "$PUBLIC_HTML/" || true

# 6. 권한 설정 (디렉토리 755, 파일 644)
log "6. 권한 설정"
find "$PUBLIC_HTML" -mindepth 1 -type d -exec chmod 755 {} \; 2>/dev/null || true
find "$PUBLIC_HTML" -type f -exec chmod 644 {} \; 2>/dev/null || true

# 7. 운영 로그 복사 (/status/ 페이지용)
log "7. 운영 로그 복사"
mkdir -p "$PUBLIC_HTML/ops"
tail -n 40 "$HOME/lotto_ops/log/update.log" > "$PUBLIC_HTML/ops/update.log.tail.txt" 2>/dev/null || true
tail -n 60 "$HOME/lotto_ops/log/build.log" > "$PUBLIC_HTML/ops/build.log.tail.txt" 2>/dev/null || true
chmod 644 "$PUBLIC_HTML/ops/"*.txt 2>/dev/null || true

# 8. 배포 후 검증 (5개 URL)
log "8. 배포 검증"
URLS=(
    "https://lotto.newsforgreens.com/"
    "https://lotto.newsforgreens.com/draws/"
    "https://lotto.newsforgreens.com/stats/"
    "https://lotto.newsforgreens.com/number/7/"
    "https://lotto.newsforgreens.com/robots.txt"
)
FAIL_COUNT=0
for url in "${URLS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    if [ "$STATUS" != "200" ]; then
        log "[WARN] $url -> HTTP $STATUS"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        log "[OK] $url -> HTTP 200"
    fi
done

if [ "$FAIL_COUNT" -gt 0 ]; then
    log "[WARN] VARNISH_PURGE_NEEDED - $FAIL_COUNT URL(s) not 200"
fi

# 완료
log "========== 빌드/배포 완료 =========="
log "latest_draw: $(grep -o '"latest_draw":[0-9]*' "$PUBLIC_HTML/data/lotto_history.json" | head -1)"
