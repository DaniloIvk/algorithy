# App shell and routing

How a request becomes a screen: the entry points, the providers, and the
hand-rolled router.

## The three entry points

### `src/server.ts` - the server

A small Hono app run by `Bun.serve` on port 3000 (or `PORT`). Its route table:

1. `/assets/*` - static files, tried in `dist/` first, then `public/`.
2. `/docs` and `/docs/:slug` - the documentation site, rendered from
   Markdown by [the docs renderer](./20-documentation-guide.md);
   `/docs/:slug.md` serves the raw Markdown instead.
3. `*` - the SPA fallback: return `index.html` for any non-asset path, so the
   client router can resolve the level from the URL. Asset requests that fell
   through stay 404s.

In development (`NODE_ENV` not `production`) every response gets
`Cache-Control: no-store`, because the watchers rewrite `dist/assets` in
place. The app construction lives in an exported `createApp()` so tests can
exercise the real routes through `app.request(...)` without binding a port;
`Bun.serve` only runs when the file is executed directly (`import.meta.main`).

### `index.html` - the static shell

The HTML the server returns for every non-asset route. It holds the `<head>`
(meta tags, theme colour, favicon, stylesheet link), a header and footer, the
`#root` element the client renders into, a bilingual `<noscript>` warning
(the page must still say something with JavaScript off), and the client
bundle script. The header/footer text is filled in by `ShellText` once the
app mounts, because it must be translatable, and `HeaderTitle` swaps the
centred wordmark for the builder's own pixel wordmark on `/build`.

The header is one flex row: the builder and language controls on the left, the
logo centred (it scales down inside its lane, so it never pushes the controls
off a narrow screen), and the skin chooser on the right. The control groups are
`order`ed in `style.css` (`#header-*-slot`) because the components append them.

The footer has three slots: an empty spacer, the centred copyright, and a
"Documentation" link on the right. On narrow screens it becomes a centred,
wrapping flex row instead, so the two never collide. That link points at
`/docs` with a plain anchor (not the client `Link`), so the browser makes a
full navigation to the server-rendered guide. Both the copyright and the link
text are translated through the `app_footer_copyright` and
`app_footer_documentation` messages.

### `src/client.tsx` - the browser entry point

Four lines: import the app, find `#root`, `render(<App />, root)` with
`hono/jsx/dom`.

## The provider stack (`src/App.tsx`)

`App` composes the providers that hold the app-wide state:

```
LocaleProvider
  AppShell (keyed by locale)
    ToastProvider
      SkinProvider
        Router                 the current page
        SkinChooser / SkinSwitcher / LanguageSwitcher   floating controls
        HeaderTitle            the builder's name in the header
        ShellText              header/footer/meta text
```

- **LocaleProvider** holds the Paraglide locale, sets `<html lang>`, and is
  keyed by locale: switching language remounts the whole subtree, so every
  rendered message is re-evaluated with no reload and no locale in the URL.
- **ToastProvider** owns the toast list (`lib/toast.tsx`): at most 5 active
  toasts, each auto-dismissing after 10 seconds. A sixth arrives by animating
  the oldest one out rather than making it vanish, and every dismiss (manual or
  timed) keeps the toast mounted for a short exit animation; timers are
  cleaned up on unmount.
- **SkinProvider** loads the stored player skin, applies
  `data-player-skin` to `<html>`, and offers the chooser/switcher.
- **ShellText** writes the translated header, footer and `<meta
  name="description">` on mount and on every locale change (they live outside
  the app tree in `index.html`).
- **HeaderTitle** keeps the header mark in step with the route: on `/build` it
  swaps the Algorithy wordmark for the builder's own pixel wordmarks - one
  file per word, per language (`public/assets/logo-builder-<locale>-<n>.svg`),
  so the two words can wrap on a narrow screen - and restores the Algorithy
  mark everywhere else.
- One small effect in `App` stamps the browser engine
  (`data-browser-engine`) via `lib/browserEngine` for CSS quirk handling.

## The client router (`src/lib/router.tsx`)

Routing is a hand-rolled `pushState`/`popstate` router, not Hono routing:

- `^/levels/([^/]+)$` renders `LevelPage`; `/` redirects to the stored last
  level (level 1 when there is none); any other path renders `NotFound`.
- `^/build(?:/([^/]+))?$` renders the builder, with an optional share payload
  to edit. `^/shared/([^/]+)$` renders a shared level. See
  [Level builder](./23-level-builder.md).
- `Link` is a small anchor wrapper that calls `navigate(href)` (pushState +
  a synthetic `popstate`) so in-app navigation never reloads the page.
- On first mount, `/` is replaced with `/levels/<slug>` via
  `history.replaceState`, so the URL always shows a level.

Because `/docs` is a _server_ route, links to the documentation use plain
anchors, not the client `Link`, so the browser performs a full navigation to
the server-rendered page.

## The level page (`src/pages/LevelPage.tsx`)

`LevelPage` resolves the slug through the level registry
(`domain/level.ts`) and renders `<Level>` with the raw data, the next slug and
the previous slug. An unknown slug renders a "coming soon" placeholder with a
link back to level 1.

## The level screen (`src/features/level/Level.tsx`)

`Level` is the orchestrator described in the data flow below. It:

1. Takes either raw level data (parsed once with `parseLevel`; invalid data
   renders an error message instead of a broken board) or an already built
   `LevelData`, which is how the shared level page reuses it.
2. Holds the program state via `useSequence` and the run state via
   `useSimulation` (both in `features/level/hooks/`).
3. Wraps everything in `DndProvider` (the drag-and-drop context).
4. Renders, side by side: the `Playground` with the `Palette` below it on the
   left, and the `LevelPicker` (or, for a shared level, the title/author
   header), `SequenceZone` (the program) and `Controls` on the right.
   `OutcomeModal`, `ExportModal` and `ToastStack` overlay the rest.
5. On a failure status, shows a translated toast explaining the outcome; on a
   win, records completion through `completion.ts`. The win modal also offers
   the builder once every built-in level is complete.

The exact data flow is diagrammed in
[The program tree](./08-the-program-tree.md) and
[Simulation](./09-simulation.md).

Next: [Levels overview](./05-levels-overview.md).
