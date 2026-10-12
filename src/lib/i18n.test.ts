import { describe, expect, test } from 'bun:test';
import { baseLocale, localized } from './i18n';

describe('localized', () => {
	test('picks the requested locale', () => {
		expect(localized({ en: 'English', 'sr-Latn-RS': 'Srpski' }, 'sr-Latn-RS')).toBe('Srpski');
	});

	test('falls back to the base locale', () => {
		expect(localized({ en: 'English' }, 'sr-Latn-RS')).toBe('English');
	});

	test('falls back to the first value and then to empty', () => {
		expect(localized({ de: 'Deutsch' }, 'sr-Latn-RS')).toBe('Deutsch');
		expect(baseLocale).toBe('sr-Latn-RS');
		expect(localized({}, 'en')).toBe('');
	});
});
