# HA-Dashboard — interfaccia personalizzata per Home Assistant

**Aggiornato il 21 ottobre 2026.** Fase 1 (mockup) confermata da Pietro. **Fase 2 (collegamento) consegnata, in attesa della prova di Pietro sul suo Home Assistant** e della sua conferma prima della fase 3.

Home Assistant resta il motore (integrazioni, automazioni, configurazione). La nuova app è solo l'interfaccia e parla con HA attraverso la API WebSocket ufficiale (`home-assistant-js-websocket`).

## Dove sta cosa

| Cosa | Dove |
|---|---|
| Codice, copia principale con la cronologia | GitHub `PietroPT/Frontend-domotica`, branch `claude/ecstatic-archimedes-kwey31` |
| Copia dei sorgenti | questa cartella (`HA-Dashboard\`): stessa struttura del repository, senza `node_modules` e senza le skill `.claude\`. **È ferma alla fase 1**: il codice della fase 2 è solo su GitHub (commit `69edca4`), da cui si scarica con `git clone` o `git pull` |
| Immagini d'esempio della fase 1 | `HA-Dashboard\immagini\` |
| Profilo del prodotto (utenti, vincoli, regole) | `HA-Dashboard\PRODUCT.md` |
| Sistema grafico (colori, caratteri, componenti) | `HA-Dashboard\DESIGN.md` |
| Come provarla sul PC | qui sotto, «Fase 2 — da fare per provarla», e `HA-Dashboard\README.md` |
| Mockup da aprire sul telefono, senza installare nulla | https://claude.ai/artifact/Svq8v6PsfBhMorj3WG1y6o (privato: lo apre solo Pietro; dati finti della fase 1) |

**Perché il codice vive su GitHub e qui c'è una copia:** `npm install` crea una cartella `node_modules` con migliaia di file; dentro `G:\Il mio Drive\` Google Drive proverebbe a sincronizzarli tutti. Si lavora in una cartella locale (`C:\HA-Dashboard`) clonata dal repository; la copia su Drive si aggiorna a ogni fine fase.

## Fasi

| Fase | Contenuto | Stato |
|---|---|---|
| 1. Mockup | Interfaccia completa con dati finti, nessun collegamento a HA | **fatta e confermata** il 21/10 |
| 2. Collegamento | Login HA (OAuth, `getAuth`), aree ed entità, stati reali in tempo reale | **fatta** il 21/10, provata su un HA di prova; **da provare sull'HA di casa** |
| 3. Controlli | Comandi veri (accendi/spegni, regolazioni), grafici dalla cronologia di HA | da fare |
| 4. Pubblicazione | Build statica servita da un LXC leggero con nginx su Proxmox, token del pannello kiosk | da fare |

## Fase 2 — da fare per provarla

Tre passi. **Nessuna password nuova**: si entra con nome utente e password di Home Assistant che usi già.

### 1. Home Assistant: permettere il login dalla dashboard

**Perché:** dopo il login, la dashboard ritira l'accesso da HA con una richiesta dal proprio indirizzo (`http://localhost:5173`). Il browser la blocca se HA non dichiara quell'indirizzo come permesso: è la lista `cors_allowed_origins`. Il collegamento in tempo reale (WebSocket) non ne ha bisogno, il login sì.

Dalla versione 2026.8 di HA la configurazione HTTP non si scrive più in `configuration.yaml` ma si gestisce dall'interfaccia (se si mette un blocco `http:` nel file, HA lo importa una volta e poi mostra l'avviso «HTTP YAML configuration is ignored after migration»: va tolto dal file).

1. **Impostazioni → Sistema → Rete**, scheda **Server HTTP → Altre opzioni**.
2. Sotto **Origini consentite CORS** clicca **Aggiungi Origini consentite CORS** e scrivi `http://localhost:5173` (`http`, non `https`, senza barra finale). La voce `https://cast.home-assistant.io` è quella predefinita di HA: si lascia.
3. **Salva** sotto «Altre opzioni»: HA si riavvia. Se dopo il riavvio chiede di confermare le nuove impostazioni, conferma.
4. Se in `configuration.yaml` c'è un blocco `http:`, toglilo (File editor), salva, controlla con **Impostazioni → Strumenti → scheda YAML → Verifica configurazione** e riavvia con **Impostazioni → ⋮ (in alto a destra) → Riavvia Home Assistant** (da HA 2026.2 gli «Strumenti per sviluppatori» non sono più nella barra laterale: stanno in Impostazioni → Strumenti).

