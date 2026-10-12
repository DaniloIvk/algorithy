# Design system

How the app looks the way it looks: tokens, block colours, terrain themes,
entity art and skins. The authority for styling lives in two places:
`styles/theme.css` (the shared palette, breakpoints, typography, radii,
shadows and the `v-*` height variants) and `src/style.css` (Tailwind entry,
app-specific tokens, entity art, `[data-*]` selectors, browser quirks).
`styles/global.css` holds the base element styles; everything lives inside
this app, there is no separate design package. The `.agent/` folder's
`color-sweep.md` keeps the same information for contributors.

## The token system

Tailwind v4 `@theme` declares semantic tokens; components use semantic
classes, never raw palette colours:

| Group    | Tokens                                                              |
| -------- | ------------------------------------------------------------------- |
| Accent   | `primary`, `primary-hover/-active`, `primary-light`, `primary-dark` |
| Surfaces | `surface`, `surface-raised` (+ `-hover`/`-active`)                  |
| Content  | `content`, `content-raised`, `content-masked`                       |
| Borders  | `border`, `border-masked`                                           |
| Status   | `success`, `warning`, `error`, `info`                               |

App-specific additions in `src/style.css`:

- **Blocks**: `block-sky`, `block-emerald`, `block-yellow`, `block-green`,
  `block-red`, `block-orange`, `block-gray` (the locked/default scheme), each
  with `-hover`, `-active`, `-border`, plus `-washed` variants for container
  bodies and `-washed-hover` for the drag-over state.
- **Terrain themes** (paired ground/wall): `default` (ground/orange wall),
  `amber`, `forest` (`-terrain`), `frost`, `icy-blue` (`blue-ice`),
  `legend`, `boss`, `stone`, plus `ice`.
- **Entities**: `player` (equals `primary`), `target` (cheese yellow),
  `stop` (the Stop button), `success-strong` (completed-level dot, because
  the shared `success` is too pale on the picker).
- **Code export**: `syntax-keyword`, `syntax-call`, `syntax-number` and the
  brand badges `logo-c`, `logo-python` (+accent), `logo-javascript`.

## Sharing the VTS-apps look

Algorithy is one of the VTS teaching apps. Its chrome reuses that family's
visual language, but not its branding (no team logos, no cursor spotlight or
cursor trail):

- **Font** - Gilroy, loaded from the same `cdnfonts` import the sibling apps
  use, with an `-apple-system` / Segoe UI / `sans-serif` fallback. It is set as
  `--font-sans` in `styles/theme.css`, so everything inherits it; headings get
  the family's tighter `-0.02em` tracking. The documentation page carries the
  same import in its inline stylesheet.
- **Primary** - the family indigo/violet, `oklch(0.585 0.233 277)` in light
  and `oklch(0.673 0.182 277)` in dark, with violet `secondary`
  (`oklch(0.606 0.25 293)` / `oklch(0.702 0.183 294)`) and cyan `accent`
  (`oklch(0.688 0.148 233)` / `oklch(0.75 0.13 230)`) as the supporting hues.
  Because `player` equals `primary`, the mouse is purple too.
- **Primary gradient** - the signature `92deg` indigo-to-violet sweep
  (`--app-primary-gradient`) is a `bg-primary-gradient` utility with a soft
  coloured glow. Run and the builder's Share use it; the neutral and Stop
  buttons keep their own colours.
- **Aurora background** - `--app-background` layers the landing page's
  indigo/violet/cyan radial glows over the page, dialled down for a working
  screen (subtle washes in light mode, the full navy aurora in dark). It is
  painted on `body`; `#root` is transparent and the header is a translucent
  surface so the glow reads through.
- **Light theme** - the page is a purple-tinted near-white (`surface`
  `oklch(0.965 0.012 285)`) with near-white cards/inputs (`surface-raised`
  `oklch(0.995 0.004 285)`) and a stronger indigo/violet aurora, closer to the
  sibling app's `#f5f7fa` + white-card look.
