# patterns - how to write code here

Concrete conventions for `apps/app`. Read before writing a new schema, hook,
block, or component. `../AGENTS.md` holds the rules; this file holds the
recipes.

## Validation (parse at the boundary)

- Schemas live in `src/schemas/*.schema.ts` and are the single source of the
  type. Export `parseX(data: unknown)` that calls `safeParse` and returns the
  output or `null`.
- Correct:

  ```ts
  const result = safeParse(LevelSchema, data);
  if (!result.success) return null;
  const level: LevelData = result.output;
  ```

- Wrong: `JSON.parse` without a schema; `try/catch` around parse as the only
  guard; `as` after a successful parse; manually re-declaring an inferred type.
- Bidirectional/recursive schemas use `let X = pipe(object({... lazy(() => X)}), readonly()) as unknown as GenericSchema<...>`.
  That single cast is allowed; do not add casts at call sites.
- Cross-field checks belong in `pipe(..., check(fn, 'message'))`. Keep messages
  user-facing and specific (the test surfaces `issues[0].message`).
- If you add a boundary, add the schema + `parse*` helper + a table row in
  `../AGENTS.md`, then run `bun validate`.

## hono/jsx

- Import hooks from `hono/jsx`; the DOM runtime JSX types come from
  `hono/jsx/dom/jsx-runtime`. `tsconfig` sets `jsxImportSource:
  hono/jsx/dom`.
- Use the `Activity` helper for conditional rendering:

  ```tsx
  <Activity when={condition} fallback={<Fallback />}>
  	{children}
  </Activity>
  ```

  Avoid `condition && <X/>` and nested ternaries in JSX.

- Event handlers are plain functions; `onClick`, `onChange`, `onInput`,
  `onDragStart`, `onDragOver`, `onDragEnd`, `onDrop`. Cast `event.target` /
  `event.currentTarget` narrowly (`instanceof HTMLElement` etc.) before use.
- Icons: pass a lucide `IconNode` to `<Lucide icon={...} class='size-4'/>`; the
  component swaps the SVG in an effect. Import from `lucide`, not
  `lucide-solid`.

## Hooks

- `useState`/`useRef`/`useEffect`/`useMemo`/`useCallback` from `hono/jsx`.
- Never depend on a ref's `.current` in a `useMemo`/dependency array; use a
  plain function or a stable callback.
- Reset-on-prop-change belongs in `useEffect(() => { ... }, [prop])`. Follow
  `useSimulation`'s pattern of clearing timers before resetting.

## Components

- `BlockShell` renders shared block chrome. Pick a `variant` (`sky`,
  `emerald`, `yellow`, `green`, `red`, `orange`, plus `washed-out-*`). Add new
  variants to `VARIANT_MAP` and the `BlockVariant` union instead of
  hand-rolling classes.
- Container blocks (`ForBlock`, `WhileBlock`, `IfBlock`, `SwitchBlock`) take a
  discriminated `variant: 'palette' | 'sequence'` prop. Keep that explicit; do
  not infer mode from whether a callback is present.
- `for`, `if`, `while` and `switch` all collapse - a container takes children,
  so it can fold. They share `BlockCollapseToggle` (hover/active/focus-visible
  states in one place).
  Collapsed children are summarised with `block_container_collapsed_count`,
  which must stay grammatically correct per locale (plural categories).
- `resolveActions(names)` maps allowed action names to palette definitions via
  `blocks/registry.tsx`.

## i18n

- All display text comes from `messages`, imported from the `lib/i18n` seam at the
  right depth (for example `../../../lib/i18n`). Never hardcode English in JSX;
  `domain/` must stay i18n-free (put label maps in the UI, like
  `blocks/conditionLabel.ts` and `features/skin/skinLabel.ts`).
- Keys are flat `snake_case` with a feature/module prefix and are sorted
  ascending. Add every key to all locale files (`messages/en.json`,
  `messages/sr-Latn-RS.json`) and run `bun run i18n`.
- Count-based messages are complex messages using `Intl.PluralRules`
  categories (`one`/`other` in `en`, `one`/`few`/`other` in `sr-Latn-RS`).
  Convert `bigint` cycles with `Number(...)` at the UI boundary before passing
  them to a message.
- To wrap a JSX element inside a sentence, split the message into
  `..._prefix` / `..._suffix` keys and keep the element inline; do not use
  markup placeholders.
- See `.agent/i18n.md` for the prefix table and the reuse-vs-duplicate rules.

## Styling

