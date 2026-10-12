# Algorithy (`apps/app`)

Learn algorithms through play - a browser game modelled on Code.org's _Hour of
Code_ Maze. Drag Scratch-like blocks into a program and run it to reach the goal.

## Development

```sh
bun install
bun run dev
```

Opens on <http://localhost:3000> (override with `PORT`). The dev orchestrator
runs the Hono server under `bun --hot` and rebuilds the client bundle, Tailwind
CSS (including CSS `@import`s) and messages on change - no dev restart needed,
just refresh the browser.

## Production

```sh
bun run build    # bun run i18n + bun build -> dist/assets/client.js, tailwindcss -> dist/assets/index.css
bun run start    # serve dist/ + public/ with Hono on :3000
```

No Vite: the client is bundled with `bun build` and Tailwind is compiled with
`@tailwindcss/cli`.

## Translations

The app ships `sr-Latn-RS` (base and default) and `en` via Paraglide JS. Locales live in
`project.inlang/settings.json`; text lives in `messages/*.json` (flat
`snake_case` keys, prefixed by feature/component). `paraglide.config.ts` keeps
the locale in `localStorage` (never in the URL), and `scripts/i18n.ts` compiles
the catalog into the gitignored `src/paraglide/`:

```sh
bun run i18n     # regenerate src/paraglide (required before lint/build)
```

See `.agent/i18n.md` for the key taxonomy and reuse rules.

## Testing

```sh
bun validate     # format + lint + test: the gate
bun test         # tests only, coverage on, randomized order
```

Components are tested through happy-dom, registered by the `happydom.ts`
preload and driven by `src/dom-harness.tsx`; there is no Testing Library and no
mocking. Coverage is reported, not enforced. The philosophy, the file-by-file
map and the short list of intentionally dark lines live in
`documentation/19-testing.md` and `documentation/21-known-issues-and-gaps.md`.
