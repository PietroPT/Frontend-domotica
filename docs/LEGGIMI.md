# HA-Dashboard — interfaccia personalizzata per Home Assistant

**Aggiornato il 21 ottobre 2026, sera.** Fasi 1, 2 e 3 **fatte e confermate da Pietro**, la 2 e la 3 provate sul suo Home Assistant («va tutto bene», 21/10). Prossima: **fase 4, pubblicazione**.

Home Assistant resta il motore (integrazioni, automazioni, configurazione). La dashboard è solo l'interfaccia e parla con HA attraverso la API WebSocket ufficiale (`home-assistant-js-websocket`).

## Dove sta cosa

| Cosa | Dove |
|---|---|
| Codice, copia principale con la cronologia | GitHub `PietroPT/Frontend-domotica`, branch `claude/ecstatic-archimedes-kwey31` (fase 3 chiusa al commit `006b57b`) |
| Copia sul PC di Pietro, da cui gira | `C:\HA-Dashboard` (si aggiorna da sola a ogni avvio con `avvia.cmd`) |
| Copia dei sorgenti su Drive | questa cartella (`HA-Dashboard\`): **ferma alla fase 1**. Il codice delle fasi 2 e 3 è solo su GitHub |
| Profilo del prodotto (utenti, vincoli, regole) | `HA-Dashboard\PRODUCT.md` |
| Sistema grafico (colori, caratteri, componenti) | `HA-Dashboard\DESIGN.md` (scritto alla fase 1) |
| Mockup da aprire sul telefono, senza installare nulla | https://claude.ai/artifact/Svq8v6PsfBhMorj3WG1y6o (privato, dati finti della fase 1) |

**Perché il codice vive su GitHub e non su Drive:** `npm install` crea una cartella `node_modules` con migliaia di file che Google Drive proverebbe a sincronizzare. Sul PC si lavora in `C:\HA-Dashboard`, clonata dal repository.

## Fasi

| Fase | Contenuto | Stato |
|---|---|---|
| 1. Mockup | Interfaccia completa con dati finti | **fatta e confermata** il 21/10 |
| 2. Collegamento | Login di HA (OAuth), aree ed entità, stati reali in tempo reale | **fatta e confermata** il 21/10, provata sull'HA di casa |
| 3. Controlli | Comandi veri, grafici dalla cronologia, energia di oggi | **fatta e confermata** il 21/10, provata sull'HA di casa |
| 4. Pubblicazione | Build statica su un LXC con nginx su Proxmox, pannello kiosk sul Pi | da fare |

## Come si usa sul PC

**Ogni volta:** doppio clic su `C:\HA-Dashboard\avvia.cmd`. Aggiorna il codice da GitHub, installa i pacchetti che mancano, avvia la dashboard e apre il browser su `http://localhost:5173`. La finestra nera va lasciata aperta; chiudendola la dashboard si ferma. Collegamento sul desktop: tasto destro su `avvia.cmd` → **Mostra altre opzioni** → **Invia a** → **Desktop (crea collegamento)**.

**Prima installazione (fatta il 21/10):** Node.js LTS e Git (`winget install OpenJS.NodeJS.LTS`, `winget install Git.Git`), poi in PowerShell `git clone https://github.com/PietroPT/Frontend-domotica.git C:\HA-Dashboard`, `cd C:\HA-Dashboard`, `git checkout claude/ecstatic-archimedes-kwey31`, `Copy-Item .env.example .env`, `npm.cmd install`, `npm.cmd run dev`. In PowerShell si usa `npm.cmd` e non `npm`, perché Windows blocca gli script `.ps1`: così non si cambiano le impostazioni di sicurezza.

**`.env`** contiene solo l'indirizzo di HA (`VITE_HA_URL=http://10.10.50.10:8123`): nessun segreto, ed è escluso da git. Senza `.env`, o aggiungendo `?demo` all'indirizzo, la dashboard parte con i dati finti del mockup.

**Impostazione in HA per il login (fatta il 21/10):** **Impostazioni → Sistema → Rete → Server HTTP → Altre opzioni → Origini consentite CORS** contiene `http://localhost:5173`. Serve perché dopo il login il browser ritira l'accesso da HA con una richiesta dall'indirizzo della dashboard, e HA deve dichiararlo permesso. Dalla versione 2026.8 di HA questa impostazione si gestisce dall'interfaccia: un blocco `http:` in `configuration.yaml` viene importato una volta e poi ignorato, con un avviso «Riparazione» che chiede di toglierlo (Pietro l'ha tolto). Rischio basso: senza nome utente e password di HA quell'indirizzo non ottiene nulla. Nella fase 4 si aggiunge l'indirizzo dell'LXC e `localhost` si potrà togliere.

