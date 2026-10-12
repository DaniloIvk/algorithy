# Blocks

Blocks are the visible, draggable units of the program. This page covers the
actions, the palette, the block chrome, and the container blocks.

## The eight actions

`domain/actions.ts` defines the full set:

| Action         | Kind      | What it does                                                                           |
| -------------- | --------- | -------------------------------------------------------------------------------------- |
| `start`        | synthetic | The implicit program head; never draggable, never stored.                              |
| `move-forward` | leaf      | One step in the facing direction, then an ice slide if the floor is slippery.          |
| `turn-right`   | leaf      | Rotate 90 degrees clockwise.                                                           |
| `turn-left`    | leaf      | Rotate 90 degrees counter-clockwise.                                                   |
| `for`          | container | Repeat its children `count` times (1 to 99).                                           |
| `while`        | container | Repeat its children until the mouse reaches the target.                                |
| `if`           | container | Run `children` when the condition is true, otherwise `elseChildren`.                   |
| `switch`       | container | Run the first branch whose condition is true; `default` matches always and sorts last. |

Conditions (`domain/conditions.ts`) are the three relative directions:
`path-ahead`, `path-left`, `path-right`. A condition is true when the
adjacent cell in that direction (relative to facing) is **passable**; walls
fail, and so does being out of bounds. Note that lava and holes are passable,
so a path condition reads them as open: that is exactly what makes them
traps (see [Simulation](./09-simulation.md)).

## The registry

`blocks/registry.tsx` is the one place that maps an action name to its UI:

```ts
type BlockDefinition = {
  action: ActionName;
  label: string;
  render: (props?: {...}) => JSX.Element;
};
```

`resolveActions(names)` turns a level's `allowedActions` into the palette
list. Every container has two render modes, passed explicitly as
`variant='palette' | 'sequence'`: the palette shows an empty container, the
sequence shows the container with its children and drop zones. `Start` is the
fixed head of the program (`blocks/Start.tsx`).

## Block chrome: `BlockShell`

`blocks/BlockShell.tsx` owns every visual aspect a block shares, so no block
re-declares `bg-*`/`border-*` classes:

- A rounded "clipart" body with a top notch and a bottom nub (the Scratch
  puzzle-piece look). A `block-notch-border` child sits inside the body: it is a
  border-coloured shape the size of the cut-out grown by the border width, so
  the clip-art's clip-path cuts the notch out of it and the outline keeps one
  uniform width — including around the cut-out, which follows the cut-out's own
  shape.
- A variant system: `sky`, `emerald`, `yellow`, `green`, `red`, `orange` for
  solid blocks, `washed-out-*` for container _bodies_ (60% opacity vs 80%),
  and `gray` for locked/default blocks. Each maps to semantic tokens
  (`border-block-*-border`, `bg-block-*/80`, hover and active states).
- A drag-over state that swaps the washed bodies to their stronger
  `-washed-hover` tokens.
- Sizing that scales with the viewport (`clamp()` paddings and text, a shared
  `--block-height`), so blocks read the same on a phone and a projector.

One subtle rule: only the solid variants are CSS hover _groups_
(`group-hover:`), because a `group` on a washed container body would light up
every nested block when the pointer is over the body, instead of only the
block actually under the pointer.

## The container blocks

- **ForBlock** - shows the `for` header with a repeat-count input
  (`block_for_*` messages) and a collapsible body drop zone.
- **WhileBlock** - "while target not reached" header and a body. Collapsible.
- **IfBlock** - a condition chooser (`path-ahead`/`path-left`/`path-right`),
  a then-zone and an else-zone. Collapsible.
- **SwitchBlock** - a list of branches, each with its own condition and
  body; the `default` branch always sorts last. Collapsible.

`while`, `if` and `switch` share `BlockCollapseToggle` (hover, active and
focus-visible states in one place); when collapsed, their bodies are
summarised with a translated plural message (`block_container_collapsed_count`).

## The palette

`features/level/components/Palette.tsx` renders the level's blocks as
draggables, wrapped in a fixed-height, scrollable tray
(`--palette-height`) so it never grows or shrinks between levels. The tray
doubles as the **delete zone**: dragging an existing block over it shows a
"Drop to delete" hint (`palette_drop_to_delete`) and dropping removes the
block. While a fresh block is being dragged out of the palette, its source is
hidden (`invisible`) but the palette keeps its width, so the layout never
jumps.

## How blocks relate to the data

The UI never stores anything itself. A block is a rendering of a
`SequenceItem` node (see [The program tree](./08-the-program-tree.md)); drags
and drops mutate that tree through `domain/sequence-tree.ts`; labels and
conditions stay in the UI layer (`blocks/conditionLabel.ts`) so `domain/`
remains free of i18n.

Next: [The program tree](./08-the-program-tree.md).
