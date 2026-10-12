# color-sweep - styling & tokens

The original "color sweep" (replacing raw palette classes with semantic tokens)
is complete. This file is now the reference for the token system and the
remaining exceptions. Read before changing colors, classes, `style.css`, or
`theme.css`.

## Where tokens live

- `styles/theme.css` - the app's design tokens (`@theme`), breakpoints,
  typography, radii, shadows, and the `v-*` height variants
  (`@custom-variant v-xs … v-3xl`). Imported by `src/style.css`.
- `styles/global.css` - base element styles.
- `src/style.css` - Tailwind entry. Imports Tailwind + `theme.css`, declares
  `@source` globs, app-specific `@theme` overrides, the `.clipart` clip-path,
  `[data-*]` selectors, and browser-engine quirks.

## Semantic tokens (from theme.css)

| Group    | Tokens                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------- |
| Accent   | `primary`, `primary-hover/-active`, `primary-light(-hover/-active)`, `primary-dark(-hover/-active)` |
| Surfaces | `surface`, `surface-raised` (+ `-hover`/`-active`)                                                  |
| Content  | `content`, `content-raised`, `content-masked` (+ `-hover`/`-active`)                                |
| Borders  | `border`, `border-masked` (+ `-hover`/`-active`)                                                    |
| Status   | `success`, `warning`, `error`, `info`                                                               |

App overrides/additions in `src/style.css` `@theme`:

- `primary` (re-specified for the app) and `player = primary`. The app is part
  of the VTS-apps family: `primary` is its indigo/violet
  (`oklch(0.585 0.233 277)` light, `oklch(0.673 0.182 277)` dark), with
  `secondary` (violet) and `accent` (cyan) as the supporting hues. `--font-sans`
  is Gilroy (imported at the top of `src/style.css`), `--app-background` paints
  the family's aurora glows on `body`, `--app-primary-gradient` backs the
  `bg-primary-gradient` utility used by Run and Share, the dark surfaces are
  indigo-tinted and the light ones a purple-tinted near-white with near-white
  cards. `content`/`content-masked` and the light status colours are dark
  enough to read on that surface, and borders use their own `border-masked`
  token so they stay subtle. See
  [Design system](../documentation/13-design-system.md).
- Blocks: `block-sky`, `block-emerald`, `block-yellow`, `block-green`,
  `block-red`, `block-orange`, `block-gray` (the locked/default scheme), each
  with `-hover`, `-active`, `-border`, and
  `block-yellow|green|red|orange|gray-washed` (+ `-hover`, `-border`,
  `-hover-border`).
- Terrain themes (paired ground/wall): `ground`/`wall-orange` (default),
  `ground-amber`/`wall-amber`, `ground-terrain`/`wall-terrain` (forest),
  `ground-frost`/`wall-frost`, `ground-blue-ice`/`wall-blue-ice` (icy-blue),
  `ground-legend`/`wall-legend`, `ground-boss`/`wall-boss`,
  `ground-stone`/`wall-stone`, plus `ice` (+ `ice-hover/-active/-border`).
- Misc: `target` (cheese yellow), `overlay`, `stop` (+ hover/active/border),
  `success-strong` (stronger green for the completed-level dot; the shared
  `success` is too pale against the picker background), the code-preview
  tokens `syntax-keyword`, `syntax-call`, `syntax-number`, and the export tab
  brand badges `logo-c`, `logo-python` (+ `logo-python-accent`),
  `logo-javascript`.
