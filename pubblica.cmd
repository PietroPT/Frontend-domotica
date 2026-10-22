@echo off
rem Pubblica la dashboard sull'LXC con nginx: aggiorna i sorgenti, fa la build e la copia.
rem Doppio clic da Esplora file. L'indirizzo dell'LXC sta in .env alla riga PUBBLICA_SU=root@...
rem La copia passa da SSH con la chiave del PC: nessuna password in questo file.
chcp 65001 >nul
setlocal
cd /d "%~dp0"
rem Solo dalla copia di lavoro (C:\HA-Dashboard): da Drive installerebbe migliaia di file nella cartella sincronizzata.
if not exist ".git\" (
  echo Questo file va lanciato dalla copia sul PC, C:\HA-Dashboard, non da qui:
  echo %~dp0
  pause
  exit /b 1
)

set "DEST="
if exist ".env" for /f "usebackq tokens=1,* delims==" %%a in (".env") do if /i "%%a"=="PUBBLICA_SU" set "DEST=%%b"
if not defined DEST (
  echo Manca la riga PUBBLICA_SU=root@indirizzo-dell-LXC nel file .env
  goto errore
)

rem Da qui in poi un unico blocco: cmd lo legge tutto prima di eseguirlo, quindi git pull può
rem aggiornare questo stesso file senza che cmd riprenda a leggerlo da un punto sbagliato.
(
  echo == Aggiorno i sorgenti
  git pull --ff-only || goto errore
  echo == Installo le dipendenze
  call npm.cmd install --no-audit --no-fund || goto errore
  echo == Build
  call npm.cmd run build || goto errore

  echo == Copio su %DEST%
  ssh %DEST% "rm -rf /var/www/ha-dashboard.new /root/ha-deploy && mkdir -p /root/ha-deploy" || goto errore
  scp -q -r dist %DEST%:/var/www/ha-dashboard.new || goto errore
  scp -q deploy\nginx-ha-dashboard.conf deploy\bollette.py deploy\ha-bollette.service deploy\installa.sh %DEST%:/root/ha-deploy/ || goto errore
  rem installa.sh: archivio delle bollette, poi nginx; scambia la cartella solo se la configurazione e' valida (la precedente resta in ha-dashboard.old)
  ssh %DEST% "bash /root/ha-deploy/installa.sh" || goto errore

  echo.
  echo Pubblicata. Ricarica la pagina della dashboard.
  pause
  exit /b 0
)

:errore
echo.
echo Pubblicazione NON riuscita: leggi il messaggio qui sopra.
pause
exit /b 1
