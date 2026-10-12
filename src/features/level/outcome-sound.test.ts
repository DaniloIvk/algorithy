import { describe, expect, test } from 'bun:test';
import { outcomeSound, trapKindAt } from './outcome-sound';
import { parseLevel, type LevelData } from '../../schemas/level.schema';

/**
 * The mapping from a finished run to its cue, and how the two lethal traps are
 * told apart from the board.
 */

const TEST_LEVEL_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

function buildLevel(map: readonly (readonly string[])[]): LevelData {
	const parsed = parseLevel({
		id: TEST_LEVEL_ID,
		title: { en: 'Sound test level' },
		slug: '1',
		width: map[0]?.length ?? 0,
		height: map.length,
		map,
		player: { x: 0, y: 1, direction: 'right' },
		target: { x: 2, y: 1 },
		allowedActions: ['move-forward'],
		optimalActionCount: 2,
		optimalIterations: 1,
		optimalSolution: [{ action: 'move-forward' }],
	});

	if (parsed === null) {
		throw new Error('sound test level failed to parse');
	}

	return parsed;
}

describe('outcomeSound', () => {
	test('maps each outcome to its own cue', () => {
		expect(outcomeSound('won', null)).toBe('won');
		expect(outcomeSound('blocked', null)).toBe('blocked');
		expect(outcomeSound('not-reached', null)).toBe('not-reached');
		expect(outcomeSound('infinite-loop', null)).toBe('infinite-loop');
	});

	test('tells the two traps apart', () => {
		expect(outcomeSound('trapped', 'hole')).toBe('hole');
		expect(outcomeSound('trapped', 'lava')).toBe('lava');
		expect(outcomeSound('trapped', null)).toBe('hole');
	});
});

describe('trapKindAt', () => {
	test('reads the trap under a cell', () => {
		const level = buildLevel([
			['lava', 'hole', 'ground'],
			['ground', 'ground', 'ground'],
		]);

		expect(trapKindAt(level, { x: 0, y: 0 })).toBe('lava');
		expect(trapKindAt(level, { x: 1, y: 0 })).toBe('hole');
		expect(trapKindAt(level, { x: 0, y: 1 })).toBeNull();
		expect(trapKindAt(level, { x: 9, y: 9 })).toBeNull();
	});
});
