# Accessibility

What the app does so that everyone can play it, and the rules new code must
follow.

## The board is a real table

The playground is a semantic `<table>`: column headers (A, B, C...) and row
headers (1, 2, 3...) announce coordinates, and every cell is a `<td>` with an
accessible name. Each cell also carries a `title` and a screen-reader-only
label for its contents (ground, wall, ice, lava, hole, target, player), so a
screen reader can describe the whole board without the visuals.

## Names and labels

- Every icon-only control has an accessible name: the export button
  (`aria-label` + `title`), the collapse toggles, the skin and language
  switchers, and the sound toggle (`aria-pressed` carries the state).
- Status and outcome messages are text, not colour alone; the outcome modal
  spells out the result (won, blocked, not reached, trapped, infinite loop).
- Focus states are styled (`focus-visible`) on every interactive element,
  including the shared `BlockCollapseToggle`.

## Keyboard

- The whole game is operable by mouse, touch and keyboard: blocks are placed
  by dragging, but every program edit is a drop target and every control is a
  real `<button>`.
- Dragging can be cancelled with `Escape` at any time (the drag session
  listens for it and for `pointercancel`).
- The client router keeps real `<a href>` anchors, so links work with
  keyboard, middle-click and assistive tech.

## Motion

- Only the player and the lava animate; nothing else moves on its own.
- `prefers-reduced-motion` disables the player and lava animations, and the
  death effects.
- Turns always rotate the shortest way, so the mouse never spins
  disorientingly.

## Sound

- Sound is additive, never the only signal: each cue accompanies text, colour
  or motion that is already there (see [Design system](./13-design-system.md)).
- The header's sound toggle mutes every cue with one click, and the choice is
  remembered on the device, so nobody is forced into audio.
- The toggle is a real `<button>` with a translated label and `aria-pressed`.

## Contrast and legibility

- Colours come from semantic tokens with tested pairs (content on surface,
  washed block bodies over terrain, error text on raised surfaces), not raw
  palette values.
- Text scales with the viewport via `clamp()`, and the level picker and
  modals use readable type sizes at every breakpoint.

## What is deliberately out of scope today

There is no dedicated focus-management for drag and drop (placing blocks by
keyboard alone), and no screen-reader announcements during the run animation.
Both are tracked honestly on
[Known issues and gaps](./21-known-issues-and-gaps.md).

Next: [Testing](./19-testing.md).