**Accesso:** si entra con nome utente e password di HA, nessuna password nuova. HA rilascia l'accesso e il browser lo conserva (`localStorage`, chiave `ha-dashboard.accesso`); si rinnova da solo. **Avanzate → Accesso → Esci da questo dispositivo** lo revoca.

## Cosa fa

- **Dati dal vivo, senza interrogazioni periodiche:** stati con `subscribeEntities`; aree, dispositivi ed entità riletti solo quando HA segnala una modifica; cronologia in streaming (`history/stream`). Se la connessione cade compare «Connessione a Home Assistant persa: riprovo…» e riparte da sola.
- **Casa:** stanze come le aree di HA. Al primo avvio luci, prese vere (quelle con sensore di potenza), termostato, telecamere e il riquadro **Cibo extra**; con «+» si aggiunge o toglie (scelta salvata nel browser di quel dispositivo).
- **Luci, Clima, Energia, Telecamere, Allarme, Avanzate** (Avanzate si apre facendo scorrere il cursore «Scorri per Avanzate»).
- **Termostato:** in grande la temperatura della stanza, sotto in piccolo l'obiettivo, solo il numero nel colore del termostato (scelta di Pietro dopo aver scartato «Impostata a» e un'icona a bersaglio). Mentre si modifica, in grande e colorato il valore che si sta impostando, sotto «Ora …».
- **Grafici delle ultime 24 ore** dalla cronologia di HA: potenza delle prese e totale, temperatura misurata e desiderata. Al massimo un punto al minuto, per non appesantire il Pi.
- **Energia di oggi** (totale, per presa, ora per ora) dalle statistiche a 5 minuti dei contatori kWh delle prese: gli stessi numeri del pannello Energia di HA.
- **Telecamere** di Frigate attraverso HA: fotogramma ogni 10 secondi nei riquadri, video continuo (MJPEG) a schermo intero. La telecamera della stampante 3D (PrusaLink) è esclusa (Pietro: serve solo per le stampe).
- **Cibo extra** (Cucina): scelta 10–50 g, «Eroga» e «Annulla erogazione», con le entità di PetKit `text.crocchette_alimentazione_manuale` e `button.crocchette_annulla_alimentazione_manuale`. Dopo l'invio il pulsante resta fermo qualche secondo per evitare doppie porzioni. **Provato il 21/10: eroga.**
- **Rinominare:** si tocca il riquadro, poi il nome con la matita in alto nel foglio (in Clima la riga «Nome»). Il nome si salva **in Home Assistant** (scelta di Pietro): vale ovunque, anche nell'app di HA e per gli assistenti vocali. L'entity_id non cambia, quindi automazioni e regole di sicurezza restano agganciate. Campo vuoto = nome originale. Serve un utente amministratore.
- **Avanzate:** UPS (NUT, sola lettura), Rack (sola lettura), Servizi (HA, Zigbee2MQTT, stampante, crocchette), Automazioni, Aspetto, Accesso. UPS e stampante si riconoscono dall'integrazione che li crea, non dal nome.
- **Allarme:** voce nel menu con pagina segnaposto «da configurare», che elenca i sensori di movimento, presenza e apertura già presenti in HA (richiesta di Pietro, da configurare più avanti).

## Regole di sicurezza

