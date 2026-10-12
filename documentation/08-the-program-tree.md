# The program tree

Your program is not a flat list: it is a **tree**. This page describes the
data structure, its invariants, and the one module that may touch it.

## The shape: `SequenceItem`

`schemas/sequence.schema.ts` defines the UI shape of one node:

```ts
type SequenceItem = {
	kind: 'algorithm';
	id: string; // unique within the program
	action: ActionName;
	label: string; // translated display name
	from?: number; // drag internals
	sourceId?: string; // drag internals
	default: boolean; // true for the level's starter blocks
	count?: number; // for only
	condition?: ConditionName; // if only
	movable: boolean; // false = locked in place
	modifiable?: boolean; // false = header fields locked
	children?: readonly SequenceItem[]; // for/while/if-then bodies
	elseChildren?: readonly SequenceItem[]; // if-else body
	branches?: readonly {
		condition: SwitchCondition;
		children: SequenceItem[];
		modifiable?: boolean;
	}[]; // switch only
};
```

The whole program is `SequenceItem[]`, always starting with the synthetic
`start` item (`action: 'start'`, `default: true`, `movable: false`). The
`start` head is what makes "the first block runs first" trivial: the runner
walks the list in order.

The schema (`SequenceItemSchema`) re-validates the sequence at every mutation
boundary, so a bug in a drag handler cannot silently corrupt the program
shape.

## The four zones

Every container contributes drop zones, addressed by string ids:

| Zone id               | Meaning                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| `root`                | the top-level program                                                   |
| `<itemId>`            | that item's `children` (for/while/if-then bodies, switch branch bodies) |
| `<itemId>:else`       | that item's `elseChildren`                                              |
| `<itemId>:branch-<n>` | that switch's branch `n`                                                |

The whole tree is addressed with these ids; components never hand-roll
recursion.

## The one module that mutates: `domain/sequence-tree.ts`

All traversal and mutation lives here, immutably (every update returns a new
tree, reusing untouched branches):

- `getZoneItems` / `getZoneLength` - read a zone.
- `findItem` - find a node by id, anywhere in the tree.
- `insertAt` - insert into a zone; the index is **clamped past locked
  items**, because locked (non-movable) blocks must always stay ahead of
  user-placed blocks.
- `removeAt` - remove by index, returning the removed item.
- `moveWithinZone` - reorder inside one zone (also clamped past locked items).
- `updateItem` - replace one node by id via an updater.
- `updateZone` - replace a whole zone's item array.
- `sortSwitchBranches` - keeps the `default` branch last, whatever order it
  arrives in.
- `isMovableAt` - the guard the drag layer uses before moving anything.
- `clampInsertIndex` - the one clamp both the drop (`insertAt` /
  `moveWithinZone`) and the renderer's drop placeholder call, so the dashed
  slot always sits exactly where the block will land (never above the `start`
  head or another locked block).

## Defaults and locks

The level's `defaultActions` become real `SequenceItem`s at the head of the
program, each flagged `default: true` and carrying the level's `movable` and
`modifiable` settings. Nested default children (level 11's `switch` inside
the locked `while`) are flagged too. The flags matter twice:

1. In the UI: default blocks render in the gray variant, cannot be deleted
   (`canDelete` in the drag session checks `default !== true`), and locked
   ones cannot be moved.
2. In storage: the flag is the bridge that re-attaches the level's internal
   fields (movable, modifiable, ids, labels) after a reload. See
   [Persistence](./14-persistence.md).

## Rebuilding after storage

`features/level/stored-sequence.ts` converts between the UI tree and the
stored shape:

- `toStoredSequence(items)` - strips the `start` head and all internal
  fields, keeps action/count/condition/children/elseChildren/branches plus
  the `default` flag.
- `fromStoredSequence(stored, defaults, allowedActions, labelForAction)` -
  rebuilds the UI tree, merging each flagged item with the matching level
  default (matched by action, in traversal order), and rebuilding plain items
  as editable user blocks. It returns `null` when the data is stale or
  inconsistent:
  - the program uses an action the level no longer offers, because its
    `allowedActions` palette changed (the player can no longer build or edit
    that block), or
  - a flag has no matching default, or
  - a level default comes back unflagged (the program was hand-tinkered).

  In every case the caller keeps the level's defaults, and the mount save
  overwrites the bad program in storage.

`useSequence` (in `features/level/hooks/`) owns the in-memory tree: it
restores from storage on mount, saves on every change, and exposes `reset`
to restore the level's defaults.

Next: [Simulation](./09-simulation.md).
