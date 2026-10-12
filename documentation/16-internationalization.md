# Internationalization

The app speaks two languages properly: **Serbian in Latin script**
(`sr-Latn-RS`, the base locale and the default) and **English** (`en`), using
Paraglide JS.

## How it is wired

- Locales are declared in `project.inlang/settings.json`
  (`baseLocale: "sr-Latn-RS"`, `locales: ["en", "sr-Latn-RS"]`). With no stored
  choice, Paraglide falls back to the base locale, so a fresh visitor gets
  Serbian.
- The message catalog is flat JSON: `messages/en.json` and
  `messages/sr-Latn-RS.json`, sorted ascending so an editor lists a
  component's strings together.
- `paraglide.config.ts` extends the shared root config with one deliberate
  difference: the strategy is `['localStorage', 'baseLocale']`. The locale
  lives in `localStorage`, never in the URL, so there is no locale routing
  and no link rewriting.
- `scripts/i18n.ts` compiles the catalog into `src/paraglide/` (gitignored);
  `dev` and `build` run it first, and it must have run once before
  lint/typecheck.
- UI code imports `{ messages }` from the `lib/i18n` seam; only that file
  touches `src/paraglide` directly. `domain/` never imports i18n: labels
  stay in the UI layer (`blocks/conditionLabel.ts`,
  `features/skin/skinLabel.ts`).

## Switching languages

`LocaleProvider` sets `<html lang>` and keys the subtree on the locale, so
switching re-renders every `messages.*` call with no reload. The shell's
header, footer and `<meta name="description">` live outside the app tree, so
`ShellText` writes their text on mount and on every locale change, and
`HeaderTitle` swaps in the builder's pixel wordmark on `/build`; the
static `index.html`/`404.html` keep brand fallbacks and a bilingual `<noscript>`
(the page must say something even with JavaScript off).

## Serbian dialect

`sr-Latn-RS` uses standard Serbian **ekavica** (`napred`, `levo`, `pomera`,
`ovde`, `neverovatno`, `vreme`), not the ijekavica used in Bosnian/Croatian
(`naprijed`, `lijevo`, `pomjeri`, `ovdje`, `nevjerovatno`, `vrijeme`).

## Key taxonomy

Keys are flat `snake_case`, prefixed with the feature that owns them:
`palette_`, `controls_`, `level_picker_`, `block_for_`, `outcome_details_`,
`skin_chooser_`, `playground_cell_` and so on. Keys name the element, not
the string (`palette_drop_to_delete`, not `drop_to_delete_text`). A small
set of truly shared words is promoted to `common_` (`common_close`,
`common_collapse`, `common_expand`); everything else stays in its owner's
prefix, because a translator could reasonably write a different sentence for
two places that happen to share an English word.

## Plurals and variables

- Variables are `{name}` and become typed inputs
  (`messages.skin_pick({ color })`).
- Count-based strings are complex messages using `Intl.PluralRules`, each
  locale listing its own categories: English `one`/`other`, Serbian
  `one`/`few`/`other` (for example `block_container_collapsed_count`).
- Cycle counts are `bigint` in `domain/`; the UI converts with `Number(...)`
  at the message boundary, never inside a message or `domain/`.
- Markup placeholders are not used: when a sentence must wrap a JSX element
  (the `for` loop letter), the message is split into `..._prefix` /
  `..._suffix` keys and the element stays inline.

## Level titles

Level names are content, not UI chrome, so they live in the level JSON as a
locale-keyed record (`"title": { "en": "...", "sr-Latn-RS": "..." }`),
resolved with `localized(values, locale)` (current locale, then base, then
the first entry). Levels that introduce a block or hazard name it in the
title in both locales.

## What is not translated

The documentation in `documentation/` is written in English only. It is
aimed at developers and reviewers, and every page is a single source file; a
translated guide would be a folder per locale with its own link-checker run.
The app itself is the bilingual part.

## Adding a string

1. Add the key to `messages/en.json` in sorted position, with the right
   prefix.
2. Add the same key to `messages/sr-Latn-RS.json` (every locale must have
   it).
3. Import `messages` from the `lib/i18n` seam and replace the literal.
4. `bun run i18n`, then `bun validate`.

Next: [Code export](./17-code-export.md).
