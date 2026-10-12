# Simulation

`domain/simulation.ts` is the heart of the game: it executes your program
exactly the way the on-screen mouse does, and it decides whether you won. It
is pure TypeScript, no JSX, no i18n, fully unit-tested.

## The pieces

- `DIRECTION_DELTAS` - how each facing maps to a step (`right` = +x, `down` =
  +y and so on).
- `TURN_RIGHT` / `TURN_LEFT` - the two rotation tables.
- `stepAction(playerState, action, level)` - one atomic action: turns always
  succeed; `move-forward` succeeds only into bounds and onto a `passable`
  cell, then applies the ice slide. Returns `{ playerState, isSuccessful }`.
- `evaluateCondition(playerState, condition, level)` - resolves
  `path-ahead`/`path-left`/`path-right` relative to facing and answers "is
  that adjacent cell passable?".
- `runSequence(sequence, level, start)` - the full run, returning the final
  player state, the outcome, and both cycle counts.

## Outcomes

| Outcome         | When                                              |
| --------------- | ------------------------------------------------- |
| `won`           | the player lands on the target cell.              |
| `blocked`       | a move ran into a wall or out of bounds.          |
| `not-reached`   | the program ran out of actions before the target. |
| `trapped`       | the player stepped onto lava or a hole.           |
| `infinite-loop` | a `while` kept repeating the same state.          |

The state machine and its animation timings are described in
[The playground](./12-playground.md) and in the outcome handling of
`useSimulation`.

## Sliding on ice

`ice` cells are `slidable`. When a move lands on ice, `collectSlidingTrail`
keeps advancing in the same direction while the next cell is in bounds and
passable, and stops when the floor stops being slippery. Two rules make
slides fair:

- A slide is bounded by `width * height` steps, so it can never loop forever.
- **A slide stops on the goal**: if the trail crosses the target cell, the
  player lands there instead of sliding past it. Without this, a level whose
  target sits on open ice could never be won, because the slide would carry
  the mouse past the cheese every time.

The slide trail feeds the animation (`getMoveTrail`), so what you see is
exactly what the simulation computed.

## Traps

`lava` and `hole` are **passable but lethal**. That distinction is the point
of a trap: a path condition (`path-ahead` and friends) reads them as open,
because "can I move there" and "is it safe to stand there" are different
questions. `isTrapped(position, level)` answers the second one, and the run
ends in `trapped` the moment the player stands on a trap.

The trap design rule follows from this: a trap is only meaningful when it
sits on a route that would otherwise reach the target. A trap on a dead end
is not a trap, the run would fail there anyway. So each level uses at most
one trap, never placed on the authored optimal solution path, always where a
plausible algorithm turns in.

## Loop detection

A `while` block is only bounded by its condition ("target not reached"), so a
wrong program can loop forever. The simulator stops that with one detector:

- A per-`while` loop detector records each `x:y:direction` state the player
  passes through after an iteration. Revisiting the same state 3 times
  (`INFINITE_LOOP_REPETITION_THRESHOLD`) means the program made no progress
  and is looping: outcome `infinite-loop`.

There is no separate iteration cap: a `while` that makes no progress repeats
the same state, so the detector catches it within a few iterations. The
threshold is shown in the user-facing message ("repeated the same state 3
times").

## Execution vs counting

The same tree is walked three times for three different purposes:

- `runSequence` - decides the outcome, stopping at the target (the player
  sees the win the moment it happens).
- `collectExecutedActions` - records the flat order of executed leaf actions
  for the animation.
- `countExecutedCycles` - counts the full cost of the program, including
  work after the winning move. Why these differ on purpose is explained on
  [Cycles and optimization](./10-cycles-and-optimization.md).

## How `useSimulation` animates it

`features/level/hooks/useSimulation.ts` is the bridge between the pure
simulator and the screen:

1. `run()` records the block and cycle counts, marks the state `running`,
   computes the outcome up front, and starts a timeout-driven animation. The
   caller (`Level.tsx`, `BuilderPage.tsx`) first awaits `revealElement` on the
   board, so the playground finishes scrolling into view before the mouse
   starts walking.
2. The animation replays `collectExecutedActions` step by step: turns rotate
   the mouse the shortest way (`shortestTurn`, so it never spins 270
   degrees), moves slide it between cells (`--step-x`/`--step-y`), ice slides
   walk the trail waypoint by waypoint.
3. The final status is held back briefly (`WIN_SETTLE_MS` 650 ms,
   `TRAP_SETTLE_MS` 850 ms, `FAILURE_SETTLE_MS` 250 ms) so the last frame,
   the mouse on the cheese or the trap animation, is visible before the
   outcome modal or toast appears.
4. Editing the program or switching levels clears the pending timer and
   resets to idle, so a stale run can never fire.

Next: [Cycles and optimization](./10-cycles-and-optimization.md).
