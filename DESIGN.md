---
name: Casa
description: A custom Home Assistant dashboard in the Apple Home idiom, rooms of soft tiles with one colour per category.
colors:
  luci-amber: "#f59f0a"
  clima-green: "#2fb35a"
  caldo-orange: "#ff7a2e"
  energia-blue: "#0a7cff"
  sicurezza-violet: "#a64fe0"
  rack-teal: "#1ba3b8"
  pericolo-red: "#ff3b30"
  ok-green: "#2fb35a"
  luci-amber-dark: "#ffaa1f"
  clima-green-dark: "#38c766"
  energia-blue-dark: "#2e8fff"
  sicurezza-violet-dark: "#bf6cf5"
  rack-teal-dark: "#2cc0d6"
  ground-day: "#eef0f6"
  ground-night: "#100d1f"
  tile-day: "rgba(255, 255, 255, 0.62)"
  tile-night: "rgba(255, 255, 255, 0.085)"
  tile-on: "#ffffff"
  tile-on-night: "rgba(255, 255, 255, 0.94)"
  raised-day: "#ffffff"
  raised-night: "#1d1a2c"
  ink: "#1c1c1e"
  ink-2: "#636369"
  ink-3: "#8e8e93"
  ink-night: "#f5f5f7"
  ink-2-night: "#a1a1a8"
  ink-3-night: "#75757c"
  track-day: "rgba(120, 120, 128, 0.18)"
  track-night: "rgba(255, 255, 255, 0.14)"
  sep-day: "rgba(60, 60, 67, 0.13)"
  sep-night: "rgba(255, 255, 255, 0.1)"
typography:
  display:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
    fontFeature: "'cv11', 'ss01'"
  headline:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  tile-title:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  detail:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
  readout:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "52px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.04em"
rounded:
  control-inner: "10px"
  notice: "12px"
  segment: "14px"
  chip: "16px"
  tile: "18px"
  card: "22px"
  sheet: "28px"
  pill-slider: "34px"
  round: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  tile-gap: "10px"
  md: "12px"
  page-phone: "16px"
  lg: "18px"
  section: "22px"
  page-wide: "32px"
components:
  tile:
    backgroundColor: "{colors.tile-day}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "10px 6px 10px 10px"
    height: "72px"
  tile-on:
    backgroundColor: "{colors.tile-on}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
  tile-dot:
    backgroundColor: "{colors.track-day}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.round}"
    size: "48px"
  summary-chip:
    backgroundColor: "{colors.tile-day}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "6px 16px 6px 7px"
    height: "52px"
  button-primary:
    backgroundColor: "{colors.energia-blue}"
    textColor: "{colors.tile-on}"
    rounded: "{rounded.tile}"
    height: "56px"
  button-danger:
    backgroundColor: "{colors.pericolo-red}"
    textColor: "{colors.tile-on}"
    rounded: "{rounded.tile}"
    height: "56px"
  button-neutral:
    backgroundColor: "{colors.track-day}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    height: "56px"
  button-pill:
    backgroundColor: "{colors.tile-day}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "0 16px 0 12px"
    height: "44px"
  button-round:
    backgroundColor: "{colors.tile-day}"
    textColor: "{colors.ink}"
    rounded: "{rounded.round}"
    size: "44px"
  segmented:
    backgroundColor: "{colors.track-day}"
    rounded: "{rounded.segment}"
    padding: "4px"
  segmented-selected:
    backgroundColor: "{colors.raised-day}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control-inner}"
    height: "44px"
  card:
    backgroundColor: "{colors.tile-day}"
    rounded: "{rounded.card}"
    padding: "18px"
  sheet:
    backgroundColor: "{colors.raised-day}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "22px 24px 26px"
  brightness-slider:
    backgroundColor: "{colors.track-day}"
    rounded: "{rounded.pill-slider}"
    width: "112px"
  slide-to-unlock:
    backgroundColor: "{colors.tile-day}"
    rounded: "30px"
    height: "60px"
  nav-tab-active:
    textColor: "{colors.energia-blue}"
    rounded: "{rounded.tile}"
    height: "72px"
---

# Design System: Casa

## Overview

**Creative North Star: "The Lit Room"**

The category standard, played straight at Apple Home's finish. The house is a set of rooms; each room is a grid of soft, translucent tiles laid over a blurred, tinted wallpaper. A tile at rest is a frosted pane that lets the wall show through; a tile that is on becomes solid white, lifts with a soft shadow, and its icon disc fills with its category colour. Reading the screen is reading which panes are lit.

