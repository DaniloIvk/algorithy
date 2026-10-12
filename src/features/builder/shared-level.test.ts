import { describe, expect, test } from 'bun:test';
import {
	buildLevelData,
	cellKey,
	createDefaultDraft,
	draftCellsToArray,
	draftFromPayload,
	draftToPayload,
	levelFromPayload,
	looksForTerrain,
	paintDraft,
	prepareDraft,
	resizeDraft,
	validateBuilderDraft,
	type BuilderDraft,
} from './shared-level';
import { decodeLevelPayload, encodeLevelPayload } from './level-codec';
import { actionNames, type ActionName } from '../../domain/actions';
import {
	countBlocks,
	countExecutedCycles,
	runSequence,
	toSimulationSequence,
} from '../../domain/simulation';
import { createBuilderStartItem, optimalItemsToSequenceItems } from './solution-sequence';
import type { OptimalSolutionItem, SequenceItem } from '../../schemas/sequence.schema';

/**
 * The builder bridge: draft resizing and buffering, the floor rule under
 * the player and target (ice may stay), and the validation that decides
 * whether a level can be shared.
 */

const SALT = Uint8Array.from([3, 1, 4, 1]);

function createDraft(overrides: Partial<BuilderDraft> = {}): BuilderDraft {
	return {
		...createDefaultDraft(5, 5),
		title: 'Test level',
		player: { x: 1, y: 1, direction: 'right' },
		target: { x: 3, y: 1 },
		...overrides,
	};
}

function createSolution(items: readonly OptimalSolutionItem[]): SequenceItem[] {
	const labelForAction = (action: ActionName): string => `${action} label`;
	return [
		createBuilderStartItem(labelForAction),
		...optimalItemsToSequenceItems(items, labelForAction),
	];
}

const WINNING_SOLUTION: readonly OptimalSolutionItem[] = [
	{ action: 'move-forward' },
	{ action: 'move-forward' },
];

describe('draft resizing and cells', () => {
	test('shrinking keeps the off-map cells and growing restores them', () => {
		const painted = new Map([[cellKey(4, 4), 'wall' as const]]);
		let draft = createDraft({ cells: painted });

		draft = resizeDraft(draft, 3, 3);
		expect(draft.cells.get(cellKey(4, 4))).toBe('wall');

		draft = resizeDraft(draft, 5, 5);
		expect(draftCellsToArray(draft)[4 * 5 + 4]).toBe('wall');
	});

	test('shrinking clamps the player and target into the new bounds', () => {
		const draft = resizeDraft(
			createDraft({ player: { x: 4, y: 4, direction: 'up' }, target: { x: 4, y: 0 } }),
			3,
			3,
		);

		expect(draft.player).toEqual({ x: 2, y: 2, direction: 'up' });
		expect(draft.target).toEqual({ x: 2, y: 0 });
	});

	test('ice stays under the player and target, other kinds become ground', () => {
		const icy = draftCellsToArray(
			createDraft({
				cells: new Map([
					[cellKey(1, 1), 'ice' as const],
					[cellKey(3, 1), 'ice' as const],
				]),
			}),
		);
		expect(icy[1 * 5 + 1]).toBe('ice');
		expect(icy[1 * 5 + 3]).toBe('ice');

		const blocked = draftCellsToArray(
			createDraft({
				cells: new Map([
					[cellKey(1, 1), 'lava' as const],
					[cellKey(3, 1), 'wall' as const],
					[cellKey(0, 0), 'hole' as const],
				]),
			}),
		);
		expect(blocked[1 * 5 + 1]).toBe('ground');
		expect(blocked[1 * 5 + 3]).toBe('ground');
		expect(blocked[0]).toBe('hole');
		expect(blocked[1 * 5 + 2]).toBe('ground');
	});

	test('ice under the player and target survives the share bridge', () => {
		const draft = createDraft({
			cells: new Map([
				[cellKey(1, 1), 'ice' as const],
				[cellKey(3, 1), 'ice' as const],
			]),
		});
		const prepared = prepareDraft(draft, createSolution(WINNING_SOLUTION));

		expect(prepared.status).toBe('ready');
		if (prepared.status !== 'ready') {
			return;
		}

		expect(prepared.input.cells[1 * 5 + 1]).toBe('ice');
		expect(prepared.input.cells[1 * 5 + 3]).toBe('ice');
	});

	test('unpainted cells default to ground', () => {
		const array = draftCellsToArray(createDraft());
		expect(array).toHaveLength(25);
		expect(array.filter((kind) => kind === 'ground')).toHaveLength(25);
	});
});

