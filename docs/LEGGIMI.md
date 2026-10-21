# HA-Dashboard — interfaccia personalizzata per Home Assistant

**Aggiornato il 21 ottobre 2026, sera.** Fasi 1, 2 e 3 **fatte e confermate da Pietro**, la 2 e la 3 provate sul suo Home Assistant («va tutto bene», 21/10). **Fase 4 in corso:** codice e istruzioni per LXC, pubblicazione, utenti e token pronti e provati sull'HA di prova ([sotto](#pubblicazione--fase-4)); da eseguire da Pietro. Il pannello sul Pi è il passo successivo.

Home Assistant resta il motore (integrazioni, automazioni, configurazione). La dashboard è solo l'interfaccia e parla con HA attraverso la API WebSocket ufficiale (`home-assistant-js-websocket`).

## Dove sta cosa

| Cosa | Dove |
|---|---|
| Codice, copia principale con la cronologia | GitHub `PietroPT/Frontend-domotica`, branch `claude/ecstatic-archimedes-kwey31` (fase 3 chiusa al commit `006b57b`) |
| Copia sul PC di Pietro, da cui gira | `C:\HA-Dashboard` (si aggiorna da sola a ogni avvio con `avvia.cmd`) |
| Versione pubblicata (fase 4) | CT 203 `ha-dashboard` su pve1, `http://10.10.50.21`, nginx; si aggiorna con `C:\HA-Dashboard\pubblica.cmd` |
| Copia dei sorgenti su Drive | questa cartella (`HA-Dashboard\`), **aggiornata alla fase 4, parte 1** (21/10 sera, commit `78073ec` più questo LEGGIMI): stessa struttura del repository, senza `node_modules`, senza le skill `.claude\` e senza `package-lock.json` (lo rigenera `npm install`); questo file è `docs\LEGGIMI.md` del repository, la bozza di nota per Obsidian è in `vault\`. I file `.cmd` da usare sono quelli nella copia sul PC. Versioni sostituite in `ARCHIVIO_FILE_VECCHI\2026-10-21\ha-dashboard-fase-3\` e `…\ha-dashboard-fase-4\` |
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
| 4. Pubblicazione | Build statica su un LXC con nginx su Proxmox, pannello kiosk sul Pi | **in corso**: parte 1 (LXC, pubblicazione, utenti, token) pronta; parte 2 (Pi) da preparare |

## Come si usa sul PC

**Ogni volta:** doppio clic su `C:\HA-Dashboard\avvia.cmd`. Aggiorna il codice da GitHub, installa i pacchetti che mancano, avvia la dashboard e apre il browser su `http://localhost:5173`. La finestra nera va lasciata aperta; chiudendola la dashboard si ferma. Collegamento sul desktop: tasto destro su `avvia.cmd` → **Mostra altre opzioni** → **Invia a** → **Desktop (crea collegamento)**.

**Prima installazione (fatta il 21/10):** Node.js LTS e Git (`winget install OpenJS.NodeJS.LTS`, `winget install Git.Git`), poi in PowerShell `git clone https://github.com/PietroPT/Frontend-domotica.git C:\HA-Dashboard`, `cd C:\HA-Dashboard`, `git checkout claude/ecstatic-archimedes-kwey31`, `Copy-Item .env.example .env`, `npm.cmd install`, `npm.cmd run dev`. In PowerShell si usa `npm.cmd` e non `npm`, perché Windows blocca gli script `.ps1`: così non si cambiano le impostazioni di sicurezza.

**`.env`** contiene solo l'indirizzo di HA (`VITE_HA_URL=http://10.10.50.10:8123`): nessun segreto, ed è escluso da git. Senza `.env`, o aggiungendo `?demo` all'indirizzo, la dashboard parte con i dati finti del mockup.

**Impostazione in HA per il login (fatta il 21/10):** **Impostazioni → Sistema → Rete → Server HTTP → Altre opzioni → Origini consentite CORS** contiene `http://localhost:5173`. Serve perché dopo il login il browser ritira l'accesso da HA con una richiesta dall'indirizzo della dashboard, e HA deve dichiararlo permesso. Dalla versione 2026.8 di HA questa impostazione si gestisce dall'interfaccia: un blocco `http:` in `configuration.yaml` viene importato una volta e poi ignorato, con un avviso «Riparazione» che chiede di toglierlo (Pietro l'ha tolto). Rischio basso: senza nome utente e password di HA quell'indirizzo non ottiene nulla. Nella fase 4 si aggiunge l'indirizzo dell'LXC e `localhost` si potrà togliere.

