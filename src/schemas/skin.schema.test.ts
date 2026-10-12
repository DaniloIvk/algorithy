import { describe, expect, test } from 'bun:test';
import { parseSkin } from './skin.schema';

describe('parseSkin', () => {
	test('accepts the known skins', () => {
		expect(parseSkin('blue')).toBe('blue');
		expect(parseSkin('pink')).toBe('pink');
	});

	test('rejects everything else', () => {
		expect(parseSkin('green')).toBe(null);
		expect(parseSkin(42)).toBe(null);
		expect(parseSkin(null)).toBe(null);
		expect(parseSkin({ skin: 'blue' })).toBe(null);
	});
});
