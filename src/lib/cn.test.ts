import { describe, expect, test } from 'bun:test';
import { classNames } from './cn';

describe('classNames', () => {
	test('joins the truthy values and trims each one', () => {
		expect(classNames('a', ' b ', false, undefined, null, 'c')).toBe('a b c');
	});

	test('returns an empty string when nothing is truthy', () => {
		expect(classNames(false, null, undefined)).toBe('');
	});
});
