# This documentation

How the pages you are reading are stored, rendered, served and tested. The
documentation is part of the app: the same server that runs the game serves
the guide.

## Where the content lives

Every page is a plain Markdown file in `documentation/`, named `NN-slug.md`
so the file system sorts them into reading order. `index.md` is the landing
page served at `/docs`. The page title is the first `# ` heading in the file,
and the slug is the file name minus the extension, so a new page is a new
file, nothing else to register.

There are no front-matter blocks, no build steps for content, and no
database. Adding a page is: create `NN-your-topic.md`, write it, done. The
tests will complain if the title is missing or duplicated, if a link is
broken, or if an anchor does not exist.

## How it is rendered: Bun's native Markdown

`src/features/documentation/` holds the engine:

- `markdown.ts` - a typed seam over `Bun.markdown.html()`, Bun's built-in
  Markdown parser (CommonMark + GFM tables, strikethrough, task lists). It
  renders with `headings: true`, which gives every heading a stable id and
  wraps its text in a link to that id, so titles are selectable links like on
  any documentation site, and with `tagFilter`, which strips raw disallowed
  HTML tags so authored Markdown can never inject markup into the page shell.
  This is the "native instead of a library" choice: no `marked`, no
  `highlight.js`.
- `docs.ts` - the page loader and the HTML shell: reads the Markdown folder,
  extracts titles, renders a complete, self-contained page (inline
  stylesheet in the app's palette, sidebar nav with the active page marked,
  previous/next links, a back-to-app link and a raw-markdown link at the
  bottom). Pages are re-read per request, so an edit shows up on the next
  request with no server restart.
- Link handling: the Markdown sources link to each other with
  `./NN-slug.md`, which keeps the raw files browsable; the renderer rewrites
  those into `/docs/<slug>` in the HTML output, so page content and the
  sidebar always agree.

## The page layout

The shell adapts to the screen size, and the page list never changes sides:

- **Desktop (64rem and wider)**: a sticky side panel on the left, with the
  content column centred next to it.
- **Tablet (48 to 64rem)**: the same list as a left side panel that slides
  in over the content, with a dimmed backdrop.
- **Mobile (under 48rem)**: a full-width sheet, 70dvh tall, stuck to the
  bottom edge, opening over the content.
- **Floating controls**: a "Browse docs" pill on the left and a round
  back-to-top arrow on the right. They have no background of their own, so
  they float above the page. On mobile they hide while the sheet is open;
  the sheet closes by tapping the backdrop or pressing Escape. The
  back-to-top arrow appears once the page is scrolled.
- Content clears the controls on small screens, so the footer links are
  never covered, and scrollbars keep a visible handle on a transparent
  track everywhere.

## How it is served

- **Server**: `src/server.ts` registers `/docs` and `/docs/:slug` before the
  SPA fallback. `bun run dev` and `bun run start` both serve the docs, next
  to the game.
- **Raw markdown**: `/docs/<slug>.md` serves exactly the Markdown the page
  is rendered from, as plain text.
- **Static**: `scripts/assemble-dist.ts` renders every page into
  `dist/docs/<slug>/index.html` and copies the raw Markdown to
  `dist/docs/<slug>.md`, so the same URLs work on a static host without an
  SPA fallback.

## How it is tested

Two test files treat the documentation like the feature it is:

- `src/features/documentation/docs.test.ts` - the engine and the routes:
  every page renders non-empty HTML with its title in the shell, headings
  link to themselves, internal `.md` links are rewritten to `/docs/` URLs,
  the raw markdown route answers, unknown slugs return null (and the server
  answers 404), and path-style slugs cannot escape the catalog.
- `documentation/documentation.test.ts` (inside the documentation folder) -
  the content contract: every file has a first-level heading title, titles
  are unique, slugs are unique and valid, the index exists, every internal
  link in a rendered page points to an existing page, every anchor exists as
  a heading id, and the raw markdown variant returns exactly the page source.
  This is a real link-checker: a renamed page or a typo'd heading fails the
  gate.

## House rules for pages

- First line is the `# Title`; it becomes the nav entry.
- Use relative links between pages: `[name](./NN-slug.md#heading)`; the
  renderer turns them into `/docs/` URLs.
- Written for humans: plain first, technical where it matters, no em dashes,
  honest about gaps.
- The guide is written in English only. Translating it is a possible future
  job (one folder per locale), but the app is the bilingual part; see
  [Internationalization](./16-internationalization.md).
- Keep the [Known issues](./21-known-issues-and-gaps.md) page in sync when
  reality changes.

Next: [Known issues and gaps](./21-known-issues-and-gaps.md).
