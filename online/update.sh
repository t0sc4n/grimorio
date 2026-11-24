#!/usr/bin/env bash
# Aggiorna Grimorio con i file di questa cartella (le partite restano).
# Uso:  sudo ./update.sh
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then echo "Lancia lo script con sudo."; exit 1; fi
SRC="$(cd "$(dirname "$0")" && pwd)"
APP=/opt/grimorio
bash /opt/grimorio/backup.sh || true
cp "$SRC"/server.js "$SRC"/dict.js "$SRC"/ai-core.js "$SRC"/ai-worker.js "$SRC"/package.json "$SRC"/package-lock.json "$SRC"/backup.sh "$APP"/
rm -rf "$APP/public"; cp -r "$SRC/public" "$APP/public"
cd "$APP" && npm ci --omit=dev --no-audit --no-fund
systemctl restart grimorio
sleep 3
systemctl is-active --quiet grimorio && echo "Grimorio aggiornato e attivo." || { echo "Il servizio non parte: journalctl -u grimorio -n 50"; exit 1; }