Density is calm and direct: one tap toggles, the chevron-less tile body opens a detail sheet, and every control is large (48px minimum, 84px tiles on the wall panel). Colour is never decoration. Each category owns one hue (amber lights, green climate, blue energy, violet security, teal rack), and that hue appears only when something in that category is active or being navigated to. Type is a single family, Inter Variable, self-hosted as the stand-in for SF, set tight and bold for headings and quiet grey for detail.

Infrastructure is not part of the everyday world. Rack and UPS appear only in Avanzate, behind the slide-to-unlock control, and that page is where teal lives.

**Key Characteristics:**
- Blurred two-glow wallpaper ground: pale blue and lilac by day, violet-navy by night.
- Translucent 18px tiles that turn solid white and lift when on.
- One colour per category, shown as a filled circular icon disc.
- Inter Variable throughout, negative tracking on headings, tabular numerals for live values.
- Custom duotone icon set on a 24 grid, 1.75 stroke, 16% tinted fill.
- Sheets rise from the bottom on phone and pop centred on wider screens, with an exponential ease-out.

## Colors

A neutral glass world where saturated colour means "this category is active".

### Primary
- **Energy Blue** (energia-blue / energia-blue-dark): energy tiles and readouts, the active tab and rail item, the focus ring, text selection, and the primary action button. It is the system's interactive accent as well as the energy category colour.

