# apps/app - Algorithy

Algorithy is a browser game that teaches algorithms. It is an interpretation of
Code.org's "Hour of Code" Maze (level 1 of 20): the player drags Scratch-like
blocks into a program, runs it, and watches a character reach a target cell.

Runtime: `hono/jsx` for DOM, `valibot` for validation, Tailwind CSS v4 for
styling, and a small Hono-on-Bun server. The client is bundled with `bun build`
and Tailwind is compiled with `@tailwindcss/cli`; there is **no Vite**. Levels
are JSON files. There is no remote API. Translations use Paraglide JS (locales
`sr-Latn-RS` — the base and default — plus `en`, persisted in `localStorage`,
never in the route).

## Scope

- This guide governs this app folder only. The app is self-contained: its own
  `package.json`, `tsconfig.json`, `bunfig.toml`, `.oxlintrc.jsonc`,
  `.oxfmtrc.jsonc`, `paraglide.config.ts` and styles. Nothing is borrowed from
  outside the folder.
- Run the app's own scripts (`bun run validate`, `bun run format`,
  `bun run lint`, `bun run test`, `bun run build`, `bun run dev`); do not
  invoke arbitrary commands or fetch arbitrary code.
- Keep pure logic out of JSX and JSX out of `domain/`.

## Commands

All commands run inside the app folder (`apps/app`), which is self-contained:
its own `package.json`, `tsconfig.json`, `bunfig.toml`, `.gitignore`,
`.oxlintrc.jsonc`, `.oxfmtrc.jsonc` and styles. The root `bun validate` is not
the gate for this app; run it here.

| Command            | Purpose                                                               |
| ------------------ | --------------------------------------------------------------------- |
| `bun run validate` | `format` + `lint` + `test`. The gate: must pass before work is done.  |
| `bun run format`   | `oxfmt --write` (tabs, single quotes, Tailwind class sorting).        |
| `bun run lint`     | `oxlint --type-aware --type-check`. Must report 0 errors.             |
| `bun run test`     | `bun test` (coverage on, randomized order).                           |
| `bun run build`    | `bun build` the client + `tailwindcss` CLI + static site into `dist`. |
| `bun run i18n`     | Compile `messages/*.json` into the gitignored `src/paraglide/`.       |
| `bun run start`    | Serve the built app (`dist/` + `public/`) with Hono on `:3000`.       |
| `bun run dev`      | Server + watch rebuilds of client JS and CSS (see below).             |

### Build and serving

- `src/client.tsx` -> `bun build --target browser --minify` -> `dist/assets/client.js`.
- `src/style.css` -> `@tailwindcss/cli` -> `dist/assets/index.css`. The design
  tokens live in `styles/theme.css` (+ `styles/global.css` base styles), both
  part of this app.
- `src/server.ts` is a Hono app that renders `index.html` as the SPA shell for
  non-asset routes, serves `/assets/*` from `dist/` then `public/`, and
  renders the documentation site at `/docs`, `/docs/<slug>` and the raw
  Markdown variant `/docs/<slug>.md` from the pages in `documentation/` via
  `features/documentation/` (`Bun.markdown`, no parser dependency). The
  static build writes the same pages into `dist/docs/<slug>/index.html` plus
  `dist/docs/<slug>.md`.
- `src/dev.ts` does one initial build, then watches: the client bundle
  (`bun build --watch`), CSS (rebuilt on any `src` change, so CSS `@import`s
  update too), and messages (`bun run i18n` on change). The server runs under
  `bun --hot`, so server edits reload without restarting the dev process.
  `PORT` overrides the default `3000`.
- `dist/` is also a complete static site: `build:static` copies `index.html`
  and everything in `public/` (favicon, `_redirects`, `.htaccess`, `404.html`)
  next to the assets, so it can be uploaded as-is. The host still needs an SPA
  fallback (`_redirects` for Cloudflare/Netlify, `.htaccess` for Apache,
  `404.html` for GitHub Pages) and must serve it from the site root, since the
  shell uses absolute `/assets/...` paths.
