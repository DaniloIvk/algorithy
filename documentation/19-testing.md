# Testing

What is tested, what each test proves, and the philosophy behind coverage.
The gate is `bun validate` **from `apps/app`** (format + lint + test); the
scripts there mirror the ones the monorepo root used to hold, so the app sits
on its own. `bun test` runs with coverage reporting and **randomized order**,
so a test that depends on another test's leftovers fails loudly.

## The coverage philosophy

Coverage is a by-product, not a goal. The aim is **real coverage in real use
cases**: every test below exercises a behaviour a player, an author or a
maintainer actually depends on. Line and function coverage is the hint that
keeps us honest ("is there a branch no real case reaches?"), and the small set
of lines that stay dark is listed in
[Known issues and gaps](./21-known-issues-and-gaps.md).

The app has a real DOM harness now (happy-dom through a Bun preload) and no
Testing Library: components are mounted with `hono/jsx`'s own `render`, driven
with real events, and asserted on real DOM, real timers and real
`localStorage`.

There is deliberately **no `coverageThreshold`**. A handful of lines are
redundant re-checks that no input can reach (see the known-gaps page), so a
hard per-file 100% gate would force either synthetic tests or deleting still
useful defensive code. The report is read, not wired to fail.

## The tests, file by file

### `schemas/level.test.ts` - every level is real and winnable

The strongest test in the app. For each of the 20 `Level*.json` files it:

- parses the level and asserts the schema checks pass;
- converts the authored `optimalSolution` into a runnable sequence and
  **simulates it on the real map**;
- asserts the run wins, uses exactly `optimalActionCount` blocks, and costs
  exactly `optimalIterations` cycles.

Effect: no level can ship with a solution that does not actually win, and no
map edit can silently invalidate the stated optimum. This is how the app is
"played" before anyone opens it.

### `domain/simulation.test.ts` - the rules of the world

The engine's real behaviour, not just winning runs: `stepAction` (turns,
walls, bounds, ice slides that stop on the goal), `getMoveTrail`,
`evaluateCondition` at the board edge, `isTrapped`, `countBlocks` (which
includes the `start` head), the outcome paths `won` / `blocked` /
`not-reached` / `trapped` / `infinite-loop`, traps and infinite loops inside
`for` / `while` / `switch` / `if`, the animation helpers
(`collectExecutedActions` stops at the target), the cycle models
(`countExecutedCycles` charges every written repetition, a `while` stops on
the target), `formatCycles`, the loop threshold, and `detectExcessRepetitions`
for the excess-`for` hint.

### `schemas/level.schema.test.ts` and `schemas/sequence.schema.test.ts` - the boundaries

The rejection contract, which the happy-path suites cannot show: map
dimensions, palette rules, title and slug rules, the authored count bounds,
look defaults (traps inherit the ground theme, ice uses `ice`), and the
container shape rules for the optimal solution and the UI sequence, including
the fields that must not appear on a `for`, `while` or `if`. `parseLevel`,
`parseSequence`, `parseCount` and `parseOptimalSolution` are exercised
directly.

### `features/builder/level-codec.test.ts` - the share link codec

Round trips at every scale: a minimal level, every block kind, every
container shape, unicode titles and authors, and a 16x16 level with a deep
solution that must still land far under the URL budget. The rejection suite
pins garbage, truncation, a flipped bit (the checksum catches it), shapes the
encoder refuses (sizes, over-long strings, a container body holding the
implicit `start`), and a battery of **crafted, checksum-valid byte bodies**
that hit every decode rejection: a wrong version, bad sizes, an unknown
terrain or direction, a bad cell kind, missing strings, and every broken
solution item. `fnv1a16` and `toBase64Url` are exported so the tests can build
those bodies; the checksum itself is never weakened.

### `schemas/shared-level.schema.test.ts` - the share boundary

The decoded payload contract: sizes, title and author caps, map dimensions,
player and target inside the board, and a non-empty, well-formed authored
solution.

### `features/builder/shared-level.test.ts` - the builder bridge

Resizing with the off-map buffer, the floor rule under the player and the
target (ice may stay), painting and the player/target swap, the draft payload
round trip, the derived block and cycle counts, the too-heavy guard, the try
preparation (unnamed drafts and losing programs still run), every validation
status from empty to valid, and `levelFromPayload` rejecting a decodable
payload with an invalid shape or a program too heavy to build.

### `features/builder/level-identity.test.ts` - the content identity

