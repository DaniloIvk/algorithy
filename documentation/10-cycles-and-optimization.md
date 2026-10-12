# Cycles and optimization

Why the game counts "cycles", what a cycle is, how the numbers are computed,
and how they turn into feedback and scores.

## Why count at all

A puzzle game needs a notion of "better". Algorithy's answer is a **cycle**:
a rough measure of how much work a program does. Two programs can both win,
but the one that does less work is better, and the game says so. The counts
drive three things:

1. The outcome modal shows the blocks used and the cycles used for your run.
2. The authored optimum (`optimalIterations`) is the number to beat, and the
   test suite asserts every level's optimal solution hits it exactly.
3. A hint (see below) tells you _why_ you used more than the optimum.

## The weighted cycle model

`countIterations` is a static cost model over the program tree. Every node
costs 1, plus:

| Action                       | Cost                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| leaf (`move-forward`, turns) | 1                                                            |
| `if`                         | 1 + the larger of its two branches                           |
| `while`                      | 1 + its body (once; the loop count is unknowable statically) |
| `for`                        | 2 + `n` repetitions of (2 + its body)                        |
| `switch`                     | 1 + its most expensive branch                                |

So a `for` of 4 moves costs `2 + 4 * (2 + 1) = 14`; a `while` wrapping a move
costs `2`. The model deliberately prices loops, because loops are the point
of the game.

## Executed cycles: the honest count

`countExecutedCycles` actually _runs_ the program (with the real player
state) and counts every unit of work, expanding loops for real. It is what
the outcome modal reports for your run.

Two deliberate design choices live here, both documented in the code:

- **The cost is of the written program, not of the visible walk.** Visual
  execution stops at the target, but counting continues: blocks after the
  winning move count, and a `for` runs all its repetitions. A program that
  keeps working after the goal costs more than the optimum, and it should,
  because that extra work is real.
- **`while` stops at the target in both paths**, because its condition is
  literally "target not reached". That is the one place the two walks agree.

Both cycle counters are `bigint` end to end. Counts can reach 3 000 000 000
(loop bombs), which does not fit in a safe `number` range; `bigint` makes
overflow impossible. `formatCycles` turns the count into a string, and the UI
converts to `Number(...)` only at the message boundary.

## The excess-repetition hint

When your run used more cycles than the optimum, `detectExcessRepetitions`
asks: is the excess explained by `for` loops repeating more than the authored
solution? It collects every `for` count from your program and from the
optimal solution (in traversal order) and compares them. If your loops repeat
more, the outcome message suggests tightening the repeat counts. It is a
_hint_, never a correctness rule: the outcome is decided by the simulation,
not by this comparison.

## Block count

`countBlocks` counts the blocks in the program, **including the implicit
`start` head** (containers count once, plus their bodies). That is why a
level's `optimalActionCount` is one more than the blocks written in its
`optimalSolution`. Together with cycles it feeds the "used X blocks, Y
cycles" summary, and `optimalActionCount` is the target.

## Why `optimalActionCount` and `optimalIterations` are asserted

These two numbers sit in every level file, next to the `optimalSolution`
itself. The tests convert the optimal solution into a runnable program and
simulate it on the real map: it must win, use exactly `optimalActionCount`
blocks, and cost exactly `optimalIterations` cycles. That means the numbers
in the level file are not decoration, they are a checked fact. When you edit
a level's map or solution, the gate fails until the numbers match reality
again. See [Testing](./19-testing.md) for how.

Next: [Drag and drop](./11-drag-and-drop.md).
