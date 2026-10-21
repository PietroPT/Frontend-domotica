# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: Vite + TypeScript + Svelte 5 + `home-assistant-js-websocket`. Svelte because many sensor values (power, UPS load) update every few seconds and its compiled, fine-grained reactivity redraws only the changed value, with a small bundle that matters on the Raspberry Pi 4 kiosk. Static build served by nginx in a Proxmox LXC (phase 4).

## Users

- **Pietro** (owner, technical): runs the Rack homelab and Home Assistant; wants live state of the house and of the infrastructure, from home and through the WireGuard tunnel.
- **A second person in the household** (non-technical): needs lights, climate and cameras without seeing infrastructure details.
- Technical detail lives behind a deliberate "slide to enter advanced" control, so the everyday surface stays simple for both.

## Product Purpose

A custom interface that replaces the standard Home Assistant dashboard. Home Assistant stays the engine (integrations, automations, configuration); this app only displays and commands, over HA's official WebSocket API. Success: both users prefer it to the stock UI on the phone, and the wall panel is readable from across the room.

## Operating Context

- Devices: iPhone, PC, tablet, and later a Raspberry Pi 4 touch panel in Chromium kiosk mode on the wall.
- HA at `10.10.50.10:8123` (SERVERS VLAN); from outside only through the WireGuard tunnel `REMOTO`. Port 8123 is never opened on the WAN.
- Areas known today: Soggiorno (rack, UPS, camera), Ufficio (3D printer, camera).
- Devices: Zigbee via Zigbee2MQTT (SMLIGHT SLZB-06p10U); SONOFF S60ZBTPF plugs with energy metering (`presa_lavatrice`, `presa_stampante3d`, `presa_rack`, `presa_friggitrice`); MOES ZHT-S03 thermostat; UPS EPYC NEON via NUT (read-only, no credentials); Frigate cameras Soggiorno (portrait, rotated in Frigate) and Ufficio; Prusa Core One via PrusaLink; PetKit feeder.

## Capabilities and Constraints

- Live state by entity subscription, no polling. Entities are read from HA and grouped by area, never hard-coded.
- Auth: HA OAuth login flow (`getAuth`), no token in code. Kiosk only: optional long-lived token stored on the device, never in the repository. No secrets in git.
- Lights, climate, energy, cameras, rack/services, automations. An "add to dashboard" flow chooses which HA entities appear and where (pairing new devices stays in Zigbee2MQTT/HA).
- **Safety rules from the Rack documentation:** the rack plug's switch is disabled in HA and must never be offered as a control; the air-fryer plug must never be switched on remotely; the 3D-printer plug must not cut power right after a print (extruder cooling). The UPS is read-only.
- Light and dark theme. Touch first: large targets, no hover-only feedback.

## Brand Commitments

- Italian UI.
- Visual direction chosen by Pietro on 21/10/2026: the category standard, played straight (Apple Home-like tiles, soft rounded surfaces, one colour per category). Quality bar: Apple Casa. Custom-drawn icon set (24 grid, 1.75 stroke, duotone) is a requirement, not decoration.

## Evidence on Hand

Real entity names and behaviours in the Rack Drive documentation (`AI/Rack/Documenti rack/piano-home-assistant.md`). Phase 1 mockup data is synthetic and labelled as such; no lights are documented in HA today.

## Product Principles

1. The house first, the rack second: everyday controls for everyone, infrastructure behind a deliberate gesture.
2. Never offer a control that the documentation says is dangerous; show it as read-only with the reason.
3. Live means live: every value shown is subscribed, with visible staleness when HA is unreachable.
4. One glance from across the room on the wall panel; one thumb on the phone.

## Accessibility & Inclusion

Touch targets at least 48px (larger on the wall panel); state never conveyed by colour alone; works with reduced motion.
