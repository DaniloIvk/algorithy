import { describe, expect, test } from 'bun:test';
import {
	parseCompletedLevelSlugs,
	parseLastLevelSlug,
	parseStoredSequence,
	type StoredSequenceItem,
} from './persistence.schema';

describe('parseStoredSequence', () => {
	test('accepts a stored program without the start head', () => {
		expect(parseStoredSequence([{ action: 'move-forward' }])).toEqual([{ action: 'move-forward' }]);
	});

	test('rejects the start head and malformed shapes', () => {
		expect(parseStoredSequence([{ action: 'start' }])).toBe(null);
		expect(parseStoredSequence([{ action: 'unknown' }])).toBe(null);
		expect(parseStoredSequence('nope')).toBe(null);
	});

	test('parses nested children, else children and branches', () => {
		const nested: readonly StoredSequenceItem[] = [
			{
				action: 'if',
				condition: 'path-ahead',
				children: [{ action: 'move-forward' }],
				elseChildren: [{ action: 'turn-left' }],
			},
			{
				action: 'switch',
				branches: [
					{ condition: 'path-left', children: [{ action: 'turn-right' }] },
					{ condition: 'default', children: [] },
				],
			},
		];

		expect(parseStoredSequence(nested)).toEqual([...nested]);
	});
});

describe('parseLastLevelSlug', () => {
	test('accepts a slug and rejects everything else', () => {
		expect(parseLastLevelSlug('3')).toBe('3');
		expect(parseLastLevelSlug(3)).toBe(null);
	});
});

describe('parseCompletedLevelSlugs', () => {
	test('accepts slug arrays and rejects everything else', () => {
		expect(parseCompletedLevelSlugs(['1', '2'])).toEqual(['1', '2']);
		expect(parseCompletedLevelSlugs(['1', 2])).toBe(null);
		expect(parseCompletedLevelSlugs(null)).toBe(null);
	});
});
