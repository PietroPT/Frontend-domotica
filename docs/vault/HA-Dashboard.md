# HA-Dashboard

Dashboard web personalizzata per Home Assistant, al posto della dashboard standard. Avviata il 21/10/2026; fasi 1–3 fatte e confermate da Pietro lo stesso giorno. Fase 4 (pubblicazione) in corso: la dashboard è pubblicata su `http://10.10.50.21`; il 22/10 creati gli utenti di HA «Pannello» (con il suo token) e «Filippo»; il pannello sul Pi è rimandato perché manca ancora lo schermo. Il 22/10 pomeriggio aggiunte e pubblicate: stanze modificabili, costi e andamento dell'energia, bollette con archivio nel CT 203, ordine dei riquadri della Casa uguale per tutti.

**Dettagli operativi** (uso, istruzioni, prove, regole complete): `G:\Il mio Drive\AI\Rack\HA-Dashboard\LEGGIMI.md`. **Codice**: GitHub `PietroPT/Frontend-domotica`, branch `claude/ecstatic-archimedes-kwey31`; copia sul PC in `C:\HA-Dashboard`. Per l'uso di tutti i giorni basta aprire `http://10.10.50.21` (sempre accesa nel CT 203); `avvia.cmd` serve solo a provare le modifiche prima di pubblicarle con `pubblica.cmd`.

## Cos'è

- Home Assistant resta il motore (integrazioni, automazioni, configurazione); la dashboard è solo l'interfaccia, collegata con la API WebSocket ufficiale.
- Svelte 5 + TypeScript + Vite: pacchetto piccolo (≈67 KB compressi), pensato anche per il Pi 4 del pannello a muro.
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

## Decisioni di Pietro (22/10)

- Stanze: dalla dashboard si sposta un dispositivo in un'altra stanza, si creano e si rinominano le stanze (sono le aree di Home Assistant); solo gli amministratori.
- **Friggitrice**: si accende anche da remoto, ma solo dopo un avviso (cestello inserito, niente appoggiato sopra o intorno) e una conferma.
- **Energia**: costi delle prese misurate al prezzo per kWh inserito (salvato in HA, lo cambia un amministratore) e andamento dei consumi in kWh o euro per giorni, mesi e anni, dalle statistiche a lungo termine di HA. Il prezzo giusto è quello di un kWh in più, non il totale della bolletta diviso i kWh.
- **Bollette** di luce, gas, acqua e TARI, in Energia: inserite a mano o importate da un file preparato da Claude leggendo i PDF; le possono inserire e modificare tutti gli utenti; archivio nel CT 203, nel backup notturno.
- **Casa**: l'ordine dei riquadri si cambia con le frecce (matita accanto a +) ed è uno solo per tutti gli utenti e i dispositivi.

## Regole di sicurezza

Ricontrollate prima di ogni comando, riconosciute da entity_id, nome e dispositivo: presa del **rack** mai comandata (solo misura); **friggitrice** accesa solo dopo un avviso e una conferma (fino al 22/10 non si accendeva a distanza: cambiato da Pietro); **stampante 3D**, **programma dei pasti** e qualunque presa sopra 50 W chiedono conferma prima di spegnersi; disattivare un'**automazione** richiede un doppio tocco; **UPS** solo lettura.

## Lezioni

- Un file `.cmd` che si aggiorna da solo con `git pull` esegue ancora i passi vecchi in quel giro, perché Windows legge il blocco prima di eseguirlo: ora `pubblica.cmd` si rilancia da solo se il pull lo ha cambiato.
- Nelle bollette lo stesso consumo può comparire due volte (acconto e conguaglio): per i confronti i periodi non devono sovrapporsi.

- Home Assistant di casa è più recente della 2026.8: la configurazione HTTP (origini CORS) si fa da **Impostazioni → Sistema → Rete → Server HTTP → Altre opzioni**, non più in `configuration.yaml`; gli «Strumenti per sviluppatori» stanno in **Impostazioni → Strumenti**. Regola: prima di dare un percorso dell'interfaccia di HA, verificarlo sulla versione più recente.
- I nomi delle entità vanno letti, non previsti: UPS (NUT) e stampante (PrusaLink) si riconoscono dall'integrazione; gli entity_id del distributore PetKit sono stati letti dalla pagina Stati.
- Sul PC Windows, in PowerShell si usa `npm.cmd` (gli script `.ps1` sono bloccati).

## Aperto

- Fase 4, parte 1 fatta il 21/10: CT 203 `ha-dashboard` su pve1 con solo nginx (`http://10.10.50.21`, SERVERS), build fatta sul PC e copiata via SSH con chiave (`pubblica.cmd`), aperta anche da fuori casa col tunnel. Il 22/10: utente HA «Pannello» non amministratore e solo locale, con il token a lunga durata (nel password manager, voce «Token HA Pannello»; starà solo sul Pi) e un'immagine della persona disegnata nello stile delle icone; utente non amministratore «Filippo» per l'altra persona. Da fare: provare l'accesso di Filippo dal tunnel; il pannello sul Pi quando ci sarà lo schermo; eventualmente installare la dashboard come app sul PC e sugli iPhone.
- Non provati: tablet, Pi 4 (fluidità, leggibilità a 2–3 m); carico del video delle telecamere su Frigate e HA e resa dal tunnel WireGuard. Sull'iPhone la dashboard si apre, anche dal tunnel (riferito da Pietro), ma non è stata provata funzione per funzione.
- Allarme da progettare.
- Bollette mancanti: luce di ottobre 2025, gas di marzo 2026. Riordino delle stanze (non solo dei riquadri) proposto, non chiesto.
