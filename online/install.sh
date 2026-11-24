#!/usr/bin/env bash
# Installa Grimorio su Ubuntu con Apache già presente.
# Uso (dalla cartella estratta):  sudo ./install.sh grimorio.tuodominio.it
set -euo pipefail
DOMINIO="${1:-}"
if [ -z "$DOMINIO" ]; then echo "Uso: sudo bash install.sh NOME-DEL-DOMINIO"; exit 1; fi
if [ "$(id -u)" -ne 0 ]; then echo "Lancia lo script con sudo."; exit 1; fi
SRC="$(cd "$(dirname "$0")" && pwd)"
APP=/opt/grimorio
DATA=/var/lib/grimorio

echo "== 1/6 Node.js"
if command -v node >/dev/null 2>&1; then
  MAJ="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$MAJ" -lt 24 ]; then
    if [ "${FORCE_NODE:-0}" != "1" ]; then
      echo "Trovato Node.js $(node -v): serve la versione 24 o successiva."
      echo "Se nessun altro programma sulla VPS usa Node.js, rilancia con: sudo FORCE_NODE=1 bash install.sh $DOMINIO"
      exit 1
    fi
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt-get install -y nodejs
  fi
else
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js $(node -v)"

echo "== 2/6 Utente e cartelle"
id grimorio >/dev/null 2>&1 || useradd --system --home-dir "$DATA" --shell /usr/sbin/nologin grimorio
mkdir -p "$APP" "$DATA"
chown grimorio:grimorio "$DATA"; chmod 750 "$DATA"

echo "== 3/6 Programma"
cp "$SRC"/server.js "$SRC"/dict.js "$SRC"/ai-core.js "$SRC"/ai-worker.js "$SRC"/package.json "$SRC"/package-lock.json "$SRC"/backup.sh "$APP"/
rm -rf "$APP/public"; cp -r "$SRC/public" "$APP/public"
cd "$APP" && npm ci --omit=dev --no-audit --no-fund
chown -R root:root "$APP"

echo "== 4/6 Servizio"
sed "s/DOMINIO/$DOMINIO/g" "$SRC/deploy/grimorio.service" > /etc/systemd/system/grimorio.service
systemctl daemon-reload
systemctl enable grimorio >/dev/null
systemctl restart grimorio
sleep 3
systemctl is-active --quiet grimorio && echo "Servizio attivo" || { echo "Il servizio non parte: guarda  journalctl -u grimorio -n 50"; exit 1; }

echo "== 5/6 Apache"
a2enmod -q proxy proxy_http proxy_wstunnel rewrite headers deflate
sed "s/DOMINIO/$DOMINIO/g" "$SRC/deploy/grimorio-apache.conf" > /etc/apache2/sites-available/grimorio.conf
a2ensite -q grimorio
apache2ctl configtest
systemctl reload apache2

echo "== 6/6 Certificato HTTPS"
if ! command -v certbot >/dev/null 2>&1; then apt-get install -y certbot python3-certbot-apache; fi
echo
echo "Quasi fatto. Ultimo passo (ti chiederà un indirizzo email per gli avvisi di scadenza):"
echo "    sudo certbot --apache -d $DOMINIO --redirect"
echo "Poi apri https://$DOMINIO dal telefono."
