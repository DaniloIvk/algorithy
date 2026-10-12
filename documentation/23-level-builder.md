# Level builder

Players can build their own levels and share them as links. There is no
server: the whole level travels inside the URL. This page covers the routes,
the drawing board, the validation, and the link format.

## Routes

| Route               | What it is                                                              |
| ------------------- | ----------------------------------------------------------------------- |
| `/build`            | A new level. The draft is restored from this browser when one is saved. |
| `/build/<payload>`  | Editing a shared level; the payload is decoded into the draft.          |
| `/shared/<payload>` | Playing a shared level, through the regular level screen.               |

Entry points: the paintbrush button in the app header (always there), and
"Build a level" in the win modal once all 20 built-in levels are completed.

## The drawing board

- **Layout**, like playing a level: the level settings (size, theme, start
  direction) are one inline row directly above the drawing tools, which sit
  above the playground; the block palette sits below the playground exactly
  like a level's palette, and the solution editor takes the whole right
  column with the name and creator fields above it and the action buttons
  below it. Every field keeps its label on top and its normal size; fields
  never squeeze or clip. When the row is too narrow for all three, whole
  fields wrap to the next line, still centered, and the row below is pushed
  down rather than overlapped.
- **Reset** clears the whole builder back to the default starting level (a
  5 by 5 ground board with the mouse and the cheese placed), after a
  confirmation; the page's name is always "Level Builder" (a pixel wordmark in
  the app header, in place of the Algorithy mark), whether you arrived with a
  fresh draft or from a shared level's Edit.
- **Tools**: ground, wall, ice, lava, hole, the mouse and the cheese. Each chip
  shows the colour it actually paints - ground and wall follow the level's
  theme, ice uses the ice colour, lava the real orange lava, the cheese the
  real cheese and the mouse the current player skin - and the label ink is
  picked from that swatch after render (`lib/contrast.ts`, `readableInk`) so it
  always keeps contrast. The pen cursor follows the pointer (fine pointers
  only): a nib whose point is exactly on the pointer, with the block being
  painted beside it, no chip around either.
- **Painting**: press and drag. Every cell reports its coordinate, so a fast
  drag paints everything the pointer crosses.
- **Player and target are unique**: painting one onto the other swaps them,
  and the cell under either is ground when the level is saved, so the mouse
  and the cheese stand on the floor. Ice is the exception: ice may stay under
  either, because a level can start or finish on a slide.
- **Resize and theme** can change at any time. Cells live in a sparse map:
  shrinking clips the view, and the cut cells wait in the buffer, so growing
  back restores them.
- **Work survives a reload**. The work in progress is saved, encoded, under
  `algorithy:builder-draft`, and decoded when the builder opens.
- **Save commits one level**. Pressing Save stores the level under
  `algorithy:builder-level` (always one level, overwritten, no gallery), even
  when it is empty or unfinished, and the button then reads Share until the
  next edit.

## The solution, trying and validation

The creator writes the level's ideal program with the regular block palette
and drop zones; that program is what gets stored and shown to players.

**Try runs the program right on the builder page**, through the same
simulator as the game, so the creator sees the mouse walk, slide, win or die
without leaving the page. Outcomes arrive as toasts - including a win, which is
a toast here rather than the outcome modal - and the builder's toasts clear
faster than the level screen's. `Open level page` plays the finished level on
its real page instead.

Validation and the draft save run 300ms after the last change, so continuous
painting is never interrupted while slower edits are checked almost
immediately. Save does not validate: any state can be the saved builder level.
Nothing is reported inline: pressing `Try`, or `Share` when the level cannot be
published, explains itself through a toast. A level is shareable when:

- it has a name,
- the program has at least one block and at most 20,
- the program is representable in the authored solution format (no empty
  `for` or `while` bodies),
- the program actually wins on the draft board,
- and the encoded link fits the budget.

`Share` copies the link and confirms it with a toast; the link itself is never
shown. The publish button
reads `Save` while the work differs from the saved builder level, and `Share`
once the two match. Share stays disabled until the level is shareable, with
the missing piece as its tooltip, so an unplayable level can never be
published.

## The link format

The link is `base64url` over a compact byte payload, never JSON:

```
version | random salt (4 bytes) | width | height | terrain | player | target
| cells (3 bits each) | title | author | solution | checksum (2 bytes)
```

- **The salt is fresh for every draft**, so saving the same level twice
  produces different links, and an edited copy (even just the author) can
  never be handed back as the original link.
- **The checksum** rejects any tampered or truncated payload; decoding never
  throws, it returns null and the page shows a friendly error.
- **The identity** of a shared level is a deterministic hash of its board
  (map, player position and facing, target, theme, action palette), never of
  the link. The salt changes on every save while the board does not, so the
  same board keeps the same stored player program and completion; editing only
  the title keeps it too, while changing the board gets a fresh identity.

Limits, chosen so an over-long link is practically impossible:

| Thing        | Limit                                       |
| ------------ | ------------------------------------------- |
| Board        | 16 by 16                                    |
| Solution     | 20 blocks                                   |
| Level name   | 60 characters                               |
| Creator name | 40 characters (empty means anonymous)       |
| Link         | 2000 characters (a worst case is under 400) |

## Playing a shared level

A shared level is adapted into the same `LevelData` a built-in level uses:
the Playground, the simulator, the export and the outcome modal work
unchanged. The differences:

- the level picker is replaced by a header with the creator's title, the
  author below it, and an **Edit** button that opens the level in the builder
  as a new draft;
- every level offers all actions (the creator does not curate a palette);
- the block and cycle counts come from the creator's solution, so the
  outcome modal shows how the player compares to it.

## Not in this version

There is no automatic path search: the creator authors the solution, and
that is the validation. There is also no DOM test harness, so the builder's
UI itself is covered by hand, not by tests; the codec, the schema, the
adapter and the validation all have direct tests (see
[Testing](./19-testing.md)).

Next: [Algorithy Documentation](./index.md).
