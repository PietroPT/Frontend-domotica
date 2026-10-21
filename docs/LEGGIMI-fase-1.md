# HA-Dashboard — interfaccia personalizzata per Home Assistant

**Aggiornato il 21 ottobre 2026.** Fase 1 (mockup) consegnata, **in attesa della conferma di Pietro** prima della fase 2.

Home Assistant resta il motore (integrazioni, automazioni, configurazione). La nuova app è solo l'interfaccia e parla con HA attraverso la API WebSocket ufficiale (`home-assistant-js-websocket`).

## Dove sta cosa

| Cosa | Dove |
|---|---|
| Codice, copia principale con la cronologia | GitHub `PietroPT/Frontend-domotica`, branch `claude/ecstatic-archimedes-kwey31`, commit della fase 1 `b9eeff4` e `3b4d70b` (correzioni della revisione) |
| Copia dei sorgenti | questa cartella (`HA-Dashboard\`): stessa struttura del repository, senza `node_modules` e senza le skill `.claude\` |
| Immagini d'esempio della fase 1 | `HA-Dashboard\immagini\` |
| Profilo del prodotto (utenti, vincoli, regole) | `HA-Dashboard\PRODUCT.md` |
| Come provarla sul PC | `HA-Dashboard\README.md`, sezione «Provarla sul PC» |
| Mockup da aprire sul telefono, senza installare nulla | https://claude.ai/artifact/Svq8v6PsfBhMorj3WG1y6o (privato: lo apre solo Pietro) |

**Perché il codice vive su GitHub e qui c'è una copia:** `npm install` crea una cartella `node_modules` con migliaia di file; dentro `G:\Il mio Drive\` Google Drive proverebbe a sincronizzarli tutti. Si lavora in una cartella locale (es. `C:\HA-Dashboard`) clonata dal repository; la copia su Drive si aggiorna a ogni fine fase.

## Fasi

| Fase | Contenuto | Stato |
|---|---|---|
| 1. Mockup | Interfaccia completa con dati finti, nessun collegamento a HA | **fatta** il 21/10, da confermare |
| 2. Collegamento | Login HA (OAuth, `getAuth`), lettura di aree ed entità, stati reali in tempo reale | da fare |
| 3. Controlli | Comandi veri (accendi/spegni, regolazioni), grafici dalla cronologia di HA | da fare |
| 4. Pubblicazione | Build statica servita da un LXC leggero con nginx su Proxmox, `http: cors_allowed_origins` in HA | da fare |

## Fase 1 — cosa è stato fatto

**Scelte (con il perché):**
- **Stack: Vite + TypeScript + Svelte 5.** Svelte ridisegna solo il valore che cambia: i consumi delle prese arrivano ogni pochi secondi, e sul Raspberry Pi 4 del pannello conta. Il pacchetto finale è piccolo (circa 40 KB compressi di codice).
- **Direzione grafica:** scelta da Pietro il 21/10 fra tre schizzi (Maiolica, Linea, Standard): **lo standard di categoria, stile Apple Casa**. Riquadri arrotondati che diventano bianchi pieni quando il dispositivo è acceso, un colore per categoria (luci ambra, clima verde, energia blu, sicurezza viola, rack azzurro), sfondo sfumato. Gli schizzi scartati restano nel repository, `.impeccable\mocks\decision\`.
- **Icone disegnate su misura** (griglia 24, tratto 1,75, riempimento tenue): casa, stanze, luci, lampada, striscia LED, termostato, prese, lavatrice, stampante 3D, friggitrice, rack, UPS, telecamera, Zigbee, crocchette, automazioni (riavvio, avviso, crocchette) e altre.
- **Utenti:** Pietro e un'altra persona. La parte tecnica (UPS, rack, servizi, automazioni) sta in **Avanzate**, che si apre solo **facendo scorrere il cursore** «Scorri per Avanzate» (richiesta di Pietro): non si apre per sbaglio.
- **Dispositivi:** iPhone, PC, tablet, pannello a muro (Pi 4, Chromium kiosk). Telefono: barra in basso. Tablet, PC e pannello: colonna laterale. Pannello: riquadri più alti, nessun effetto solo al passaggio del mouse.
- **Tema:** automatico (segue il dispositivo), chiaro o scuro; si cambia dal pulsante in alto nella Casa o in Avanzate → Aspetto.

**Pagine:** Casa (stanze con i loro riquadri, riepilogo clima/luci/energia/sicurezza, termostato e telecamere sul pannello), Luci (tutte, per stanza, «Spegni tutte»), Clima (quadrante circolare da trascinare, Riscalda/Spento, grafico 24 ore), Energia (potenza adesso, grafico 24 ore, consumo per presa, barre ora per ora), Telecamere (Soggiorno verticale come in Frigate, Ufficio), Avanzate. Fogli di dettaglio: luce (slider grande della luminosità, colore caldo/neutro/freddo), presa (grafico, comando con conferma), telecamera a tutto schermo, **Aggiungi alla Casa** (cerca, filtra, aggiungi o togli per stanza).

**Regole di sicurezza nel codice** (`src\lib\policy.ts`), prese dal [piano HA](<../Documenti rack/piano-home-assistant.md#prese-zigbee-sonoff-s60zbtpf-7-ottobre-2026>):
- presa del **rack**: nessun comando, solo misura, con il motivo scritto;
- **friggitrice**: si può solo spegnere, mai accendere da qui;
- **stampante 3D**: prima di spegnerla un avviso sul raffreddamento dell'estrusore;
- qualunque presa che sta assorbendo più di 50 W chiede conferma prima di spegnersi (es. lavatrice a metà lavaggio);
- **UPS** solo in lettura (NUT senza credenziali, come configurato il 20/10).

**Il modello dei dati è quello di HA** (stati, aree, registro entità e dispositivi; l'area di un'entità è la sua o quella del dispositivo, come in HA). Nella fase 2 si sostituisce solo la sorgente (`src\lib\ha\mock.ts` → connessione vera); le pagine non cambiano.

**Dati finti:** le luci e le stanze Cucina, Camera e Bagno **sono inventate** (nei documenti non risultano luci in HA). Nomi e comportamenti di termostato, prese, UPS, Frigate, stampante e automazioni ricalcano i documenti, ma i valori sono di esempio. In ogni pagina c'è la scritta «Mockup con dati di esempio».

**Revisione:** la build è passata da una revisione indipendente (agente di revisione della skill impeccable). Correzioni applicate dopo la revisione: rack tolto dalla Casa (l'infrastruttura sta solo in Avanzate), pannello a quattro colonne, fondo scuro viola-blu, clima in verde, icone distinte per le automazioni, dati UPS/rack in righe, grafico dell'energia coerente col valore attuale, barra in basso più leggibile, movimento ridotto rispettato.

## Cosa NON è dimostrato

- **Nessuna prova su un dispositivo vero.** Le schermate sono catture di un browser (Chromium) alle misure 390×844 (telefono), 1280×800 (pannello) e 1440×900 (PC). Non provati: iPhone/Safari, il Pi 4 (fluidità degli effetti di trasparenza e del trascinamento), i tablet.
- **Leggibilità a distanza sul pannello** non misurata: dimensioni scelte, non collaudate a 2–3 metri.
- **Nessun collegamento a HA:** login, aree, nomi reali delle entità e loro numero non sono ancora stati letti. Possibili differenze nei nomi delle entità di NUT, Frigate, PrusaLink e PetKit rispetto a quelli usati nel mockup.
- **Video delle telecamere:** nel mockup è un disegno. Come arriverà il video vero (attraverso HA, anche dal tunnel) va deciso e provato nella fase 2/3.
- **Scelta di cosa sta nella Casa** salvata solo nel browser del dispositivo: non condivisa fra telefono, PC e pannello (da decidere nella fase 2).

## Prossimo passo

**Conferma di Pietro sulla fase 1**, eventuali ritocchi, poi **fase 2: collegamento**. Cosa servirà, anticipato e **non ancora fatto**:
- l'indirizzo di HA è già noto (`10.10.50.10:8123`, documentato nel piano HA): non serve chiederlo;
- **nessuna password nuova:** il login è quello di HA, con le credenziali che Pietro usa già;
- in HA andrà aggiunta l'origine della dashboard in `http: cors_allowed_origins` (all'inizio quella del PC di sviluppo, nella fase 4 quella dell'LXC): istruzioni passo passo al momento;
- il **token a lunga durata** servirà solo al pannello kiosk (fase 4). Lo genera HA, quindi è già lungo e casuale; va trattato come una password forte e resta solo sul Pi, mai nel repository.

## Errori di metodo della sessione

- Il percorso indicato per i documenti di passaggio era `Rack\Handoff\`, che non esiste: nel progetto Rack l'handoff è `Avvio sessione AI\HANDOFF.md` e ogni argomento ha la sua cartella con un `LEGGIMI.md`. Si è seguito lo schema esistente invece di creare una cartella nuova.
- Il primo schizzo del termostato mostrava un'umidità del 54% che il termostato MOES non misura secondo i documenti: tolta prima della build.
- La skill «frontend design» citata da Pietro non è disponibile in questa sessione: è stata usata `impeccable`, che copre lo stesso lavoro, insieme a `karpathy-guidelines`.

## Letti e non letti

**Letti:** livello 1 (`00-INIZIA-DA-QUI`, `REGOLE`, `HANDOFF`), `FINE-SESSIONE`, `MAPPA-PROGETTO`, `piano-home-assistant.md`. **Non letti:** schede Frigate e UPS, `STATO-ATTUALE.md`, scheda rete e scheda rack, archivio. **Vault Obsidian:** non accessibile da questa sessione → **allineamento parziale**, vedi l'handoff.
