#!/usr/bin/env bash
# 日次バックアップ(docs/design/01-basic-design.md §8)
# 単一VPSはSPOFのため、pg_dumpと原本ファイルを必ずVPS外へ転送すること。
# SQLite(data/sqlite)はPostgres+原本から再生成可能なキャッシュのため対象外
# (docs/adr/0006-ai-content-storage-split.md)。
#
# cron例(root, 毎日3:00): 0 3 * * * /home/deploy/saitama-council-watch/infra/scripts/backup.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/saitama-council-watch}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "==> pg_dump"
docker compose -f "$PROJECT_ROOT/infra/docker/compose.yml" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-app}" "${POSTGRES_DB:-saitama_council_watch}" \
  | gzip > "$BACKUP_DIR/db-${TIMESTAMP}.sql.gz"

echo "==> 原本ファイル(data/raw)のアーカイブ"
tar -czf "$BACKUP_DIR/raw-${TIMESTAMP}.tar.gz" -C "$PROJECT_ROOT/data" raw

echo "==> 7日より古いローカルバックアップを削除"
find "$BACKUP_DIR" -type f -mtime +7 -delete

# --- VPS外への転送(要設定。例: rclone) ---
# rclone copy "$BACKUP_DIR/db-${TIMESTAMP}.sql.gz" remote:saitama-council-watch-backups/
# rclone copy "$BACKUP_DIR/raw-${TIMESTAMP}.tar.gz" remote:saitama-council-watch-backups/
echo "==> 完了: $BACKUP_DIR/db-${TIMESTAMP}.sql.gz, raw-${TIMESTAMP}.tar.gz"
echo "    (注: VPS外への転送コマンドは未設定。上記rcloneの行を有効化すること)"
