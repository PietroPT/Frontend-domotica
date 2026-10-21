@echo off
rem Avvio della dashboard sul PC con un doppio clic.
rem Aggiorna il codice da GitHub, installa i pacchetti che mancano, avvia e apre il browser.
rem Per fermarla: chiudere questa finestra (oppure Ctrl+C).
chcp 65001 >nul
cd /d "%~dp0"
title HA-Dashboard
rem Solo dalla copia di lavoro (C:\HA-Dashboard): da Drive installerebbe migliaia di file nella cartella sincronizzata.
if not exist ".git\" (
  echo Questo file va lanciato dalla copia sul PC, C:\HA-Dashboard, non da qui:
  echo %~dp0
  pause
  exit /b 1
)

if not exist .env (
  copy .env.example .env >nul
  echo Creato .env con l'indirizzo di Home Assistant.
)

rem Da qui in poi un unico blocco: cmd lo legge tutto prima di eseguirlo, quindi git pull può
rem aggiornare questo stesso file senza che cmd riprenda a leggerlo da un punto sbagliato.
(
  echo Aggiorno il codice da GitHub...
  git pull --ff-only
  if errorlevel 1 echo Aggiornamento non riuscito: parto con la versione già presente.

  echo Controllo i pacchetti...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo Installazione dei pacchetti non riuscita: leggi il messaggio qui sopra.
    pause
    exit /b 1
  )

  echo.
  echo Avvio. Il browser si apre da solo su http://localhost:5173
  echo Lascia aperta questa finestra: chiudendola la dashboard si ferma.
  call npm.cmd run dev -- --open
  pause
)