### Secondary
- **Lamp Amber** (luci-amber / luci-amber-dark): lights. Fills the icon disc of a lit light tile (its glyph is the dark `--on-luci` #3b2600, because white on amber stays under 3:1; every other category disc carries a white glyph), the brightness pill gradient, the selected colour-temperature ring, and warning notices (tinted 16% into the raised surface).
- **Leaf Green** (clima-green / clima-green-dark): climate. Thermostat tiles, the Clima summary chip, and the dial arc when the target is reached.
- **Signal Violet** (sicurezza-violet / sicurezza-violet-dark): security. The Sicurezza chip and the camera "Movimento" badge.

### Tertiary
- **Rack Teal** (rack-teal / rack-teal-dark): infrastructure. Avanzate only: the rack and UPS icon discs, the active Avanzate rail item, and the slide-to-unlock knob and fill.
- **Ember Orange** (caldo-orange): the heating state, used only inside the thermostat dial (arc, knob ring and "Riscalda" label) while the HVAC action is heating.
- **Alert Red** (pericolo-red): the danger button, UPS on battery, offline service state.
- **OK Green** (ok-green): healthy service state, switches on, the UPS charge gauge.

### Neutral
- **Daylight Ground** (ground-day) under a wallpaper of two radial glows (#d6e2f7 top-left, #efe3f3 top-right); **Violet-Navy Night** (ground-night) under glows of #2d2350 and #10243f. The wallpaper is fixed, so content scrolls over it.
- **Frosted Tile** (tile-day / tile-night): every resting surface: tiles, chips, cards, round buttons. Hover lightens it to 80% / 13% white.
- **Lit Pane** (tile-on / tile-on-night): an active tile. Its ink stays dark (#1c1c1e, detail #6e6e73) in both themes.
- **Raised** (raised-day / raised-night): sheets and the selected segment.
- **Ink ramp** (ink, ink-2, ink-3 and their night values): primary text, secondary detail, tertiary icons and inactive tabs.
- **Track** (track-day / track-night): off icon discs, slider and switch tracks, segmented-control wells, the sheet grabber.
- **Separator** (sep-day / sep-night): hairlines between rows and around the tab bar.

### Named Rules
**The One Hue Per Category Rule.** Lights are amber, climate is green, energy is blue, security is violet, infrastructure is teal. A device tile takes its category colour and no other; a new category gets a new hue, never a borrowed one.

**The Colour Means On Rule.** Category colour fills an icon disc only when that thing is on or active. An off tile is grey disc on frosted glass. State is carried twice: the tile turns solid and the detail text changes ("Spenta", "70%"), so colour is never the only signal.

**The Heat Stays In The Dial Rule.** Climate is green on tiles and chips. Ember Orange appears only inside the thermostat dial while heating.

## Typography

**Display Font:** Inter Variable (self-hosted via @fontsource-variable, standing in for SF; fallback system-ui, sans-serif)
**Body Font:** Inter Variable
**Label/Mono Font:** none distinct; numerals use tabular figures (`font-variant-numeric: tabular-nums`) for every live value.

**Character:** One neutral grotesk at Apple weights. Headings are bold and tightly tracked; detail is regular weight in grey. Stylistic sets cv11 and ss01 are on globally.

### Hierarchy
- **Display** (700, 34px on phone, 40px from 720px, line-height 1.05, -0.03em): page titles ("Casa", "Avanzate").
- **Headline** (700, 22px, 1.15, -0.02em): sheet titles.
- **Title** (700, 20px, -0.02em): room and section headings, followed inline by a 14px grey summary.
- **Tile title** (600, 15px, 1.2, -0.01em; 16px on the wall panel): tile names, clamped to two lines.
- **Body** (400, 15px, 1.4): date lines, row labels, dial readouts.
- **Detail** (400, 13.5px): tile state. One line with ellipsis only from 1100px up; below that it wraps.
- **Label** (600, 11.5px; 12.5px on the rail): tab bar labels.
- **Readout** (700, 52px, -0.04em; 46px in sheets; dial value scales at 20% of the dial size): the single big number on a page, coloured by its category.

### Named Rules
**The Sentence Case Rule.** All headings and labels are sentence case Italian. The only uppercase string is the "LIVE" status badge on camera feeds, a camera-feed convention, not a heading device.

**The Live Numbers Rule.** Every value that updates from Home Assistant is set in tabular numerals so it does not jitter.

## Layout

Phone first, one column, 16px side padding, with the bottom tab bar clearing 104px plus the safe area. Rooms stack with 22px between them; tiles sit in a 2-column grid with a 10px gap. The summary chips scroll horizontally edge to edge.

From 720px the tab bar becomes a 96px sticky side rail, page padding grows to 28px / 32px, and the tile grid becomes auto-fill at a 190px minimum. Sheets switch from bottom sheet to a centred 480px dialog (880px when wide).

From 1100px the Casa page splits into tiles plus a 320px sticky right column holding the thermostat card, cameras and the slide-to-unlock. Tile grids lock to 4 columns, tiles tighten (44px disc, 8px gap) and detail text clamps to one line. On coarse-pointer screens at that width (the wall panel) tiles grow to 84px. Content maxes out at 1440px.

Spacing rhythm: 4 / 8 / 10 / 12 / 16 / 18 / 22 / 28px. 10px is the tile gap, 22px the section gap.

## Elevation & Depth

A hybrid: depth comes first from glass and tone (translucent tiles over a blurred wallpaper, solid raised sheets over a scrim), and shadows appear only on things that are lit or floating.

### Shadow Vocabulary
- **Lit** (`--shadow`; day `0 1px 1px rgba(20,20,40,0.04), 0 6px 20px -10px rgba(20,20,40,0.25)`, night `0 1px 1px rgba(0,0,0,0.3), 0 10px 24px -12px rgba(0,0,0,0.7)`): an on tile and the selected segment.
- **Lift** (`--shadow-lift`; day `0 2px 4px rgba(20,20,40,0.06), 0 18px 40px -16px rgba(20,20,40,0.35)`, night `0 2px 6px rgba(0,0,0,0.4), 0 24px 50px -18px rgba(0,0,0,0.8)`): sheets.
- **Tinted knob glow** (`0 4px 12px -4px` at 70% of the tone): the slide-to-unlock knob only.

The tab bar is chrome glass: 92% opaque ground with `saturate(180%) blur(20px)` and a hairline border, falling back to the raised colour where backdrop-filter is unsupported.

### Named Rules
**The Lit Panes Lift Rule.** Resting surfaces are flat. A tile earns a shadow by being on; a sheet earns one by floating. Nothing else casts a shadow.

## Shapes

Continuous soft rounding scaled to the size of the object: 10px inner segment buttons, 12px notices and the demo strip, 14 to 16px segmented wells, chips and notices, 18px tiles, action buttons and camera frames, 22px cards, 28px sheets, 34px brightness pill. Every icon disc, round button and knob is a full circle. No borders on surfaces; hairlines (1px separator colour) appear only between rows, around the tab bar, and as an inset ring on the unlock track and colour swatches.

## Components

### Buttons
Soft, borderless, and big.
- **Shape:** gently rounded (18px) for full-width actions, fully round for 44px icon buttons, 22px-radius pills for compact labelled actions ("Blocca").
- **Primary:** Energy Blue with white 600-weight text, 56px tall. **Danger:** Alert Red, same form. **Neutral:** track fill.
- **Hover / Focus:** no hover-only feedback; focus is a 3px Energy Blue outline at 2px offset with 10px rounding. Pressed tiles scale to 0.975.

### Chips
- **Style:** frosted tile fill, 16px radius, 52px tall, a 34px category-coloured disc with a white icon, a 14px bold name and a 12.5px grey value.
- **State:** summary chips are navigation, always coloured; they link to their category page.

### Cards / Containers
- **Corner Style:** 22px.
- **Background:** frosted tile.
- **Shadow Strategy:** none at rest (see Elevation).
- **Internal Padding:** 18px.

### Inputs / Fields
- **Segmented control:** track-coloured well (4px padding, 14 to 16px radius); the selected segment is a raised, shadowed 10 to 12px pill, 44 to 48px tall.
- **Switch:** 56x34 track that fills OK Green when on, white 28px thumb with a small drop shadow.
- **Brightness slider:** a 112px-wide vertical pill (34px radius, up to 340px or 44vh tall), filled from the bottom with a gradient from the category colour to 70% colour mixed with white; scales to 1.03 while dragging; the value is shown below at 28px bold.

### Navigation
Bottom tab bar on phone: five tabs, 26px duotone icons over 11.5px semibold labels, inactive ink-3, active Energy Blue with the icon fill raised to 30%. From 720px it becomes a left rail of 72px-tall, 18px-radius items where the active item also gets a frosted tile background. The Avanzate item appears only after unlocking and is Rack Teal when active.

### Tile (signature)
The unit of the whole system. A 48px circular icon disc (the toggle) plus a text body (the opener) in an 18px frosted pane, 72px minimum height. Off: grey disc, translucent pane. On: disc fills with the category colour and the icon turns white with its duotone fill at 32%, the pane turns solid white with the Lit shadow. Background, shadow and colour transition over 0.35s on the shared ease. A read-only or protected device shows a 13px padlock before its detail text.

### Sheet
Detail views. Phone: a bottom sheet rising from 40% with fade over 0.5s, 28px top corners, a 40x5 grabber and a 44px round close button. From 720px: a centred dialog popping from 0.97 scale over 0.45s. Scrim fades in behind. Escape closes and focus returns.

### Thermostat Dial
A 270-degree arc (18px round-capped stroke) with minor and major ticks, a white knob ringed in the state colour, and a dot for the current temperature. Green when holding, Ember Orange when heating, ink-3 when off. The centre stacks the mode with its icon, the target at 20% of the dial size, and "Ora" with the current reading.

### Slide To Unlock
The gate to Avanzate: a 60px frosted track with a hairline ring, a 48px Rack Teal knob carrying a padlock that becomes the Avanzate icon, and a teal fill that follows the knob. The label carries a moving shimmer (3.2s linear loop) that is switched off under reduced motion. Keyboard: hold Enter or Space to advance.

### Camera View
4:3 or 3:4 frames at 18px radius with a dark fallback, a translucent "LIVE" badge with a blinking red dot, a violet "Movimento" badge on motion, and a bottom gradient footer with the name and time.

### Icons
A custom set drawn on a 24 grid with 1.75 stroke, round caps and joins, and a duotone fill layer at 16% currentColor (30 to 32% on active surfaces). No third-party icon packs.

## Do's and Don'ts

### Do:
- **Do** give every device a tile in its category colour, and fill the disc only when it is on.
- **Do** pair every colour state with a text state ("Spenta", "70%", "Riscalda") and with the solid-pane change.
- **Do** keep touch targets at 44px minimum for icon buttons and 48px for tile toggles, growing tiles to 84px on the wall panel.
- **Do** use the shared ease `cubic-bezier(0.16, 1, 0.3, 1)` for every transition and entrance, and let reduced motion collapse them.
- **Do** set live values in tabular numerals.
- **Do** draw new icons in the house style: 24 grid, 1.75 stroke, duotone fill.
- **Do** clamp tile detail text to one line only from 1100px up; let it wrap below.

### Don't:
- **Don't** use orange for climate outside the thermostat dial; climate tiles and chips are green.
- **Don't** put rack, UPS or other infrastructure on Casa or any everyday page; they live only in Avanzate.
- **Don't** offer a toggle for a device the safety rules forbid; show it read-only with a padlock and the reason.
- **Don't** give resting surfaces shadows or borders; depth at rest is glass and tone.
- **Don't** add uppercase eyebrows or kickers above headings; headings are sentence case and stand alone.
- **Don't** swap Inter for another face or pull in a stock icon library.
