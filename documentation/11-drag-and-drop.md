# Drag and drop

Blocks are dragged with a hand-written **pointer events** system in
`features/level/dnd/`. There are no HTML5 drag events (`dragstart`, `drop`,
`dataTransfer`), so dragging works identically with mouse, touch and pen, and
the code never fights the browser's native drag behaviour.

## The API components see

`DndProvider` wraps the level screen and exposes one stable interface
(`useDnd()`):

- `draggableProps(descriptor)` - attach to any draggable; returns an
  `onPointerDown` that starts a session.
- `dropZoneProps(zoneId)` - attach to any drop target; returns
  `data-drop-zone="<zoneId>"`.
- `deleteZoneProps()` - returns `data-drop-delete="true"` (the palette tray).

Components never attach raw pointer or drag listeners. Three reactive hooks
drive styling: `useActiveZoneId()` (which zone is under the pointer, for
BlockShell highlights and the root zone border), `useActiveDropIndex()` (the
insertion index, so the renderer can draw the landing placeholder) and
`useActiveDrag()` (what is being dragged, so the source is removed from
layout).

The `DraggableDescriptor` carries everything the layer needs: the action, the
label, and, for existing blocks, the id, source zone, index and the `default`
flag (which is how the delete guard knows the starter blocks are
undeletable).

## The drag session (`session.ts`)

A session follows the pointer through these stages:

1. **Press** - `begin` records the descriptor. A hold/slop filter
   distinguishes a drag from a tap or a scroll: 50 ms hold and 8 px of
   movement for touch/pen, 4 px for mouse (`DND_CONFIG`).
2. **Drag** - a floating **ghost** (a cloned node, fixed-positioned, at
   z-index 1000) follows the pointer. The body gets `data-dragging`, and
   `data-deletable-drag` when the dragged block is deletable.
3. **Targeting** - every move, `targets.ts` hit-tests with
   `document.elementFromPoint` against `[data-drop-zone]` /
   `[data-drop-delete]`, then `computeHoverIndex` (in `lib/hover.ts`)
   computes the insertion index from the pointer's Y against the zone's
   direct items, skipping items that belong to nested zones and the dragged
   item itself. The renderer removes the dragged item from the flow and draws
   a dashed placeholder of the same size at that index - run through
   `clampInsertIndex`, the same clamp the drop applies - so the gap closes as
   you drag and the placeholder sits exactly where the block will land, never
   above the `start` head. The active zone gets `data-drag-over='true'`, which
   CSS turns into an outline.
4. **Drop** - `resolveDrop` reuses the tree helpers from
   `domain/sequence-tree.ts`: palette insert via `insertAt`, same-zone
   reorder via `moveWithinZone` (the collapse-aware index is shifted back to
   the list that still contains the dragged item, so dropping on its own slot
   is a no-op), cross-zone move via `removeAt` + `insertAt`, delete via
   `removeAt`. Inserts clamp past locked items, so locked starter blocks stay
   ahead of anything you place.
5. **Cancel** - `Escape` or `pointercancel` ends the session without a
   change.

## Drag feedback

The zone you can actually drop into is the one that lights up:

- Lifting a **fresh block from the palette** softly glows the algorithm
  (sequence) zone, which is the destination; the palette itself stays neutral,
  because it is the source.
- Lifting a **block out of the program** turns the palette into the red trash
  zone; the algorithm zone keeps its normal look.
- Inside the program, the dragged item leaves the flow and a dashed
  placeholder shows the slot it will land in. An empty container body is still
  a drop zone, so the placeholder appears there too; its hint text (for example
  "place blocks here") steps aside while a drag is over that body.

## Autoscroll

While dragging near the top or bottom viewport edge (within
`autoscrollEdgePx` = 56 px), the session scrolls the window on an animation
frame at up to `autoscrollSpeedPx` = 14 px per frame. Long programs can
therefore be dragged into without manually scrolling first.

## Tunables

Every threshold lives in `dnd/config.ts` (hold, slop, ghost z-index,
autoscroll edge and speed). The rule is to tune numbers there only, never to
inline them elsewhere, so the feel of dragging is adjustable from one file.

## Drop zone ids

Recap from [The program tree](./08-the-program-tree.md): `root`, `<itemId>`,
`<itemId>:else`, `<itemId>:branch-<n>`. Container blocks receive their zone
ids as props and attach them internally, so the renderer never invents zone
ids on the fly.

Next: [The playground](./12-playground.md).