- Tailwind v4 with tokens declared in `src/style.css` `@theme` plus
  `styles/theme.css` (both in this app; `styles/global.css` holds the base
  element styles). Prefer semantic tokens
  (`bg-surface`, `bg-content/15`, `text-error`, `bg-block-sky`, `bg-player`,
  `bg-target`) over raw palette colors.
- Tailwind sorts classes via oxfmt (`sortTailwindcss: true`). Let `bun format`
  order them; do not reorder by hand.
- Conditional classes go through `cn(...)`.
- Sizing scales with the viewport: `BlockShell` uses `clamp()` for its padding
  and text, containers use the `v-*` height variants, and the action palette has
  a fixed `clamp()` height (it must not grow/shrink between levels). Keep new
  sizes in the same spirit rather than fixed px values.
- The level's left column has explicit widths per breakpoint (`md:w-96` up), so
  the palette keeps the same width in every state - including the "drop to
  delete" state, where its blocks are hidden. Never let it size to content.
- Playground terrain is a per-kind identifier (`looks: { ground: { terrain: 'forest' } }`).
  `GridCell` emits `data-terrain`/`data-kind` and `style.css` maps them to
  colour + texture; never put a `bg-*` class in a level look. Add a new theme in
  `terrain.schema.ts` + `style.css` instead.
- See `color-sweep.md` for the full token list.

## Simulation & bigint

- Cycle counts are `bigint` end to end (`countIterations`,
  `countExecutedCycles`, `formatCycles`). Never mix `number` and `bigint`
  arithmetic; use `n` literals.
- `stepAction` must stay total: return `{ playerState, isSuccessful }` for every
  action, with `isSuccessful: false` only when the move is not allowed (wall /
  out of bounds). Do not add alias fields for the same value - one name per
  concept.
- If you add an action, update: `domain/actions.ts`, `blocks/registry.tsx`, the
  `SequenceItem`/`OptimalSolutionItem` schemas if it has children/branches,
  `domain/simulation.ts` traversal (there are several walkers - share helpers
  rather than copy-pasting), and the level pedagogy tests.

## Drag & drop

- Never wire `dragstart`/`drop`/`dataTransfer` or raw pointer listeners in
  components. Use `useDnd().draggableProps(descriptor)` on draggables and
  `dropZoneProps(zoneId)` / `deleteZoneProps()` on targets.
- Drop-zone ids: `root`, `<id>`, `<id>:else`, `<id>:branch-<n>`. Container
  blocks receive the zone ids (`thenZoneId`/`elseZoneId`, `zoneIdPrefix`) and
  set them internally.
- The pointer session, ghost, hold/slop thresholds, autoscroll and body
  attributes live in `features/level/dnd/session.ts`; hit-testing is in
  `targets.ts`. Tune numbers in `dnd/config.ts` only.
- `useActiveZoneId()` gives the hovered zone for BlockShell `isDragOver`
  highlights; `useActiveDrag()` hides the dragged source.
- Styling hooks are data attributes: `data-drag-item`, `data-drop-zone`,
  `data-drag-over` (palette), `data-drop-delete`, body `data-dragging` /
  `data-deletable-drag` / `data-palette-drag`.

## Sequence tree

- All block-tree traversal/mutation goes through `domain/sequence-tree.ts`.
  Drop zones are `root`, `<id>`, `<id>:else`, `<id>:branch-<n>`.
- Mutate one item with `updateItem(sequence, id, updater)`; use
  `insertAt`/`removeAt`/`moveWithinZone` for drops and `sortSwitchBranches` to
  keep `default` last. Never hand-roll `children`/`elseChildren`/`branches`
  recursion.
- Add cases to `sequence-tree.test.ts` when you add a helper.

## Levels

- Add a level by creating `src/levels/LevelN.json` **and** registering it in
  `src/levels/index.ts` (static imports; `import.meta.glob` is Vite-only and no
  longer available).
- Keep `optimalActionCount`, `optimalIterations`, and `optimalSolution`
  consistent with the map; `schemas/level.test.ts` asserts all three.

## Do / Don't

| Do                                         | Don't                                            |
| ------------------------------------------ | ------------------------------------------------ |
| `safeParse` once, then trust `InferOutput` | `as` casts after parsing                         |
| `Activity` for conditionals                | `cond && <X/>`                                   |
| `BlockShell` variants                      | duplicated `bg-*`/`border-*` chrome              |
| share one tree-walk helper                 | copy `removeFrom`/`insertInto` per branch        |
| `bigint` cycles                            | `number` cycles or `Number(bigint)` for counting |
| `features/level/dnd` for drag              | raw drag/pointer listeners in components         |
| semantic color tokens                      | raw `bg-rose-500` / `text-black/50`              |
