# Level schema

The exact JSON contract of a level file, field by field. The schema lives in
`src/schemas/level.schema.ts` (`LevelSchema`), with `parseLevel(data)`
returning `LevelData | null`. Levels are validated at three moments: once at
module load (the registry throws on invalid data), once per level mount
(`Level.tsx`), and once in the tests.

## The fields

### `id`

A UUID v4 string. Stable identity, independent of the slug, so a level can
move in the order without losing its identity. The registry throws on
duplicates.

### `slug`

A numeric string (regex `^\d+$`, 1 to 16 characters). The slug is the route
segment (`/levels/3`) and the level ordering key. Numeric-only is deliberate:
it is reserved for the default levels.

### `title`

A record of locale keys to strings: `{ "en": "...", "sr-Latn-RS": "..." }`.
At least one locale, each value 1 to 80 characters. Resolved at runtime with
`localized(values, locale)` (current locale, then base locale, then the first
entry). Levels that introduce a block or hazard name it in the title in both
locales (for example "Repeat: For", "Mind the Gap: Holes").

### `width`, `height`, `map`

The grid. `map` is an array of rows, each row an array of block kinds:

- `ground` - walkable floor.
- `wall` - not walkable; every move into it is blocked.
- `ice` - walkable and slippery; see [Simulation](./09-simulation.md).
- `lava` - walkable but lethal (a trap).
- `hole` - walkable but lethal (a trap).

The schema checks `map.length === height` and every row `=== width`, and
every cell must be one of the five kinds. The set of kinds is owned by the
schema (`blockKinds`); a level cannot declare its own block list.

### `player`

`{ x, y, direction? }`. Position plus an optional facing: `up`, `down`,
`left` or `right`, defaulting to `right`. An optional `color` string is
accepted for future art use.

### `target`

`{ x, y }`. Where the cheese is. Optional `color` as above.

### `allowedActions`

The actions this level's palette offers, as a non-empty, duplicate-free list
from the eight action names (`start` is implicit and never listed). This is
the _only_ palette restriction; a level does not declare which block kinds
its map may use.

### `defaultActions`

Optional (defaults to `[]`): the starter program. Each entry uses a
`DefaultActionSchema` parallel to the optimal-solution shape, but looser: it
may carry `movable` (required boolean) and `modifiable` (optional boolean),
plus `count`, `condition`, `children`, `elseChildren` and `branches` for
container actions. These become the locked or editable starter blocks in the
program (see [Persistence](./14-persistence.md) for how they round-trip
through storage). The schema checks every default action is among
`allowedActions`.

### `looks`

Optional per-kind terrain overrides:

```json
"looks": { "ground": { "terrain": "forest" }, "wall": { "terrain": "forest" } }
```

The terrain identifier (one of `default`, `amber`, `forest`, `frost`,
`icy-blue`, `legend`, `boss`, `stone`, `ice`) is presentation only. The parse
transform builds a complete `Record<BlockKind, BlockLook>` from
`defaultLooks`, with two rules baked in:

- `lava` and `hole` cells inherit the level's **ground** look, because traps
  are drawn on top of the floor.
- `ice` always uses the `ice` terrain.
- Per-level `looks` entries override the defaults per kind.

So a level never carries a `bg-*` class or a texture; it names a theme.

### `optimalActionCount`

Integer between 2 and 99: how many blocks the optimal program uses. Asserted
by the tests.

### `optimalIterations`

Integer between 1 and 3 000 000 000, transformed to `bigint` at parse time.
The optimal program's cycle count under the weighted cycle model (see
[Cycles and optimization](./10-cycles-and-optimization.md)). Asserted by the
tests.

### `optimalSolution`

The authored optimal program, in a shape very close to the stored program but
validated harder. `OptimalSolutionSchema` enforces, recursively:

- no `start` item;
- `for` requires `count` and non-empty `children`; `while` requires non-empty
  `children`; `if` requires a `condition`; `switch` requires non-empty
  `branches`;
- `count` exists only on `for`; `condition` exists only on `if` (and
  `switch` branches); only container actions may have `children`;
  `branches` exist only on `switch`.

The tests convert the optimal solution into a runnable sequence
(`toSimulationSequence` prepends `start`) and simulate it: it must win with
exactly the stated block and cycle counts.

## Annotated example

This is level 11, "Split Paths: Switch", the first `switch` level:

```json
{
	"id": "0859160a-82e5-4ecd-a582-c200cc4fce36",
	"title": { "en": "Split Paths: Switch", "sr-Latn-RS": "Račvanje: Grananje" },
	"slug": "11",
	"width": 7,
	"height": 7,
	"map": [
		["wall", "wall", "wall", "wall", "wall", "wall", "wall"],
		["wall", "ground", "ground", "ground", "wall", "wall", "wall"],
		["wall", "wall", "wall", "ground", "wall", "wall", "wall"],
		["wall", "wall", "wall", "ground", "wall", "wall", "wall"],
		["wall", "wall", "wall", "ground", "wall", "wall", "wall"],
		["wall", "wall", "wall", "ground", "ground", "ground", "wall"],
		["wall", "wall", "wall", "wall", "wall", "wall", "wall"]
	],
	"player": { "x": 1, "y": 1, "direction": "right" },
	"target": { "x": 5, "y": 5 },
	"allowedActions": ["move-forward", "turn-left", "turn-right", "while", "switch"],
	"defaultActions": [
		{
			"action": "while",
			"movable": false,
			"modifiable": false,
			"children": [
				{
					"action": "switch",
					"movable": true,
					"modifiable": false,
					"branches": [
						{ "condition": "path-left", "children": [] },
						{ "condition": "path-right", "children": [] }
					]
				}
			]
		}
	],
	"looks": { "ground": { "terrain": "stone" }, "wall": { "terrain": "stone" } },
	"optimalActionCount": 6,
	"optimalIterations": 27,
	"optimalSolution": [
		{
			"action": "while",
			"children": [
				{
					"action": "switch",
					"branches": [
						{ "condition": "path-left", "children": [{ "action": "turn-left" }] },
						{ "condition": "path-right", "children": [{ "action": "turn-right" }] }
					]
				},
				{ "action": "move-forward" }
			]
		}
	]
}
```

Reading it: the player starts in the top-left corridor facing right. The
default program is a locked `while` containing a movable `switch` with two
empty branches, so the player only has to fill in the branch bodies and add
the forward move. The optimal program uses 6 blocks and 27 cycles, and the
test suite proves both numbers.

## Adding a level

1. Create `src/levels/LevelN.json` following the contract above.
2. Register it in `src/levels/index.ts` (static import + registry entry).
3. Keep `optimalActionCount`, `optimalIterations` and `optimalSolution`
   consistent with the map; `schemas/level.test.ts` asserts all three.
4. Run `bun validate`.

Next: [Blocks](./07-blocks.md).
