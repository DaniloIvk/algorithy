# Algorithy Documentation

This is the complete, from-zero guide to **Algorithy**, the browser game that
teaches algorithms by letting you drag blocks, press Run, and watch a little
mouse walk to its cheese. It explains what the app is, how every piece of it
works, how it is built, how it is tested, and why it makes the choices it
makes. Nothing important is left out on purpose.

## Who this guide is for

- **Players and curious people** - start with
  [What is Algorithy](./01-what-is-algorithy.md), which needs no programming
  knowledge at all.
- **Developers** who want to understand or change the code - every page after
  that, especially [Technology stack](./03-technology-stack.md),
  [The program tree](./08-the-program-tree.md),
  [Simulation](./09-simulation.md) and
  [Validation](./15-validation.md).
- **Future-me**, the project's own author, and anyone reviewing this as a
  master's project - the [Testing](./19-testing.md) and
  [Known issues](./21-known-issues-and-gaps.md) pages say honestly what is
  proven and what is not.

## How to read it

The pages are ordered roughly from "what is this" to "how is it built", then
"how do we know it works". Every page links forward and backward, so you can
read straight through or jump around.

1. [What is Algorithy](./01-what-is-algorithy.md) - the idea, in plain words.
2. [Getting started](./02-getting-started.md) - run it, build it, find your way around.
3. [Technology stack](./03-technology-stack.md) - every tool and why it was chosen.
4. [App shell and routing](./04-app-shell-and-routing.md) - entry points, providers, URLs.
5. [Levels overview](./05-levels-overview.md) - all 20 levels and what each one teaches.
6. [Level schema](./06-level-schema.md) - the exact JSON contract, field by field.
7. [Blocks](./07-blocks.md) - the actions, the palette, and how blocks look.
8. [The program tree](./08-the-program-tree.md) - the data structure behind your program.
9. [Simulation](./09-simulation.md) - how Run actually executes your program.
10. [Cycles and optimization](./10-cycles-and-optimization.md) - what "cycles" mean and why they are counted.
11. [Drag and drop](./11-drag-and-drop.md) - the pointer-based dragging system.
12. [The playground](./12-playground.md) - the grid, its geometry, textures and entities.
13. [Design system](./13-design-system.md) - tokens, block colours, terrain themes, skins.
14. [Persistence](./14-persistence.md) - what is saved in the browser and how it is validated on load.
15. [Validation](./15-validation.md) - why this app validates data it wrote itself.
16. [Internationalization](./16-internationalization.md) - English and Serbian, done properly.
17. [Code export](./17-code-export.md) - turning the program into C, Python and JavaScript.
18. [Accessibility](./18-accessibility.md) - what the app does for everyone.
19. [Testing](./19-testing.md) - every test and what it proves.
20. [This documentation](./20-documentation-guide.md) - how these pages are built and served.
21. [Known issues and gaps](./21-known-issues-and-gaps.md) - honest inventory of what is unfinished.
22. [Glossary](./22-glossary.md) - every term in one place.
23. [Level builder](./23-level-builder.md) - make and share your own levels.

## The one-paragraph version

Algorithy is a browser game modeled on Code.org's Hour of Code maze. You drag
Scratch-like blocks (move forward, turn, repeat, if, while, switch) into a
program, press Run, and watch a mouse walk a grid toward a piece of cheese.
Twenty levels ramp from a single move to icy slides, lava, holes and nested
control flow. There is no server API: the game runs entirely in your browser,
with Bun, TypeScript, hono/jsx, valibot and Tailwind CSS v4 under the hood.
Every level file, every saved program and every piece of storage is validated
with schemas before it is trusted, and the whole thing is covered by tests that
run the actual game logic, not just toy cases.
