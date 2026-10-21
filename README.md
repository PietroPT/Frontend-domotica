# Frontend domotica — dashboard per Home Assistant

Interfaccia web personalizzata che sostituisce la dashboard standard di Home Assistant.
Home Assistant resta il motore (integrazioni, automazioni, configurazione): questa app
mostra e comanda soltanto, attraverso la API WebSocket ufficiale (`home-assistant-js-websocket`).

**Stato: fase 2, collegamento a Home Assistant in sola lettura.** Login di HA, stanze,
dispositivi e stati veri in tempo reale; i comandi arrivano con la fase 3.

| Fase | Contenuto | Stato |
|---|---|---|
| 1. Mockup | Interfaccia completa con dati finti | fatta e confermata (21/10) |
| 2. Collegamento | Login HA (OAuth), aree ed entità reali, stati in tempo reale | fatta (21/10), da confermare |
| 3. Controlli | Comandi veri e grafici dalla cronologia di HA | da fare |
| 4. Pubblicazione | Build statica su LXC con nginx, `cors_allowed_origins` in HA | da fare |

## Provarla sul PC

Serve [Node.js](https://nodejs.org) 22 o più recente.

```powershell
git clone https://github.com/PietroPT/Frontend-domotica.git C:\HA-Dashboard
cd C:\HA-Dashboard
git checkout claude/ecstatic-archimedes-kwey31
Copy-Item .env.example .env
npm install
npm run dev -- --host
```

Poi apri `http://localhost:5173`. Il file `.env` contiene solo l'indirizzo di Home Assistant
(niente password): se manca, l'app parte con i dati di esempio del mockup. Anche con `.env`
il mockup resta apribile aggiungendo `?demo` all'indirizzo (`http://localhost:5173/?demo`).

Perché il login funzioni, Home Assistant deve accettare l'indirizzo della dashboard:
in `configuration.yaml`

```yaml
http:
  cors_allowed_origins:
    - http://localhost:5173
```

(passi dettagliati in `docs/LEGGIMI.md`). Con `npm run dev -- --host` la vedi anche dal telefono
sulla stessa rete, all'indirizzo che il comando stampa (`Network: http://…:5173`); per il login
da lì va aggiunto anche quell'indirizzo a `cors_allowed_origins`.

Meglio non lanciare `npm install` dentro `G:\Il mio Drive\…`: la cartella `node_modules`
contiene migliaia di file che Google Drive proverebbe a sincronizzare.

## Com'è fatta

- **Svelte 5 + TypeScript + Vite.** Svelte aggiorna solo il numero che cambia (i consumi
  arrivano ogni pochi secondi) e produce un pacchetto piccolo (≈40 KB compressi): conta sul
  Raspberry Pi 4 del pannello.
- `src/lib/ha/` — modello dei dati uguale a quello di Home Assistant (stati, aree, registro
  entità e dispositivi). `live.ts` lo riempie dalla connessione vera (login di HA,
  `subscribeEntities`, registri riletti quando cambiano); senza `.env`, `mock.ts` lo riempie
  con dati finti. Presa e sensore di potenza, telecamera e sensore di movimento si abbinano
  perché stanno sullo stesso dispositivo di HA, non dal nome.
- `src/lib/policy.ts` — regole di sicurezza prese dalla documentazione del Rack: la presa del
  rack non si comanda, la friggitrice non si accende a distanza, la stampante 3D chiede conferma.
  Si riconoscono dal nome (entità, nome visibile o dispositivo), così sopravvivono a una
  rinomina in HA.
- `src/lib/icons.ts` — set di icone disegnato su misura (griglia 24, tratto 1,75, duotono).
- `src/pages/` le sezioni, `src/sheets/` i fogli di dettaglio, `src/lib/ui/` i controlli
  (slider luminosità, quadrante termostato, scorri-per-sbloccare, grafici).

## Segreti

Nessuna password o token nel codice. `.env` è escluso da git (vedi `.gitignore`);
`.env.example` mostra cosa contiene. Dopo il login, Home Assistant rilascia i token e questi
restano solo nel browser del dispositivo («Esci da questo dispositivo» in Avanzate li revoca).
Il token del pannello kiosk (fase 4) resterà solo sul Pi.

## Skill Claude Code

Skill di progetto per Claude Code, in `.claude/skills/` (e sub-agent in `.claude/agents/`).

| Skill | Uso | Origine | Licenza |
|-------|-----|---------|---------|
| `karpathy-guidelines` | `/karpathy-guidelines` — linee guida per evitare gli errori tipici degli LLM quando scrivono codice | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) @ `2c60614` | MIT |
| `impeccable` | `/impeccable <comando>` (es. `init`, `audit`, `critique`, `polish`) — design guidance per il frontend | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) @ `dad8dbb` (v0.1.16) | Apache-2.0 (vedi `.claude/skills/impeccable/LICENSE`) |

I quattro agent `impeccable-*` in `.claude/agents/` sono usati dalla skill impeccable.
Gli hook automatici di impeccable non sono inclusi: la skill si usa solo su richiesta.
### Aggiornare le skill

Ricopiare le cartelle dai repo upstream:

```bash
git clone --depth 1 https://github.com/multica-ai/andrej-karpathy-skills /tmp/aks
git clone --depth 1 https://github.com/pbakaus/impeccable /tmp/imp
rm -rf .claude/skills/karpathy-guidelines .claude/skills/impeccable
cp -r /tmp/aks/skills/karpathy-guidelines .claude/skills/
cp -r /tmp/imp/.claude/skills/impeccable .claude/skills/
cp /tmp/imp/LICENSE /tmp/imp/NOTICE.md .claude/skills/impeccable/
cp /tmp/imp/.claude/agents/*.md .claude/agents/
```
