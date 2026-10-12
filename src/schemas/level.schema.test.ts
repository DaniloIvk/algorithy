import { describe, expect, test } from 'bun:test';
import { parseLevel } from './level.schema';
import { defaultLooks } from '../domain/blocks';

/**
 * The level boundary. The level suite proves every shipped file parses and
 * wins; these cases pin the rules that keep a level honest: dimensions,
 * allowed actions, the authored counts, and the look defaults.
 */

const VALID_LEVEL_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

function createLevelInput(
	overrides: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
	return {
		id: VALID_LEVEL_ID,
		title: { en: 'Test level' },
		slug: '42',
		width: 3,
		height: 3,
		map: [
			['wall', 'wall', 'wall'],
			['wall', 'ground', 'ground'],
			['wall', 'wall', 'wall'],
		],
		player: { x: 1, y: 1 },
		target: { x: 2, y: 1 },
		allowedActions: ['move-forward', 'turn-right'],
		optimalActionCount: 2,
		optimalIterations: 2,
		optimalSolution: [{ action: 'move-forward' }],
		...overrides,
	};
}

describe('parseLevel', () => {
	test('parses a minimal level and applies the documented defaults', () => {
		const level = parseLevel(createLevelInput());

		expect(level).not.toBeNull();
		expect(level?.slug).toBe('42');
		expect(level?.player.direction).toBe('right');
		expect(level?.defaultActions).toEqual([]);
		expect(level?.optimalIterations).toBe(2n);
	});

	test('builds a look for every block kind, with traps on the ground theme', () => {
		const level = parseLevel(
			createLevelInput({ looks: { ground: { terrain: 'forest' }, wall: { terrain: 'forest' } } }),
		);

		expect(level?.looks.ground).toEqual({ terrain: 'forest' });
		expect(level?.looks.wall).toEqual({ terrain: 'forest' });
		expect(level?.looks.lava).toEqual({ terrain: 'forest' });
		expect(level?.looks.hole).toEqual({ terrain: 'forest' });
		expect(level?.looks.ice).toEqual({ terrain: 'ice' });
	});

	test('falls back to the default looks when a level names none', () => {
		const level = parseLevel(createLevelInput());

		expect(level?.looks.ground).toEqual(defaultLooks.ground);
		expect(level?.looks.ice).toEqual(defaultLooks.ice);
	});

	test('returns null when the map does not match its dimensions', () => {
		expect(parseLevel(createLevelInput({ map: [['wall', 'wall', 'wall']] }))).toBeNull();
		expect(
			parseLevel(
				createLevelInput({
					map: [
						['wall', 'wall', 'wall'],
						['wall', 'ground'],
						['wall', 'wall', 'wall'],
					],
				}),
			),
		).toBeNull();
		expect(
			parseLevel(
				createLevelInput({
					map: [
						['wall', 'wall', 'wall'],
						['wall', 'lava', 'wall'],
						['wall', 'wall', 'tree'],
					],
				}),
			),
		).toBeNull();
	});

	test('returns null for palette, title and count rule breaks', () => {
		expect(parseLevel(createLevelInput({ allowedActions: [] }))).toBeNull();
		expect(
			parseLevel(createLevelInput({ allowedActions: ['move-forward', 'move-forward'] })),
		).toBeNull();
		expect(parseLevel(createLevelInput({ allowedActions: ['dance'] }))).toBeNull();
		expect(parseLevel(createLevelInput({ slug: 'level-one' }))).toBeNull();
		expect(parseLevel(createLevelInput({ title: {} }))).toBeNull();
		expect(parseLevel(createLevelInput({ title: { en: 'x'.repeat(81) } }))).toBeNull();
		expect(parseLevel(createLevelInput({ optimalActionCount: 1 }))).toBeNull();
		expect(parseLevel(createLevelInput({ optimalIterations: 0 }))).toBeNull();
		expect(parseLevel(createLevelInput({ optimalIterations: 3_000_000_001 }))).toBeNull();
		expect(
			parseLevel(createLevelInput({ player: { x: 1, y: 1, direction: 'diagonal' } })),
		).toBeNull();
	});

	test('returns null when defaults or the optimum use an action outside the palette', () => {
		expect(
			parseLevel(
				createLevelInput({
					defaultActions: [{ action: 'while', movable: false }],
				}),
			),
		).toBeNull();

		expect(
			parseLevel(
				createLevelInput({
					optimalSolution: [{ action: 'while', children: [{ action: 'move-forward' }] }],
				}),
			),
		).toBeNull();
	});

	test('returns null for malformed optimal solutions', () => {
		expect(
			parseLevel(
				createLevelInput({ optimalSolution: [{ action: 'for', count: 2, children: [] }] }),
			),
		).toBeNull();
		expect(parseLevel(createLevelInput({ optimalSolution: [{ action: 'start' }] }))).toBeNull();
	});

	test('collects default actions nested under else bodies and switch branches', () => {
		const level = parseLevel(
			createLevelInput({
				allowedActions: ['move-forward', 'turn-right', 'if', 'switch'],
				defaultActions: [
					{
						action: 'if',
						movable: true,
						condition: 'path-ahead',
						children: [{ action: 'move-forward', movable: true }],
						elseChildren: [{ action: 'turn-right', movable: true }],
					},
					{
						action: 'switch',
						movable: true,
						branches: [
							{
								condition: 'default',
								children: [{ action: 'move-forward', movable: true }],
							},
						],
					},
				],
			}),
		);

		expect(level?.defaultActions).toHaveLength(2);
		expect(level?.defaultActions[0]?.elseChildren?.[0]?.action).toBe('turn-right');
		expect(level?.defaultActions[1]?.branches?.[0]?.children?.[0]?.action).toBe('move-forward');
	});
});
