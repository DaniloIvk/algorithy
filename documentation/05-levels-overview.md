# Levels overview

Algorithy ships with 20 levels. Each level is one JSON file in
`src/levels/LevelN.json`, registered statically in `src/levels/index.ts` (an
`import.meta.glob` would be Vite-only, so imports are explicit). The level
registry in `domain/level.ts` parses every file at module load, throws on
invalid data or duplicate ids/slugs, and sorts by numeric slug.

## The 20 levels at a glance

| Level | Title (en)                               | Grid | Terrain  | Palette adds | Teaches                           |
| ----- | ---------------------------------------- | ---- | -------- | ------------ | --------------------------------- |
| 1     | First Steps: Move Forward                | 5x5  | default  | -            | sequencing, one locked move       |
| 2     | Turn Right                               | 5x5  | default  | `turn-right` | turning right                     |
| 3     | Turn Left                                | 5x5  | default  | `turn-left`  | turning left                      |
| 4     | Into the Sand                            | 5x5  | amber    | -            | longer paths, new scenery         |
| 5     | Repeat: For                              | 7x5  | amber    | `for`        | repetition with a fixed count     |
| 6     | Round and Round                          | 5x7  | amber    | -            | using `for` on a non-square map   |
| 7     | Decisions: If                            | 7x7  | forest   | `if`         | conditional turns, inside a `for` |
| 8     | The Winding Path                         | 9x7  | forest   | -            | combining `for` and `if`          |
| 9     | Keep Going: While                        | 6x7  | forest   | `while`      | repetition until the goal         |
| 10    | Mind the Gap: Holes (The Purple Path)    | 9x9  | boss     | (hole trap)  | a hole trap changes the route     |
| 11    | Split Paths: Switch                      | 7x7  | stone    | `switch`     | branching on the path ahead       |
| 12    | Hot Floor: Lava                          | 7x7  | stone    | (lava trap)  | a lava trap changes the route     |
| 13    | Rock Bottom                              | 9x9  | stone    | (hole trap)  | `while` + `switch` through a hole |
| 14    | Frostbite: Ice                           | 7x5  | frost    | (ice)        | sliding on ice                    |
| 15    | Slippery Slope                           | 7x7  | frost    | -            | planning around slides            |
| 16    | Deep Freeze                              | 9x9  | frost    | -            | longer icy routes                 |
| 17    | Blue Ice                                 | 9x9  | icy-blue | -            | a map with no ground at all       |
| 18    | Frozen Maze                              | 9x9  | icy-blue | -            | ice maze with decisions           |
| 19    | The Long Slide                           | 9x9  | icy-blue | -            | a long ice slide onto the goal    |
| 20    | The Last Piece of Cheese (The Blue Path) | 9x9  | legend   | -            | the final chase: `while` + `if`   |

The palette is never hardcoded per level: each level's `allowedActions` list
decides which blocks the palette offers, and the schema enforces that the
defaults and the authored optimal solution only use those actions.

## Title conventions

Level titles are player-facing content, not UI chrome, so they live in the
level JSON as a locale-keyed record. Two rules keep them honest:

- A level that **introduces a block or hazard names it** after a colon:
  "Repeat: For", "Decisions: If", "Keep Going: While", "Mind the Gap: Holes",
  "Split Paths: Switch", "Hot Floor: Lava", "Frostbite: Ice". A level that
  introduces nothing new gets a plain thematic name ("Into the Sand", "The
  Winding Path", "Rock Bottom").
- A thematic colour path may be kept in parentheses after the descriptive
  name, as on levels 10 and 20: "Mind the Gap: Holes (The Purple Path)" and
  "The Last Piece of Cheese (The Blue Path)". The parenthetical is a place
  name, not a second mechanic.

## How levels teach

- **Early levels** seed locked starter blocks (`defaultActions` with
  `movable: false`) and narrow corridors, so the player focuses on one new
  idea. Example: level 1 puts one locked `move-forward` in the program.
- **Later levels** open up (`defaultActions: []`) and combine ideas: loops,
  conditionals, ice and traps.
- **Traps** (holes in 10 and 13, lava in 12) sit on a route that would
  otherwise reach the target, so a decision is actually a decision. The trap
  design rule is described on the [Simulation](./09-simulation.md) page.
- **Terrain** changes with the story: sand (amber), forest, stone, frost,
  ice, deep-ice and the purple "boss" theme. Terrain is presentation only; it
  never changes the rules.

## Registry details (`domain/level.ts`)

- `levelEntries` is built once at module load: parse every `Level*.json`,
  throw on invalid data, sort by numeric slug, throw on duplicate ids or
  slugs.
- `resolveLevel(input)` accepts a slug, a UUID id, or a numeric string
  fallback; it returns the raw JSON data or `null`.
- `resolveNextSlug` / `resolvePrevSlug` walk the sorted list and power the
  Next/Previous level navigation and the picker.

## The authored optimum

Every level carries three numbers that describe its intended solution:

- `optimalActionCount` - how many blocks the optimal program uses.
- `optimalIterations` - its cycle count under the weighted cycle model.
- `optimalSolution` - the program itself, in the level-data shape.

These three are not decoration. The test suite simulates every
`optimalSolution` and asserts it wins with exactly the stated block and cycle
counts, so editing a level without updating these numbers fails the gate.
More on the cycle model in
[Cycles and optimization](./10-cycles-and-optimization.md).

## The exact JSON contract

Every field, its rules and defaults, is documented field by field on the
[Level schema](./06-level-schema.md) page, with an annotated example.

Next: [Level schema](./06-level-schema.md).
