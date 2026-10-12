import { useEffect } from 'hono/jsx';
import { messages } from '../../lib/i18n';
import { usePathname } from '../../lib/router';
import { useLocale } from './LocaleProvider';

/**
 * The header lives in the static SPA shell (`index.html`), outside the app
 * tree, so this writes into it. Everywhere the header shows the Algorithy
 * pixel wordmark; the builder shows its own name as two pixel wordmarks
 * (one per word, so they can wrap on a narrow screen) in the same style,
 * in the active language.
 */

const BUILDER_PATH = /^\/build(?:\/|$)/i;
const APP_MARK = '/assets/logo.svg';

/** Two wordmark files per locale, in word order. */
const BUILDER_MARKS: Record<string, readonly [string, string]> = {
	en: ['/assets/logo-builder-en-1.svg', '/assets/logo-builder-en-2.svg'],
	'sr-Latn-RS': ['/assets/logo-builder-sr-1.svg', '/assets/logo-builder-sr-2.svg'],
};

function makeMark(source: string, alt: string): HTMLImageElement {
	const image = document.createElement('img');
	image.src = source;
	image.alt = alt;
	return image;
}

function applyHeaderMark(pathname: string, locale: string): void {
	const heading = document.querySelector<HTMLElement>('header h1');
	if (heading === null) {
		return;
	}

	if (BUILDER_PATH.test(pathname)) {
		const words = messages.builder_title().split(' ');
		const marks = BUILDER_MARKS[locale] ?? BUILDER_MARKS['en'];
		if (marks !== undefined) {
			heading.replaceChildren(
				makeMark(marks[0], words[0] ?? ''),
				makeMark(marks[1], words[1] ?? ''),
			);
			return;
		}
	}

	heading.replaceChildren(makeMark(APP_MARK, messages.app_title()));
}

function HeaderTitle(): null {
	const { locale } = useLocale();
	const pathname = usePathname();

	useEffect(() => {
		applyHeaderMark(pathname, locale);
	}, [locale, pathname]);

	return null;
}

export default HeaderTitle;
