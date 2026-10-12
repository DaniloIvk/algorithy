# What is Algorithy

Algorithy is a browser game that teaches **algorithms** by play. Think of it
as a puzzle game where the pieces are instructions.

## The story in one screen

A little mouse stands on a grid. Somewhere on that grid is a piece of cheese.
Your job is to get the mouse to the cheese. You do not steer the mouse with
arrows or a joystick. Instead you build a small **program** out of blocks:

- `move-forward` - take one step in the direction the mouse faces.
- `turn-left` / `turn-right` - spin the mouse in place.
- `repeat (for)` - do something a chosen number of times.
- `while` - keep doing something until the mouse reaches the cheese.
- `if` / `else` - do something only when a path is open (or closed).
- `switch` - pick one of several paths depending on what the mouse sees.

You drag these blocks from a **palette** into a **program area**, press
**Run**, and watch the mouse walk, turn, slide over ice, and (hopefully)
arrive at the cheese. If the program is wrong, the mouse stops, bumps into a
wall, falls in a hole, or keeps going forever; you fix the program and run
again.

## Where the idea comes from

The game follows the structure of Code.org's "Hour of Code" maze (level 1 of
20): short levels that each teach one new idea, starting with a single
`move-forward` and ending with a maze that needs loops and decisions. The
teaching trick is the same one that makes Scratch work: instead of typing
code, you snap visible blocks together, so the syntax can never be wrong.
Every mistake you can make is a _thinking_ mistake, and thinking mistakes are
exactly what the game wants you to practice.

## What the game teaches, level by level

Each level introduces one concept and only offers the blocks needed for it:

| Concept                         | First appears            |
| ------------------------------- | ------------------------ |
| Sequencing (one step at a time) | Level 1                  |
| Turning                         | Levels 2 and 3           |
| Repetition with `for`           | Levels 5 and 6           |
| Decisions with `if`             | Level 7                  |
| Repetition with `while`         | Level 9                  |
| Choosing paths with `switch`    | Level 11                 |
| Hazards: holes, lava, ice       | Levels 10, 12, 13 and 14 |

The full table is on the [Levels overview](./05-levels-overview.md) page.

## What makes it different from a video

The game is not just an animation. Under the hood there is a real
**simulator**: the same code that walks the mouse on screen decides whether
you won. It counts **cycles** (a rough measure of how much work your program
does), so a shorter, smarter program scores better than a long one, and it
explains _why_ you lost: blocked by a wall, never reached the cheese, stepped
into a trap, or looped forever. All of that is described on the
[Simulation](./09-simulation.md) and
[Cycles and optimization](./10-cycles-and-optimization.md) pages.

## What you can do besides solving levels

- **Export as code**: the game turns your blocks into real C, Python and
  JavaScript, so you can see what you actually "wrote". See
  [Code export](./17-code-export.md).
- **Pick a language**: the whole interface works in English and Serbian.
  See [Internationalization](./16-internationalization.md).
- **Change the mouse**: two skins, blue and pink.
- **Pick a level freely**: a level picker lets you jump anywhere, and your
  progress is remembered in your browser.

## And what it deliberately is not

- There is **no server API**. The game runs entirely in your browser; the
  server only hands out the files.
- There is **no account** and no cloud. Progress lives in `localStorage` in
  your own browser.
- There are **no ads, no timers, no violence**. The mouse walks, slides, and
  when it fails it falls into a cartoon pit or vanishes in a puff; the art is
  deliberately soft and friendly.

Ready to run it? Go to [Getting started](./02-getting-started.md).