Nel codice (`src\lib\policy.ts`) e ricontrollate in un punto unico prima di **ogni** comando (`hass.callService`), qualunque schermata lo mandi. Si riconoscono da entity_id, nome visibile e nome del dispositivo, quindi una rinomina non le toglie. Fonte: [piano HA](<../Documenti rack/piano-home-assistant.md#prese-zigbee-sonoff-s60zbtpf-7-ottobre-2026>).

- **Rack:** nessun comando, solo misura.
- **Friggitrice:** si può solo spegnere, mai accendere a distanza.
- **Stampante 3D:** conferma prima di spegnere (raffreddamento dell'estrusore).
- **Programma dei pasti** (`switch.cucina_crocchette_feeding_schedule`): conferma prima di spegnerlo.
- **Qualunque presa sopra 50 W:** conferma prima di spegnerla.
- **Automazioni:** per disattivarne una serve un secondo tocco entro 4 secondi; riattivarla è immediato.
- **UPS:** solo lettura.

Effetto collaterale, prudente: una presa rinominata con «rack», «friggitrice» o «stampante» nel nome eredita la regola corrispondente.

## Prove eseguite

- **Su un HA 2026.2.3 di prova** avviato nell'ambiente di sviluppo (integrazione `demo`, con `recorder` e `history`), con un browser automatico: login OAuth e ritorno, stati e telecamere dal vivo, ricarica senza login, uscita, rinomina e ritorno al nome originale, luce accesa davvero, cronologia in streaming, pagina Allarme.
- **Nel mockup:** doppio tocco sulle automazioni, Cibo extra, energia ora per ora, conferma sul programma dei pasti, termostato a riposo e durante il trascinamento (tema chiaro e scuro).
- **Da Pietro sull'HA di casa (21/10):** login, stanze, UPS, Rack, stampante, crocchette, telecamere, termostato, friggitrice senza «Accendi», Rack senza comandi, energia simile al pannello Energia di HA, grafici, Cibo extra che eroga. Esito riferito da Pietro.

## Cosa NON è dimostrato

- **Telecamere Frigate attraverso HA:** viste funzionare, ma non misurati il carico del video continuo su Frigate e HA né la resa dal tunnel WireGuard.
- **Dispositivi:** provata solo sul PC (Windows) e in Chromium. Non provati iPhone/Safari, il tablet, il Pi 4 del pannello (fluidità, leggibilità a 2–3 m).
- **`avvia.cmd`:** scritto e controllato nel formato, usato da Pietro, ma non provato da me su Windows.
- **Scelta di cosa sta nella Casa:** salvata solo nel browser di ogni dispositivo; da decidere se condividerla.
- **Allarme:** solo segnaposto.

## Prossimo passo

**Fase 4: pubblicazione.** Build statica servita da un LXC leggero con nginx su Proxmox; il suo indirizzo aggiunto alle origini CORS di HA; pannello a muro sul Pi 4 in Chromium kiosk con un **token a lunga durata** (lo genera HA, è già lungo e casuale, va trattato come una password forte, resta solo sul Pi, mai nel repository).

Anticipato e **non ancora fatto**: per l'altra persona serve un suo utente in HA (**Impostazioni → Persone → Aggiungi persona**, con accesso consentito). Basta una password facile da ricordare e da scrivere sul telefono, purché non usata altrove, perché HA non è esposto su internet (rete di casa e WireGuard); l'opzione per limitare l'accesso alla rete locale la protegge ancora. I percorsi esatti si verificano sulla versione di HA del momento.

Poi, quando Pietro vorrà: configurazione dell'**Allarme**.

## Errori di metodo

- **Percorsi dell'interfaccia di HA dati per versioni vecchie** (21/10): `http:` in `configuration.yaml` (dalla 2026.8 si usa Impostazioni → Rete) e «Strumenti per sviluppatori» nella barra laterale (dalla 2026.2 sono in Impostazioni → Strumenti). L'HA di prova era più vecchio di quello di casa. **Regola:** prima di dare un percorso dell'interfaccia di HA, verificarlo sulla documentazione della versione più recente.
- **Nomi delle entità previsti invece che letti:** la scheda UPS e la riga delle crocchette non comparivano sull'HA di casa. Corretto riconoscendo UPS e stampante dall'integrazione e leggendo gli entity_id veri delle crocchette dalla pagina Stati.
- **Primo HA di prova senza `history`:** la cronologia falliva per configurazione dell'HA di prova, non per il codice.
- **Autonomia dell'UPS letta in secondi** mentre HA la mostra in minuti («0 min» invece di 9): corretto leggendo l'unità.
- Il percorso indicato per i documenti di passaggio era `Rack\Handoff\`, che non esiste: si è seguito lo schema esistente (`Avvio sessione AI\HANDOFF.md` più un `LEGGIMI.md` per argomento).
- La skill «frontend design» citata da Pietro non è disponibile in questa sessione: usate `impeccable` e `karpathy-guidelines`.

## Letti e non letti

**Letti:** livello 1 (`00-INIZIA-DA-QUI`, `REGOLE`, `HANDOFF`), `FINE-SESSIONE`, `MAPPA-PROGETTO`, `piano-home-assistant.md`. **Non letti:** schede Frigate e UPS, `STATO-ATTUALE.md`, scheda rete e scheda rack, archivio. **Vault Obsidian:** non accessibile da questa sessione → **allineamento parziale**, vedi l'handoff.