- There is no Vite config or HTML processing; `index.html` is a plain template.
- Translations: `messages/*.json` -> `paraglide-js compile` -> `src/paraglide/`
  (gitignored). `dev` and `build` run `bun run i18n` first, so the generated
  modules exist before bundling; run it once before `bun lint`/typecheck too.

`bun run validate` is the gate (the `bun validate` shorthand works too).
`src/schemas/level.test.ts` simulates every level's `optimalSolution` and
asserts it wins with the stated block and cycle counts. If you change a level
or the simulation, keep the test green - never weaken the test to pass.

`bun test` runs with coverage on and randomized order. Components are tested
through happy-dom, preloaded by `happydom.ts` and driven by
`src/dom-harness.tsx`; there is no Testing Library and no mocking. Coverage is
reported, not enforced: a short list of redundant or defensive lines stays
dark and is recorded in `documentation/21-known-issues-and-gaps.md`. See
`documentation/19-testing.md` for the philosophy and the file-by-file map.

## Architecture

```text
src/
  server.ts            Hono app served by Bun.serve (SPA shell + /assets/* + /docs/*)
  server.test.ts       routes: SPA shell fallback, missing assets stay 404
  dev.ts               dev orchestrator: initial build + client/CSS watchers
  client.tsx           entry: render(<App/>, #root)
  App.tsx              LocaleProvider > ToastProvider > SkinProvider > Router + choosers/switchers/sound
  paraglide/           generated by `bun run i18n` (m + runtime); gitignored
  style.css            Tailwind entry, @theme tokens, clipart clip-path
  terrain.css          terrain themes: data-terrain colours + tileable textures
  schemas/             valibot schemas + parse* (single source of types)
    block.schema.ts      BlockKind, BlockLook (terrain), BlockProps
    terrain.schema.ts    TerrainName: the playground theme identifier
    level.schema.ts      LevelSchema, parseLevel, LevelData
    sequence.schema.ts   SequenceSchema/OptimalSolutionSchema, Count/Condition, parse*
    drag.schema.ts       BlockDefinition (draggable block shape)
    skin.schema.ts       SkinSchema, parseSkin
    sound.schema.ts      SoundMutedSchema, parseSoundMuted (localStorage preference)
    persistence.schema.ts  StoredSequence/LastLevel/Completed schemas + parse* (localStorage)
    level.test.ts        validates every Level*.json and simulates optimalSolution
    level.schema.test.ts  parseLevel + look defaults + rejection contract
    sequence.schema.test.ts  parseSequence/parseCount/parseOptimalSolution + rejections
  domain/              pure TS, no JSX
    actions.ts           actionNames: start, move-forward, turn-right, turn-left, for, if, while, switch
    conditions.ts        path-ahead | path-left | path-right
    blocks.ts            block properties (passable/slidable) + defaultLooks
    simulation.ts        runSequence + cycle counting + step/trail/condition helpers
    simulation.test.ts   engine behaviour: outcomes, slides, traps, counts, animation helpers
    sequence-tree.ts     traversal/mutation of the block tree (drop zones)
    level.ts             level registry (from levels/index.ts), resolveLevel/Next/Prev/Slug
    level.test.ts        registry: 20 levels, unique ids/slugs, resolution, neighbours
  blocks/              block UI + action registry
    registry.tsx         actions: Record<ActionName, BlockDefinition>, resolveActions
    conditionLabel.ts    path-condition labels via messages (UI-side, keeps domain pure)
    BlockShell.tsx       shared chrome (clipart, notch, variants)
    BlockCollapseToggle.tsx  shared collapse control (for/if/while/switch)
    ForBlock/WhileBlock/IfBlock/SwitchBlock.tsx  container blocks (palette | sequence)
    Start/MoveForward/TurnLeft/TurnRight.tsx
  features/
    locale/              LocaleProvider (setLocale, <html lang>) + LanguageSwitcher + ShellText + HeaderTitle
    level/Level.tsx      orchestrator
    level/dnd/           pointer-based DnD (DndProvider, session, targets, config)
    level/hooks/         useSequence, useSimulation
    level/components/    Palette, SequenceZone, SequenceItemRenderer, Controls, LevelPicker, OutcomeModal, OutcomeDetails, ToastStack
    level/status.ts      getStatusMessage(status) -> translated run outcomes
    level/outcome-sound.ts  outcomeSound(status, trapKind) + trapKindAt(level, position)
    level/completion.ts  recordLevelOutcome: only a win completes a level
    level/stored-sequence.ts  UI sequence <-> stored solution-shape sequence
    skin/                SkinProvider, SkinChooser, SkinSwitcher, skinLabel
    sound/               SoundToggle (header mute switch, persisted)
    documentation/       markdown.ts (Bun.markdown seam) + docs.ts (page loader, HTML shell) + tests
    builder/             level-codec.ts (share link bytes), level-identity.ts (content hash + fingerprint),
                         shared-level.ts (draft, validation, LevelData adapter),
                         BuilderCanvas/BuilderToolbar/BuilderActions/BuilderSolution, BuildLink, tools.ts
  components/
    Activity.tsx         conditional render helper: <Activity when={...} fallback={...}>
    PlayerMouse.tsx      shared flat mouse (playground player + skin previews)
    Lucide.tsx           mouse lucide icon host (replaceChildren on icon change)
    Playground/          Playground.tsx (grid table + sizing frame), GridCell.tsx (cell/player/target/trap), cheeseHoles.ts (random target holes)
  dom-harness.tsx      shared DOM test harness: mount, settle, cleanup
  lib/                 router.tsx, toast.tsx, cn.ts, id.ts, skin.ts, persistence.ts, column.ts, hover.ts, i18n.ts, browserEngine.ts, sound.ts, sound-recipes.ts
  pages/               LevelPage.tsx, NotFound.tsx, BuilderPage.tsx, SharedLevelPage.tsx
  levels/              index.ts (static registry) + Level1.json … Level20.json
styles/                theme.css (design tokens, @theme) + global.css (base element styles)
project.inlang/        settings.json (baseLocale sr-Latn-RS, locales sr-Latn-RS + en)
paraglide.config.ts    self-contained compile config (localStorage strategy, no URL)
bunfig.toml            Bun settings: install policy + test coverage/randomize + happy-dom preload
happydom.ts            registers happy-dom for the DOM tests (Bun test preload)
tsconfig.json          self-contained TypeScript config (hono/jsx/dom)
.oxlintrc.jsonc        lint rules; .oxfmtrc.jsonc format rules
messages/              en.json + sr-Latn-RS.json (flat snake_case catalog)
documentation/         the human-readable guide (Markdown pages + link-checker test), served at /docs
scripts/i18n.ts        compile() -> src/paraglide (run via `bun run i18n`)
scripts/assemble-dist.ts  static site assembly, incl. dist/docs/<slug>/index.html + .md
```

