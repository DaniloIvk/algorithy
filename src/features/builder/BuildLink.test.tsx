import { describe, expect, test } from 'bun:test';
import { mountComponent, settleDom } from '../../dom-harness';
import { messages } from '../../lib/i18n';
import { LocaleProvider } from '../locale/LocaleProvider';
import BuildLink from './BuildLink';

/**
 * happy-dom keeps its own URL, set through `happyDOM.setURL`; the header
 * action reads the route store, so the test sets the URL and dispatches the
 * same `popstate` the app's navigation does before mounting.
 */
function setPath(path: string): void {
	const happyDom = (globalThis as { happyDOM?: { setURL?: (url: string) => void } }).happyDOM;
	happyDom?.setURL?.(`http://localhost${path}`);
	globalThis.dispatchEvent(new PopStateEvent('popstate'));
}

function mountHeaderAction(): HTMLElement {
	const header = document.createElement('header');
	document.body.append(header);
	mountComponent(
		<LocaleProvider>
			<BuildLink />
		</LocaleProvider>,
	);
	return header;
}

describe('BuildLink', () => {
	test('offers the builder off the builder route', async () => {
		setPath('/levels/1');
		const header = mountHeaderAction();
		await settleDom();

		expect(header.querySelector('a')?.getAttribute('href')).toBe('/build');
		expect(header.textContent).toBe(messages.builder_open());
	});

	test('becomes a back link on the builder itself', async () => {
		setPath('/build');
		const header = mountHeaderAction();
		await settleDom();

		expect(header.querySelector('a')?.getAttribute('href')).toBe('/');
		expect(header.textContent).toBe(messages.builder_back_to_game());
	});
});
