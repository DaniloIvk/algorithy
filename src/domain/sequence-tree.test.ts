import { describe, expect, test } from 'bun:test';
import {
	branchZoneId,
	clampInsertIndex,
	elseZoneId,
	findItem,
	getZoneItems,
	getZoneLength,
	insertAt,
	isMovableAt,
	moveWithinZone,
	removeAt,
	sortSwitchBranches,
	updateItem,
	updateZone,
} from './sequence-tree';
import type { SequenceItem } from '../schemas/sequence.schema';

function makeItem(
	overrides: Partial<SequenceItem> & Pick<SequenceItem, 'id' | 'action'>,
): SequenceItem {
	return {
		kind: 'algorithm',
		label: overrides.action,
		default: false,
		movable: true,
		...overrides,
	};
}

function makeTree(): SequenceItem[] {
	const turnThen = makeItem({ id: 'turn-then', action: 'turn-right' });
	const turnElse = makeItem({ id: 'turn-else', action: 'turn-left' });
	const nestedIf = makeItem({
		id: 'if-1',
		action: 'if',
		condition: 'path-ahead',
		children: [turnThen],
		elseChildren: [turnElse],
	});
	const insideFor = makeItem({ id: 'inside-for', action: 'move-forward' });
	const forItem = makeItem({
		id: 'for-1',
		action: 'for',
		count: 3,
		children: [insideFor, nestedIf],
	});
	const branchMove = makeItem({ id: 'branch-move', action: 'move-forward' });
	const branchTurn = makeItem({ id: 'branch-turn', action: 'turn-left' });
	const switchItem = makeItem({
		id: 'switch-1',
		action: 'switch',
		branches: [
			{ condition: 'path-left', children: [branchMove] },
			{ condition: 'default', children: [branchTurn] },
		],
	});
	const start = makeItem({ id: 'start', action: 'start', movable: false });
	const tail = makeItem({ id: 'tail', action: 'move-forward' });

	return [start, forItem, switchItem, tail];
}

describe('findItem', () => {
	test('finds items at every depth', () => {
		const tree = makeTree();
		for (const id of [
			'start',
			'for-1',
			'inside-for',
			'if-1',
			'turn-then',
			'switch-1',
			'branch-turn',
			'turn-else',
			'tail',
		]) {
			expect(findItem(tree, id)?.id).toBe(id);
		}
	});

	test('returns null for an unknown id', () => {
		expect(findItem(makeTree(), 'missing')).toBeNull();
	});
});

describe('getZoneItems / getZoneLength / isMovableAt', () => {
	test('resolves root, children, else and branch zones', () => {
		const tree = makeTree();
		expect(getZoneItems(tree, 'root')?.length).toBe(4);
		expect(getZoneItems(tree, 'for-1')?.length).toBe(2);
		expect(getZoneItems(tree, elseZoneId('if-1'))?.length).toBe(1);
		expect(getZoneItems(tree, branchZoneId('switch-1', 0))?.length).toBe(1);
		expect(getZoneItems(tree, 'nope')).toBeNull();
		expect(getZoneItems(tree, 'switch-1:branch-abc')).toBeNull();
	});

	test('reports zone length and movable state', () => {
		const tree = makeTree();
		expect(getZoneLength(tree, 'root')).toBe(4);
		expect(getZoneLength(tree, 'nope')).toBe(0);
		expect(isMovableAt(tree, 'root', 0)).toBe(false);
		expect(isMovableAt(tree, 'root', 1)).toBe(true);
		expect(isMovableAt(tree, 'root', 99)).toBeNull();
	});
});

describe('updateItem', () => {
	test('updates a deeply nested item without touching the original', () => {
		const tree = makeTree();
		const next = updateItem(tree, 'for-1', (item) => ({ ...item, count: 7 }));
		expect(findItem(next, 'for-1')?.count).toBe(7);
		expect(findItem(tree, 'for-1')?.count).toBe(3);
	});

	test('preserves untouched branch references', () => {
		const tree = makeTree();
		const next = updateItem(tree, 'inside-for', (item) => ({ ...item, label: 'changed' }));
		expect(findItem(next, 'inside-for')?.label).toBe('changed');
		expect(next[2]).toBe(tree[2]);
	});

	test('updates an item inside a switch branch', () => {
		const tree = makeTree();
		const next = updateItem(tree, 'branch-move', (item) => ({ ...item, label: 'changed' }));

		expect(findItem(next, 'branch-move')?.label).toBe('changed');
		expect(findItem(tree, 'branch-move')?.label).toBe('move-forward');
		expect(next[1]).toBe(tree[1]);
	});
});

