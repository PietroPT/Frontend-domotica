# HA-Dashboard

Dashboard web personalizzata per Home Assistant, al posto della dashboard standard. Avviata il 21/10/2026; fasi 1–3 fatte e confermate da Pietro lo stesso giorno. Fase 4 (pubblicazione) in corso: la dashboard è pubblicata su `http://10.10.50.21`.

**Dettagli operativi** (uso, istruzioni, prove, regole complete): `G:\Il mio Drive\AI\Rack\HA-Dashboard\LEGGIMI.md`. **Codice**: GitHub `PietroPT/Frontend-domotica`, branch `claude/ecstatic-archimedes-kwey31`; copia sul PC in `C:\HA-Dashboard`, avvio con doppio clic su `avvia.cmd`.

## Cos'è

- Home Assistant resta il motore (integrazioni, automazioni, configurazione); la dashboard è solo l'interfaccia, collegata con la API WebSocket ufficiale.
- Svelte 5 + TypeScript + Vite: pacchetto piccolo (≈53 KB compressi), pensato anche per il Pi 4 del pannello a muro.
- Dati dal vivo senza interrogazioni periodiche: stati, aree e dispositivi, cronologia delle ultime 24 ore, energia di oggi dalle statistiche di HA.
- Accesso con il login di HA (nessun token nel codice). Il pannello a muro entra con un token a lunga durata che sta solo sul Pi e si revoca da HA.

## Decisioni di Pietro (21/10)

- Stile: lo standard di categoria, tipo Apple Casa; icone disegnate su misura.
- Utenti: Pietro e un'altra persona. La parte tecnica (UPS, rack, servizi, automazioni) sta in **Avanzate**, che si apre facendo scorrere un cursore.
- Dispositivi: iPhone, PC, tablet, pannello Pi 4.
- I nomi si cambiano dalla dashboard e si salvano **in Home Assistant** (gli entity_id non cambiano, quindi automazioni e regole restano agganciate).
- Termostato: in grande la temperatura della stanza, in piccolo l'obiettivo, solo il numero nel colore del termostato (scartate «Impostata a» e un'icona a bersaglio). Mentre si modifica, in grande il valore che si imposta.
- Pulsante **Cibo extra** in Cucina per il distributore PetKit (10–50 g): provato, eroga.
- Telecamera della stampante 3D esclusa dalle telecamere della casa.
- Sezione **Allarme** nel menu, da configurare più avanti.

## Regole di sicurezza

Ricontrollate prima di ogni comando, riconosciute da entity_id, nome e dispositivo: presa del **rack** mai comandata (solo misura); **friggitrice** solo spegnere, mai accendere a distanza; **stampante 3D**, **programma dei pasti** e qualunque presa sopra 50 W chiedono conferma prima di spegnersi; disattivare un'**automazione** richiede un doppio tocco; **UPS** solo lettura.

## Lezioni

- Home Assistant di casa è più recente della 2026.8: la configurazione HTTP (origini CORS) si fa da **Impostazioni → Sistema → Rete → Server HTTP → Altre opzioni**, non più in `configuration.yaml`; gli «Strumenti per sviluppatori» stanno in **Impostazioni → Strumenti**. Regola: prima di dare un percorso dell'interfaccia di HA, verificarlo sulla versione più recente.
- I nomi delle entità vanno letti, non previsti: UPS (NUT) e stampante (PrusaLink) si riconoscono dall'integrazione; gli entity_id del distributore PetKit sono stati letti dalla pagina Stati.
- Sul PC Windows, in PowerShell si usa `npm.cmd` (gli script `.ps1` sono bloccati).

## Aperto

- Fase 4, parte 1 fatta il 21/10: CT 203 `ha-dashboard` su pve1 con solo nginx (`http://10.10.50.21`, SERVERS), build fatta sul PC e copiata via SSH con chiave (`pubblica.cmd`), aperta anche da fuori casa col tunnel. Da fare: utente HA «Pannello» non amministratore e solo locale (il suo token starà solo sul Pi), utente non amministratore per l'altra persona, poi il pannello sul Pi.
- Non provati: tablet, Pi 4 (fluidità, leggibilità a 2–3 m); carico del video delle telecamere su Frigate e HA e resa dal tunnel WireGuard. Sull'iPhone la dashboard si apre, anche dal tunnel (riferito da Pietro), ma non è stata provata funzione per funzione.
- Allarme da progettare.
