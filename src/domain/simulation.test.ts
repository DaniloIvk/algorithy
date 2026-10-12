import { describe, expect, test } from 'bun:test';
import {
	collectExecutedActions,
	countBlocks,
	countExecutedCycles,
	detectExcessRepetitions,
	formatCycles,
	getMoveTrail,
	INFINITE_LOOP_REPETITION_THRESHOLD,
	isTrapped,
	runSequence,
	stepAction,
	toSimulationSequence,
	type LevelOptimum,
	type RepetitionNode,
} from './simulation';
import { parseLevel, type LevelData } from '../schemas/level.schema';
import type { ActionName } from './actions';
import type { Direction } from '../schemas/level.schema';

/**
 * Engine tests. The level suite proves the authored optima win on the real
 * maps, but it only ever walks winning paths; these tests exercise the rest:
 * blocked, trapped, exhausted and looping runs, plus the helpers that feed
 * the animation and the cycle counts.
 */

type SequenceStep = {
	readonly action: ActionName;
	readonly count?: number;
	readonly condition?: 'path-ahead' | 'path-left' | 'path-right';
	readonly children?: readonly SequenceStep[];
	readonly elseChildren?: readonly SequenceStep[];
	readonly branches?: readonly {
		readonly condition: 'path-ahead' | 'path-left' | 'path-right' | 'default';
		readonly children: readonly SequenceStep[];
	}[];
};

const TEST_LEVEL_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

function buildLevel(options: {
	readonly map: readonly (readonly string[])[];
	readonly target: { readonly x: number; readonly y: number };
	readonly player?: { readonly x: number; readonly y: number; readonly direction?: Direction };
}): LevelData {
	const rows = options.map;
	const firstRow = rows[0];
	const player = options.player ?? { x: 1, y: 1, direction: 'right' as const };

	const parsed = parseLevel({
		id: TEST_LEVEL_ID,
		title: { en: 'Engine test level' },
		slug: '1',
		width: firstRow?.length ?? 0,
		height: rows.length,
		map: rows,
		player: { x: player.x, y: player.y, direction: player.direction ?? 'right' },
		target: options.target,
		allowedActions: ['move-forward', 'turn-right', 'turn-left', 'for', 'if', 'while', 'switch'],
		optimalActionCount: 2,
		optimalIterations: 1,
		optimalSolution: [{ action: 'move-forward' }],
	});

	if (parsed === null) {
		throw new Error('engine test level failed to parse');
	}

	return parsed;
}

function startStateOf(level: LevelData) {
	return { x: level.player.x, y: level.player.y, direction: level.player.direction };
}

function withStart(steps: readonly SequenceStep[]): readonly SequenceStep[] {
	return [{ action: 'start' }, ...steps];
}

const WALL_ROW = ['wall', 'wall', 'wall', 'wall'] as const;

/** A 4x3 corridor: start (1,1), target (2,1), wall at (3,1). */
const CORRIDOR = buildLevel({
	map: [WALL_ROW, ['wall', 'ground', 'ground', 'wall'], WALL_ROW],
	target: { x: 2, y: 1 },
});

