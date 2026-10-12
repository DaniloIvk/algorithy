import { describe, expect, test } from 'bun:test';
import { mountComponent, settleDom } from '../../dom-harness';
import { getLocale, messages } from '../../lib/i18n';
import HeaderTitle from './HeaderTitle';
import { LocaleProvider } from './LocaleProvider';

/**
 * happy-dom keeps its own URL, set through `happyDOM.setURL`; the location is
 * what the header reads, so the test drives it there and then pings the route
 * store with the same `popstate` the app's own navigation dispatches.
 */
function setPath(path: string): void {
	const happyDom = (globalThis as { happyDOM?: { setURL?: (url: string) => void } }).happyDOM;
	happyDom?.setURL?.(`http://localhost${path}`);
	globalThis.dispatchEvent(new PopStateEvent('popstate'));
}

function mountHeader(): HTMLElement {
	const header = document.createElement('header');
	const heading = document.createElement('h1');
	const logo = document.createElement('img');
	logo.setAttribute('src', '/assets/logo.svg');
	logo.alt = 'Algorithy';
	heading.append(logo);
	header.append(heading);
	document.body.append(header);
	return heading;
}

function mountHeaderTitle(): void {
	mountComponent(
		<LocaleProvider>
			<HeaderTitle />
		</LocaleProvider>,
	);
}

function marks(heading: HTMLElement): Array<{ src: string | null; alt: string }> {
	return Array.from(heading.querySelectorAll('img')).map((image) => ({
		src: image.getAttribute('src'),
		alt: image.alt,
	}));
}

describe('HeaderTitle', () => {
	test('shows one wordmark per word, in the active language, on the builder', async () => {
		setPath('/build');
		expect(globalThis.location.pathname).toBe('/build');
		const heading = mountHeader();
		mountHeaderTitle();
		await settleDom();

		const words = messages.builder_title().split(' ');
		const suffix = getLocale() === 'en' ? 'en' : 'sr';

		expect(marks(heading)).toEqual([
			{ src: `/assets/logo-builder-${suffix}-1.svg`, alt: words[0] ?? '' },
			{ src: `/assets/logo-builder-${suffix}-2.svg`, alt: words[1] ?? '' },
		]);
	});

	test('restores the Algorithy wordmark off the builder route', async () => {
		setPath('/levels/1');
		const heading = mountHeader();
		mountHeaderTitle();
		await settleDom();

		expect(marks(heading)).toEqual([{ src: '/assets/logo.svg', alt: messages.app_title() }]);
	});
});