`index.html` at the app root is the SPA shell template served by `server.ts`.
User-facing text is translated through Paraglide; see `.agent/i18n.md` for the
key taxonomy (flat `snake_case`, feature/module prefixes) and the reuse rules.

Routing is custom (`lib/router.tsx`): `pushState` + `popstate`, `/` redirects to
the level stored in `localStorage` (level 1 when there is none), pattern
`^/levels/([^/]+)$`, plus `^/build(?:/([^/]+))?$` and `^/shared/([^/]+)$` for
the level builder and shared levels (see `documentation/23-level-builder.md`).
Not Hono routing.

## Core model

### Actions and conditions

Action names are unioned from `domain/actions.ts`. Container actions:
`for` (count 1..99 + `children`), `while` (no count; `children`), `if`
(`condition` + `children` + `elseChildren`), `switch` (`branches[]`, each with
`condition` and `children`). `start` is the synthetic program head.

Conditions are evaluated against the cell adjacent to the player in a direction
relative to facing: `path-ahead`, `path-left`, `path-right`; `switch` also
allows `default`.

### Simulation (`domain/simulation.ts`)

- `stepAction(playerState, action, level)`: rotates for turn actions; for
  `move-forward` checks bounds + `passable`, then slides along consecutive
  `slidable` (`ice`) cells collecting a trail. Returns one state plus one flag,
  `{ playerState, isSuccessful }` (`isSuccessful` is false only when the move
  is not allowed; traps are checked separately with `isTrapped`).
