# Glossary

Every term the documentation uses, in one place.

**Action** - one instruction a block stands for: `move-forward`,
`turn-left`, `turn-right`, `for`, `while`, `if`, `switch`. `start` is the
synthetic head.

**Block** - the visual, draggable unit of the program; a rendering of a
sequence item.

**Block kind** - what a map cell is made of: `ground`, `wall`, `ice`,
`lava`, `hole`.

**Boundary** - any place data enters the program from outside (a JSON file,
`localStorage`, a URL segment, an input), and therefore must be validated.

**Builder** - the paint-like editor at `/build` where players make and share
their own levels.

**Condition** - a question about the path relative to facing:
`path-ahead`, `path-left`, `path-right`.

**Container** - a block that holds other blocks: `for`, `while`, `if`,
`switch`.

**Cycle** - the game's unit of program cost; the weighted model prices
containers and loops, the executed model counts real work (bigint).

**Default (block)** - a starter block seeded by the level's
`defaultActions`, flagged `default: true`, undeletable, possibly locked.

**Draft** - the work in progress in the builder, saved in this browser under
`algorithy:builder-draft` and restored on the next visit.

**Saved level (builder)** - the one builder level committed with Save, stored
under `algorithy:builder-level`. Saving always overwrites it; there is no
gallery.

**Drop zone** - a place a block can be dropped, addressed as `root`,
`<itemId>`, `<itemId>:else`, `<itemId>:branch-<n>`.

**Ghost** - the floating copy of a block that follows the pointer during a
drag.

**Level** - one puzzle: a grid, a player, a target, a palette and an
authored optimum, in `LevelN.json`.

**Locked** - `movable: false`; the item cannot be moved, and inserts clamp
past it.

**Look / terrain** - the presentation of a block kind, one identifier
(`forest`, `ice`, ...) that CSS turns into colour and texture.

**Outcome** - how a run ends: `won`, `blocked`, `not-reached`, `trapped`,
`infinite-loop`.

**Palette** - the tray of available blocks; doubles as the delete zone.

**Passable** - walkable by the player. Lava and holes are passable but
lethal, which is what makes them traps.

**Payload** - the encoded byte string that carries a whole shared level in
its link: salt, board, metadata and solution, with a checksum.

**Playground** - the game board: the labelled grid table, the player, the
target and the traps.

**Sequence** - the program, a tree of sequence items starting with `start`.

**Salt** - random bytes inside a share payload, fresh for every draft, so
saving the same level twice yields different links.

**Shared level** - a player-made level that travels entirely in its link and
plays at `/shared/<payload>`, with the creator's name in the header.

**Slidable** - ice: a move onto it slides to the last consecutive ice cell,
stopping on the goal.

**Slug** - the numeric level identifier used in URLs (`/levels/3`) and
storage keys.

**SPA shell** - the static `index.html` the server returns for non-asset
routes; the client router decides the screen.

**Trap** - lava or a hole: passable, so path conditions read it as open, but
lethal to stand on.

**Valibot** - the schema library; every boundary is validated with it.

**Zone** - a container's body (children, elseChildren, a switch branch) or
the root, i.e. anywhere blocks can live.

Next: [Level builder](./23-level-builder.md).
