# Persistence

Everything the app remembers between visits, where it lives, and how it is
defended against bad data. There is no server and no account: persistence is
`localStorage` in the player's browser.

## The three keys

| Key                          | Holds                             |
| ---------------------------- | --------------------------------- |
| `algorithy:level:<slug>`     | that level's program, per browser |
| `algorithy:last-level`       | the last visited level slug       |
| `algorithy:completed-levels` | the slugs of completed levels     |

`lib/persistence.ts` owns all access: reads go through the `parse*` helpers
and fall back to empty; writes are immediate and never throw (blocked or full
storage just means no persistence, the game keeps working).

## The stored program

A stored program is the whole program tree, minus everything internal:

- kept: `action`, `count`, `condition`, `children`, `elseChildren`,
  `branches`;
- kept as the bridge: the `default` flag (true for items that came from the
  level's `defaultActions`);
- dropped: `movable`, `modifiable`, `id`, `label` (these come back from the
  level defaults), and the `start` head (it is implicit).

The storage shape is validated by `StoredSequenceSchema` in
`schemas/persistence.schema.ts` before anything touches it.

## Load, merge, and the invalidation rule

On load, `stored-sequence.ts` rebuilds the UI tree against the level's
defaults:

1. Every flagged stored item is matched with the corresponding level default
   (matched by action, in traversal order) and takes its internal fields, so
   locks survive a reload.
2. Every plain item becomes an editable user block.
3. The program is **discarded** (replaced by the level defaults) when the
   data is inconsistent in either direction:
   - the program uses an action the level no longer offers, because its
     `allowedActions` palette changed (the player can no longer build or edit
     that block, so the saved program is stale), or
   - a flag has no matching default (the flag is a lie), or
   - **one of the level's defaults comes back unflagged**.

That second rule exists because the level's starter blocks are part of every
real program: they cannot be deleted (`canDelete` refuses `default: true`
items) and locked ones cannot be moved, so a genuine save always contains
every default, flagged. A stored program like
`[{"action":"move-forward"},{"action":"move-forward"}]` on level 1 (whose
default is one locked move-forward) has no flag anywhere, so it is hand-
tinkered data: it is rejected and the level resets to its defaults. The mount
save then writes the correct program back over the bad data, so storage
self-heals.

## Completion is only earned

`algorithy:completed-levels` is written exactly once per level, by
`recordLevelOutcome`, and only when the run status is `won`. Invalid or
tinkered stored programs never touch it, and neither do failures: a level is
"passed" only when the player actually wins it, never because of what sits in
storage.

## The skin

The player skin (`blue`/`pink`) persists under `bunplate:player-skin`
(`lib/skin.ts`), validated by `SkinSchema`. The locale persists under the
Paraglide `language` key, outside these three.

## Why validate storage we wrote ourselves

Because `localStorage` is not ours: the player can open devtools and edit it,
an old version of the app may have written a different shape, or a browser
extension may have mangled it. The schemas make sure the app never trusts
any of it. The full argument is on [Validation](./15-validation.md).

Next: [Validation](./15-validation.md).
