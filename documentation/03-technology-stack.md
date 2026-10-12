# Technology stack

Every technology the app uses, and the reason it was chosen. The philosophy is
deliberate minimalism: few dependencies, native where possible, and a single
runtime (Bun) for everything. The app is self-contained: every configuration
file, stylesheet and dependency it needs lives in its own folder.

## The runtime: Bun

Bun is the JavaScript runtime, the package manager, the bundler, the test
runner and the script runner. One tool replaces Node.js, npm, Vite and a test
framework. The version is pinned with `"packageManager": "bun@1.4.0"` in
`package.json`, and `bunfig.toml` holds the app's own Bun settings (install
policy and test behaviour).

Two Bun features matter especially here:

- **`bun build`** bundles the client (`src/client.tsx`) into a single minified
  `dist/assets/client.js` with `--target browser`. No config file, no plugin
  ecosystem.
- **`Bun.markdown`** is a native Markdown-to-HTML parser. The documentation
  site renders with it directly, so there is no `marked`/`remark` dependency
  (see [This documentation](./20-documentation-guide.md)).

## The language: TypeScript

Everything is TypeScript with the strictest practical settings, all in the
app's own `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`,
`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and
`jsxImportSource: "hono/jsx/dom"`. Bundler module resolution is used because
Bun is the bundler. Type checking happens through `oxlint` in type-aware
mode; `typescript` and `@types/bun` are declared as dev dependencies for
editors and standalone type checks.

## The UI runtime: hono/jsx

There is **no React and no framework**. The DOM is rendered with `hono/jsx`,
the tiny JSX runtime that ships with [Hono](https://hono.dev):

- `render(<App />, root)` mounts the client (`hono/jsx/dom`).
- Hooks (`useState`, `useEffect`, `useMemo`, `useRef`, `useCallback`,
  `useContext`) come from `hono/jsx` and behave like the familiar React hooks.
- `Activity` (`components/Activity.tsx`) is the house helper for conditional
  rendering: `<Activity when={condition} fallback={...}>...</Activity>` instead
  of `condition && <X/>` chains.
- Hono itself also runs the small server (`src/server.ts`), so one package
  covers client rendering and the HTTP layer.

## Validation: valibot

[Valibot](https://valibot.dev/) is the schema library. Every boundary between
"unknown data" and "trusted data" is a valibot schema with a `parse*` helper
that runs `safeParse` once. The parsed output type is the single source of
truth, and nothing is ever `as`-cast after parsing. Why this is a core value
of the app is its own page: [Validation](./15-validation.md).

## Styling: Tailwind CSS v4, in-app

- Tailwind v4 with the design tokens declared in `@theme` across
  `styles/theme.css` (the shared palette, breakpoints, typography, radii,
  shadows and the `v-*` height variants) and `src/style.css` (app-specific
  tokens and entity art).
- `styles/global.css` holds the base element styles; both files live in the
  app, there is no separate design package.
- The CSS is compiled with `@tailwindcss/cli` into `dist/assets/index.css`;
  dev rebuilds it on any source change.
- Class names are semantic tokens (`bg-surface`, `text-error`,
  `bg-block-sky`), not raw palette colours. The full token system is in
  [Design system](./13-design-system.md).
- Terrain art lives in `src/terrain.css` as procedural, asset-free CSS and
  inline SVG data URIs (no image files, no network fetches).
- `oxfmt` sorts Tailwind classes on format, so class order is never a
  hand-edited concern.

## Internationalization: Paraglide JS

Paraglide JS compiles `messages/en.json` and `messages/sr-Latn-RS.json` into
typed message functions under the gitignored `src/paraglide/`. The app's own
`paraglide.config.ts` configures the compile, with the locale stored in
`localStorage` and never appearing in the URL. Details are in
[Internationalization](./16-internationalization.md).

## The build pipeline (no Vite)

```
bun run i18n            paraglide compile -> src/paraglide/
bun build client.tsx    -> dist/assets/client.js   (bun build, minified)
tailwindcss -i style.css-> dist/assets/index.css   (Tailwind v4 CLI)
assemble-dist.ts        -> dist/index.html + public/* + dist/docs/*
```

- `src/server.ts` is a Hono app served by `Bun.serve`; it returns the SPA
  shell for non-asset routes, serves `/assets/*` from `dist/` then `public/`,
  and renders `/docs/*` from Markdown.
- `src/dev.ts` orchestrates development: one initial build, then
  `bun build --watch` for the client, a 60 ms debounced Tailwind rebuild on
  any source change, a 120 ms debounced i18n recompile on message changes, and
  the server under `bun --hot`.
- `dist/` is also a complete static site (`build:static` copies the shell,
  `public/` and renders the docs into `dist/docs/<slug>/index.html`), so the
  same build can be uploaded to any static host.

## Code quality tooling

- **oxfmt** formats (tabs, single quotes, Tailwind class sorting), configured
  in `.oxfmtrc.jsonc`.
- **oxlint** lints with `--type-aware --type-check` and a curated rule set
  (typescript, eslint, unicorn, oxc, promise, jsx-a11y, jsdoc plugins),
  configured in `.oxlintrc.jsonc`.
- **bun test** runs the tests with coverage reporting and randomized order
  (`bunfig.toml`), so a test that accidentally depends on another test's
  leftovers fails loudly.

Both linters are ordinary dev dependencies of this app, pinned like every
other dependency.

## The dependency list, annotated

Runtime dependencies:

| Package                            | Why                                    |
| ---------------------------------- | -------------------------------------- |
| `hono`                             | server + JSX runtime                   |
| `valibot`                          | all schema validation                  |
| `tailwindcss` + `@tailwindcss/cli` | CSS compilation                        |
| `lucide`                           | a couple of icons (code export, trash) |

Dev dependencies: `@inlang/paraglide-js` (i18n compile), `@types/bun` +
`typescript` (types and tooling), `oxfmt` + `oxlint` (format and lint). That
is the entire list.

Next: [App shell and routing](./04-app-shell-and-routing.md).
