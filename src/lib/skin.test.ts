import '../dom-harness';
import { describe, expect, test } from 'bun:test';
import { applySkinToDocument, getStoredSkin, setStoredSkin, STORAGE_KEY } from './skin';

describe('skin storage', () => {
	test('round-trips a skin and clears it', () => {
		setStoredSkin('blue');
		expect(getStoredSkin()).toBe('blue');

		setStoredSkin(null);
		expect(getStoredSkin()).toBe(null);
	});

	test('ignores missing, malformed and unknown stored data', () => {
		expect(getStoredSkin()).toBe(null);

		localStorage.setItem(STORAGE_KEY, '{not json');
		expect(getStoredSkin()).toBe(null);

		localStorage.setItem(STORAGE_KEY, JSON.stringify('green'));
		expect(getStoredSkin()).toBe(null);
	});

	test('mirrors the skin on the document and removes it', () => {
		applySkinToDocument('pink');
		expect(document.documentElement.getAttribute('data-player-skin')).toBe('pink');

		applySkinToDocument(null);
		expect(document.documentElement.hasAttribute('data-player-skin')).toBe(false);
	});
});