/** A 6x3 hall: start (1,1), target (4,1), four open cells. */
const HALL = buildLevel({
	map: [
		['wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
		['wall', 'ground', 'ground', 'ground', 'ground', 'wall'],
		['wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
	],
	target: { x: 4, y: 1 },
});

/** A 6x3 ice lane: start (1,1), ice at (2,1)-(3,1), target (4,1). */
const ICE_LANE = buildLevel({
	map: [
		['wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
		['wall', 'ground', 'ice', 'ice', 'ground', 'wall'],
		['wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
	],
	target: { x: 4, y: 1 },
});

/** A 5x3 trap lane: start (1,1), a hole at (2,1), target (3,1). */
const HOLE_LANE = buildLevel({
	map: [
		['wall', 'wall', 'wall', 'wall', 'wall'],
		['wall', 'ground', 'hole', 'ground', 'wall'],
		['wall', 'wall', 'wall', 'wall', 'wall'],
	],
	target: { x: 3, y: 1 },
});

/** A 5x3 trap lane with lava instead of a hole. */
const LAVA_LANE = buildLevel({
	map: [
		['wall', 'wall', 'wall', 'wall', 'wall'],
		['wall', 'ground', 'lava', 'ground', 'wall'],
		['wall', 'wall', 'wall', 'wall', 'wall'],
	],
	target: { x: 3, y: 1 },
});

describe('stepAction', () => {
	test('turns update the facing without moving', () => {
		const start = startStateOf(CORRIDOR);

		const right = stepAction(start, 'turn-right', CORRIDOR);
		expect(right.isSuccessful).toBe(true);
		expect(right.playerState).toEqual({ x: 1, y: 1, direction: 'down' });

		const left = stepAction(start, 'turn-left', CORRIDOR);
		expect(left.isSuccessful).toBe(true);
		expect(left.playerState).toEqual({ x: 1, y: 1, direction: 'up' });
	});

	test('moves into a wall and out of bounds fail without moving', () => {
		const atWall = stepAction({ x: 1, y: 1, direction: 'down' }, 'move-forward', CORRIDOR);
		expect(atWall.isSuccessful).toBe(false);
		expect(atWall.playerState).toEqual({ x: 1, y: 1, direction: 'down' });

		const atEdge = stepAction({ x: 1, y: 1, direction: 'up' }, 'move-forward', CORRIDOR);
		expect(atEdge.isSuccessful).toBe(false);
	});

	test('returns only the canonical result fields', () => {
		const moved = stepAction(startStateOf(HALL), 'move-forward', HALL);

		expect(Object.keys(moved).sort()).toEqual(['isSuccessful', 'playerState']);
	});

	test('moves one cell on plain ground', () => {
		const moved = stepAction(startStateOf(HALL), 'move-forward', HALL);

		expect(moved.isSuccessful).toBe(true);
		expect(moved.playerState).toEqual({ x: 2, y: 1, direction: 'right' });
	});

	test('slides across ice and stops when the floor is no longer slippery', () => {
		const moved = stepAction(startStateOf(ICE_LANE), 'move-forward', ICE_LANE);

		expect(moved.isSuccessful).toBe(true);
		expect(moved.playerState).toEqual({ x: 4, y: 1, direction: 'right' });
	});

	test('a slide stops on the target instead of sliding past it', () => {
		const moved = stepAction(startStateOf(ICE_LANE), 'move-forward', ICE_LANE);

		expect(moved.playerState.x).toBe(ICE_LANE.target.x);
		expect(moved.playerState.y).toBe(ICE_LANE.target.y);
	});
});

describe('getMoveTrail', () => {
	test('is empty for turns and blocked moves', () => {
		expect(getMoveTrail(startStateOf(CORRIDOR), 'turn-right', CORRIDOR)).toEqual([]);
		expect(getMoveTrail({ x: 1, y: 1, direction: 'down' }, 'move-forward', CORRIDOR)).toEqual([]);
	});

	test('lists the entered cell, plus every slide waypoint on ice', () => {
		expect(getMoveTrail(startStateOf(HALL), 'move-forward', HALL)).toEqual([{ x: 2, y: 1 }]);
		expect(getMoveTrail(startStateOf(ICE_LANE), 'move-forward', ICE_LANE)).toEqual([
			{ x: 2, y: 1 },
			{ x: 3, y: 1 },
			{ x: 4, y: 1 },
		]);
	});
});

describe('isTrapped', () => {
	test('is true on lava and holes, false on plain ground and ice', () => {
		expect(isTrapped({ x: 2, y: 1 }, HOLE_LANE)).toBe(true);
		expect(isTrapped({ x: 2, y: 1 }, LAVA_LANE)).toBe(true);
		expect(isTrapped({ x: 1, y: 1 }, CORRIDOR)).toBe(false);
		expect(isTrapped({ x: 2, y: 1 }, ICE_LANE)).toBe(false);
	});
});

describe('countBlocks', () => {
	// The count includes the implicit `start` head, which is why a level's
	// `optimalActionCount` is one more than the blocks in `optimalSolution`.
	test('counts containers once plus everything in their bodies', () => {
		expect(countBlocks(withStart([{ action: 'move-forward' }]))).toBe(2);
		expect(
			countBlocks(
				withStart([
					{ action: 'for', count: 3, children: [{ action: 'move-forward' }] },
					{ action: 'turn-right' },
				]),
			),
		).toBe(4);
		expect(
			countBlocks(
				withStart([
					{
						action: 'if',
						condition: 'path-ahead',
						children: [{ action: 'move-forward' }],
						elseChildren: [{ action: 'turn-left' }],
					},
				]),
			),
		).toBe(4);
	});
});

describe('toSimulationSequence', () => {
	test('prepends the synthetic start head', () => {
		const sequence = toSimulationSequence([{ action: 'move-forward' }]);

		expect(sequence[0]?.action).toBe('start');
		expect(sequence[1]?.action).toBe('move-forward');
	});

	test('converts nested containers, branches and conditions', () => {
		const sequence = toSimulationSequence([
			{
				action: 'switch',
				branches: [
					{ condition: 'path-left', children: [{ action: 'turn-left' }] },
					{ condition: 'default', children: [] },
				],
			},
		]);

		const switchItem = sequence[1];
		expect(switchItem?.action).toBe('switch');
		expect(switchItem?.branches?.[0]?.condition).toBe('path-left');
		expect(switchItem?.branches?.[0]?.children?.[0]?.action).toBe('turn-left');
		expect(switchItem?.branches?.[1]?.condition).toBe('default');
	});
});

describe('runSequence outcomes', () => {
	test('won when the written moves reach the target', () => {
		const result = runSequence(
			withStart([{ action: 'move-forward' }]),
			CORRIDOR,
			startStateOf(CORRIDOR),
		);

		expect(result.outcome).toBe('won');
		expect(result.playerState).toEqual({ x: 2, y: 1, direction: 'right' });
	});

	test('blocked when a move runs into a wall', () => {
		const result = runSequence(
			withStart([
				{ action: 'move-forward' },
				{ action: 'move-forward' },
				{ action: 'turn-right' },
				{ action: 'move-forward' },
			]),
			HALL,
			startStateOf(HALL),
		);

		expect(result.outcome).toBe('blocked');
	});

	test('not-reached when the program runs out before the target', () => {
		const result = runSequence(
			withStart([{ action: 'turn-right' }]),
			CORRIDOR,
			startStateOf(CORRIDOR),
		);

		expect(result.outcome).toBe('not-reached');
	});

	test('not-reached for an empty program', () => {
		expect(runSequence(withStart([]), CORRIDOR, startStateOf(CORRIDOR)).outcome).toBe(
			'not-reached',
		);
	});

	test('trapped when a move lands in a hole or lava', () => {
		expect(
			runSequence(withStart([{ action: 'move-forward' }]), HOLE_LANE, startStateOf(HOLE_LANE))
				.outcome,
		).toBe('trapped');
		expect(
			runSequence(withStart([{ action: 'move-forward' }]), LAVA_LANE, startStateOf(LAVA_LANE))
				.outcome,
		).toBe('trapped');
	});

	test('infinite-loop when a while repeats a state without progress', () => {
		const result = runSequence(
			withStart([{ action: 'while', children: [{ action: 'turn-right' }] }]),
			CORRIDOR,
			startStateOf(CORRIDOR),
		);

		expect(result.outcome).toBe('infinite-loop');
	});

	test('a while that keeps walking stops naturally on the target', () => {
		const result = runSequence(
			withStart([{ action: 'while', children: [{ action: 'move-forward' }] }]),
			HALL,
			startStateOf(HALL),
		);

		expect(result.outcome).toBe('won');
		expect(result.playerState).toEqual({ x: 4, y: 1, direction: 'right' });
	});

	test('if chooses the then or else body by the path condition', () => {
		const thenResult = runSequence(
			withStart([
				{
					action: 'if',
					condition: 'path-ahead',
					children: [{ action: 'move-forward' }],
					elseChildren: [{ action: 'turn-right' }],
				},
			]),
			CORRIDOR,
			startStateOf(CORRIDOR),
		);

		expect(thenResult.outcome).toBe('won');

		const elseResult = runSequence(
			withStart([
				{
					action: 'if',
					condition: 'path-left',
					children: [{ action: 'turn-left' }],
					elseChildren: [{ action: 'turn-right' }],
				},
			]),
			CORRIDOR,
			startStateOf(CORRIDOR),
		);

		expect(elseResult.outcome).toBe('not-reached');
		expect(elseResult.playerState.direction).toBe('down');
	});

	test('switch runs the first matching branch and falls back to default', () => {
		const result = runSequence(
			withStart([
				{
					action: 'switch',
					branches: [
						{ condition: 'path-ahead', children: [{ action: 'move-forward' }] },
						{ condition: 'path-left', children: [{ action: 'turn-left' }] },
						{ condition: 'default', children: [{ action: 'turn-right' }] },
					],
				},
			]),
			CORRIDOR,
			startStateOf(CORRIDOR),
		);

		// path-ahead is open, so the first branch wins and the target is reached.
		expect(result.outcome).toBe('won');
	});
});

describe('collectExecutedActions', () => {
	test('records the leaf actions in execution order', () => {
		const actions = collectExecutedActions(
			withStart([
				{ action: 'for', count: 2, children: [{ action: 'move-forward' }] },
				{ action: 'turn-right' },
			]),
			HALL,
			startStateOf(HALL),
		);

		expect(actions).toEqual(['move-forward', 'move-forward', 'turn-right']);
	});

	test('stops at the target, so the winning frame is the last one animated', () => {
		const actions = collectExecutedActions(
			withStart([{ action: 'move-forward' }, { action: 'turn-right' }]),
			CORRIDOR,
			startStateOf(CORRIDOR),
		);

		expect(actions).toEqual(['move-forward']);
	});
});

describe('countExecutedCycles', () => {
	test('charges a for loop for every repetition and its overhead', () => {
		const sequence = withStart([
			{ action: 'for', count: 2, children: [{ action: 'move-forward' }] },
		]);
		const result = runSequence(sequence, HALL, startStateOf(HALL));

		expect(countExecutedCycles(sequence, HALL, startStateOf(HALL))).toBe(8n);
		expect(result.iterationsUsed).toBe(8n);
	});

	test('counts the whole written program, even past the winning move', () => {
		const sequence = withStart([
			{ action: 'for', count: 3, children: [{ action: 'move-forward' }] },
		]);

		const result = runSequence(sequence, CORRIDOR, startStateOf(CORRIDOR));
		expect(result.outcome).toBe('won');

		// The run stops at the target, the count does not: three repetitions.
		expect(countExecutedCycles(sequence, CORRIDOR, startStateOf(CORRIDOR))).toBe(11n);
		expect(collectExecutedActions(sequence, CORRIDOR, startStateOf(CORRIDOR))).toEqual([
			'move-forward',
		]);
	});

	test('a while stops counting once the target is reached', () => {
		const sequence = withStart([{ action: 'while', children: [{ action: 'move-forward' }] }]);

		expect(countExecutedCycles(sequence, HALL, startStateOf(HALL))).toBe(7n);
	});
});

describe('formatCycles and the loop threshold', () => {
	test('formats bigint counts as plain digits', () => {
		expect(formatCycles(3_000_000_000n)).toBe('3000000000');
		expect(formatCycles(0n)).toBe('0');
	});

	test('the infinite-loop threshold is the one the UI message quotes', () => {
		expect(INFINITE_LOOP_REPETITION_THRESHOLD).toBe(3);
	});
});

describe('edge cells and container branches', () => {
	const EDGE = buildLevel({
		map: [
			['ground', 'ground', 'wall'],
			['ground', 'ground', 'wall'],
			['wall', 'wall', 'wall'],
		],
		target: { x: 2, y: 0 },
		player: { x: 0, y: 0, direction: 'up' },
	});

	test('a move and its trail stop at the board edge', () => {
		expect(stepAction({ x: 0, y: 0, direction: 'up' }, 'move-forward', EDGE).isSuccessful).toBe(
			false,
		);
		expect(getMoveTrail({ x: 0, y: 0, direction: 'up' }, 'move-forward', EDGE)).toEqual([]);
	});

	test('a condition whose neighbour is outside the board is false', () => {
		const result = runSequence(
			withStart([
				{
					action: 'if',
					condition: 'path-ahead',
					children: [{ action: 'turn-right' }],
					elseChildren: [{ action: 'turn-left' }],
				},
			]),
			EDGE,
			startStateOf(EDGE),
		);

		expect(result.playerState.direction).toBe('left');
	});

	test('stepAction falls through for a non-moving action', () => {
		const result = stepAction(startStateOf(CORRIDOR), 'start', CORRIDOR);

		expect(result.isSuccessful).toBe(true);
		expect(result.playerState).toEqual(startStateOf(CORRIDOR));
	});

	test('runSequence handles traps and wins inside every container', () => {
		expect(
			runSequence(
				withStart([{ action: 'for', count: 2, children: [{ action: 'move-forward' }] }]),
				HOLE_LANE,
				startStateOf(HOLE_LANE),
			).outcome,
		).toBe('trapped');
		expect(
			runSequence(
				withStart([{ action: 'while', children: [{ action: 'move-forward' }] }]),
				CORRIDOR,
				startStateOf(CORRIDOR),
			).outcome,
		).toBe('won');
		expect(
			runSequence(
				withStart([
					{
						action: 'switch',
						branches: [{ condition: 'default', children: [{ action: 'move-forward' }] }],
					},
				]),
				HOLE_LANE,
				startStateOf(HOLE_LANE),
			).outcome,
		).toBe('trapped');
		expect(
			runSequence(
				withStart([
					{
						action: 'if',
						condition: 'path-ahead',
						children: [{ action: 'move-forward' }],
						elseChildren: [{ action: 'turn-left' }],
					},
				]),
				HOLE_LANE,
				startStateOf(HOLE_LANE),
			).outcome,
		).toBe('trapped');
	});

	test('collectExecutedActions walks containers and stops on traps or loops', () => {
		expect(
			collectExecutedActions(
				withStart([{ action: 'for', count: 2, children: [{ action: 'move-forward' }] }]),
				HALL,
				startStateOf(HALL),
			),
		).toEqual(['move-forward', 'move-forward']);
		const loopActions = collectExecutedActions(
			withStart([{ action: 'while', children: [{ action: 'turn-right' }] }]),
			CORRIDOR,
			startStateOf(CORRIDOR),
		);

		expect(loopActions.length).toBeGreaterThan(0);
		expect(loopActions).toContain('turn-right');
		expect(
			collectExecutedActions(
				withStart([
					{
						action: 'switch',
						branches: [{ condition: 'default', children: [{ action: 'move-forward' }] }],
					},
				]),
				HALL,
				startStateOf(HALL),
			),
		).toEqual(['move-forward']);
		expect(
			collectExecutedActions(
				withStart([
					{
						action: 'if',
						condition: 'path-left',
						children: [{ action: 'turn-right' }],
						elseChildren: [{ action: 'turn-left' }],
					},
				]),
				CORRIDOR,
				startStateOf(CORRIDOR),
			),
		).toEqual(['turn-left']);
	});

	test('countExecutedCycles walks containers, traps and loops', () => {
		expect(
			countExecutedCycles(
				withStart([
					{
						action: 'switch',
						branches: [{ condition: 'default', children: [{ action: 'move-forward' }] }],
					},
				]),
				HOLE_LANE,
				startStateOf(HOLE_LANE),
			),
		).toBeGreaterThan(0n);
		expect(
			countExecutedCycles(
				withStart([
					{
						action: 'if',
						condition: 'path-ahead',
						children: [{ action: 'move-forward' }],
						elseChildren: [{ action: 'turn-left' }],
					},
				]),
				HALL,
				startStateOf(HALL),
			),
		).toBeGreaterThan(0n);
		expect(
			countExecutedCycles(
				withStart([{ action: 'while', children: [{ action: 'turn-right' }] }]),
				CORRIDOR,
				startStateOf(CORRIDOR),
			),
		).toBeGreaterThan(0n);
	});
});

describe('detectExcessRepetitions', () => {
	function forLoop(count: number, children: readonly RepetitionNode[] = []): RepetitionNode {
		return { action: 'for', count, children };
	}

	function moveForward(): RepetitionNode {
		return { action: 'move-forward' };
	}

	test('is false when the run does not exceed the optimum', () => {
		const sequence = [forLoop(5, [moveForward()])];
		const optimum: LevelOptimum = {
			optimalIterations: 10n,
			optimalSolution: [forLoop(3, [moveForward()])],
		};

		expect(detectExcessRepetitions(sequence, optimum, 10n)).toBe(false);
		expect(detectExcessRepetitions(sequence, optimum, 8n)).toBe(false);
	});

	test('is true when a loop repeats more times than the authored solution', () => {
		const sequence = [forLoop(5, [moveForward()])];
		const optimum: LevelOptimum = {
			optimalIterations: 10n,
			optimalSolution: [forLoop(3, [moveForward()])],
		};

		expect(detectExcessRepetitions(sequence, optimum, 12n)).toBe(true);
	});

	test('is false when the loop counts match and something else costs cycles', () => {
		const sequence = [forLoop(3, [moveForward()]), moveForward()];
		const optimum: LevelOptimum = {
			optimalIterations: 10n,
			optimalSolution: [forLoop(3, [moveForward()])],
		};

		expect(detectExcessRepetitions(sequence, optimum, 12n)).toBe(false);
	});

	test('is true when the player wrote an extra loop', () => {
		const sequence = [forLoop(3, [moveForward()]), forLoop(1, [moveForward()])];
		const optimum: LevelOptimum = {
			optimalIterations: 10n,
			optimalSolution: [forLoop(3, [moveForward()])],
		};

		expect(detectExcessRepetitions(sequence, optimum, 12n)).toBe(true);
	});

	test('pairs nested loops in traversal order', () => {
		const sequence = [forLoop(2, [forLoop(4, [moveForward()])])];
		const optimum: LevelOptimum = {
			optimalIterations: 10n,
			optimalSolution: [forLoop(2, [forLoop(2, [moveForward()])])],
		};

		expect(detectExcessRepetitions(sequence, optimum, 12n)).toBe(true);
	});
});