- Entities (`GridCell.tsx`, styled in `src/style.css`): one coherent, friendly
  set (mouse + cheese). Flat art only - filled shapes, no strokes, outlines or
  gradients; `--tex-block` gives the body and cheese the same grain as the
  terrain. Non-violent (game for all ages).
  - Player: `.player-mouse`, a mouse seen from above (oval body, round ears set
    on the head, dot eyes, light nose, tapering curled tail). It walks between
    cells: `.player-step` slides it in from the cell it came from (offsets set
    inline, scoped above neighbouring cells by the table's `isolate`), and its
    accumulated `rotate` makes every turn take the shortest way round instead of
    spinning 270 degrees. `.player-mouse-walking` bobs subtly while running,
    `mouse-idle` breathes when still. The tail is one clipped shape behind the
    body.
  - Target (goal): `.target-cheese`, a narrow cheese wedge cut from the wheel,
    tilted and seen at an angle: `.target-cheese-top` (top face) over
    `.target-cheese-side` (the front cut face). Holes are rolled with
    `Math.random` in `cheeseHoles.ts` (constrained to the wedge so they never
    clip or clump) and placed with inline styles; lighter on the top, darker on
    the side. Still, and hidden while the mouse occupies the cell.
  - Hole: `.hole-pit`, a flat uneven dark pit. Still.
  - Lava: `.lava-pool`, a jagged molten puddle with a fine grain surface and
    fixed `.lava-glow` patches that fade in and out on their own linear clocks.
    Only the player and lava animate. Trap cells use the ground look as their
    background. On death the player animates: `.player-fall` (hole) spins and
    shrinks away, `.player-burn` (lava) evaporates upward (it never grows);
    `prefers-reduced-motion` disables the player/lava animations.

`BlockShell` variants map to these tokens:

| Variant                                                   | Border token                     | Background token                         |
| --------------------------------------------------------- | -------------------------------- | ---------------------------------------- |
| `sky` / `emerald` / `yellow` / `green` / `red` / `orange` | `border-block-<c>-border`        | `bg-block-<c>/80` (+ `-hover`/`-active`) |
| `washed-out-yellow` / `-green` / `-red` / `-orange`       | `border-block-<c>-washed-border` | `bg-block-<c>-washed/60` (+ `-hover`)    |

## Terrain themes

A level no longer carries presentation classes. `looks` maps a block kind to a
single terrain identifier (`schemas/terrain.schema.ts`):

```json
"looks": { "ground": { "terrain": "forest" }, "wall": { "terrain": "forest" } }
```

`GridCell` puts the identifier on the tile (`data-terrain` + `data-kind`) and
`src/terrain.css` derives the base colour and texture for ground/wall. Traps use
the ground theme (their marker is drawn on top); ice always uses the `ice`
terrain. Terrains: `default`, `amber`, `forest`, `frost`, `icy-blue`, `legend`,
`boss`, `stone`, `ice`.

## Playground grid

`Level.tsx` wraps the board in `.playground-box` (min 8rem, capped at
`--playground-limit`, which is computed on the box from the header+footer
chrome, the palette and `--playground-reserved`; the builder raises that reserve
for its title row, toolbar and brushes so the bottom controls stay on screen);
`Playground.tsx` wraps the table in `.playground-frame`
(the inline-size query container) and puts `--playground-columns` /
`--playground-rows` on `.playground-grid`. `style.css` derives
`--playground-label-size` and `--playground-tile-size` from those, then gives
each cell an explicit width and height through `data-playground-track`
(`corner` / `column-label` / `row-label` / `cell`). That is what keeps every
data cell square on non-square maps; do not bring back the table `aspect-ratio`
or `aspect-square` on the cells.

## Textures

All playground textures live in `src/terrain.css`: asset-free, tileable,
procedural, never binary files or network fetches. **Every themed colour has its
own texture** - ground and wall of a theme are variations (different
frequency/seed/scale/offset), never the exact same image.

- `--tex-*` - inline SVG `feTurbulence` noise / `<pattern>` data URIs, one per
  (terrain, kind): rock, sand, grass needles, evergreen canopy, frost speckle,
  ice, deep-ice patches, purple polygons, dry/wet gravel. `--tex-block` is the
  entity grain and `--tex-lava-grain` is the lava pool texture; UI blocks stay
  flat (no grain).
- Colours are **not** changed by any texture rule; each rule sets the level's
  existing `--color-*` token plus a texture. Tiles are large (72-160px) and
  seamless (`stitchTiles` noise or `<pattern>` shapes) so the detail reads as
  randomness, not as busy pixel grain.
- Art direction: grass = directional needles; the forest wall is packed with
  overlapping upright evergreens of varied size and tone, covering the whole
  tile so no ground shows between them; purple = sharp larger polygons, hazy; deep ice =
  large smooth depth patches, no lines; amber/stone/frost = coarse,
  low-frequency grain in the same spirit as levels 1-3; only `ice`/`icy-blue`
  use stripes.
- Per-tile variation is gone: every cell paints the same seamless texture from
  the same origin, with no `background-position` shifts and no per-cell
  `transform` (rotation or mirror), so all tiles are exactly the same size,
  square, and aligned. Rotation used to bleed past the cell on fractional tile
  sizes, and shifted phases broke the pattern at tile seams, which made cells
  look displaced.
- `.lava-pool` uses a fine grain for texture and soft radial `.lava-glow`
  patches that fade in and out; no bubbles, crust or baked-in highlights.
- Header cells (`kind === undefined`) get no terrain attributes and stay clean.
- `--block-height` is the single height shared by `BlockShell` and `Start`
  (`min-h`), so every block is exactly the same height and the top notch never
  overlaps its content.

Keep new textures procedural, tileable, large, and theme-aware.

## Rules

- Use semantic tokens (`bg-surface`, `bg-content/15`, `text-error`,
  `bg-block-sky`, `bg-player`, `bg-target`, `bg-overlay`), never raw palette
  classes like `bg-rose-500`, `text-black/50`, `bg-orange-700`.
- Compose conditional classes with `cn(...)`.
- Every interactive element needs a hover and an active state (background,
  fill, colour or opacity as fits) - no dead-looking controls. If a component
  sets its own `bg-*`, it also owns the `hover:`/`active:` variants, because
  those override the base input/button hover.
- Focus stays visible: `styles/global.css` gives every control a
  `:focus-visible` outline; keep it, or replace it with a `focus-visible:` ring.
- Transparent surfaces keep a `backdrop-blur` (deeper glass reads better over
  the aurora than a flat translucent fill).
- Builder brush swatches show the real paint colour (terrain-aware ground and
  wall, ice, lava, cheese, player skin). Their label ink comes from
  `lib/contrast.ts` `readableInk`, which reads the resolved colour and picks a
  near-black or near-white ink from its perceived lightness (oklch L, or the
  cube root of the WCAG luminance; the crossover is 0.65), so a saturated blue
  gets white ink while orange and the pale terrains get dark ink. Both
  the paint and the ink are set imperatively (the paint lives in `data-paint`,
  the effect runs every render): hono resets an element's inline style whenever
  a `style` prop is applied, so a `style` prop would wipe the ink.
- Let oxfmt sort classes (`sortTailwindcss: true`); run `bun format`.
- Block chrome only through `BlockShell`; do not re-declare `bg-*`/`border-*`
  per block.

## Known remaining exceptions

None. The skin chooser rings moved into `src/style.css` as `.skin-ring` classes
built from the app's tokens (`--color-player` plus block accents), so no
component carries raw colour values.

## Skin theming

`[data-player-skin='blue'|'pink']` overrides `--color-player` in
`src/style.css`, so it works both on `<html>` (the live game, set by
`lib/skin.ts`) and on any element (the picker options render a preview mouse in
that skin). `lib/skin.ts` persists the choice in `localStorage` under
`bunplate:player-skin` and sets the attribute on `<html>`.