**Fatto il 21/10:** Pietro ha messo il blocco `http:` nel file; al riavvio HA (versione successiva alla 2026.8) l'ha importato e `http://localhost:5173` risulta nella lista delle origini CORS.

**Rischio:** basso. La lista permette solo a una pagina aperta su `localhost:5173` di *chiedere* l'accesso; senza nome utente e password di HA non ottiene nulla. Nella fase 4 si aggiungerà l'indirizzo dell'LXC e `localhost` si potrà togliere.

### 2. PC: avviare la dashboard

Serve **Node.js 22 o più recente** (https://nodejs.org, versione «LTS», installazione con le opzioni proposte) e **Git** (https://git-scm.com). Poi in **PowerShell**:

```powershell
git clone https://github.com/PietroPT/Frontend-domotica.git C:\HA-Dashboard
cd C:\HA-Dashboard
git checkout claude/ecstatic-archimedes-kwey31
Copy-Item .env.example .env
npm install
npm run dev
```

- `.env` contiene solo l'indirizzo di HA (`http://10.10.50.10:8123`), già scritto: **nessun segreto**, ed è escluso da git.
- Se avevi già clonato il repository per la fase 1: `cd C:\HA-Dashboard`, `git pull`, `Copy-Item .env.example .env`, `npm install`, `npm run dev`.
- Il mockup con i dati finti resta disponibile su `http://localhost:5173/?demo`.

### 3. Primo accesso e cosa guardare

1. Apri `http://localhost:5173`. Si apre la pagina di login di HA con l'avviso «Stai per dare accesso a http://localhost:5173/»: è normale, è la dashboard che chiede l'accesso. Entra con le tue credenziali di HA.
2. Torni alla dashboard con i tuoi dati veri. Dalla seconda volta non chiede più il login: l'accesso resta salvato **solo in questo browser**.
3. Guarda e dimmi:
   - **Casa:** le stanze sono quelle delle aree di HA? Ci sono dispositivi «Senza stanza» che invece hanno una stanza?
   - **Avanzate** (scorri il cursore): compaiono le schede **UPS** e **Rack** con valori sensati? Se una manca, i nomi delle entità sono diversi da quelli previsti e lo sistemo.
   - **Telecamere:** si vedono le immagini di Soggiorno e Ufficio? Aprendone una, il video si muove?
   - **Energia:** ci sono tutte le prese con i consumi?
   - Toccando un comando compare «Comandi non ancora attivi: arrivano con la fase 3»: è voluto.
4. Se qualcosa non va, la dashboard mostra «Non riesco a collegarmi» con il motivo. Il caso più probabile è il passo 1 (lista `cors_allowed_origins` mancante o scritta diversa).

**Avvio dalle volte successive:** doppio clic su `C:\HA-Dashboard\avvia.cmd`. Fa da solo `git pull`, `npm install` e `npm run dev`, e apre il browser su `http://localhost:5173`. Usa `npm.cmd`, quindi non serve cambiare le impostazioni di sicurezza di PowerShell. Collegamento sul desktop: tasto destro su `avvia.cmd` → **Mostra altre opzioni** → **Invia a** → **Desktop (crea collegamento)**. La finestra nera va lasciata aperta finché si usa la dashboard.

**Uscire:** Avanzate → Accesso → **Esci da questo dispositivo** revoca l'accesso di questo browser in HA.

## Fase 2 — cosa è stato fatto

**Scelte (con il perché):**
- **Login di HA (OAuth, `getAuth`)**: nel codice non c'è nessun token. HA rilascia l'accesso dopo il login e il browser lo conserva (`localStorage`, chiave `ha-dashboard.accesso`); si rinnova da solo. Si accetta solo l'accesso emesso dall'HA scritto in `.env`.
- **Solo lettura in questa fase**: i comandi non partono e lo dicono. Le regole di sicurezza delle prese vanno prima verificate sui nomi reali delle entità (fase 3).
- **Regole di sicurezza riconosciute dal nome**, non da un `entity_id` preciso: «rack» → nessun comando, «friggit» → solo spegnere, «stampant / Core One / Prusa» → conferma prima di spegnere. Se una presa viene rinominata in HA la regola resta. Rack e UPS non si possono mettere nella Casa.
- **Abbinamenti per dispositivo**: presa ↔ sensore di potenza, telecamera ↔ sensore di movimento si trovano perché stanno sullo stesso dispositivo di HA, non indovinando il nome.
- **Aggiornamenti senza interrogazioni periodiche**: stati con `subscribeEntities`; aree, dispositivi ed entità riletti solo quando HA segnala una modifica. Se la connessione cade compare «Connessione a Home Assistant persa: riprovo…» e riparte da sola.
- **Casa al primo avvio**: tutte le luci, prese, termostati e telecamere (senza infrastruttura e senza le entità nascoste o tecniche di HA). Con «+» si toglie o aggiunge; la scelta resta su quel dispositivo.
- **Telecamere**: nei riquadri un fotogramma da HA ogni 10 secondi; a schermo intero il video continuo (MJPEG) attraverso HA, quindi funziona anche dal tunnel. L'orientamento verticale si ricava dall'immagine.
- **Rinominare** (richiesta di Pietro, 21/10): si tocca il riquadro, poi il nome in alto nel foglio (icona della matita); in Clima la riga «Nome». Il nome si salva **in Home Assistant** (registro delle entità, scelta di Pietro): vale nella dashboard su ogni dispositivo, per l'altra persona e nell'app di HA. L'entity_id non cambia, quindi automazioni e regole di sicurezza restano agganciate. Campo vuoto = torna al nome originale. Serve un utente amministratore di HA. È l'unica scrittura verso HA della fase 2: cambia un nome, non comanda dispositivi. Provata sull'HA di prova: rinomina, aggiornamento del riquadro, ritorno al nome originale.
- **UPS e stampante** riconosciuti dall'integrazione che li crea (NUT, PrusaLink) e dal nome interno della misura, non dall'entity_id: sull'HA di casa la scheda UPS non compariva con il primo metodo.
- **Casa al primo avvio**: fra gli interruttori solo le prese vere (con sensore di potenza); restano fuori «Permit join» di Zigbee2MQTT e i comandi del distributore di crocchette.
- **Grafici**: la cronologia arriva con la fase 3; per ora i grafici dicono «Cronologia non ancora collegata» invece di mostrare valori finti.

**Prova eseguita (21/10):** Home Assistant **2026.2.3** di prova, avviato nell'ambiente di sviluppo con le entità dell'integrazione `demo` e `cors_allowed_origins: http://localhost:5173`. Esito, con un browser automatico (Chromium):
- reindirizzamento alla pagina di login di HA, login, ritorno alla dashboard: **ok**;
- stati reali e immagini delle telecamere: **ok**; dopo un ricaricamento entra senza login: **ok**;
- un comando mostra l'avviso e non parte: **ok**; «Esci da questo dispositivo» riporta al login: **ok**;
- trovato e corretto: con tre telecamere la riga della Casa usciva dallo schermo del telefono.

Il mockup (senza `.env`) è stato ricontrollato e non è cambiato.

## Fase 1 — cosa è stato fatto

**Scelte (con il perché):**
- **Stack: Vite + TypeScript + Svelte 5.** Svelte ridisegna solo il valore che cambia: i consumi delle prese arrivano ogni pochi secondi, e sul Raspberry Pi 4 del pannello conta. Il pacchetto finale è piccolo (circa 47 KB compressi di codice con la libreria di connessione).
- **Direzione grafica:** scelta da Pietro il 21/10 fra tre schizzi (Maiolica, Linea, Standard): **lo standard di categoria, stile Apple Casa**. Riquadri arrotondati che diventano bianchi pieni quando il dispositivo è acceso, un colore per categoria (luci ambra, clima verde, energia blu, sicurezza viola, rack azzurro), sfondo sfumato. Gli schizzi scartati restano nel repository, `.impeccable\mocks\decision\`.
- **Icone disegnate su misura** (griglia 24, tratto 1,75, riempimento tenue): casa, stanze, luci, lampada, striscia LED, termostato, prese, lavatrice, stampante 3D, friggitrice, rack, UPS, telecamera, Zigbee, crocchette, automazioni (riavvio, avviso, crocchette) e altre.
- **Utenti:** Pietro e un'altra persona. La parte tecnica (UPS, rack, servizi, automazioni, accesso) sta in **Avanzate**, che si apre solo **facendo scorrere il cursore** «Scorri per Avanzate».
- **Dispositivi:** iPhone, PC, tablet, pannello a muro (Pi 4, Chromium kiosk). Telefono: barra in basso. Tablet, PC e pannello: colonna laterale. Pannello: riquadri più alti, nessun effetto solo al passaggio del mouse.
- **Tema:** automatico (segue il dispositivo), chiaro o scuro; si cambia dal pulsante in alto nella Casa o in Avanzate → Aspetto.

**Pagine:** Casa, Luci, Clima (quadrante circolare), Energia, Telecamere, Avanzate. Fogli di dettaglio: luce (slider della luminosità, colore), presa (grafico, comando con conferma), telecamera a tutto schermo, **Aggiungi alla Casa** (cerca, filtra, aggiungi o togli per stanza).

**Regole di sicurezza** (`src\lib\policy.ts`), prese dal [piano HA](<../Documenti rack/piano-home-assistant.md#prese-zigbee-sonoff-s60zbtpf-7-ottobre-2026>): presa del **rack** solo misura; **friggitrice** solo spegnere; **stampante 3D** avviso sul raffreddamento prima di spegnere; qualunque presa sopra 50 W chiede conferma prima di spegnersi; **UPS** solo in lettura.

**Revisione:** la build della fase 1 è passata da una revisione indipendente (agente di revisione della skill impeccable), verdetto finale «ship».

## Cosa NON è dimostrato

- **Nessuna prova sull'HA di casa.** La fase 2 è provata su un HA 2026.2.3 di prova con dispositivi finti dell'integrazione `demo`. Da vedere con i dati veri: versione di HA, aree, nomi delle entità di **NUT (UPS), PrusaLink, PetKit, Zigbee2MQTT**, la presa del rack disattivata.
- **Telecamere Frigate attraverso HA**: provate solo con le telecamere finte di HA. Non misurati il carico del video continuo su Frigate e HA, né la resa dal tunnel WireGuard.
- **Nessuna prova su un dispositivo vero.** Catture di un browser (Chromium) a 390×844 (telefono) e 1280×800 (pannello). Non provati: iPhone/Safari, il Pi 4, i tablet.
- **Leggibilità a distanza sul pannello** non misurata.
- **Scelta di cosa sta nella Casa** salvata solo nel browser: non condivisa fra telefono, PC e pannello. Da decidere (dati utente di HA, ma ogni persona ha il suo utente).
- **Cronologia e comandi**: non collegati (fase 3).

## Prossimo passo

**Prova di Pietro della fase 2 sul suo HA** (passi qui sopra) e conferma. Poi **fase 3: controlli**: comandi veri con le regole di sicurezza verificate sui nomi reali, grafici dalla cronologia di HA (`history/stream` per le ultime 24 ore, statistiche per l'energia di oggi).

Anticipato e **non ancora fatto**:
- per far usare la dashboard all'altra persona serve un suo utente in HA (**Impostazioni → Persone → Aggiungi persona → Può effettuare l'accesso**). La password: HA non è esposto su internet (solo rete di casa e WireGuard), quindi basta una **frase facile da ricordare e da scrivere sul telefono**, purché non usata altrove; l'opzione «Può accedere solo dalla rete locale» la limita ancora. Utile dalla fase 4, quando la dashboard sarà pubblicata;
- il **token a lunga durata** servirà solo al pannello kiosk (fase 4). Lo genera HA, quindi è già lungo e casuale; va trattato come una password forte e resta solo sul Pi, mai nel repository.

## Errori di metodo

- **Percorsi dell'interfaccia di HA dati per versioni vecchie** (21/10): `http:` in `configuration.yaml` (dalla 2026.8 si usa Impostazioni → Rete) e «Strumenti per sviluppatori» nella barra laterale (dalla 2026.2 sono in Impostazioni → Strumenti). La prova era su HA 2026.2.3, più vecchio di quello di casa. **Regola da qui in poi:** prima di dare un percorso dell'interfaccia di HA, verificarlo sulla documentazione della versione più recente.

- Il percorso indicato per i documenti di passaggio era `Rack\Handoff\`, che non esiste: si è seguito lo schema esistente (`Avvio sessione AI\HANDOFF.md` più un `LEGGIMI.md` per argomento).
- Il primo schizzo del termostato mostrava un'umidità che il MOES non misura: tolta prima della build.
- La skill «frontend design» citata da Pietro non è disponibile in questa sessione: usate `impeccable` e `karpathy-guidelines`.
- Diversi caricamenti su Drive sono stati bloccati dal controllo automatico della modalità «Auto»; ripresi in «Accetta modifiche» con conferma manuale.
- Fase 2: la prima prova automatica ha trascinato il quadrante del termostato invece del cursore di Avanzate (nessun effetto: i comandi sono spenti). Ripetuta aprendo Avanzate direttamente.

## Letti e non letti

**Letti:** livello 1 (`00-INIZIA-DA-QUI`, `REGOLE`, `HANDOFF`), `FINE-SESSIONE`, `MAPPA-PROGETTO`, `piano-home-assistant.md`. **Non letti:** schede Frigate e UPS, `STATO-ATTUALE.md`, scheda rete e scheda rack, archivio. **Vault Obsidian:** non accessibile da questa sessione → **allineamento parziale**, vedi l'handoff.