- **Navy dark mode** - the dark surfaces are tinted indigo
  (`surface` `oklch(0.21 0.03 275)`, `surface-raised` `oklch(0.27 0.04 275)`)
  to match the sibling editor's `#161a2e` / `#232842` chrome.
- **Readable contrast** - `content` is `oklch(0.17 0.022 285)`,
  `content-masked` `oklch(0.37 0.04 285)` (dark-mode `0.78`), and the light
  status colours sit around `0.47`, because `success`/`warning`/`error`/`info`
  are used as text in the outcome details. Borders use their own `border-masked`
  (`oklch(0.76 0.025 285)` light), so darkening text does not darken every
  divider. Every focusable control gets a `:focus-visible` outline from
  `styles/global.css`, and the glass surfaces (header, modals, palette,
  sequence zone, toasts, block bodies) use deeper `backdrop-blur` so the aurora
  reads behind them.
- **Rounder, softer** - the radius scale is one step roomier, following the
  family's controls/cards/pills (`--radius` 6px, `-md` 10px, `-lg` 18px,
  `-xl` 22px), and the shadows are low-opacity black instead of solid
  `content`. Controls also got the family's roomier padding (`px-3 leading-9`
  inputs, `px-4 py-2` at `v-sm`).

What stays Algorithy's own: the mouse, cheese, lava and hole art, the
Scratch-like block palette, the procedural terrain textures and the layout.

## Brand mark

The header shows the app name as a hand-made pixel wordmark,
`public/assets/logo.svg`: the same `#44aa00` blocks as the favicon
(`public/assets/favicon.svg`). Everything is on one 25.4-unit pixel grid. The
capital "A" is the favicon glyph verbatim. The lowercase "lgorithy" is a
coarser font built from **fewer pixels**: `l` and `h` reach the A's height,
`t` stops one row short (a lowercase t), the x-height letters sit three rows
tall, `g` hooks left below the baseline and `y` hangs two rows, all
baseline-aligned with the A. It is an `<img>`
inside the
shell `h1`, with `alt="Algorithy"`, and it also replaces the text in
`public/404.html`. `ShellText` no longer writes the title into the header (that
caused a flash); it only localises the logo's `alt`, so the mark survives
mount. The builder is the one page that replaces the mark: `HeaderTitle` swaps
it for the builder's own pixel wordmarks (`public/assets/logo-builder-*.svg`) -
one file per word, in each language, built on the same 25.4-unit grid and the
same `#44aa00` - which can wrap onto two lines on a narrow screen. Its height
comes from the header `h1 img` rule in `src/style.css`, and
`shape-rendering="crispEdges"` keeps the blocks sharp when scaled down. The
favicon itself is untouched.

## Block chrome

`BlockShell` (see [Blocks](./07-blocks.md)) is the single source of block
chrome: the clipart body, the notch border, the bottom tooth, the variant map
and the drag-over colour swap. Block colours are solid 80% or washed 60% opacity
with a 4 px backdrop blur; 70/50 was tried first and looked muddy when
containers nested, so the values are what they are on purpose. `--block-height`
is the shared height so every block, including the Start head, aligns.

## Terrain themes

A level names a theme per block kind through `looks`; the theme is an
identifier, never a class. `src/terrain.css` maps each `data-terrain` +
`data-kind` pair to a colour token and a procedural texture, with the rule
that **ground and wall of a theme are different images** (different
frequency, seed, scale or offset), never the same image. The art direction:

- `default` - large smooth rock/sand grain.
- `amber` - coarse sand.
- `forest` - grass ground with directional needles; the wall is a dense,
  overlapping, upright evergreen canopy of varied size and tone that covers
  the whole tile (no ground shows between trees).
- `frost` - soft snow drifts.
- `icy-blue` - ice with large stripes.
- `legend` (deep ice) - large smooth depth patches, no lines.
- `boss` (purple) - hazy sharp polygons.
- `stone` - dry gravel (ground) and darker wet gravel (wall).
- `ice` - icy surface with stripes; the block kind `ice` always uses it.