- **Sliding stops on the goal.** `collectSlidingTrail` breaks when it enters the
  target cell (whether that is the cell just moved into or one reached mid-slide),
  so a slide always lands the player on the target. This matches the slide
  animation in `useSimulation`, which wins the moment the target is crossed.
  Without it, a level whose target sits on open ice would slide past it forever
  and loop.
- `isTrapped(position, level)`: true on `lava` or `hole`. Both are `passable`
  but lethal, so "can move there" and "safe to stand there" differ.
- `runSequence(sequence, level, start)` -> `RunResult` with
  `outcome: won | blocked | not-reached | infinite-loop | trapped`,
  `iterationsUsed` and `executedCycles` as `bigint`.
- Cycle accounting is `bigint` throughout (`level.schema.ts` caps the authored
  `optimalIterations` at 3_000_000_000, but there is no runtime cap).
  `countIterations` statically estimates weighted cycles; `countExecutedCycles`
  simulates and counts. Weights: leaf/if/while = 1 + inner, `for` =
  2 + n·(2 + inner), `switch` = 1 + max branch.
- Loop detection: a `while` that revisits the same `x:y:direction` state
  `INFINITE_LOOP_REPETITION_THRESHOLD` (3) times is an infinite loop. There is
  no separate iteration cap; a `while` that makes no progress repeats the same
  state, so the detector catches it in a few iterations.
- Animation helpers: `collectExecutedActions` (ordered actions) and
  `getMoveTrail` (slide waypoints) feed `useSimulation`.

### Sequence tree (`domain/sequence-tree.ts`)

All traversal and mutation of the block tree lives here; do not hand-roll
recursion in components. Drop zones are addressed by string id: `root`,
`<itemId>` (children), `<itemId>:else`, `<itemId>:branch-<n>`. Helpers:
`getZoneItems`/`getZoneLength`, `isMovableAt`, `insertAt`, `removeAt`,
`moveWithinZone`, `updateItem`, `updateZone`, and `sortSwitchBranches` (keeps
`default` last). Inserts clamp past locked items through `clampInsertIndex`;
the renderer's drop placeholder applies the same clamp, so the dashed slot
always matches the landing spot. `sequence-tree.test.ts` covers the helpers.

### Progress persistence (`lib/persistence.ts`)

`localStorage` holds five things, each behind its own key: every level's
program under `algorithy:level:<slug>`, the last visited level under
`algorithy:last-level`, the completed-level slugs under
`algorithy:completed-levels`, the builder's work in progress under
`algorithy:builder-draft` (an encoded share payload, validated by the codec
on load), and the one committed builder level under
`algorithy:builder-level` (same encoding; Save overwrites it, there is no
gallery). A stored program holds the whole sequence
structure (action, count, condition, children, elseChildren, branches) plus a
`default` flag on items that came from the level's `defaultActions`; internal
fields (movable, modifiable, id, label) are never stored. On load,
`stored-sequence.ts` matches every flagged item with the level's default blocks
(kind plus flag, in traversal order) and merges their internal fields in, so
locks survive a reload; plain items come back editable. A flag that cannot be
matched, a program that uses an action the level no longer offers (its
`allowedActions` palette changed), or a program that leaves one of the level's
defaults unflagged marks the program as stale or tinkered data, which is
discarded and replaced by the defaults. `fromStoredSequence` takes the level's
`allowedActions` for exactly that palette check.
Completion is not affected: a level is marked passed only when a win actually
happens, never from what sits in the stored program. Reads go through the `parse*` helpers in
`schemas/persistence.schema.ts` and fall back to empty; writes are immediate and
never throw (blocked storage just means no persistence). `useSequence` restores
and saves the level's program, `router.tsx` sends `/` to the stored level, and a
win records completion.

