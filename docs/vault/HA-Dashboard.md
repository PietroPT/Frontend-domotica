---
tipo: progetto
area: [informatica]
stato: attivo
scadenza: 
tags: [homelab, home-assistant, domotica, dashboard, svelte, frontend]
creata: 2026-10-21
---

# HA-Dashboard

## Obiettivo

Un'interfaccia web personalizzata per [[Home Assistant OS su Proxmox|Home Assistant]], al posto della dashboard standard. Come si capisce che è finita: la usano entrambe le persone di casa dai propri dispositivi, e il pannello a muro sul Pi 4 la mostra da solo.

Avviata il **21/10/2026**; fasi 1–3 fatte e confermate da Pietro lo stesso giorno. Fase 4 (pubblicazione) in corso: la dashboard è pubblicata su `http://10.10.50.21`. Il **22/10** sono entrati gli utenti di HA «Pannello» (con il suo token) e «Filippo», e nel pomeriggio stanze modificabili, friggitrice accendibile con avviso, costi e andamento dell'energia, **bollette** con archivio nel CT 203 e ordine dei riquadri della Casa uguale per tutti. Il **23/10** la sezione **Spese** (come Splitwise, per Pietro e Filippo) e le **icone dell'app** «Casa» e «Spese». Il pannello sul Pi è rimandato: manca lo schermo.

Pagine: Casa (ordine dei riquadri con la matita), Luci, Clima, Energia (prese con costi e andamento, bollette), Telecamere, Allarme (da fare), Spese, Avanzate (stanze e parte tecnica).

Dettagli operativi — uso, istruzioni, prove, regole complete: `AI\Rack\HA-Dashboard\LEGGIMI.md`.
**Codice:** GitHub `PietroPT/Frontend-domotica`, branch `claude/ecstatic-archimedes-kwey31`, ultimo commit di codice del 23/10 `e15bf1e`; copia sul PC in `C:\HA-Dashboard`. Per l'uso di tutti i giorni basta `http://10.10.50.21`: `avvia.cmd` serve solo a provare le modifiche prima di pubblicarle con `pubblica.cmd`. Il codice **non sta nel vault**.

## Come funziona

