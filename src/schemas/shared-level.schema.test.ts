import { describe, expect, test } from 'bun:test';
import { parseSharedLevel } from './shared-level.schema';

/**
 * The shared level boundary. Everything that arrives through a link passes
 * through here first: sizes, titles, the author cap, map dimensions, the
 * player and target positions, and a non-empty authored solution.
 */

function createSharedLevel(
	overrides: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
	return {
		width: 3,
		height: 3,
		terrain: 'forest',
		player: { x: 0, y: 1, direction: 'right' },
		target: { x: 2, y: 1 },
		cells: ['wall', 'ground', 'ground', 'wall', 'ground', 'ground', 'wall', 'wall', 'wall'],
		title: 'Little level',
		author: '',
		solution: [{ action: 'move-forward' }, { action: 'move-forward' }],
		...overrides,
	};
}

describe('parseSharedLevel', () => {
	test('accepts a level and defaults the direction', () => {
		const level = parseSharedLevel(createSharedLevel({ player: { x: 0, y: 1 } }));

		expect(level).not.toBeNull();
		expect(level?.player.direction).toBe('right');
		expect(level?.terrain).toBe('forest');
		expect(level?.author).toBe('');
	});

	test('rejects sizes outside the builder limits', () => {
		expect(parseSharedLevel(createSharedLevel({ width: 2, height: 2 }))).toBeNull();
		expect(parseSharedLevel(createSharedLevel({ width: 17, height: 17 }))).toBeNull();
		expect(parseSharedLevel(createSharedLevel({ width: 3.5 }))).toBeNull();
	});

	test('rejects titles and authors over their caps, and empty titles', () => {
		expect(parseSharedLevel(createSharedLevel({ title: '' }))).toBeNull();
		expect(parseSharedLevel(createSharedLevel({ title: 'x'.repeat(61) }))).toBeNull();
		expect(parseSharedLevel(createSharedLevel({ author: 'x'.repeat(41) }))).toBeNull();
	});

	test('rejects a map that does not match its size', () => {
		expect(parseSharedLevel(createSharedLevel({ cells: ['ground'] }))).toBeNull();
	});

	test('rejects unknown block kinds', () => {
		const cells = createSharedLevel()['cells'] as string[];
		expect(
			parseSharedLevel(createSharedLevel({ cells: [...cells.slice(0, 8), 'tree'] })),
		).toBeNull();
	});

	test('rejects player or target outside the map', () => {
		expect(parseSharedLevel(createSharedLevel({ player: { x: 3, y: 1 } }))).toBeNull();
		expect(parseSharedLevel(createSharedLevel({ target: { x: 1, y: -1 } }))).toBeNull();
	});

	test('rejects an empty or malformed solution', () => {
		expect(parseSharedLevel(createSharedLevel({ solution: [] }))).toBeNull();
		expect(
			parseSharedLevel(
				createSharedLevel({ solution: [{ action: 'for', count: 2, children: [] }] }),
			),
		).toBeNull();
		expect(
			parseSharedLevel(
				createSharedLevel({ solution: [{ action: 'while', children: [{ action: 'dance' }] }] }),
			),
		).toBeNull();
	});
});