### Level builder (`features/builder/`)

`/build` draws a level on the regular Playground, tries the solution in
place with the regular simulator, and edits it with the regular block
palette; `/build/<payload>` edits a shared level and `/shared/<payload>`
plays one. `level-codec.ts` packs a draft into bytes (version + salt + board

- title/author + solution + checksum) and back; `level-identity.ts` derives the
  board-only content hash that names a shared level and the fingerprint that
  tells whether the work differs from the saved one; `shared-level.ts` adapts a
  validated share payload into `LevelData`, prepares a draft for a try and
  runs the debounced share validation. Errors and outcomes reach the creator
  as toasts, never as inline status lines. The draft is restored from
  `algorithy:builder-draft`; Save writes the single `algorithy:builder-level`,
  and the publish button reads Save while the two differ and Share once they
  match. Share stays disabled until the saved level validates. Limits: 16x16
  board, 20 solution blocks, 60/40 name caps, 2000 character links.

### Bounds and units

A valid level has `map.length === height` and every row `=== width`; every map
cell must be a valid `BlockKind` (the schema owns the full set - levels do not
declare `allowedBlocks`); `defaultActions` actions and `optimalSolution`
actions must be in `allowedActions`. `optimalIterations` is transformed to
`bigint` at parse time.

Level names are a locale-keyed `title` record in the level JSON
(`{ "en": ..., "sr-Latn-RS": ... }`); resolve them with `localized` from
`lib/i18n`. Levels that introduce a block or hazard say so in the title
(`Repeat: For`, `Keep Going: While`, `Split Paths: Switch`); a level that
introduces nothing new gets a plain thematic name. A colour path may stay in
parentheses after the descriptive name (levels 10 and 20). Keep every title
true to the level's palette and map when editing a level.

## Validation boundaries

| Source                           | Schema                      | Parsed at                                               | Result                          |
| -------------------------------- | --------------------------- | ------------------------------------------------------- | ------------------------------- |
| `Level*.json`                    | `LevelSchema`               | `schemas/level.schema.ts:parseLevel`                    | `LevelData \| null`             |
| `sequence` re-reads              | `SequenceSchema`            | `schemas/sequence.schema.ts:parseSequence`              | `SequenceItem[] \| null`        |
| `for` count input                | `CountSchema`               | `schemas/sequence.schema.ts:parseCount`                 | `number \| null`                |
| `optimalSolution`                | `OptimalSolutionSchema`     | `schemas/sequence.schema.ts:parseOptimalSolution`       | `OptimalSolutionItem[] \| null` |
| `localStorage` skin              | `SkinSchema`                | `schemas/skin.schema.ts:parseSkin`                      | `Skin \| null`                  |
| `localStorage` level program     | `StoredSequenceSchema`      | `lib/persistence.ts:loadLevelSequence`                  | `StoredSequenceItem[] \| null`  |
| `localStorage` last level        | `LastLevelSlugSchema`       | `lib/persistence.ts:loadLastLevelSlug`                  | `string \| null`                |
| `localStorage` completions       | `CompletedLevelSlugsSchema` | `lib/persistence.ts:loadCompletedLevelSlugs`            | `string[]`                      |
| `localStorage` builder draft     | none (the codec validates)  | `lib/persistence.ts:loadBuilderDraft`                   | `string \| null`                |
| share link payload               | `SharedLevelSchema`         | `schemas/shared-level.schema.ts:parseSharedLevel`       | `SharedLevel \| null`           |
| builder draft at share time      | `SharedLevelSchema` + run   | `features/builder/shared-level.ts:validateBuilderDraft` | `DraftValidation`               |
| `PlayerState`, internal UI state | none                        | derived                                                 | not validated                   |

Rule: validate unknown data once with `safeParse`, then trust `InferOutput`.
Never `as` a value after parsing it.

## Invariants

