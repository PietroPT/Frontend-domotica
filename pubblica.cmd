@echo off
rem Pubblica la dashboard sull'LXC con nginx: aggiorna i sorgenti, fa la build e la copia.
rem Doppio clic da Esplora file. L'indirizzo dell'LXC sta in .env alla riga PUBBLICA_SU=root@...
rem La copia passa da SSH con la chiave del PC: nessuna password in questo file.
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "DEST="
if exist ".env" for /f "usebackq tokens=1,* delims==" %%a in (".env") do if /i "%%a"=="PUBBLICA_SU" set "DEST=%%b"
if not defined DEST (
  echo Manca la riga PUBBLICA_SU=root@indirizzo-dell-LXC nel file .env
  goto errore
)

echo == Aggiorno i sorgenti
git pull --ff-only || goto errore
echo == Installo le dipendenze
call npm.cmd install --no-audit --no-fund || goto errore
echo == Build
call npm.cmd run build || goto errore

echo == Copio su %DEST%
ssh %DEST% "rm -rf /var/www/ha-dashboard.new" || goto errore
scp -q -r dist %DEST%:/var/www/ha-dashboard.new || goto errore
scp -q deploy\nginx-ha-dashboard.conf %DEST%:/etc/nginx/sites-available/ha-dashboard || goto errore
rem Scambio della cartella solo se la configurazione di nginx e' valida; la versione precedente resta in ha-dashboard.old
ssh %DEST% "ln -sf ../sites-available/ha-dashboard /etc/nginx/sites-enabled/ha-dashboard && rm -f /etc/nginx/sites-enabled/default && nginx -t -q && rm -rf /var/www/ha-dashboard.old && { mv /var/www/ha-dashboard /var/www/ha-dashboard.old 2>/dev/null; mv /var/www/ha-dashboard.new /var/www/ha-dashboard; } && systemctl reload nginx" || goto errore

echo.
echo Pubblicata. Ricarica la pagina della dashboard.
pause
exit /b 0

:errore
echo.
echo Pubblicazione NON riuscita: leggi il messaggio qui sopra.
pause
exit /b 1