**Accesso:** si entra con nome utente e password di HA, nessuna password nuova. HA rilascia l'accesso e il browser lo conserva (`localStorage`, chiave `ha-dashboard.accesso`); si rinnova da solo. **Avanzate → Accesso → Esci da questo dispositivo** lo revoca.

**Pannello a muro (fase 4):** entra invece con un token a lunga durata dell'utente HA «Pannello». Il Pi apre `http://10.10.50.21/#token=<token>`: la pagina conserva il token nel browser del Pi (chiave `ha-dashboard.token-pannello`) e lo toglie subito dall'indirizzo. Quello che sta dopo `#` resta nel browser e non arriva a nginx. In Avanzate il pannello mostra «con il token del pannello a muro» e non ha «Esci»: il token si revoca cancellandolo in HA. Se HA lo rifiuta, la pagina lo dimentica e dice di crearne uno nuovo.

## Pubblicazione — fase 4

**Com'è fatta.** Un container LXC leggero (CT 203 `ha-dashboard`, pve1, Debian 13, 1 core, 256 MB, 4 GB su `zdata`, in SERVERS `10.10.50.21` con `vmbr0` tag 50 come Frigate) con solo nginx, che serve i file della build. Nessun proxy verso HA: il browser parla direttamente con HA, per questo l'indirizzo dell'LXC va nelle origini CORS. La build si fa sul PC e si copia con SSH (`pubblica.cmd`), così l'LXC non ha Node, Git né credenziali di GitHub. Configurazione di nginx nel repository (`deploy/nginx-ha-dashboard.conf`): `index.html` sempre ricontrollato, file in `assets/` in cache per un anno (cambiano nome a ogni build), compressione gzip, intestazioni di sicurezza di base, solo IPv4.

**Perché `10.10.50.21`:** SERVERS è la rete dei servizi, la fascia `.2–.99` è per gli statici e `.21` non compare nella scheda rete. Va comunque provato libero prima (passo 1). Da TRUSTED si raggiunge già (regola larga «TRUSTED → SERVERS»); dal tunnel `REMOTO` serve una regola, come per HA.

**Perché l'accesso SSH solo con chiave e senza password di root:** l'unico uso è la copia dal PC; senza password non c'è niente da indovinare, e dalla Shell di pve1 si entra comunque con `pct enter 203`.

### Parte 1 — LXC, pubblicazione, accesso (da fare)

1. **Indirizzo libero.** pve1 → **Shell**: `ping -c 2 -W 1 10.10.50.21`. Atteso: `100% packet loss`. Se risponde qualcosa, fermarsi.
2. **Chiave pubblica del PC.** In PowerShell: `Get-ChildItem $env:USERPROFILE\.ssh\*.pub`. Se c'è `id_ed25519.pub`: `Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard`. È la parte **pubblica** della chiave: non è un segreto, si può incollare ovunque.
3. **Chiave su pve1.** Shell di pve1: `cat > /root/pc-pietro.pub`, Invio, incollare, Invio, **Ctrl+D**. Controllo: `ssh-keygen -lf /root/pc-pietro.pub` deve stampare una riga con `SHA256:` e `(ED25519)`.
4. **Creazione del CT**, un solo comando:
   `pct create 203 "$(pveam list local | awk '/debian-13-standard/ {print $1}' | sort | tail -1)" --hostname ha-dashboard --unprivileged 1 --features nesting=1 --cores 1 --memory 256 --swap 256 --rootfs zdata:4 --net0 name=eth0,bridge=vmbr0,tag=50,ip=10.10.50.21/24,gw=10.10.50.1,firewall=1 --nameserver "10.10.50.53 10.10.50.54" --searchdomain home.arpa --timezone Europe/Rome --onboot 1 --ssh-public-keys /root/pc-pietro.pub --start 1`
   Prende lo stesso modello Debian 13 già usato per Frigate. Nell'output, annotare l'impronta della riga `ssh_host_ed25519_key` (serve al passo 8).
