# Code export

The game can show you the algorithm you built as real code. The code icon in
the top-right of the program area (and the "Export as code" link on the win
modal) opens the export modal.

## The feature

- Three language tabs, each with an IDE-style tab: **C**, **Python** and
  **JavaScript** (`algorithm.c`, `algorithm.py`, `algorithm.js`).
- A language badge with each language's brand colours (`LanguageLogo.tsx`),
  line numbers, a monospace preview with syntax token colours, and a Copy
  button that flips to a "copied" label for a couple of seconds.
- The exported code is always your current program, exactly as it is in the
  sequence zone.

## The generator

`features/level/export-algorithm.ts` is the pure generator, shared by the
modal and its tests. It does two things: it declares the functions the program
calls, then it translates the blocks.

### The scaffold

The sibling C course that precedes this one in the learning path expects
student code as a set of function definitions followed by `main`, so the export
mirrors that shape. A two-step program exports as:

```c
void move_forward() {}

void main() {
    move_forward();
    move_forward();
}
```

- Every action and condition the program actually calls gets one stub at the
  top, in a fixed order (the move/turn actions first, then the conditions).
  Functions the program does not use are not declared.
- C wraps the program in `void main() { ... }`; its condition stubs return an
  `int` (`int path_ahead() { return 0; }`) so the pasted file still compiles.
- Python and JavaScript keep the program at the top level, after the stubs.
  Python action stubs use `pass` and condition stubs `return False`;
  JavaScript action stubs are empty and condition stubs `return false`.
- A program that calls nothing at all exports as an empty script.

### Block mapping

It maps blocks to language statements:

| Block             | C / JavaScript                             | Python                           |
| ----------------- | ------------------------------------------ | -------------------------------- |
| `move-forward`    | `move_forward();` / `moveForward();`       | `move_forward()`                 |
| `turn-left/right` | `turn_left();` ...                         | `turn_left()`                    |
| `for`             | `for (int i = 1; i <= n; i++) {` / `let i` | `for i in range(1, n + 1):`      |
| `while`           | `while (!target_reached()) {`              | `while not target_reached():`    |
| `if`              | `if (path_ahead()) { ... } else { ... }`   | `if path_ahead(): ... else: ...` |
| `switch`          | an `if` / `else if` / `else` chain         | `if` / `elif` / `else`           |

A `switch` exports as an if-else chain because that is the honest
translation: each branch is a path condition, and `default` becomes the
final `else`. Empty Python bodies get a `pass`, because Python requires one.
`while` exports as "while the target is not reached", which is exactly what
the block means.

Symbol naming follows each language's convention: `snake_case` in C and
Python, `camelCase` in JavaScript. Nested loops are labelled `i`, `j`, `k`
(and `k` beyond), with the same letters shown in the block UI
(`lib/loopLetter.ts`), so the code and the blocks never disagree about which
loop is which.

## The formatting rules

The formatting is a deliberate contract, locked by tests:

- A container (`for`, `while`, `if`, `switch`) is set off by **one blank
  line** from what precedes or follows it at the same level.
- Leaves stay adjacent to each other, no blank lines.
- Bodies are never padded inside; a structure nested as the first or last
  thing in a body sits flush with it.
- Indentation is four spaces.

The result reads like a human wrote it, not like a printer dumped a tree.

## Where the pieces live

`ExportModal.tsx` renders the modal; the win modal's
[Outcome modal](./04-app-shell-and-routing.md) link opens it on top;
`export-algorithm.test.ts` locks the formatting contract for all three
languages.

Next: [Accessibility](./18-accessibility.md).
