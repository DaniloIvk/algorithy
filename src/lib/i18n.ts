import { baseLocale, getLocale, locales, setLocale, type Locale } from '../paraglide/runtime';
import { m as messages } from '../paraglide/messages';

// Single seam for the generated Paraglide output. Components import `messages`
// (and the locale helpers) from here instead of reaching into `src/paraglide`
// directly, so the generated path stays an implementation detail. Paraglide
// names the catalog `m`; the alias keeps app code descriptive.

/**
 * Pick a value from a locale-keyed record (level titles, for example), falling
 * back to the base locale and then to the first entry that exists.
 */
function localized(values: Readonly<Record<string, string>>, locale: Locale): string {
	return values[locale] ?? values[baseLocale] ?? Object.values(values)[0] ?? '';
}

export { baseLocale, getLocale, locales, localized, messages, setLocale };
export type { Locale };
