# Validation

This page answers two questions the app gets asked a lot: why validate level
data we wrote ourselves, and why validate storage we wrote ourselves. The
short answer to both: **because "ours" is not the same as "safe"**. The long
answer is the app's whole philosophy.

## The philosophy: parse at the boundary

Every piece of data crosses a boundary between "unknown" and "trusted". A
**boundary** is any place where data enters the program from the outside
world: a JSON file on disk, a `localStorage` read, a URL segment, a number
typed into an input. At every boundary the app runs `safeParse` against a
valibot schema, exactly once, and then trusts the parsed output everywhere
else. The parsed output type is the single source of truth; nothing is ever
`as`-cast after parsing.

The practical result: the _inside_ of the app can assume the data is correct.
The simulator can index the map without checking every cell, the renderer can
assume every block kind is one of five, and no component needs defensive
plumbing for shapes that "should not happen".

## Why validate level files we wrote ourselves

The level files are written by a human, and humans make mistakes that a
game's logic turns into crashes or nonsense:

- a map row shorter than `width` would make the simulator read `undefined`
  cells;
- a `defaultActions` entry using an action the palette does not offer would
  render a block the player cannot reproduce;
- an `optimalSolution` with a `for` missing its count would crash the test
  suite, not the game, hours later;
- a duplicate slug would make two levels fight over one URL.

The schema turns all of these from "crashes somewhere later" into "the
registry throws at startup with the file name" or "the test fails with the
exact message". Validation is also _documentation_: `LevelSchema` is the
executable spec of the level format, the thing the
[Level schema](./06-level-schema.md) page describes in prose.

## Why validate localStorage we wrote ourselves

`localStorage` is not ours. The player can open devtools and edit it, an
older version of the app may have written a different shape, or an extension
may have mangled it. The schemas in `schemas/persistence.schema.ts` and the
merge rules in `stored-sequence.ts` ensure a hand-edited program either
rebuilds correctly or is discarded for the level's defaults, as described on
[Persistence](./14-persistence.md). The same applies to the skin and the
locale.

## Why the user-built sequence is re-validated

The program tree is mutated by drag-and-drop, a stateful pointer system with
many moving parts. `parseSequence` re-reads the sequence at every mutation
boundary: if a drag bug ever produced a malformed node, the app would refuse
it instead of corrupting the tree silently. The schema is the invariant the
drag code must maintain.

## The boundary table

| Source                           | Schema                      | Parsed at                                          | Result                          |
| -------------------------------- | --------------------------- | -------------------------------------------------- | ------------------------------- |
| `Level*.json`                    | `LevelSchema`               | `parseLevel` (registry load + level mount + tests) | `LevelData \| null`             |
| sequence re-reads                | `SequenceSchema`            | `parseSequence`                                    | `SequenceItem[] \| null`        |
| `for` count input                | `CountSchema`               | `parseCount`                                       | `number \| null`                |
| `optimalSolution`                | `OptimalSolutionSchema`     | `parseOptimalSolution`                             | `OptimalSolutionItem[] \| null` |
| stored skin                      | `SkinSchema`                | `parseSkin`                                        | `Skin \| null`                  |
| stored level program             | `StoredSequenceSchema`      | `loadLevelSequence`                                | `StoredSequenceItem[] \| null`  |
| stored last level                | `LastLevelSlugSchema`       | `loadLastLevelSlug`                                | `string \| null`                |
| stored completions               | `CompletedLevelSlugsSchema` | `loadCompletedLevelSlugs`                          | `string[]`                      |
| `PlayerState`, internal UI state | none                        | derived                                            | not validated                   |

Internal UI state (`PlayerState`, the animation timers, the drag session) is
_derived_ state: it is produced by trusted code from validated inputs, so it
does not get a schema. The distinction is deliberate: validate what crosses a
boundary, derive everything else.

## Cross-field rules

Some rules span several fields, so they live in `check` pipes inside the
schema, with human-readable messages:

- map dimensions must match `width` and `height`;
- `defaultActions` and `optimalSolution` must only use `allowedActions`;
- `for` requires count and non-empty children, `while` requires non-empty
  children, `if` requires a condition, `switch` requires non-empty branches;
- `count`/`condition`/`branches` are only allowed on the actions that use
  them.

The tests surface the messages (`issues[0].message`), so a failing level
file says _what_ is wrong, not just that something is.

## The one deliberate cast

Recursive schemas need a self-reference, and valibot's `lazy` needs a typed
anchor. The schema files use one `as unknown as GenericSchema<...>` per
recursive schema, exactly where the recursion is declared, and nowhere else.
It is the single sanctioned cast in the codebase; casts at call sites are a
lint target and a code-review smell.

Next: [Internationalization](./16-internationalization.md).
