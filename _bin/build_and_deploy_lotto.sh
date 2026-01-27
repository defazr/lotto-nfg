#!/bin/bash
#
# 로또 사이트 자동 빌드/배포 스크립트
# 크론: 50 21 * * 6 (토요일 21:50)
#
# 데이터 수집(21:20/21:40) 후 실행
# SSG 정적 빌드 → public_html 배포
#

set -e

# ===== 경로 설정 =====
APP_DIR="/home/master/applications/mtwpxgbeus"
REPO_DIR="${APP_DIR}/repo/lotto-next"
PUBLIC_HTML="${APP_DIR}/public_html"
LOG_FILE="${APP_DIR}/_data/build.log"

# ===== 로그 함수 =====
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "========== 빌드/배포 시작 =========="

# ===== 1. Git pull =====
log "1. Git pull..."
cd "$REPO_DIR"
git fetch origin
git reset --hard origin/main 2>/dev/null || git reset --hard origin/master
log "   Git 최신화 완료"

# ===== 2. 의존성 설치 =====
log "2. npm ci..."
npm ci --silent
log "   의존성 설치 완료"

# ===== 3. 정적 빌드 =====
log "3. npm run build..."
npm run build
log "   빌드 완료 (out/ 생성)"

# ===== 4. 배포 (rsync) =====
log "4. rsync 배포..."
rsync -avz --delete \
    --exclude '_bin' \
    --exclude '_data' \
    --exclude 'data' \
    "${REPO_DIR}/out/" "${PUBLIC_HTML}/"
log "   배포 완료"

# ===== 5. 권한 설정 =====
log "5. 권한 설정..."
find "${PUBLIC_HTML}" -type f -name "*.html" -exec chmod 644 {} \;
find "${PUBLIC_HTML}" -type f -name "*.json" -exec chmod 644 {} \;
chmod 644 "${PUBLIC_HTML}/robots.txt" 2>/dev/null || true
chmod 644 "${PUBLIC_HTML}/sitemap.xml" 2>/dev/null || true
log "   권한 설정 완료"

# ===== 완료 =====
log "========== 빌드/배포 완료 =========="
log "최신 회차: $(cat ${PUBLIC_HTML}/data/lotto_history.json | grep -o '\"latest_draw\":[0-9]*' | head -1)"
log ""