describe('updateZone', () => {
	test('replaces the root array', () => {
		const tree = makeTree();
		const next = updateZone(tree, 'root', (current) => [...current].reverse());
		expect(next.map((item) => item.id)).toEqual(['tail', 'switch-1', 'for-1', 'start']);
		expect(tree.map((item) => item.id)).toEqual(['start', 'for-1', 'switch-1', 'tail']);
	});

	test('replaces a nested branch zone', () => {
		const tree = makeTree();
		const extra = makeItem({ id: 'extra', action: 'move-forward' });
		const next = updateZone(tree, branchZoneId('switch-1', 0), (current) => [...current, extra]);
		expect(getZoneItems(next, branchZoneId('switch-1', 0))?.map((item) => item.id)).toEqual([
			'branch-move',
			'extra',
		]);
	});

	test('leaves the tree alone for an out-of-range branch index', () => {
		const tree = makeTree();
		const next = updateZone(tree, branchZoneId('switch-1', 9), (current) => [...current]);

		expect(next.map((item) => item.id)).toEqual(tree.map((item) => item.id));
	});

	test('reaches a target nested inside an else branch', () => {
		const tree = makeTree();
		const next = updateZone(tree, 'turn-else', (current) => [
			...current,
			makeItem({ id: 'x', action: 'move-forward' }),
		]);

		expect(findItem(next, 'turn-else')?.children?.[0]?.id).toBe('x');
	});

	test('reaches a target nested inside a switch branch body', () => {
		const tree = makeTree();
		const next = updateZone(tree, 'branch-move', (current) => [...current]);

		expect(getZoneLength(next, branchZoneId('switch-1', 0))).toBe(1);
	});
});

describe('removeAt', () => {
	test('removes from root and returns the item', () => {
		const tree = makeTree();
		const { sequence, removed } = removeAt(tree, 'root', 3);
		expect(removed?.id).toBe('tail');
		expect(sequence.map((item) => item.id)).toEqual(['start', 'for-1', 'switch-1']);
	});

	test('removes a nested item inside a for', () => {
		const tree = makeTree();
		const { sequence, removed } = removeAt(tree, 'for-1', 1);
		expect(removed?.id).toBe('if-1');
		expect(getZoneItems(sequence, 'for-1')?.map((item) => item.id)).toEqual(['inside-for']);
	});

	test('removes from an else and a branch zone', () => {
		const tree = makeTree();
		expect(removeAt(tree, elseZoneId('if-1'), 0).removed?.id).toBe('turn-else');
		expect(removeAt(tree, branchZoneId('switch-1', 1), 0).removed?.id).toBe('branch-turn');
	});

	test('reports no removal for an unknown zone', () => {
		const { removed } = removeAt(makeTree(), 'missing', 0);
		expect(removed).toBeUndefined();
	});
});

describe('insertAt', () => {
	test('keeps locked items ahead of the insert', () => {
		const tree = makeTree();
		const extra = makeItem({ id: 'extra', action: 'move-forward' });
		const next = insertAt(tree, 'root', 0, extra);
		expect(next.map((item) => item.id)).toEqual(['start', 'extra', 'for-1', 'switch-1', 'tail']);
	});

	test('inserts into a nested children zone at the requested index', () => {
		const tree = makeTree();
		const extra = makeItem({ id: 'extra', action: 'move-forward' });
		const next = insertAt(tree, 'for-1', 1, extra);
		expect(getZoneItems(next, 'for-1')?.map((item) => item.id)).toEqual([
			'inside-for',
			'extra',
			'if-1',
		]);
	});
});

describe('clampInsertIndex', () => {
	test('never lets a drop land ahead of the locked head', () => {
		const tree = makeTree();
		expect(clampInsertIndex(tree, 0)).toBe(1);
	});

	test('counts every locked item, not just the head', () => {
		const start = makeItem({ id: 'start', action: 'start', movable: false });
		const lockedDefault = makeItem({
			id: 'default',
			action: 'move-forward',
			movable: false,
			default: true,
		});
		const tail = makeItem({ id: 'tail', action: 'move-forward' });
		const zone = [start, lockedDefault, tail];

		expect(clampInsertIndex(zone, 0)).toBe(2);
		expect(clampInsertIndex(zone, 2)).toBe(2);
		expect(clampInsertIndex(zone, 3)).toBe(3);
	});

	test('leaves an index that already sits past the locks', () => {
		const tree = makeTree();
		expect(clampInsertIndex(tree, 2)).toBe(2);
	});
});

describe('moveWithinZone', () => {
	test('reorders within root while respecting the locked prefix', () => {
		const tree = makeTree();
		const next = moveWithinZone(tree, 'root', 3, 1);
		expect(next.map((item) => item.id)).toEqual(['start', 'tail', 'for-1', 'switch-1']);
	});

	test('is a no-op for adjacent positions', () => {
		const tree = makeTree();
		const next = moveWithinZone(tree, 'root', 1, 2);
		expect(next.map((item) => item.id)).toEqual(['start', 'for-1', 'switch-1', 'tail']);
	});

	test('ignores an out-of-range source index', () => {
		const tree = makeTree();
		const next = moveWithinZone(tree, 'root', 99, 1);

		expect(next.map((item) => item.id)).toEqual(tree.map((item) => item.id));
	});
});

describe('sortSwitchBranches', () => {
	test('pushes the default branch last', () => {
		const sorted = sortSwitchBranches([
			{ condition: 'default', children: [] },
			{ condition: 'path-ahead', children: [] },
			{ condition: 'path-left', children: [] },
		]);
		expect(sorted.map((branch) => branch.condition)).toEqual([
			'path-ahead',
			'path-left',
			'default',
		]);
	});
});
