import { describe, expect, test } from 'bun:test';
import { parseSoundMuted } from './sound.schema';

describe('parseSoundMuted', () => {
	test('accepts the two booleans', () => {
		expect(parseSoundMuted(true)).toBe(true);
		expect(parseSoundMuted(false)).toBe(false);
	});

	test('rejects anything else', () => {
		expect(parseSoundMuted('true')).toBeNull();
		expect(parseSoundMuted(1)).toBeNull();
		expect(parseSoundMuted(null)).toBeNull();
	});
});