- **Home Assistant resta il motore** — integrazioni, automazioni, configurazione. La dashboard è solo l'interfaccia, collegata con la API WebSocket ufficiale.
- Svelte 5 + TypeScript + Vite: pacchetto piccolo (≈67 KB compressi al 22/10), pensato anche per il Pi 4 del pannello a muro.
- Dati dal vivo senza interrogazioni periodiche: stati, aree e dispositivi, cronologia delle ultime 24 ore, energia di oggi dalle statistiche di HA.
- Accesso con il login di HA, **nessun token nel codice**. Il pannello a muro entrerà con un token a lunga durata che sta solo sul Pi e si revoca da HA.
- Pubblicata nel **CT 203 `ha-dashboard`** su pve1, con nginx: `http://10.10.50.21`, in SERVERS → [[Cluster Proxmox]]. Build fatta sul PC e copiata via SSH con chiave (`pubblica.cmd`). Raggiungibile anche da fuori casa col tunnel → [[Rete domestica segmentata]].
- **Dal 22/10 nel CT c'è anche un servizio suo:** `ha-bollette` (systemd, utente `bollette` senza privilegi) ascolta **solo su `127.0.0.1:8099`** e nginx gli passa `/api/` sulla porta 80 già aperta — nessuna porta e nessuna regola di firewall nuove. Tiene bollette, disposizione della Casa e, dal 23/10, le spese in `/var/lib/ha-dashboard/` (`bollette.json`, `casa.json`, `spese.json`, `storico/` con le ultime 100 versioni di ciascun archivio). Ogni richiesta porta il token di HA con cui la dashboard è entrata, e il servizio chiede a HA chi è: **nessuna password o chiave nel CT né nel codice**.
- **I dati di bollette e spese esistono solo nel CT 203**, che è nel backup notturno di Proxmox → [[Backup configurazioni di rete#CT 203 HA-Dashboard nel backup — 22 ottobre 2026]].

## Decisioni di Pietro (21/10)

- **Stile:** lo standard di categoria, tipo Apple Casa; icone disegnate su misura.
- **Utenti:** Pietro e un'altra persona. La parte tecnica (UPS, rack, servizi, automazioni) sta in **Avanzate**, che si apre facendo scorrere un cursore.
- **Dispositivi:** iPhone, PC, tablet, pannello Pi 4.
- **I nomi si cambiano dalla dashboard e si salvano in Home Assistant.** Gli `entity_id` non cambiano, quindi automazioni e regole restano agganciate.
- **Termostato:** in grande la temperatura della stanza, in piccolo l'obiettivo, solo il numero nel colore del termostato (scartate «Impostata a» e un'icona a bersaglio). Mentre si modifica, in grande il valore che si imposta.
- Pulsante **Cibo extra** in Cucina per il distributore PetKit (10–50 g): provato, eroga.
- Telecamera della stampante 3D **esclusa** dalle telecamere della casa → [[Frigate e telecamere Imou]].
- Sezione **Allarme** nel menu, da configurare più avanti.

## Decisioni di Pietro (22/10)

- **Stanze:** dalla dashboard si sposta un dispositivo in un'altra stanza, si creano e si rinominano le stanze (sono le **aree** di Home Assistant); solo gli amministratori.
- **Friggitrice:** si accende anche da remoto, ma **solo dopo un avviso** (cestello inserito, niente appoggiato sopra o intorno) **e una conferma**. Fino al 22/10 si poteva solo spegnere.
- **Energia:** costi delle prese misurate al prezzo per kWh inserito (salvato in HA, lo cambia un amministratore) e andamento dei consumi in kWh o euro per giorni, mesi e anni, dalle statistiche a lungo termine di HA. Il prezzo giusto è **quello di un kWh in più**, non il totale della bolletta diviso i kWh.
- **Bollette** di luce, gas, acqua e TARI, dentro Energia: inserite a mano o importate da un file preparato leggendo i PDF; **le possono inserire e modificare tutti** gli utenti di HA (nella prova del mattino i non amministratori erano in sola lettura: cambiato da Pietro dopo averla vista).
- **Casa:** l'ordine dei riquadri si cambia con le frecce (matita accanto a +) ed è **uno solo per tutti** gli utenti e i dispositivi, salvato nel CT 203.
- **Pannello sul Pi rimandato** a quando avrà lo schermo.

## Decisioni di Pietro (23/10)

- **Spese**, voce nuova del menu, che replica Splitwise per Pietro e Filippo: saldo di chi deve a chi, spese divise a metà, a importi, a percentuali, a quote o tutte all'altro, «Salda» per i rimborsi, spese che si ripetono, totali per periodo e categoria, esportazione CSV. Le modificano tutti gli utenti di HA; chi guarda è riconosciuto dal nome del suo utente di HA. Archivio nel CT 203 come le bollette. Mancano rispetto a Splitwise: altre valute, foto degli scontrini, commenti, più di due persone.
- **Icona dell'app «Casa»**: la casetta del set di icone, di vetro sul fondo scuro, con la porta accesa d'ambra (scelta fra tre proposte). **Icona «Spese»**: una moneta indaco con l'€ al centro, sullo stesso fondo, anche nel menu (scartate le due monete). Salvando la pagina Spese sulla schermata Home nasce un'app «Spese» che si apre direttamente lì.

## Utenti di HA (22/10)

- **«Pannello»** (`pannello`): non amministratore, **solo accesso locale**, password generata, nessun dispositivo; serve solo a produrre il token a lunga durata del pannello a muro. Non amministratore di proposito: un token vale quanto il suo utente, e dal Pi potrebbe essere letto.
- **Token del pannello:** creato da Profilo → Sicurezza → Token di accesso a lungo termine; sta **solo nel password manager** (voce «Token HA Pannello»), mai in chat, screenshot, Drive o repository. Vale 10 anni, si revoca dalla stessa schermata. Finora **mai usato** sull'HA di casa.
- **«Filippo»**, per l'altra persona: non amministratore, solo accesso locale. Da non amministratore usa tutta la dashboard ma non rinomina.
- **Percorso di HA letto nell'interfaccia:** *Impostazioni → Persone → Aggiungi persona*, con l'interruttore *Consenti l'accesso*; nella versione di casa i campi dell'utente stanno nella stessa finestra e il pulsante finale è **Aggiungi** (sull'HA di prova, 2026.2, erano una finestra «Aggiungi utente» e il pulsante **Crea**) → [[Un percorso di GUI o lo si e visto o va dichiarato da verificare|Un percorso di GUI o lo si è visto o va dichiarato da verificare]].
- **Aggiornamenti automatici di sicurezza** nel CT 203 attivati il 22/10 (`unattended-upgrades` 2.12, primo giro previsto il 23/10 alle 06:11).

## Regole di sicurezza sui comandi

Ricontrollate prima di ogni comando, riconosciute da `entity_id`, nome e dispositivo:

| Dispositivo | Regola |
| --- | --- |
| Presa del **rack** | **Mai comandata**, solo misura |
| **Friggitrice** | ~~Solo spegnere~~ → **dal 22/10 si accende anche a distanza, solo dopo avviso e conferma** (decisione di Pietro) |
| **Stampante 3D**, **programma dei pasti**, qualunque presa **sopra 50 W** | Chiedono conferma prima di spegnersi |
| **Automazione** | Disattivarla richiede un doppio tocco |
| **UPS** | Sola lettura |

La presa del rack è la stessa che in HA ha già le entità di comando disattivate: la regola nella dashboard è il secondo strato, non il primo → [[Home Assistant OS su Proxmox]].

## Lezioni

- **Home Assistant di casa è più recente della 2026.8:** la configurazione HTTP (origini CORS) si fa da *Impostazioni → Sistema → Rete → Server HTTP → Altre opzioni*, non più in `configuration.yaml`; gli «Strumenti per sviluppatori» stanno in *Impostazioni → Strumenti*. Regola: prima di dare un percorso dell'interfaccia di HA, verificarlo sulla versione più recente.
- **I nomi delle entità vanno letti, non previsti.** UPS (NUT) e stampante (PrusaLink) si riconoscono dall'integrazione; gli `entity_id` del distributore PetKit sono stati letti dalla pagina Stati → [[Un nome di device non e un identificatore|Un nome di device non è un identificatore]].
- Sul PC Windows, in PowerShell si usa `npm.cmd`: gli script `.ps1` sono bloccati.
- **Uno script che si aggiorna da solo esegue ancora i passi vecchi:** la prima pubblicazione dopo il cambio di `pubblica.cmd` ha fatto il `git pull` e poi i passi della versione precedente, lasciando il servizio `ha-bollette` non installato. Ora lo script **si rilancia** se il pull lo ha cambiato → [[Uno script che si aggiorna da solo esegue ancora i passi vecchi]].
- **Nelle bollette lo stesso consumo può comparire due volte** (acconto e conguaglio): per confrontare i periodi non devono sovrapporsi → [[Una spesa annuale non e una spesa del mese in cui cade|Una spesa annuale non è una spesa del mese in cui cade]].
- **Prezzo dell'energia:** consigliato prima come totale della bolletta ÷ kWh, corretto lo stesso giorno. Per decidere se accendere qualcosa serve il **costo marginale**, cioè un kWh in più, non la media che comprende quote fisse e oneri.
- **Un foglio nuovo si guarda sia a misura di telefono sia di PC** prima di consegnarlo: il modulo delle Spese, provato solo sul telefono, sul PC aveva le categorie tagliate e col mouse non scorrevano (trovato da Pietro, 23/10). Allo stesso modo un'icona si guarda anche in grande: l'€ della prima icona Spese, visto solo in piccolo, in grande sembrava un «3» rovesciato.

## Prossima azione

- [ ] **Spese con Filippo:** farlo entrare e controllare che veda il saldo in seconda persona e le stesse spese.
- [ ] **Icone sull'iPhone:** aggiungere «Casa» dalla pagina principale e «Spese» dalla pagina Spese; login da ciascuna.
- [ ] Provare l'accesso di **Filippo dal tunnel** (gli indirizzi `10.10.80.x` sono privati, quindi per HA dovrebbero valere come «solo locale»: da dimostrare).
- [ ] **Export di OPNsense** dopo le regole del 21–22/10: fermo al `Backup al 20-10-2026 2.0.xml` → [[Backup configurazioni di rete]].
- [ ] Bollette mancanti: **luce di ottobre 2025** e **gas di marzo 2026**; saldo TARI 2026 da inserire dal 01/10 al 31/12. L'acqua da 163,72 € scaduta il 30/09 è segnata pagata **senza conferma**.

## Task

- [x] Fasi 1–3: interfaccia, collegamento, comandi e regole di sicurezza, cronologia, energia, rinomina, Cibo extra, termostato, Allarme segnaposto (21/10).
- [x] Fase 4 parte 1: CT 203 con nginx, build pubblicata, aperta anche dal tunnel (21/10).
- [x] Utenti di HA «Pannello» (con token) e «Filippo»; log delle regole REMOTO spento; aggiornamenti automatici nel CT 203 (22/10 mattina).
- [x] Stanze modificabili, friggitrice con avviso, costi e andamento dell'energia, bollette con importazione (36 dentro), ordine della Casa condiviso; CT 203 verificato nel backup (22/10 pomeriggio).
- [ ] **Pannello sul Pi 4** quando ci sarà lo schermo; poi fluidità e leggibilità a 2–3 m.
- [ ] Sezione **Allarme** da progettare.
- [x] Sezione **Spese** come Splitwise; icone dell'app «Casa» e «Spese» (23/10).
- [ ] Installare la dashboard come app su PC e iPhone (le icone ci sono).
- [ ] Provare su **tablet**.
- [ ] Misurare il carico del video delle telecamere su Frigate e HA, e la resa dal tunnel WireGuard.
- [ ] Riordino delle **stanze** (non solo dei riquadri): proposto, non chiesto.
- [ ] Presa della friggitrice dopo un blackout: ancora «previous», proposto «off» → [[Home Assistant OS su Proxmox]]. Non deciso.

## Non verificato

- Stanze, friggitrice, costi e andamento dell'energia: provati solo sull'**HA di prova** (2026.2.3) e nel mockup. Sul CT 203 Pietro ha **riferito** «funziona» per l'importazione delle bollette e per l'ordine della Casa.
- I valori delle 36 bollette sono stati letti dai PDF dall'assistente: **Pietro non li ha ricontrollati**. Se abbia impostato il prezzo dell'energia non è noto.
- **Ripristino del CT 203 mai provato**, né dell'archivio intero né del solo `bollette.json`.
- Utente «Filippo» **riferito, non visto**; accesso «solo locale» dal tunnel non provato; **token del pannello mai usato** sull'HA di casa.
- Protezioni di systemd del servizio `ha-bollette` dentro un CT non privilegiato: non provate.
- **Spese:** pubblicate e aperte dal PC sul CT 203 (screenshot, riconosciuto come Pietro), «funziona» **riferito da Pietro**. Non provati: Filippo, un secondo dispositivo, una spesa che si ripete arrivata alla data, il CSV in Excel, l'iPhone. **Icone:** pubblicate, «va» riferito da Pietro senza dire cosa ha provato; schermata Home dell'iPhone e installazione da Edge o Chrome in `http` non provate.
- Sull'iPhone la dashboard si apre, anche dal tunnel (**riferito da Pietro**), ma non è stata provata funzione per funzione. Tablet e Pi 4 non provati affatto.
- Sul PC di Pietro, con **NordVPN accesa** il traffico verso `10.10.50.x` finisce nel tunnel e la dashboard non si apre: in casa la VPN resta spenta (terza volta dopo il 01/10 e il 15/10) → [[Problemi noti e diagnosi rete]].

## Log

### 2026-10-23
- Sezione **Spese** come Splitwise (archivio `spese.json` nel CT 203, stesso servizio delle bollette), categorie su due righe sul PC, icone dell'app «Casa» e «Spese» anche nel menu. Tutto pubblicato da Pietro con `pubblica.cmd`. Commit da `2265f72` a `e15bf1e`.
- Fonte: sessione Claude sul PC del 23/10 con accesso al codice, al browser di prova e al vault, **senza accesso agli apparati**: il servizio è stato provato sul PC con un finto HA, il CT 203 solo tramite ciò che Pietro ha riferito e lo screenshot. Dettagli in `AI\Rack\HA-Dashboard\LEGGIMI.md`.

### 2026-10-22
- **Mattina:** utenti di HA «Pannello» (non amministratore, solo locale) con token a lunga durata nel password manager, e «Filippo»; immagine della persona Pannello; log tolto anche dalle regole REMOTO di HA e HA-Dashboard; `unattended-upgrades` attivato nel CT 203. Pannello sul Pi rimandato.
- **Pomeriggio e sera:** stanze modificabili, friggitrice accendibile con avviso e conferma, costi e andamento dell'energia, **bollette** con servizio `ha-bollette` nel CT 203 (36 importate, da aprile 2025 a settembre 2026), ordine dei riquadri della Casa uguale per tutti. Backup del CT 203 verificato nel job notturno e rifatto a mano dopo l'importazione. Commit di chiusura `7cd1e65`.
- Fonte: `AI\Rack\Avvio sessione AI\HANDOFF.md` del 22/10 sera, `AI\Rack\HA-Dashboard\LEGGIMI.md`, `AI\Rack\Documenti rack\scheda-rete.md`, `AI\Rack\Backup configurazioni\LEGGIMI-BACKUP.md`; bozza preparata in `AI\Rack\HA-Dashboard\vault\HA-Dashboard.md` (la sessione del 22/10 era in cloud, **senza accesso al vault**: allineamento rimasto parziale fino a oggi). Assimilata il **23/10/2026** da documenti: nessun accesso agli apparati da parte dell'assistente che ha scritto questa nota.

### 2026-10-21
- Fasi 1–3 confermate; fase 4 parte 1 fatta: dashboard pubblicata nel CT 203 su pve1.
- Fonte: `AI\Rack\HA-Dashboard\LEGGIMI.md`, `AI\Rack\Avvio sessione AI\HANDOFF.md`; nota preparata in `AI\Rack\HA-Dashboard\vault\HA-Dashboard.md`. Importazione documentale del 21/10: nessun accesso agli apparati da parte dell'assistente che ha scritto questa nota.

## Collegamenti

- [[Informatica]] · [[Homelab]] — MOC dell'area
- [[Home Assistant OS su Proxmox]] — il motore dietro la dashboard
- [[Cluster Proxmox]] — il CT 203 che la ospita
- [[Rete domestica segmentata]] — la regola che la apre dal tunnel
- [[Backup configurazioni di rete]] — il CT 203 nel backup notturno
- [[Uno script che si aggiorna da solo esegue ancora i passi vecchi]] · [[Un percorso di GUI o lo si e visto o va dichiarato da verificare|Un percorso di GUI o lo si è visto o va dichiarato da verificare]] — le due lezioni del 22/10
