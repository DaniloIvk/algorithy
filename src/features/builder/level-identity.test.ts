import { describe, expect, test } from 'bun:test';
import type { ActionName } from '../../domain/actions';
import type { OptimalSolutionItem } from '../../schemas/sequence.schema';
import type { LevelPayload } from './level-codec';
import { levelContentHash, levelFingerprint } from './level-identity';

const ALL_ACTIONS: readonly ActionName[] = ['move-forward', 'turn-left'];
const MOVES_ONLY: readonly ActionName[] = ['move-forward'];

function payload(overrides: Partial<LevelPayload> = {}): LevelPayload {
	return {
		width: 3,
		height: 3,
		terrain: 'default',
		player: { x: 0, y: 0, direction: 'right' },
		target: { x: 2, y: 2 },
		cells: ['ground', 'ground', 'ground', 'ground', 'wall', 'ground', 'ground', 'ground', 'ground'],
		title: 'Test level',
		author: '',
		solution: [{ action: 'move-forward' }],
		...overrides,
	};
}

describe('levelContentHash', () => {
	test('is stable for the same board', () => {
		expect(levelContentHash(payload(), ALL_ACTIONS)).toBe(levelContentHash(payload(), ALL_ACTIONS));
	});

	test('ignores the title, the author and the creator solution', () => {
		const base = levelContentHash(payload(), ALL_ACTIONS);
		const titled: LevelPayload = { ...payload(), title: 'Other' };
		const authored: LevelPayload = { ...payload(), author: 'Someone' };
		const resolved: LevelPayload = { ...payload(), solution: [{ action: 'turn-left' }] };

		expect(levelContentHash(titled, ALL_ACTIONS)).toBe(base);
		expect(levelContentHash(authored, ALL_ACTIONS)).toBe(base);
		expect(levelContentHash(resolved, ALL_ACTIONS)).toBe(base);
	});

	test('changes with the board or the action palette', () => {
		const base = levelContentHash(payload(), ALL_ACTIONS);

		expect(levelContentHash({ ...payload(), target: { x: 1, y: 1 } }, ALL_ACTIONS)).not.toBe(base);
		expect(levelContentHash({ ...payload(), terrain: 'stone' }, ALL_ACTIONS)).not.toBe(base);
		expect(
			levelContentHash({ ...payload(), cells: ['wall', ...payload().cells.slice(1)] }, ALL_ACTIONS),
		).not.toBe(base);
		expect(levelContentHash(payload(), MOVES_ONLY)).not.toBe(base);
	});
});

describe('levelFingerprint', () => {
	test('is equal for the same authored level', () => {
		expect(levelFingerprint(payload())).toBe(levelFingerprint(payload()));
	});

	test('changes with the title and the creator solution', () => {
		const base = levelFingerprint(payload());

		expect(levelFingerprint({ ...payload(), title: 'Other' })).not.toBe(base);
		expect(levelFingerprint({ ...payload(), solution: [{ action: 'turn-left' }] })).not.toBe(base);
	});

	test('normalises container solutions', () => {
		const nested: OptimalSolutionItem[] = [
			{ action: 'for', count: 3, children: [{ action: 'move-forward' }] },
			{ action: 'while', children: [{ action: 'turn-right' }] },
			{
				action: 'if',
				condition: 'path-ahead',
				children: [{ action: 'move-forward' }],
				elseChildren: [{ action: 'turn-left' }],
			},
			{
				action: 'switch',
				branches: [{ condition: 'default', children: [{ action: 'move-forward' }] }],
			},
		];
		const sparse: OptimalSolutionItem[] = [
			{ action: 'for' },
			{ action: 'while' },
			{ action: 'if' },
			{ action: 'switch' },
		];

		expect(levelFingerprint({ ...payload(), solution: nested })).toBe(
			levelFingerprint({ ...payload(), solution: nested }),
		);
		expect(levelFingerprint({ ...payload(), solution: nested })).not.toBe(
			levelFingerprint({ ...payload(), solution: sparse }),
		);
	});
});