describe('paintDraft', () => {
	test('paints and erases block kinds', () => {
		let draft = createDraft();

		draft = paintDraft(draft, 'wall', { x: 2, y: 2 });
		expect(draft.cells.get(cellKey(2, 2))).toBe('wall');

		draft = paintDraft(draft, 'ground', { x: 2, y: 2 });
		expect(draft.cells.has(cellKey(2, 2))).toBe(false);
	});

	test('moves the player and target, swapping them when painted onto each other', () => {
		let draft = createDraft();

		draft = paintDraft(draft, 'player', { x: 1, y: 2 });
		expect(draft.player).toEqual({ x: 1, y: 2, direction: 'right' });

		draft = paintDraft(draft, 'player', { x: 3, y: 1 });
		expect(draft.player).toEqual({ x: 3, y: 1, direction: 'right' });
		expect(draft.target).toEqual({ x: 1, y: 2 });

		draft = paintDraft(draft, 'target', { x: 3, y: 1 });
		expect(draft.target).toEqual({ x: 3, y: 1 });
		expect(draft.player).toEqual({ x: 1, y: 2, direction: 'right' });
	});
});

describe('draft payload conversion', () => {
	test('round-trips a draft through the codec payload', () => {
		const draft = createDraft({
			title: 'Round trip',
			author: 'Ana',
			terrain: 'frost',
			cells: new Map([[cellKey(2, 2), 'lava' as const]]),
			player: { x: 0, y: 0, direction: 'down' },
			target: { x: 4, y: 4 },
		});

		const encoded = encodeLevelPayload(draftToPayload(draft, WINNING_SOLUTION), SALT);
		expect(encoded).not.toBeNull();

		const decoded = decodeLevelPayload(encoded ?? '');
		expect(decoded).not.toBeNull();

		const restored = decoded === null ? null : draftFromPayload(decoded);
		expect(restored?.title).toBe('Round trip');
		expect(restored?.author).toBe('Ana');
		expect(restored?.terrain).toBe('frost');
		expect(restored?.cells.get(cellKey(2, 2))).toBe('lava');
		expect(restored?.player).toEqual({ x: 0, y: 0, direction: 'down' });
		expect(restored?.target).toEqual({ x: 4, y: 4 });
	});
});

describe('buildLevelData', () => {
	const collectedActions = actionNames.filter((name) => name !== 'start');

	test('derives the identity, palette and counts from the shared level', () => {
		const levelData = buildLevelData(
			{
				width: 5,
				height: 5,
				terrain: 'forest',
				player: { x: 1, y: 1, direction: 'right' },
				target: { x: 3, y: 1 },
				cells: draftCellsToArray(createDraft()),
				title: 'Counted level',
				author: '',
				solution: WINNING_SOLUTION,
			},
			{ id: 'shared-abc', slug: 'shared-abc' },
		);

		expect(levelData).not.toBeNull();
		if (levelData === null) {
			return;
		}

		expect(levelData.id).toBe('shared-abc');
		expect(levelData.slug).toBe('shared-abc');
		expect(levelData.title).toEqual({ en: 'Counted level' });
		expect(levelData.allowedActions).toEqual(collectedActions);
		expect(levelData.defaultActions).toEqual([]);

		const simulationSequence = toSimulationSequence(levelData.optimalSolution);
		expect(levelData.optimalActionCount).toBe(countBlocks(simulationSequence));
		expect(levelData.optimalIterations).toBe(
			countExecutedCycles(simulationSequence, levelData, { x: 1, y: 1, direction: 'right' }),
		);
		expect(
			runSequence(simulationSequence, levelData, { x: 1, y: 1, direction: 'right' }).outcome,
		).toBe('won');
	});

	test('looks follow the theme, ice stays ice and traps borrow the ground theme', () => {
		expect(looksForTerrain('forest')).toEqual({
			ground: { terrain: 'forest' },
			wall: { terrain: 'forest' },
			ice: { terrain: 'ice' },
			lava: { terrain: 'forest' },
			hole: { terrain: 'forest' },
		});
	});

	test('returns null for programs too expensive to simulate', () => {
		const levelData = buildLevelData(
			{
				width: 5,
				height: 5,
				terrain: 'default',
				player: { x: 1, y: 1, direction: 'right' },
				target: { x: 3, y: 1 },
				cells: draftCellsToArray(createDraft()),
				title: 'Bomb',
				author: '',
				solution: [
					{
						action: 'for',
						count: 99,
						children: [
							{
								action: 'for',
								count: 99,
								children: [
									{
										action: 'for',
										count: 99,
										children: [{ action: 'move-forward' }],
									},
								],
							},
						],
					},
				],
			},
			{ id: 'bomb', slug: 'bomb' },
		);

		expect(levelData).toBeNull();
	});
});

describe('prepareDraft', () => {
	test('prepares an unnamed draft for a try, with a placeholder title', () => {
		const prepared = prepareDraft(createDraft({ title: '' }), createSolution(WINNING_SOLUTION));

		expect(prepared.status).toBe('ready');
		if (prepared.status !== 'ready') {
			return;
		}

		expect(prepared.input.title).toBe('Draft');
		expect(prepared.levelData.width).toBe(5);
	});

	test('prepares a losing program too, because trying is how it is checked', () => {
		const prepared = prepareDraft(createDraft(), createSolution([{ action: 'move-forward' }]));

		expect(prepared.status).toBe('ready');
	});

	test('reports the reasons a program cannot run at all', () => {
		expect(prepareDraft(createDraft(), createSolution([]))).toEqual({ status: 'empty-solution' });

		const bomb: OptimalSolutionItem[] = [
			{
				action: 'for',
				count: 99,
				children: [
					{
						action: 'for',
						count: 99,
						children: [
							{
								action: 'for',
								count: 99,
								children: [{ action: 'move-forward' }],
							},
						],
					},
				],
			},
		];

		expect(prepareDraft(createDraft(), createSolution(bomb))).toEqual({ status: 'too-heavy' });
	});
});