5. **nginx:** `pct exec 203 -- bash -c "apt-get update && apt-get -y full-upgrade && apt-get -y install nginx"`.
6. **Prova da pve1:** `curl -sI http://10.10.50.21 | head -1` → `HTTP/1.1 200 OK` (pagina di benvenuto di nginx).
7. **Sul PC:** PowerShell `git -C C:\HA-Dashboard pull --ff-only` (porta `pubblica.cmd`), poi `notepad C:\HA-Dashboard\.env` e aggiungere in fondo la riga `PUBBLICA_SU=root@10.10.50.21`; salvare.
8. **Prima pubblicazione:** doppio clic su `C:\HA-Dashboard\pubblica.cmd`. La prima volta SSH chiede se fidarsi dell'LXC: confrontare l'impronta con quella del passo 4 e scrivere `yes`. Fine atteso: «Pubblicata.»
9. **Origine CORS in HA:** **Impostazioni → Sistema → Rete → Server HTTP → Altre opzioni → Origini consentite CORS**, aggiungere `http://10.10.50.21` (senza barra finale e senza porta). Lasciare `http://localhost:5173` finché si usa `avvia.cmd`.
10. **Prova:** sul PC `http://10.10.50.21` → login di HA → dashboard. Poi sull'iPhone in Wi-Fi di casa, con Safari.
11. **Dal tunnel:** OPNsense → **Firewall → Rules**, interfaccia REMOTO: clonare la regola «TCP 8123 → `10.10.50.10`» cambiando destinazione in `10.10.50.21` e porta in `80` (HTTP); descrizione «REMOTO → HA-Dashboard (CT 203:80)»; Save e Apply. Prova dall'iPhone su rete cellulare con il tunnel acceso.

Per gli aggiornamenti successivi basta il passo 8. Se una pubblicazione va male, la versione precedente è in `/var/www/ha-dashboard.old` sull'LXC.

### Utenti di HA (da fare)

Percorsi letti nelle traduzioni italiane dell'interfaccia di HA (2026.2, l'HA di prova): **Impostazioni → Persone → Aggiungi persona**, interruttore **Consenti l'accesso**, poi la finestra **Aggiungi utente** con nome, **Nome utente**, **Password**, **Conferma la password**, gli interruttori della rete locale («Solo locale» / «Solo accesso locale», *Può accedere solo dalla rete locale*) e **Amministratore**, pulsante **Crea**. Sull'HA di casa (più recente) le parole potrebbero differire di poco.

- **Utente «Pannello»** (solo per il pannello a muro): nome utente `pannello`, **solo locale acceso, amministratore spento**. Password **forte e generata** dal password manager (voce «HA pannello»): nessuno deve ricordarla, serve solo per creare il token. Non amministratore perché il token vale quanto il suo utente: se qualcuno lo prendesse dal Pi, potrebbe comandare la casa ma non cambiare la configurazione, gli utenti o le integrazioni. HA crea anche una persona «Pannello» senza dispositivi: è normale.
- **Token del pannello:** in una finestra anonima del browser del PC (**Ctrl+Maiusc+N**) aprire `http://10.10.50.10:8123`, entrare come `pannello`, cliccare il nome in basso a sinistra (Profilo) → scheda **Sicurezza** → **Token di accesso a lungo termine** → **Crea token** → nome «Pannello a muro» → copiare. HA lo mostra **una volta sola**: salvarlo subito nel password manager (voce «HA token pannello»), poi chiudere la finestra anonima. Vale 10 anni; si revoca dalla stessa schermata. Non va mai in chat, screenshot, Drive o repository.
- **Utente dell'altra persona:** il suo nome, **amministratore spento**, solo locale acceso. Password facile da ricordare e da scrivere sul telefono, purché non usata altrove: HA non è esposto su internet. Gli indirizzi del tunnel (`10.10.80.x`) sono di rete privata, quindi per HA dovrebbero contare come locali: da provare dal tunnel. Da non amministratore può usare tutta la dashboard, ma non rinominare (la dashboard lo dice).

**Provato il 21/10 sull'HA di prova** con un utente non amministratore creato come sopra e la build servita da nginx con la stessa configurazione: token preso dall'indirizzo e tolto subito, mai presente nelle richieste a nginx; dopo una ricarica senza token resta collegato; stanze, cronologia, energia e telecamere funzionano; luce accesa davvero; rinomina rifiutata con «Solo un amministratore di Home Assistant può rinominare.»; Avanzate senza «Esci»; token sbagliato → messaggio dedicato e token dimenticato. Login normale dall'indirizzo servito da nginx: riuscito. Pubblicazione simulata due volte (scambio delle cartelle, `.old` conservata), cache e compressione controllate.

### Parte 2 — pannello sul Pi 4 (da preparare)

Chromium a schermo intero all'avvio, con `http://10.10.50.21/#token=…` nell'avvio automatico del Pi (il token sta solo lì e nel browser del Pi). Istruzioni da scrivere verificando la versione attuale di Raspberry Pi OS.

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

