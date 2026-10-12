# The playground

The playground is the game board: a grid of cells, a walking mouse, a cheese
target, and the traps. It is rendered as a real `<table>` for the simple
reason that a table is the correct semantic model of a labelled grid, and
screen readers understand it for free.

## Structure

- `components/Playground/Playground.tsx` renders the frame and the table: one
  header row of column letters (A, B, C...) plus a corner cell, then one row
  per map row, each prefixed by its row number. Letters come from
  `lib/column.ts` (`columnLetter`, throws outside 0..25).
- `components/Playground/GridCell.tsx` renders one cell. It receives the
  position, the block kind, the level's look, the player state and the target
  flag, and lays out the cell's layers: terrain background, the
  checkerboard tint, the trap art (lava pool or hole), the target cheese, and
  the player figure when the mouse is on that cell. The cheese hides while the
  mouse occupies the cell, but it waits for the mouse to actually land: while
  the player slides in, `.target-arrive` keeps it visible and drops it the
  moment the step ends.
- Every cell is a `<td>` with an explicit width and height, so cells are
  **exactly square** whatever the map shape.

## The sizing math (why cells are square)

Tables want to size themselves from content, which would make a 5x7 map's
cells slightly tall. The app refuses that: all geometry is computed from two
custom properties and applied explicitly.

1. `.playground-box` caps the board at `--playground-limit` (the largest
   square that fits, computed there from the header and footer chrome, the
   palette and `--playground-reserved`; a page with more chrome above the board,
   like the builder, raises that reserve).
2. `.playground-frame` is an inline-size query container.
3. `.playground-grid` gets `--playground-columns` and `--playground-rows`
   (the map size) and derives:
   - `--playground-label-size` - the label track, `clamp(1.5rem, 6% of the
limit, min(2.25rem, half a tile))`, so digits fit but never eat the
     board;
   - `--playground-tile-size` - the smaller of (frame width minus label) per
     column and (limit minus label) per row.
4. Each track type gets explicit sizes: the corner and the two label tracks
   take the label size on one axis, and every **data cell takes
   `--playground-tile-size` for both width and height**.

Because one value drives both axes of every data cell, cells are square by
construction, on any map shape and any viewport. The historical
`aspect-ratio` on the table was removed for exactly this reason: it ignored
the label row and column and drifted to 1:1.05 on non-square maps.

## Terrain and textures

Each cell's background comes from its **terrain identifier** (`data-terrain`

- `data-kind` attributes, derived from the level's `looks`), mapped in
  `src/terrain.css` to a colour token and a procedural texture:

* Textures are asset-free, tileable inline SVG data URIs: `feTurbulence`
  noise with `stitchTiles` for rock/sand/grass/frost/gravel, a jittered
  upright evergreen canopy for the forest wall, stripes for ice, polygons
  for the purple boss theme.
* Every cell paints the same seamless texture from the same origin, with no
  per-tile transforms or background shifts, so every tile is identical in
  size and shape and the grid is perfectly respected. (An earlier per-tile
  variation experiment rotated and phase-shifted tiles; on fractional cell
  sizes the rotations bled a pixel or two past the cell and the shifted
  phases broke the pattern at tile seams, so it was removed.)
* Traps draw their marker on top of the level's ground look; ice always uses
  the `ice` terrain.

The full art direction is on the [Design system](./13-design-system.md) page.

## Entities

- **The player** - `components/PlayerMouse.tsx`: a flat mouse seen from
  above (oval body, round ears, dot eyes, a tapering curled tail), the same
  component used for the skin previews. It walks between cells
  (`.player-step` slides it in from the cell it came from), its accumulated
  rotation always takes the shortest way round a turn, it bobs while running
  and breathes while idle.
- **The target** - `components/TargetCheese.tsx`: a cheese wedge cut from
  the wheel, with holes rolled by `cheeseHoles.ts` (constrained to the wedge
  so they never clip or clump, lighter on top, darker on the cut face). It is
  hidden while the mouse stands on it.
- **Lava** - a clipped, jagged molten puddle with fixed `.lava-glow` patches
  that fade in and out on independent linear clocks. On death the mouse
  evaporates upward (`player-burn`), and it never grows back.
- **Hole** - a flat, uneven dark pit. On death the mouse spins and shrinks
  away (`player-fall`).

Only the player and the lava animate; everything else is deliberately still.
`prefers-reduced-motion` disables the player and lava animations.

## Accessibility of the board

Every cell is a real table cell with an accessible name: column and row
headers announce the coordinates, and each cell carries a `title` and a
screen-reader-only label for its contents (ground, wall, ice, lava, hole,
target, player). Details on [Accessibility](./18-accessibility.md).

Next: [Design system](./13-design-system.md).
