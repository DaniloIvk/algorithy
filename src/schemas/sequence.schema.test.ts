import { describe, expect, test } from 'bun:test';
import { parseCount, parseOptimalSolution, parseSequence, SequenceSchema } from './sequence.schema';
import { safeParse } from 'valibot';

/**
 * The sequence boundary. `parseSequence` guards every sequence re-read,
 * `parseCount` guards the `for` input, and `parseOptimalSolution` guards the
 * authored optima. The happy paths run through the level and stored-sequence
 * tests; these cases pin the rejections, which are the contract.
 */

describe('parseSequence', () => {
	test('accepts a nested program and returns a mutable list', () => {
		const parsed = parseSequence([
			{
				kind: 'algorithm',
				id: 'start',
				action: 'start',
				label: 'Start',
				default: true,
				movable: false,
			},
			{
				kind: 'algorithm',
				id: 'for-1',
				action: 'for',
				label: 'For',
				default: false,
				movable: true,
				count: 3,
				children: [
					{
						kind: 'algorithm',
						id: 'move-1',
						action: 'move-forward',
						label: 'Move',
						default: false,
						movable: true,
					},
				],
			},
		]);

		expect(parsed).toHaveLength(2);
		expect(parsed?.[1]?.children?.[0]?.action).toBe('move-forward');
	});

	test('returns null for unknown actions and malformed items', () => {
		expect(
			parseSequence([
				{ kind: 'algorithm', action: 'dance', id: '1', label: 'x', default: false, movable: true },
			]),
		).toBe(null);
		expect(parseSequence('not a program')).toBe(null);
		expect(parseSequence([{ action: 'move-forward' }])).toBe(null);
		expect(
			parseSequence([
				{
					kind: 'algorithm',
					id: 'if-1',
					action: 'if',
					label: 'If',
					default: false,
					movable: true,
					condition: 'nowhere',
				},
			]),
		).toBe(null);
	});

	test('rejects an if without a valid condition and a bad count', () => {
		const result = safeParse(SequenceSchema, [
			{
				kind: 'algorithm',
				id: 'if-1',
				action: 'if',
				label: 'If',
				default: false,
				movable: true,
				condition: 'path-sideways',
			},
		]);

		expect(result.success).toBe(false);

		const countResult = safeParse(SequenceSchema, [
			{
				kind: 'algorithm',
				id: 'for-1',
				action: 'for',
				label: 'For',
				default: false,
				movable: true,
				count: 0,
				children: [],
			},
		]);

		expect(countResult.success).toBe(false);
	});
});

describe('parseCount', () => {
	test('accepts integers in the 1..99 range', () => {
		expect(parseCount(1)).toBe(1);
		expect(parseCount(99)).toBe(99);
	});

	test('rejects fractions, out-of-range numbers and non-numbers', () => {
		expect(parseCount(0)).toBe(null);
		expect(parseCount(100)).toBe(null);
		expect(parseCount(2.5)).toBe(null);
		expect(parseCount('3')).toBe(null);
		expect(parseCount(undefined)).toBe(null);
	});
});

describe('parseOptimalSolution', () => {
	test('accepts the authored shapes of every action', () => {
		const parsed = parseOptimalSolution([
			{ action: 'move-forward' },
			{ action: 'for', count: 2, children: [{ action: 'move-forward' }] },
			{ action: 'while', children: [{ action: 'move-forward' }] },
			{
				action: 'if',
				condition: 'path-left',
				children: [{ action: 'turn-left' }],
				elseChildren: [{ action: 'turn-right' }],
			},
			{
				action: 'switch',
				branches: [
					{ condition: 'path-ahead', children: [{ action: 'move-forward' }] },
					{ condition: 'default', children: [] },
				],
			},
		]);

		expect(parsed).toHaveLength(5);
	});

	test('rejects start and the container shape violations', () => {
		expect(parseOptimalSolution([{ action: 'start' }])).toBe(null);
		expect(parseOptimalSolution([{ action: 'for', count: 2, children: [] }])).toBe(null);
		expect(parseOptimalSolution([{ action: 'for', children: [{ action: 'move-forward' }] }])).toBe(
			null,
		);
		expect(parseOptimalSolution([{ action: 'while', children: [] }])).toBe(null);
		expect(parseOptimalSolution([{ action: 'if', children: [] }])).toBe(null);
		expect(parseOptimalSolution([{ action: 'switch', branches: [] }])).toBe(null);
	});

	test('rejects fields that belong to a different action', () => {
		expect(parseOptimalSolution([{ action: 'move-forward', count: 2 }])).toBe(null);
		expect(
			parseOptimalSolution([{ action: 'while', count: 2, children: [{ action: 'move-forward' }] }]),
		).toBe(null);
		expect(parseOptimalSolution([{ action: 'turn-left', condition: 'path-ahead' }])).toBe(null);
		expect(
			parseOptimalSolution([{ action: 'move-forward', children: [{ action: 'move-forward' }] }]),
		).toBe(null);
		expect(
			parseOptimalSolution([
				{
					action: 'if',
					condition: 'path-ahead',
					branches: [{ condition: 'default', children: [] }],
				},
			]),
		).toBe(null);
	});

	test('rejects an else body on loops', () => {
		expect(
			parseOptimalSolution([
				{ action: 'for', count: 2, children: [{ action: 'move-forward' }], elseChildren: [] },
			]),
		).toBe(null);
		expect(
			parseOptimalSolution([
				{ action: 'while', children: [{ action: 'move-forward' }], elseChildren: [] },
			]),
		).toBe(null);
	});
});
