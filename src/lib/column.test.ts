import { describe, expect, test } from 'bun:test';
import { columnLetter } from './column';

describe('columnLetter', () => {
	test('maps indices to their letter', () => {
		expect(columnLetter(0)).toBe('A');
		expect(columnLetter(25)).toBe('Z');
	});

	test('rejects anything outside 0..25', () => {
		expect(() => columnLetter(-1)).toThrow();
		expect(() => columnLetter(26)).toThrow();
		expect(() => columnLetter(1.5)).toThrow();
	});
});
