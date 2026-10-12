# Getting started

Everything you need to install, run, build and test Algorithy on your own
machine. The whole project is this one folder: a self-contained Bun + Hono
app with its own configuration, styles and tooling.

## Prerequisites

One tool does everything: **[Bun](https://bun.sh)**, version 1.4 or newer
(the version is pinned with `packageManager` in `package.json`). Bun is the
package manager, the script runner, the bundler and the test runner. There is
no Node.js toolchain, no `npm install`, no Vite.

```sh
curl -fsSL https://bun.sh/install | bash   # or your platform's installer
bun --version                              # should print 1.4.x
```

## Install

```sh
bun install
```

This installs the app's own dependencies into one lockfile. Installing
scripts from packages are disabled (`ignoreScripts` in `bunfig.toml`), which
keeps installs fast and predictable.

## Run it

```sh
bun run dev
```

`dev` does a full initial build, then watches and serves. Open
`http://localhost:3000` and you land on level 1 (or whatever level you last
played). The port changes with the `PORT` environment variable.

`dev` also serves the documentation you are reading now, under
`http://localhost:3000/docs`. See [This documentation](./20-documentation-guide.md).

For a production-like run:

```sh
bun run build   # bundle + CSS + static site + docs into dist/
bun run start   # serve dist/ with Hono on :3000
```

## The command table

All commands run inside the app folder.

| Command            | Purpose                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `bun run validate` | format + lint + test. The gate: run this before you call work done. |
| `bun run format`   | `oxfmt --write` (tabs, single quotes, sorted Tailwind classes).     |
| `bun run lint`     | `oxlint` with type-aware checks. Must report 0 errors.              |
| `bun run test`     | `bun test` with coverage on and randomized order.                   |
| `bun run build`    | full production build into `dist/`.                                 |
| `bun run dev`      | initial build + watch rebuilds + Hono server.                       |
| `bun run start`    | serve the built app on `:3000`.                                     |
| `bun run i18n`     | compile `messages/*.json` into the gitignored `src/paraglide/`.     |

`bun run validate` runs the same three steps CI would run; it is the only
gate.

## Where everything lives

```text
app/                            the whole project
  index.html                    SPA shell template
  package.json                  dependencies, scripts, pinned Bun version
  bunfig.toml                   Bun settings (install + test)
  tsconfig.json                 TypeScript configuration
  .oxlintrc.jsonc               lint rules
  .oxfmtrc.jsonc                format rules
  paraglide.config.ts           i18n compile configuration
  project.inlang/               locale declaration
  messages/                     en.json + sr-Latn-RS.json (translations)
  documentation/                the Markdown pages you are reading
  public/                       favicon and static assets
  dist/                         build output (gitignored)
  scripts/                      i18n compile + static assembly
  styles/                       theme.css (design tokens) + global.css (base styles)
  src/                          the application source
    server.ts                   Hono server + /docs routes
    client.tsx                  browser entry point
    App.tsx                     providers + router + switchers
    domain/                     pure game logic (no JSX, no i18n)
    schemas/                    valibot schemas, the single source of types
    blocks/                     block UI + the action registry
    features/level/             the level screen, drag and drop, export
    features/documentation/     the docs renderer (Bun.markdown)
    components/                 playground grid, player, target, traps
    lib/                        router, persistence, toasts, i18n seam...
    levels/                     Level1.json ... Level20.json + registry
```

A much deeper map is in [App shell and routing](./04-app-shell-and-routing.md)
and [Technology stack](./03-technology-stack.md).

## The browser game in two minutes

1. Level 1 starts with one locked `move-forward` block already in your
   program. Press **Run**. The mouse walks onto the cheese. You won.
2. Level 2 gives you `turn-right`. Drag the missing blocks under the locked
   ones, press **Run** again.
3. When you lose, a toast tells you why (blocked, never reached, trapped,
   infinite loop) and the outcome modal shows your block and cycle counts.
4. Your program is saved per level automatically; refreshing the page keeps
   it. The **Reset** button restores the level's starter program.
5. The code icon above the program opens the **Export as code** modal.

Next: how it is all put together, on
[Technology stack](./03-technology-stack.md).
