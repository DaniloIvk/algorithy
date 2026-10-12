# Known issues and gaps

An honest inventory of what is unfinished, what is knowingly imperfect, and
what is out of scope. Updated whenever reality changes.

## Code-level gaps

1. **Legacy drag-and-drop files to delete.** `lib/dnd.ts`,
   `hooks/useOnDrag*.ts`, `hooks/index.ts` and
   `features/level/hooks/useDragState.ts` are emptied placeholders
   (`export {};`) left over from the old HTML5 drag layer; the pointer DnD
   in `features/level/dnd/` replaces them. They should be deleted outright.
2. **Per-tile texture variation placeholders.**
   `components/Playground/textureVariant.ts` and its test are emptied
   placeholders. The variation (rotated/mirrored/shifted tile textures) made
   fractional cell sizes look displaced and off-square, so it was removed
   (see [The playground](./12-playground.md)). The two files should be
   deleted.
3. **Renderer length.** `SequenceItemRenderer.tsx` still has one render
   branch per container block; further data-driving is optional cleanup, not
   a bug.

## Testing gaps

- **The interactive layers that need layout or timing are not covered.**
  `features/level/dnd/` (the pointer session), the run animation in
  `useSimulation`, the router and the keyboard path. happy-dom has no layout
  engine, so a test there would assert on geometry that does not exist; the
  drop index is tested directly (`lib/hover.test.ts`, with explicit rects) and
  the logic those pieces delegate to is tested directly instead. Components,
  providers, storage-backed state, the publish button, the toast stack, the
  playground and the skin provider are covered by the DOM harness
  (`happydom.ts` preload plus `src/dom-harness.tsx`).
- **Web Audio scheduling is not covered.** `lib/sound.ts` is a browser-only
  side effect; happy-dom has no Web Audio implementation, so only the parts
  around it (the recipes, the outcome mapping, the stored mute preference and
  the safe no-op) are tested.
- **A short list of lines stays dark, all redundant or defensive.** They are
  re-checks that no input can reach: the simulator's flag short-circuits, the
  docs index comparator (`docs.ts` line 79), the `switch` tail in
  `export-algorithm.ts`, and the nested rebuild-failure propagation in
  `stored-sequence.ts` (lines 119/159/168). One `check` validator apiece in
  `level.schema.ts` and `sequence.schema.ts` is never reached either. They are
  left dark rather than exercised by synthetic tests.
- **Coverage is reported, not enforced.** `bunfig.toml` turns coverage on but
  sets no `coverageThreshold`, so the gate is "all tests pass", not "every
  file is 100%".

## Accessibility gaps

- Placing blocks by keyboard alone is not implemented (drag and drop has no
  keyboard alternative yet), and there are no screen-reader announcements
  during the run animation. Both are tracked on
  [Accessibility](./18-accessibility.md).

## Scope notes

- The coverage table is the map of what is still dark. The remaining lines
  are redundant flag re-checks and a few defensive tails, listed on
  [Testing](./19-testing.md); the real use cases are covered.
- `Bun.markdown` is marked unstable upstream, and `bun-types` does not
  declare it yet; the app types the small surface it uses in
  `features/documentation/markdown.ts` and would only need that one file
  touched if the API changes.
- The body aurora and the two-layer ice terrains declare an explicit
  `background-position` entry per `background-image` layer (the body has
  three). This is a workaround, not a redundant declaration: the SVG
  screenshot tooling (`dom-to-svg`, used by the SVG Screenshots extension)
  reads `background-position-x` by layer index and crashes on Firefox when a
  multi-layer background omits an entry. Keep the position lists aligned with
  the image layers when editing those rules.

Next: [Glossary](./22-glossary.md).