The board-only content hash is stable, ignores title/author/solution, and
changes with the board or the action palette; the fingerprint normalises
container solutions and changes with the title or the program.

### `features/builder/builder-session.test.ts` - the publish rules

The dirty check against the one saved level, Share enabled only for a valid
level, and the reason carried when it is not.

### `domain/level.test.ts` - the registry

All 20 levels load, ids and slugs are unique, resolution works by slug, UUID
and padded number, the picker's previous/next walk terminates at the ends, and
the exported validators reject an unparseable entry and duplicate ids/slugs.

### `server.test.ts` - the routes

The SPA shell answers for level paths, `/` and unknown client routes, a
missing asset stays a 404 instead of quietly returning HTML, and
`startServer` binds a real port and stops again.

### `domain/sequence-tree.test.ts` - the program tree

Every mutation helper with its invariants: zone addressing
(`root` / `<id>` / `<id>:else` / `<id>:branch-<n>`), a malformed branch
marker, insert clamping past locked items, reorder clamping (including an
out-of-range source), removal, `updateItem`/`updateZone` reaching a target
inside an else or a switch branch, and `sortSwitchBranches` keeping `default`
last.

### `features/level/stored-sequence.test.ts` - storage round-trips

Saving drops internal fields and keeps the `default` flag; loading merges
the level's defaults back (ids, movable, modifiable); several defaults of
one action match in traversal order; and the invalidation rules all ways: a
program that uses an action the level no longer offers (top level or nested)
is discarded, a flag with no matching default is discarded, a program that
omits a level default's flag is discarded, and an empty stored program on a
level with defaults is discarded. A flagged default plus user blocks after it
survives and comes back correct.

### `lib/persistence.test.ts` - the storage layer

The keys read and write through a fake storage object: valid shapes
round-trip, malformed JSON and wrong shapes fall back to empty, corrupt JSON
strings are ignored, the builder draft and the one saved builder level
round-trip, writes are immediate and non-throwing for a blocked or absent
storage, and the real `localStorage` is used when none is injected, including
when reading the storage property itself throws.

### `lib/i18n.test.ts`, `lib/cn.test.ts`, `lib/column.test.ts`, `lib/skin.test.ts`, `lib/sound-recipes.test.ts`, `lib/sound.test.ts`

The locale fallback (`localized`), class-name joining, column letters (and
their range rejection), the skin storage round trip, malformed stored values,
and the document attribute mirror, the sound recipes (every cue has at least
one voice, and every voice is quiet and timed sensibly), and the sound
preference (the persisted mute flag, corrupt storage, and the safe no-op when
no AudioContext exists).

### `schemas/skin.schema.test.ts`, `schemas/persistence.schema.test.ts`, `schemas/sound.schema.test.ts`

The skin value boundary, the muted-boolean sound preference, and the
stored-sequence, last-level and completed-level parsers including nested
children, else children and branches.

### `lib/hover.test.ts` - the drop index

The insertion-index contract with explicit rects (happy-dom has no layout):
the pointer picks the slot whose midpoint it has crossed, an empty container
is index 0, items inside a nested zone are ignored at the outer level, and the
dragged item is excluded so dropping on its own slot is a no-op.

### `domain/sequence-tree.test.ts` - `clampInsertIndex`

The shared clamp that keeps locked blocks ahead of a drop, including a
pre-placed locked starter block after the head.

### `features/level/components/SequenceItemRenderer.test.tsx` - the drop placeholder

Mounted with the DOM harness: when the pointer is above the `Start` head the
dashed slot is drawn below it (matching where the block actually lands), and
when the pointer is past the last block the placeholder is drawn at the tail.

### `features/level/status.test.ts`, `features/level/outcome-sound.test.ts`, `features/builder/draft-message.test.ts`

Every run status and every builder problem has its own non-empty sentence, a
valid level has nothing to say, and a finished run maps to its cue, with the
two traps told apart from the board.

### `features/level/completion.test.ts` - a level is only won by winning

`recordLevelOutcome` marks completion only for `won`, never for failures or
unfinished statuses, and only once.

### `features/level/export-algorithm.test.ts` - the export contract

The generated C, Python and JavaScript for real programs: the stub scaffold
(only the called functions are declared, condition stubs return a falsy value,
C wraps everything in `main` while Python and JavaScript stay at the top
level), symbol casing per language, the `for`/`while`/`if`/`switch`
translations, `pass` for empty Python bodies, a switch that only has a
`default` branch (unwrapped, no chain), a switch with no branches (exported as
nothing), a loop that calls nothing (still wrapped in C), and the blank-line
formatting contract (containers separated, leaves adjacent, bodies unpadded,
nested-first/flush rule).

