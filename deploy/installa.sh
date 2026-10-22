#!/bin/bash
# Installazione nel CT 203, lanciata da pubblica.cmd dopo la copia dei file in /root/ha-deploy
# (la build è già in /var/www/ha-dashboard.new). Si può rilanciare: rifà solo quello che manca.
set -euo pipefail
cd /root/ha-deploy

# Archivio delle bollette: Python e la libreria WebSocket di Debian, utente senza privilegi.
if ! dpkg -s python3-websockets >/dev/null 2>&1; then
  echo "== Installo python3-websockets (solo la prima volta)"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-websockets >/dev/null
fi
id bollette >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin bollette
install -D -m 644 bollette.py /opt/ha-bollette/bollette.py
install -m 644 ha-bollette.service /etc/systemd/system/ha-bollette.service
systemctl daemon-reload
systemctl enable -q ha-bollette
systemctl restart ha-bollette
sleep 1
systemctl is-active -q ha-bollette || { echo "Il servizio delle bollette non parte:"; journalctl -u ha-bollette -n 20 --no-pager; exit 1; }

# nginx: configurazione nuova, controllata prima di toccare il sito.
install -m 644 nginx-ha-dashboard.conf /etc/nginx/sites-available/ha-dashboard
ln -sf ../sites-available/ha-dashboard /etc/nginx/sites-enabled/ha-dashboard
rm -f /etc/nginx/sites-enabled/default
nginx -t -q

# Scambio della cartella: la versione precedente resta in ha-dashboard.old.
rm -rf /var/www/ha-dashboard.old
if [ -d /var/www/ha-dashboard ]; then mv /var/www/ha-dashboard /var/www/ha-dashboard.old; fi
mv /var/www/ha-dashboard.new /var/www/ha-dashboard
systemctl reload nginx
echo "== Bollette: servizio attivo, dati in /var/lib/ha-dashboard"