Textures are tileable (`stitchTiles` noise or `<pattern>` shapes), large
(72-160 px), and every cell paints from the same origin, so tiles stay
perfectly square and aligned. The `--tex-block` grain is shared by the block
bodies and the cheese so entities read as part of the same world.

## Entity art rules

Flat art only: filled shapes, no strokes, outlines or gradients. Friendly
and non-violent by design (a game for all ages). The mouse, cheese, lava and
hole are described in detail on [The playground](./12-playground.md).

## Skins

`data-player-skin='blue' | 'pink'` overrides `--color-player`, so it works
on `<html>` (the live game, set by `lib/skin.ts`) and on any element (the
picker options render a preview mouse in each skin). The choice persists in
`localStorage` under `bunplate:player-skin`.

## Sound

Sound is additive, never load-bearing: every cue accompanies a signal that is
already there (the outcome toast or modal, the wall bounce, the trap animation,
the block landing), so a muted or silent device loses nothing. There are no
audio files and no network requests. `lib/sound-recipes.ts` is the whole
"sound design" as data: warm mallet/bell tones (a fundamental plus a few
inharmonic overtones) for rewards and notices, and plain foley (a bite, a
bump, a swish, a sizzle) for the rest - the language of modern casual games,
not arcade chiptune. `lib/sound.ts` synthesises each recipe with the Web Audio
API, behind a lazy `AudioContext` created on the first user gesture, and sends
everything through a soft master low-pass and a small plate reverb so short
cues feel produced.

Cues fire **in real time from the run animation** in
`features/level/hooks/useSimulation.ts`, not from a later outcome effect, so
each one matches what the player sees and hears at that instant: `won` plays
a bite of cheese then a warm three-note marimba "got it" with a sparkle the
moment the mouse lands on the cheese, `blocked` a soft woody thunk the instant
it hits a wall, `hole` a falling whistle while it falls, `lava` a sizzle and a
puff of steam while it evaporates, `infinite-loop` a stuck two-note wobble,
and `not-reached` a gentle two-note fall when the program runs out.
`features/level/outcome-sound.ts` reads the lethal cell to tell a hole from
lava. `run`, `stop` and `reset` are soft mallet ticks, the drag commits
`place`/`remove` are a marimba pluck and a short swish, and the app shell wires
one small bell into the `ToastProvider` for every toast rather than a bespoke
sound per type. The header's `SoundToggle` (a `Volume2`/`VolumeX` button next
to the skin switcher) mutes every cue; the choice persists under
`algorithy:sound-muted`, validated by `schemas/sound.schema.ts`.

## Responsive scale

Sizing scales with the viewport instead of breakpoint jumps: `clamp()` for
block padding and text, the `v-*` custom variants (`v-xs` through `v-3xl`)
for spacing, a fixed `clamp()` height for the palette (it must not grow or
shrink between levels), and explicit per-breakpoint widths for the level's
left column so the palette keeps its width even while its blocks are hidden
during a delete drag.

The root font size is the master scale: `html` uses
`font-size: clamp(14px, 0.8333vw, 64px)`. It is px, not `rem`, so it ignores
the browser's default font size, and it is linear on **width**: 16px at Full
HD (1920), 32px at 4K (2x), 64px at 8K (4x); phones and small laptops sit at
the 14px floor. Every `rem` token and Tailwind utility follows it, which is
what lets the `clamp()` maxima (chrome, palette, block height, the `84rem`
playground cap) reach their large values instead of the UI staying 1080p-sized
in a 3840px viewport.

Border widths follow the same scale. Three `rem` tiers - `--border-hairline`
(`max(1px, 0.0625rem)`), `--border-area` (`max(1.5px, 0.125rem)`) and
`--border-block` (`max(2px, 0.1875rem)`) - are exposed as the
`border-hairline`, `border-area` and `border-block` utilities. The block shell,
the sequence/palette zones, the header controls and the form fields all use
them, so the block outline is 3px at Full HD, 6px at 4K and 12px at 8K, and
never drops below 2px on a phone.

Next: [Persistence](./14-persistence.md).