### `features/builder/solution-sequence.test.ts`

The authored-solution ⇄ UI-sequence conversion for every container shape,
round-tripping back to the same solution.

### `components/Playground/textureVariant.test.ts`

Kept as an empty placeholder after the per-tile texture variation was
removed; see [Known issues and gaps](./21-known-issues-and-gaps.md).

## The DOM harness and the component tests

`happydom.ts` registers happy-dom before the run, through the `[test] preload`
entry in `bunfig.toml` and again when `src/dom-harness.tsx` is imported, so
the suites also work when the app is tested from a different working
directory. The same preload clears the document, storage and the player-skin
attribute after every test, so nothing leaks between files.

`src/dom-harness.tsx` mounts a real component into a fresh container, settles
its effects and state, and offers a real-timer wait. There is no Testing
Library and no mocking: the tests drive the real DOM, the real timers and the
real `localStorage`.

- `lib/toast.test.tsx` - a toast appears, is marked as exiting and stays
  mounted while it animates out after a manual close, keeps only the five
  newest (with the evicted one animating out first), dismisses itself after
  its duration, clears its timers when the provider is replaced, and explains
  the misuse outside a provider.
- `features/skin/SkinProvider.test.tsx` - choosing a skin stores it and sets
  `data-player-skin`, a skin stored earlier comes back on mount, an unknown
  skin is ignored, clearing removes it from both the document and storage, and
  `useSkin` outside a provider explains the misuse.
- `components/Playground/Playground.test.tsx` - the grid renders a track per
  cell plus the row and column labels, every painted kind lands in its own
  cell, the player and the target are drawn where they belong, and the step
  animation is marked when the mouse walks in from another cell.
- `features/builder/BuilderActions.test.tsx` - the publish button reads Save
  or Share from the dirty state, Save runs its handler, Share is disabled with
  its reason until the level validates, and the two keep their colours.
- `components/Playground/cheeseHoles.test.ts` - the generated cheese holes
  keep their count, shape and non-overlap invariants.

## The documentation has its own tests

`features/documentation/docs.test.ts` and `documentation/documentation.test.ts`
cover the docs pipeline with real use cases:

- every page renders, titles are unique, and the catalog order is stable;
- every internal link and anchor in the rendered output resolves, and heading
  self-links point at real ids;
- the raw markdown route returns exactly the page source;
- the static-build render loop produces a complete page for each entry;
- the server answers `/docs`, `/docs/<slug>` and `/docs/<slug>.md`, and
  unknown slugs 404.

Details on [This documentation](./20-documentation-guide.md).

## What is not covered, and why

Three areas stay outside the tests on purpose:

- **The interactive layers that need layout or timing.** `features/level/dnd/`
  (the pointer session and its event lifecycle), the run animation in
  `useSimulation`, the router and the keyboard path. happy-dom has no layout
  engine, so tests there would assert on geometry that does not exist; the drop
  index is exercised directly through `lib/hover.test.ts` with explicit rects,
  and the logic those pieces delegate to (schemas, the sequence tree, the
  simulator, the storage merge, the export generator) is covered directly
  instead.
- **Web Audio scheduling.** `lib/sound.ts` synthesises tones and noise with the
  browser's Web Audio API; happy-dom has no Web Audio implementation, so the
  oscillator/noise scheduling itself is not asserted. Everything around it is:
  the recipes, the outcome mapping, the stored mute preference and the safe
  no-op when audio is unavailable or muted.
- **A few defensive or redundant branches.** The remaining dark lines are the
  simulator's redundant flag re-checks, the docs index comparator, the
  `switch` tail in the export generator, and the nested rebuild-failure
  propagation in stored-sequence. They are listed with their reasons on
  [Known issues and gaps](./21-known-issues-and-gaps.md).

## How tests run in the gate

`bun validate` (run in `apps/app`) = `bun format` + `bun lint` + `bun test`.
Tests run in randomized order with coverage on; a new test that fails alone, or
breaks another test's assumptions, surfaces immediately. Adding a test is
ordinary work, not ceremony: a new helper in `domain/sequence-tree.ts` gets
its cases in `sequence-tree.test.ts`, a new level gets caught by
`level.test.ts` automatically.

Next: [This documentation](./20-documentation-guide.md).
