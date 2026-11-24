#!/usr/bin/env bash
# Copia di sicurezza delle partite in /var/backups/grimorio (tiene le ultime 14).
# Uso:  sudo ./backup.sh      (o ogni notte con cron, vedi le istruzioni)
set -euo pipefail
umask 077   # le copie le legge solo root
DEST=/var/backups/grimorio
mkdir -p "$DEST"; chmod 700 "$DEST"
FILE="$DEST/grimorio-$(date +%Y%m%d-%H%M%S).db"
node -e "new (require('node:sqlite').DatabaseSync)('/var/lib/grimorio/grimorio.db').exec(\"VACUUM INTO '$FILE'\")"
cp /var/lib/grimorio/vapid.json "$DEST/vapid.json" 2>/dev/null || true
ls -1t "$DEST"/grimorio-*.db | tail -n +15 | xargs -r rm --
echo "Backup: $FILE"