- `schemas/` owns every boundary type. Manual interfaces mirroring them are a smell.
- `domain/` never imports `hono/jsx` or components.
- Use `Activity` for conditional rendering, not `&&` chains or ternaries in JSX.
- Block visuals go through `BlockShell` variants. Do not re-declare block
  `bg-*`/`border-*` classes.
- Drag & drop goes through `features/level/dnd` (`useDnd().draggableProps`,
  `dropZoneProps`, `deleteZoneProps`). Drop zones are `data-drop-zone`
  attributes (`root`, `<id>`, `<id>:else`, `<id>:branch-<n>`); never wire raw
  pointer or drag listeners in components.
- Keep files small. New tree-walking logic for `children`/`elseChildren`/
  `branches` should be shared helpers, not copy-pasted per action.
- User-facing text goes through Paraglide (`messages` from a `lib/i18n` seam); never
  hardcode display strings. `domain/` must not import i18n - keep labels in the
  UI layer. Keys are flat `snake_case` with a feature/module prefix.

## Reference docs - read on demand, not by default

These files are for agent use only. Load one only when the trigger applies; do
not load them all.

- `.agent/context.md` - deep architecture: data flow, state machine, level
  pedagogy, simulation edge cases, current status. **Read before a refactor or
  any change to `domain/simulation.ts`, `features/level/dnd/`, or a schema.**
- `.agent/patterns.md` - concrete coding patterns (`safeParse` usage,
  hono/jsx idioms, `BlockShell`, DnD lifecycle, bigint rules). **Read before
  writing a new schema, hook, block, or component.**
- `.agent/i18n.md` - message catalog layout, key taxonomy, reuse vs duplicate
  rules, plurals. **Read before adding or renaming a translation key.**
- `.agent/checklist.md` - pre/during/post edit verification and antipatterns.
  **Read before declaring a task finished.**
- `.agent/color-sweep.md` - the design-token and Tailwind class system.
  **Read before changing colors, classes, or `style.css`/`theme.css`.**
- `.agent/handoff.md` - the last agent's state of play: what changed recently,
  what is half-done, and what is next. **Read first when picking up unfinished
  work**, and keep it short (durable material belongs in the docs above).

## Known gaps (in progress - do not treat as finished)

1. **Legacy DnD files to delete.** `lib/dnd.ts`, `hooks/useOnDrag*.ts`,
   `hooks/index.ts` and `features/level/hooks/useDragState.ts` are emptied
   (`export {};`) placeholders; the pointer DnD in `features/level/dnd/`
   replaces them. Remove the files.
2. **Renderer length.** `SequenceItemRenderer.tsx` still has a render branch per
   container block; further data-driving is optional cleanup.
3. **Per-tile texture variation removed.** `components/Playground/textureVariant.ts`
   and its test are emptied placeholders (`export {};`). The per-cell
   `background-position` shifts and `transform` rotations/flips made fractional
   cell sizes look displaced and off-square, so `terrain.css` now paints every
   cell from the same origin. Delete the two files.
4. **Review bundle leftovers.** `scripts/review-bundle.ts` is an emptied
   placeholder and the `review-bundle/` folder is stale; both should be
   deleted. The replacement is `documentation/` (Markdown guide) +
   `features/documentation/` (Bun.markdown renderer), served at `/docs`. When
   the documentation changes, keep its link-checker test
   (`documentation/documentation.test.ts`) green.
5. **Interactive layers still without tests.** `features/level/dnd/` (the
   pointer session), the run animation in `useSimulation` and the router need
   layout and timing that happy-dom does not model. The DOM harness
   (`happydom.ts` preload plus `src/dom-harness.tsx`) covers components,
   providers, storage-backed state and the publish button, the drop index is
   tested directly through `lib/hover.test.ts` (explicit rects), and the rest
   of the interactive layer is driven by logic that is tested directly (the
   sequence tree, the simulator, the storage merge). The uncovered defensive
   branches (loop-bomb guards, the real `localStorage` lookup, the registry's
   invalid-file throws) stay intentionally dark and are documented in
   `documentation/19-testing.md` and
   `documentation/21-known-issues-and-gaps.md`.