describe('validateBuilderDraft', () => {
	test('reports an empty solution', () => {
		expect(validateBuilderDraft(createDraft(), createSolution([]), SALT)).toEqual({
			status: 'empty-solution',
		});
	});

	test('reports a missing name before validating the program', () => {
		expect(
			validateBuilderDraft(createDraft({ title: '  ' }), createSolution(WINNING_SOLUTION), SALT),
		).toEqual({ status: 'no-name' });
	});

	test('reports too many authored blocks', () => {
		const moves: OptimalSolutionItem[] = Array.from({ length: 21 }, () => ({
			action: 'move-forward',
		}));
		expect(validateBuilderDraft(createDraft(), createSolution(moves), SALT)).toEqual({
			status: 'too-many-blocks',
		});
	});

	test('reports a solution shape the level format cannot store', () => {
		const broken: OptimalSolutionItem[] = [{ action: 'for', count: 2, children: [] }];
		expect(validateBuilderDraft(createDraft(), createSolution(broken), SALT)).toEqual({
			status: 'shape',
		});
	});

	test('reports a program that does not win, with the outcome', () => {
		const short: OptimalSolutionItem[] = [{ action: 'move-forward' }];
		expect(validateBuilderDraft(createDraft(), createSolution(short), SALT)).toEqual({
			status: 'not-won',
			outcome: 'not-reached',
		});
	});

	test('reports a program too heavy to validate', () => {
		const bomb: OptimalSolutionItem[] = [
			{
				action: 'for',
				count: 99,
				children: [
					{
						action: 'for',
						count: 99,
						children: [
							{
								action: 'for',
								count: 99,
								children: [{ action: 'move-forward' }],
							},
						],
					},
				],
			},
		];

		expect(validateBuilderDraft(createDraft(), createSolution(bomb), SALT)).toEqual({
			status: 'too-heavy',
		});
	});

	test('a winning level validates and decodes back into the same playable level', () => {
		const result = validateBuilderDraft(createDraft(), createSolution(WINNING_SOLUTION), SALT);

		expect(result.status).toBe('valid');
		if (result.status !== 'valid') {
			return;
		}

		const restored = levelFromPayload(result.encoded);
		expect(restored).not.toBeNull();
		expect(restored?.level.title).toBe('Test level');
		expect(restored?.levelData.slug).toBe(`shared-${result.hash}`);

		if (restored === null) {
			return;
		}

		const run = runSequence(
			toSimulationSequence(restored.levelData.optimalSolution),
			restored.levelData,
			{
				x: restored.levelData.player.x,
				y: restored.levelData.player.y,
				direction: restored.levelData.player.direction,
			},
		);
		expect(run.outcome).toBe('won');
	});

	test('levelFromPayload returns null for junk links', () => {
		expect(levelFromPayload('nope')).toBeNull();
		expect(levelFromPayload('')).toBeNull();
	});

	test('prepareDraft reports a board the level format cannot store', () => {
		expect(
			prepareDraft(createDraft({ width: 17, height: 17 }), createSolution(WINNING_SOLUTION)),
		).toEqual({ status: 'shape' });
	});

	test('levelFromPayload rejects a decodable payload with an invalid level shape', () => {
		const encoded = encodeLevelPayload(
			{
				width: 1,
				height: 1,
				terrain: 'default',
				player: { x: 0, y: 0, direction: 'right' },
				target: { x: 0, y: 0 },
				cells: ['ground'],
				title: 'Tiny',
				author: '',
				solution: [{ action: 'move-forward' }],
			},
			SALT,
		);

		expect(encoded).not.toBeNull();
		expect(levelFromPayload(encoded ?? '')).toBeNull();
	});

	test('levelFromPayload rejects a level too heavy to build', () => {
		const encoded = encodeLevelPayload(
			{
				width: 3,
				height: 3,
				terrain: 'default',
				player: { x: 0, y: 1, direction: 'right' },
				target: { x: 2, y: 1 },
				cells: ['wall', 'wall', 'wall', 'ground', 'ground', 'ground', 'wall', 'wall', 'wall'],
				title: 'Heavy',
				author: '',
				solution: [
					{
						action: 'for',
						count: 99,
						children: [
							{
								action: 'for',
								count: 99,
								children: [
									{
										action: 'for',
										count: 99,
										children: [{ action: 'move-forward' }],
									},
								],
							},
						],
					},
				],
			},
			SALT,
		);

		expect(encoded).not.toBeNull();
		expect(levelFromPayload(encoded ?? '')).toBeNull();
	});
});
