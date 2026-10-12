# context - Algorithy internals

Deep reference for `apps/app`. Read this before a refactor or any change to
`domain/simulation.ts`, a schema, or the drag tree. `../AGENTS.md` is the
always-on summary; this file is the detail.

## 1. Data flow

```mermaid
flowchart LR
  JSON[levels/Level*.json] --> parseLevel[parseLevel LevelSchema] --> LevelData
  LevelData --> Level[feature/level/Level.tsx]
  Level --> useSequence --> SequenceItem[]
  Level --> useSimulation --> PlayerState
  Level --> dnd[features/level/dnd] --> SequenceItem
  Registry[resolveActions allowedActions] --> Palette --> dnd
  SequenceItem --> setSequence
  SequenceItem --> collectExecutedActions --> useSimulation animation
```

Level loading: `domain/level.ts` eagerly globs `../levels/Level*.json`, parses
each with `parseLevel`, throws on invalid data, dedupes `id`/`slug`, and sorts
by numeric slug. `resolveLevel` accepts slug, id, or a numeric fallback.

## 2. State machine

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> running: run()
  running --> won: player at target
  running --> blocked: !step.isSuccessful
  running --> not-reached: executed actions exhausted
  running --> infinite-loop: while state repeated 3x
  running --> trapped: stepped on lava/hole
  won --> idle: reset()
  blocked --> idle: reset()
  not-reached --> idle: reset()
  infinite-loop --> idle: reset()
  trapped --> idle: reset()
