# handoff - state of play, not architecture

A short note from the agent that last worked here, so a fresh session starts
from a file rather than a blank slate. The durable material lives elsewhere and
is the source of truth:

- `AGENTS.md` - scope, commands, invariants, known gaps
- `context.md` - architecture, data flow, simulation, DnD lifecycle
- `patterns.md`, `checklist.md`, `i18n.md`, `color-sweep.md` - conventions
- `../documentation/` - the user-facing guide (served at `/docs`)

This file is only **what changed lately, what is half-done, and what is next**.
Keep it short, and move anything durable into the docs above.

## Recent work (landed, `bun validate` green, build clean)

- **Drop placeholder matches the landing spot.**
  `domain/sequence-tree.ts` gained `clampInsertIndex`, used by `insertAt`,
  `moveWithinZone` and the renderer, so the dashed slot can no longer sit above
  the Start head. `SequenceItemRenderer` also draws the trailing placeholder and
  renders an empty body's zone. Tests: `domain/sequence-tree.test.ts`,
  `features/level/components/SequenceItemRenderer.test.tsx`.
- **Empty container bodies.** `SequenceItemRenderer.renderNested` always renders
  the nested zone, even with zero children; `ForBlock` / `WhileBlock` /
  `SwitchBlock` always render the body and only toggle the hint text, which
  hides while a drag is over that body.
- **`for` collapses** like the other container blocks (was documented as
  always-expanded; the comments in `BlockCollapseToggle`, `patterns.md`,
  `AGENTS.md` and `documentation/07` were updated).
- **Switch block.** Branch actions are right-aligned for the `default` branch
  too; the branch chevrons follow the master toggle and reset with it; collapsed
  and empty branch bodies are the same size. Tests: `blocks/SwitchBlock.test.tsx`,
  `blocks/ForBlock.test.tsx`.
- **Header.** The builder page shows its own pixel wordmark - two per-word SVGs,
  English and Serbian (`public/assets/logo-builder-<locale>-<n>.svg`) - instead
  of the Algorithy mark, via `features/locale/HeaderTitle.tsx` and a shared
  `usePathname()` in `lib/router.tsx`. The header action
  (`features/builder/BuildLink.tsx`) is a labelled pill that becomes "back to
  the game" on `/build`. Header slots order build / wordmark / skin / language /
  sound, and the header wraps onto two rows below `40rem`
  (`--app-header-height` in `src/style.css`). Tests: `features/locale/HeaderTitle.test.tsx`,
  `features/builder/BuildLink.test.tsx`.

## Open items

- **Delete `public/assets/logo-builder.svg`.** It is the earlier single-file
  attempt, now unused (replaced by the per-word files). There is no delete
  action for the agent, so it is still on disk.
- The Serbian wordmark glyphs (`G a t j N o` in `logo-builder-sr-*.svg`) were
  hand-drawn without visual feedback; fix per-glyph if a letter reads wrong.
- The mobile header row (the `+1.75rem` in the `< 40rem` block of
  `src/style.css`) may still want tuning once seen on a real phone.

## Known gaps

See the "Known gaps" section of `AGENTS.md` (legacy emptied DnD files to
delete, the per-container render branch in `SequenceItemRenderer.tsx`, the
emptied `textureVariant`, the stale `scripts/review-bundle.ts`, the Level19
optimal solution, and the duplicated drag traversal).

## Verify

Inside `apps/app`: `bun validate` (format + lint + test) then `bun run build`.
