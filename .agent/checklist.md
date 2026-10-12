# checklist - before finishing a task

Read before declaring work done. All commands run inside the app folder (see
`../AGENTS.md`), which is self-contained.

## Before editing

- [ ] Read the target file plus its neighbours: matching `schemas/*.schema.ts`,
      `domain/simulation.ts` if simulation is involved, `blocks/registry.tsx`
      if an action/block is involved.
- [ ] Identify boundary data. If it is not a `const`/literal in code, does it
      need a `valibot` schema + `parse*` helper?
- [ ] If it touches the `children`/`elseChildren`/`branches` tree, check whether
      an existing helper already walks it.

## While editing

- [ ] New/changed boundary type is `InferOutput<typeof Schema>`, not a manual
      interface.
- [ ] No `as` cast follows a successful `safeParse`.
- [ ] Conditional render uses `Activity`.
- [ ] Block visuals use `BlockShell`; no duplicated chrome classes.
- [ ] Drag & drop uses `useDnd()` (`draggableProps` / `dropZoneProps` /
      `deleteZoneProps`); no raw pointer or drag listeners.
- [ ] Cycle math stays `bigint`.
- [ ] Tree-walk logic is shared, not copied per action.
- [ ] Colors use semantic tokens (see `color-sweep.md`), not raw palette values.
- [ ] User-facing text goes through `messages` (from a `lib/i18n` seam); no hardcoded
      display strings and no i18n imports in `domain/`.

## After editing

- [ ] `bun format` - passes.
- [ ] `bun lint` - 0 errors, 0 warnings.
- [ ] `bun test` - if a level changed, the `level.test.ts` optimal-solution
      assertions (outcome `won`, `optimalActionCount`, `optimalIterations`) are
      updated and green.
- [ ] `bun validate` - the full gate.
- [ ] `bun run build` (in `apps/app`) - client bundle + CSS build cleanly.
- [ ] `bun run i18n` (in `apps/app`) - the catalog parses and `src/paraglide/`
      is generated (run it before `bun lint`, since the generated output is
      gitignored and needed for typecheck).
- [ ] If a non-test-facing behavior changed, smoke-test it with `bun run dev`
      or `bun run serve` (app on `http://localhost:3000`).

## Antipatterns to catch

- [ ] `JSON.parse` without `safeParse`.
- [ ] `useMemo`/hook dependency on `ref.current`.
- [ ] `ForBlock`/`IfBlock` mode inferred from a callback instead of `variant`.
- [ ] Hand-rolled `children`/`elseChildren`/`branches` recursion instead of the
      `domain/sequence-tree.ts` helpers.
- [ ] `as unknown as` chains added instead of fixing the type at the source.
- [ ] New raw hex or palette color classes instead of tokens.
- [ ] Deleting/changing a `Level*.json` fixture without updating its
      `optimalActionCount`/`optimalIterations`/`optimalSolution`.

## Reporting

- [ ] State what changed and the exact commands run.
- [ ] If a known gap remains (see `../AGENTS.md` **Known gaps**), say so rather
      than implying the app is finished.