```

`useSimulation` also clears the pending timeout and resets when `level` or
`sequence` changes, so editing the program aborts a run. Win/lose statuses are
held back briefly (`WIN_SETTLE_MS`, `TRAP_SETTLE_MS`, `FAILURE_SETTLE_MS` in
`useSimulation.ts`) so the final frame - the mouse on the cheese, or the trap
animation - is visible before the outcome prompt/toast appears.

## 3. Blocks

`schemas/block.schema.ts`: `ground | wall | ice | lava | hole`.

| Kind   | passable | slidable | notes                                |
| ------ | -------- | -------- | ------------------------------------ |
| ground | yes      | no       |                                      |
| wall   | no       | no       |                                      |
| ice    | yes      | yes      | movement slides to the last ice cell |
| lava   | yes      | no       | lethal; `isTrapped`                  |
| hole   | yes      | no       | lethal; `isTrapped`                  |

`defaultLooks` maps kinds to a terrain identifier (`schemas/terrain.schema.ts`).
In `LevelSchema`'s transform, every block kind is seeded from `defaultLooks`;
`lava` and `hole` inherit the level's `ground` terrain (traps are drawn on top
of the floor, like the player and target) and each block merges its
`looks[kind]` override; the result is `Record<BlockKind, BlockLook>`. `GridCell`
emits the terrain as `data-terrain`
(+ `data-kind`) and `style.css` derives the colour and texture.

### Trap design rule

Traps are passable but lethal, so an `if`/`switch` that only tests `passable`
reads them as a free path. A trap is only meaningful when it sits on a route
that would otherwise reach the target - i.e. it blocks one of two valid ways.
If the trapped route is a dead end, it is not a trap: the run would fail there
anyway. Rules: at most one trap per level; never on the seeded `optimalSolution`
(traps are passable, so moving one never changes a path decision, but placing
one on the solution path kills it); put it where a plausible algorithm turns
in. Current traps are one each in Levels 10 (hole), 12 (lava) and 13 (hole).

## 4. Simulation

- Tables: `DIRECTION_DELTAS`, `TURN_RIGHT`, `TURN_LEFT`.
- `collectSlidingTrail`: from an ice cell, advances while ahead is in bounds and
  `passable`; bounds the walk by `width * height`. It stops early when the
  current cell is the target, so a slide that crosses the goal lands on it.
  This keeps `runSequence`/`countExecutedCycles` consistent with the slide
  animation in `useSimulation`, which wins on the target crossing.
- `stepAction`: rotate (always succeeds) or move (succeeds only into bounds +
  `passable`), then apply the slide. Returns `{ playerState, isSuccessful }` -
  one state and one flag, no aliases.
- `evaluateCondition`: resolves `path-ahead/left/right` relative to facing,
  returns whether that adjacent cell is `passable`.
- Weighted cycle model (`countIterations` / `countExecutedCycles`):
  - leaf, `if`, `while`: `1 + inner`
  - `for`: `2 + n * (2 + inner)`
  - `switch`: `1 + max(branch)`
- `runSequence` walks the tree, expanding loops at runtime and stopping on
  target, block, trap, or loop detection. It returns both the static
  `iterationsUsed` and the simulated `executedCycles`.
- Cycle cost is the cost of the written program, not of the visual walk:
  `countExecutedCycles` keeps counting after the target is reached (a `for`
  runs all repetitions, and actions after the winning block count), while
  `runSequence` and `collectExecutedActions` stop at the target for player
  feedback. `while` stops at the target in both paths because its condition is
  "target not reached". Deliberate design choice, not a bug.
- `collectExecutedActions` mirrors `runSequence` but records the flat action
  order for the animation; `getMoveTrail` supplies intermediate slide cells.
- `toSimulationSequence` prepends a `start` item to an `optimalSolution`;
  `convertOptimalItem` converts an optimal item (and its nested
  `children`/`elseChildren`/`branches`) into the simulation `SequenceItem` shape.

## 5. Sequence / optimal-solution invariants

`SequenceItemSchema` (UI shape) carries: `kind:'algorithm'`, `id`, `action`,
`label`, `from?`, `sourceId?`, `default`, `count?`, `condition?`, `movable`,
`modifiable?`, `children?`, `elseChildren?`, `branches?`.

`OptimalSolutionItemSchema` (level data shape) is validated by cross-field
checks: no `start`; `for` requires `count` + non-empty `children`; `while`
requires non-empty `children`; `if` requires `condition`; `switch` requires
non-empty `branches`; only container actions may have `children`; `count` is
forbidden outside `for`. Keep these checks in sync with `domain/simulation.ts`.

`defaultActions` in a level uses a parallel, slightly looser schema
(`DefaultActionSchema`) that permits `modifiable` and `movable`, and is used to
seed locked/editable starter blocks via `useSequence.createSequenceItemFromDefault`.

## 6. Drag & drop lifecycle

Custom Pointer Events DnD in `features/level/dnd/`; there are no HTML5 drag
events, so it works with mouse, touch and pen alike.

- `DndProvider` exposes the stable consuming api via `useDnd()`:
  `draggableProps(descriptor)`, `dropZoneProps(zoneId)`, `deleteZoneProps()`.
  Components never attach raw pointer or drag listeners.
- `session.ts` owns the pointer session: a 50 ms hold / 8 px slop on touch
  (4 px on mouse) distinguishes a drag from a tap or scroll, a floating ghost
  (cloned node) follows the pointer, body gets `data-dragging` /
  `data-deletable-drag`, and `Escape` / `pointercancel` cancels.
- `targets.ts` hit-tests with `document.elementFromPoint` ->
  `[data-drop-zone]` / `[data-drop-delete]`, then `lib/hover.ts:computeHoverIndex`
  for the insertion index. The active zone gets `data-drag-over='true'`, which
  `style.css` outlines.
- Drop resolution reuses `domain/sequence-tree.ts`: palette inserts via
  `insertAt`, same-zone reorder via `moveWithinZone`, cross-zone move via
  `removeAt` + `insertAt`, delete via `removeAt`. Inserts clamp past locked
  items.
- Drop-zone ids are `root`, `<id>`, `<id>:else`, `<id>:branch-<n>`.
- Reactive state from `DndProvider`: `useActiveZoneId()` drives the original
  BlockShell `isDragOver` highlights (and the root zone border);
  `useActiveDrag()` hides the dragged source (`invisible`) for both palette and
  sequence drags.
- Autoscroll: while the pointer is within `autoscrollEdgePx` of the viewport top
  or bottom, the session scrolls `window` on rAF (`autoscrollSpeedPx`).
- All tunables live in `dnd/config.ts` (hold, slop, ghost z-index, autoscroll);
  do not inline them elsewhere.

## 7. Routing, shell and serving

`lib/router.tsx` is a hand-rolled client router (`pushState` + `popstate`), not
Hono routing. `/` is replaced with the stored level (level 1 when there is
none); `LevelPage` resolves the slug and the `NotFound` page handles the rest.
Level progress lives in `localStorage`: every level keeps its program under
`algorithy:level:<slug>` (the sequence structure plus a `default` flag, rebuilt
into a UI sequence by `stored-sequence.ts`, which merges the internal fields of
the level's default blocks), plus `algorithy:last-level` and
`algorithy:completed-levels`. `schemas/persistence.schema.ts` validates every
read; `useSequence` restores and saves the program, and a win records
completion. `App.tsx` mounts `LocaleProvider`
(Paraglide locale, `<html lang>`, keyed subtree) around `ToastProvider` >
`SkinProvider` > the router plus the skin, sound and language switchers. Translations
live in `messages/*.json` and compile to `src/paraglide/`; see `.agent/i18n.md`.

`src/server.ts` is a Hono app run by `Bun.serve`. It returns `index.html` (the
SPA shell template at the app root) for non-asset routes and serves `/assets/*`
from `dist/` first, then `public/`. The client bundle (`bun build`) and CSS
(`@tailwindcss/cli`) are produced by `bun run build`; `src/dev.ts` runs the
server with watch rebuilds. There is no Vite.

## 8. Level pedagogy

Earlier levels teach sequencing and rotation with locked (`movable:false`)
starter blocks and narrow corridors; later levels open up (`defaultActions: []`)
and introduce loops, conditionals, ice and traps (lava/hole). `Level1` is a
3-cell corridor with one locked `move-forward`; `Level20` is a 9×9 maze solved
with `while` + `if` decisions. `optimalActionCount` and
`optimalIterations` are asserted by `level.test.ts`, so any level edit that
changes the intended solution must update those numbers.

## 9. Current status

- `bun run validate`: **green** (format + lint + tests).
- Build/serve: **working and Vite-free.** `bun run build` emits
  `dist/assets/client.js` (`bun build`) and `dist/assets/index.css`
  (`@tailwindcss/cli`); `bun run start` serves them with Hono (`src/server.ts`);
  `bun run dev` watches and serves. The app is self-contained: own
  `tsconfig.json`, `bunfig.toml`, `paraglide.config.ts`, lint/format configs
  and `styles/`.
- `Level19` was fixed by making sliding stop on the goal; its
  `optimalIterations` was corrected from the stale `85` to `49`.
- DnD is pointer-based (`features/level/dnd`) and works on touch; the old HTML5
  layer (`lib/dnd.ts`, `hooks/useOnDrag*`, `useDragState.ts`) is emptied and
  should be deleted. `SequenceItemRenderer.tsx` (~500 lines) still has a render
  branch per container block - optional cleanup.
- Progress persists per browser: each level's program under
  `algorithy:level:<slug>` (in the solution shape), plus last level and
  completions; schema-validated reads with empty fallbacks, non-throwing writes.
- Sound is procedural (Web Audio, no assets) and additive: `lib/sound-recipes.ts`
  holds the cues, `lib/sound.ts` synthesises them, and `useSimulation` fires each
  cue at the real-time event (chomps at the cheese, thud at the wall, whistle
  while falling, sizzle while evaporating, stuck blips, shrug), `outcome-sound.ts`
  tells hole from lava, the `ToastProvider` plays one generic `toast` blip, and
  the header `SoundToggle` persists mute under `algorithy:sound-muted`.
