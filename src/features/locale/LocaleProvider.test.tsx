import { describe, expect, test } from 'bun:test';
import { mountComponent, settleDom } from '../../dom-harness';
import { LocaleProvider, useLocale } from './LocaleProvider';

/**
 * The locale context keeps the active locale in state, in Paraglide and on
 * `<html lang>`, and explains itself when used outside the provider.
 */

function LocaleProbe() {
	const { locale, setLocale } = useLocale();

	return (
		<button type='button' onClick={() => setLocale(locale === 'en' ? 'sr-Latn-RS' : 'en')}>
			{locale}
		</button>
	);
}

function LocaleOutsider() {
	useLocale();
	return null;
}

describe('LocaleProvider', () => {
	test('setLocale updates the context and the document language', async () => {
		const container = mountComponent(
			<LocaleProvider>
				<LocaleProbe />
			</LocaleProvider>,
		);

		await settleDom();
		// Serbian is the default when nothing is stored.
		expect(container.querySelector('button')?.textContent).toBe('sr-Latn-RS');
		expect(document.documentElement.lang).toBe('sr-Latn-RS');

		container.querySelector('button')?.click();
		await settleDom();

		expect(container.querySelector('button')?.textContent).toBe('en');
		expect(document.documentElement.lang).toBe('en');

		// Switch back so the Paraglide runtime does not leak the locale into
		// the other (randomly ordered) tests.
		container.querySelector('button')?.click();
		await settleDom();

		expect(container.querySelector('button')?.textContent).toBe('sr-Latn-RS');
		expect(document.documentElement.lang).toBe('sr-Latn-RS');
	});

	test('useLocale explains the misuse outside the provider', () => {
		expect(() => mountComponent(<LocaleOutsider />)).toThrow(
			'useLocale must be used within LocaleProvider',
		);
	});
});