- **Fase 4 sull'HA di prova:** vedi [Utenti di HA](#utenti-di-ha-da-fare).
- **Su un HA 2026.2.3 di prova** avviato nell'ambiente di sviluppo (integrazione `demo`, con `recorder` e `history`), con un browser automatico: login OAuth e ritorno, stati e telecamere dal vivo, ricarica senza login, uscita, rinomina e ritorno al nome originale, luce accesa davvero, cronologia in streaming, pagina Allarme.
- **Nel mockup:** doppio tocco sulle automazioni, Cibo extra, energia ora per ora, conferma sul programma dei pasti, termostato a riposo e durante il trascinamento (tema chiaro e scuro).
- **Da Pietro sull'HA di casa (21/10):** login, stanze, UPS, Rack, stampante, crocchette, telecamere, termostato, friggitrice senza «Accendi», Rack senza comandi, energia simile al pannello Energia di HA, grafici, Cibo extra che eroga. Esito riferito da Pietro.

## Cosa NON è dimostrato

- **Telecamere Frigate attraverso HA:** viste funzionare, ma non misurati il carico del video continuo su Frigate e HA né la resa dal tunnel WireGuard.
- **Dispositivi:** provata solo sul PC (Windows) e in Chromium. Non provati iPhone/Safari, il tablet, il Pi 4 del pannello (fluidità, leggibilità a 2–3 m).
- **`avvia.cmd`:** scritto e controllato nel formato, usato da Pietro, ma non provato da me su Windows.
- **`pubblica.cmd`:** la parte sull'LXC (comandi remoti, nginx) è provata in Linux; la parte Windows (lettura di `.env`, `ssh`/`scp` di Windows) no. Che la chiave del PC si chiami `id_ed25519` è un'ipotesi da verificare al passo 2.
- **LXC:** comando `pct create` scritto sul modello di Frigate (CT 202), non eseguito. Che `zdata` e il modello Debian 13 in `local` ci siano su pve1 è dedotto dal LEGGIMI di Frigate. Inclusione nel backup notturno non verificata.
- **Scelta di cosa sta nella Casa:** salvata solo nel browser di ogni dispositivo; da decidere se condividerla.
- **Allarme:** solo segnaposto.

## Prossimo passo

**Fase 4, parte 1:** Pietro esegue i passi [qui sopra](#parte-1--lxc-pubblicazione-accesso-da-fare) e crea gli utenti. **Parte 2:** pannello a muro sul Pi 4 (Chromium a schermo intero con il token).

Poi, quando Pietro vorrà: configurazione dell'**Allarme**.

## Errori di metodo

- **Percorsi dell'interfaccia di HA dati per versioni vecchie** (21/10): `http:` in `configuration.yaml` (dalla 2026.8 si usa Impostazioni → Rete) e «Strumenti per sviluppatori» nella barra laterale (dalla 2026.2 sono in Impostazioni → Strumenti). L'HA di prova era più vecchio di quello di casa. **Regola:** prima di dare un percorso dell'interfaccia di HA, verificarlo sulla documentazione della versione più recente.
- **Nomi delle entità previsti invece che letti:** la scheda UPS e la riga delle crocchette non comparivano sull'HA di casa. Corretto riconoscendo UPS e stampante dall'integrazione e leggendo gli entity_id veri delle crocchette dalla pagina Stati.
- **Primo HA di prova senza `history`:** la cronologia falliva per configurazione dell'HA di prova, non per il codice.
- **Autonomia dell'UPS letta in secondi** mentre HA la mostra in minuti («0 min» invece di 9): corretto leggendo l'unità.
- Il percorso indicato per i documenti di passaggio era `Rack\Handoff\`, che non esiste: si è seguito lo schema esistente (`Avvio sessione AI\HANDOFF.md` più un `LEGGIMI.md` per argomento).
- La skill «frontend design» citata da Pietro non è disponibile in questa sessione: usate `impeccable` e `karpathy-guidelines`.

## Letti e non letti

**Letti:** livello 1 (`00-INIZIA-DA-QUI`, `REGOLE`, `HANDOFF`), `FINE-SESSIONE`, `MAPPA-PROGETTO`, `piano-home-assistant.md`; per la fase 4 `scheda-rete.md` (VLAN, indirizzi, regole TRUSTED e REMOTO) e il `LEGGIMI.md` di Frigate (modello del CT). **Non letti:** scheda UPS, `STATO-ATTUALE.md`, scheda rack, archivio. **Vault Obsidian:** non accessibile da questa sessione → **allineamento parziale**, vedi l'handoff.
