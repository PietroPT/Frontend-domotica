# Frontend-domotica

## Skill Claude Code

Skill di progetto per Claude Code, in `.claude/skills/` (e sub-agent in `.claude/agents/`).

| Skill | Uso | Origine | Licenza |
|-------|-----|---------|---------|
| `karpathy-guidelines` | `/karpathy-guidelines` — linee guida per evitare gli errori tipici degli LLM quando scrivono codice | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) @ `2c60614` | MIT |
| `impeccable` | `/impeccable <comando>` (es. `init`, `audit`, `critique`, `polish`) — design guidance per il frontend | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) @ `dad8dbb` (v0.1.16) | Apache-2.0 (vedi `.claude/skills/impeccable/LICENSE`) |

I quattro agent `impeccable-*` in `.claude/agents/` sono usati dalla skill impeccable.

Gli hook automatici di impeccable (`.claude/settings.json` upstream) non sono inclusi: la skill si usa solo su richiesta.

## Aggiornare

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
