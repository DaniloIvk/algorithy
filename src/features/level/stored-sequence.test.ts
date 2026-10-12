import { describe, expect, test } from 'bun:test';
import { fromStoredSequence, toStoredSequence } from './stored-sequence';
import { actionNames, type ActionName } from '../../domain/actions';
import type { StoredSequenceItem } from '../../schemas/persistence.schema';
import type { SequenceItem } from '../../schemas/sequence.schema';

function labelForAction(action: ActionName): string {
	return `${action} label`;
}

/** Every action available, for the tests that are not about the palette. */
const ALL_ACTIONS: readonly ActionName[] = actionNames;

/**
 * Load a stored program with every action allowed unless the test says
 * otherwise, so the palette rule stays out of the way of the other cases.
 */
function restore(
	storedItems: readonly StoredSequenceItem[],
	defaultItems: readonly SequenceItem[],
	allowedActions: readonly ActionName[] = ALL_ACTIONS,
): SequenceItem[] | null {
	return fromStoredSequence(storedItems, defaultItems, allowedActions, labelForAction);
}

type SequenceItemOptions = {
	readonly id?: string;
	readonly default?: boolean;
	readonly movable?: boolean;
	readonly count?: number;
	readonly condition?: SequenceItem['condition'];
	readonly modifiable?: boolean;
	readonly children?: readonly SequenceItem[];
	readonly elseChildren?: readonly SequenceItem[];
	readonly branches?: SequenceItem['branches'];
};

function createSequenceItem(
	action: SequenceItem['action'],
	options: SequenceItemOptions = {},
): SequenceItem {
	return {
		kind: 'algorithm',
		id: options.id ?? `${action}-item`,
		action,
		label: `${action} label`,
		default: options.default ?? false,
		movable: options.movable ?? true,
		...(options.count === undefined ? {} : { count: options.count }),
		...(options.condition === undefined ? {} : { condition: options.condition }),
		...(options.modifiable === undefined ? {} : { modifiable: options.modifiable }),
		...(options.children === undefined ? {} : { children: options.children }),
		...(options.elseChildren === undefined ? {} : { elseChildren: options.elseChildren }),
		...(options.branches === undefined ? {} : { branches: options.branches }),
	};
}

describe('stored-sequence', () => {
	test('stores the sequence structure plus the default flag, nothing internal', () => {
		const startItem = createSequenceItem('start', { id: 'start', default: true, movable: false });
		const lockedItem = createSequenceItem('move-forward', {
			id: 'default-0',
			default: true,
			movable: false,
		});
		const forItem = createSequenceItem('for', {
			id: 'for-1',
			count: 3,
			modifiable: false,
			children: [createSequenceItem('move-forward', { id: 'move-1' })],
		});

		expect(toStoredSequence([startItem, lockedItem, forItem])).toEqual([
			{ action: 'move-forward', default: true },
			{ action: 'for', count: 3, children: [{ action: 'move-forward' }] },
		]);
	});

	test('keeps conditions, nested branches and empty containers', () => {
		const ifItem = createSequenceItem('if', {
			condition: 'path-left',
			children: [createSequenceItem('turn-left')],
			elseChildren: [],
		});
		const switchItem = createSequenceItem('switch', {
			branches: [
				{ condition: 'path-ahead', children: [createSequenceItem('move-forward')] },
				{ condition: 'default', children: [] },
			],
		});

		expect(toStoredSequence([ifItem, switchItem])).toEqual([
			{
				action: 'if',
				condition: 'path-left',
				children: [{ action: 'turn-left' }],
				elseChildren: [],
			},
			{
				action: 'switch',
				branches: [
					{ condition: 'path-ahead', children: [{ action: 'move-forward' }] },
					{ condition: 'default', children: [] },
				],
			},
		]);
	});

	test('merges flagged items with the level defaults', () => {
		const defaultSwitch = createSequenceItem('switch', {
			id: 'default-0-c-0',
			default: true,
			movable: true,
			modifiable: false,
			branches: [
				{ condition: 'path-left', children: [] },
				{ condition: 'path-right', children: [] },
			],
		});
		const defaultWhile = createSequenceItem('while', {
			id: 'default-0',
			default: true,
			movable: false,
			modifiable: false,
			children: [defaultSwitch],
		});

		const rebuilt = restore(
			[
				{
					action: 'while',
					default: true,
					children: [
						{
							action: 'switch',
							default: true,
							branches: [
								{ condition: 'path-left', children: [{ action: 'turn-left' }] },
								{ condition: 'path-right', children: [{ action: 'turn-right' }] },
							],
						},
						{ action: 'move-forward' },
					],
				},
			],
			[createSequenceItem('start'), defaultWhile],
		);

		const rebuiltWhile = rebuilt?.[0];
		const rebuiltSwitch = rebuiltWhile?.children?.[0];
		const rebuiltUserItem = rebuiltWhile?.children?.[1];

		expect(rebuiltWhile).toMatchObject({
			id: 'default-0',
			action: 'while',
			default: true,
			movable: false,
			modifiable: false,
		});
		expect(rebuiltSwitch).toMatchObject({
			id: 'default-0-c-0',
			action: 'switch',
			default: true,
			movable: true,
			modifiable: false,
		});
		expect(rebuiltSwitch?.branches?.[0]?.condition).toBe('path-left');
		expect(rebuiltSwitch?.branches?.[0]?.children?.[0]?.action).toBe('turn-left');
		expect(rebuiltUserItem).toMatchObject({
			id: 'stored-0-c-1',
			action: 'move-forward',
			default: false,
			movable: true,
		});
		expect(rebuiltUserItem?.modifiable).toBeUndefined();
	});

	test('matches several defaults of one action in traversal order', () => {
		const firstDefault = createSequenceItem('move-forward', {
			id: 'default-0',
			default: true,
			movable: false,
		});
		const secondDefault = createSequenceItem('move-forward', {
			id: 'default-1',
			default: true,
			movable: true,
			modifiable: false,
		});

		const rebuilt = restore(
			[
				{ action: 'move-forward', default: true },
				{ action: 'move-forward', default: true },
			],
			[firstDefault, secondDefault],
		);

		expect(rebuilt?.[0]).toMatchObject({ id: 'default-0', movable: false });
		expect(rebuilt?.[1]).toMatchObject({ id: 'default-1', movable: true, modifiable: false });
	});

	test('discards a program whose default flag has no matching default', () => {
		const defaultItem = createSequenceItem('move-forward', {
			id: 'default-0',
			default: true,
			movable: false,
		});

		expect(restore([{ action: 'for', default: true, children: [] }], [defaultItem])).toBe(null);

		expect(
			restore(
				[
					{
						action: 'while',
						default: true,
						children: [{ action: 'switch', default: true, branches: [] }],
					},
				],
				[createSequenceItem('while', { id: 'default-0', default: true, movable: false })],
			),
		).toBe(null);
	});

	test('discards a program that omits the flag of a level default', () => {
		const defaultItem = createSequenceItem('move-forward', {
			id: 'default-0',
			default: true,
			movable: false,
		});

		// Level 1's default is one locked move-forward; a stored program of two
		// plain move-forwards never flags it.
		expect(restore([{ action: 'move-forward' }, { action: 'move-forward' }], [defaultItem])).toBe(
			null,
		);
	});

	test('discards an empty stored program when the level has defaults', () => {
		const defaultItem = createSequenceItem('move-forward', {
			id: 'default-0',
			default: true,
			movable: false,
		});

		expect(restore([], [defaultItem])).toBe(null);
	});

	test('discards a program whose nested default is not flagged', () => {
		const defaultWhile = createSequenceItem('while', {
			id: 'default-0',
			default: true,
			movable: false,
			children: [
				createSequenceItem('switch', { id: 'default-0-c-0', default: true, movable: true }),
			],
		});

		expect(
			restore(
				[{ action: 'while', default: true, children: [{ action: 'move-forward' }] }],
				[defaultWhile],
			),
		).toBe(null);
	});

	test('discards a program that uses an action the level no longer offers', () => {
		// Level 8 once offered `while`; a program saved back then must not load
		// after the palette dropped it.
		const allowedActions: readonly ActionName[] = [
			'move-forward',
			'turn-left',
			'turn-right',
			'for',
		];

		expect(
			restore(
				[
					{
						action: 'while',
						children: [{ action: 'move-forward' }],
					},
				],
				[],
				allowedActions,
			),
		).toBe(null);
	});

	test('discards a program that uses a dropped action inside a container', () => {
		const allowedActions: readonly ActionName[] = ['move-forward', 'if'];

		expect(
			restore(
				[
					{
						action: 'if',
						condition: 'path-ahead',
						children: [{ action: 'while', children: [{ action: 'move-forward' }] }],
					},
				],
				[],
				allowedActions,
			),
		).toBe(null);
	});

	test('keeps a program that only uses offered actions', () => {
		const allowedActions: readonly ActionName[] = ['move-forward', 'if'];

		const rebuilt = restore(
			[
				{
					action: 'if',
					condition: 'path-right',
					children: [{ action: 'move-forward' }],
				},
			],
			[],
			allowedActions,
		);

		expect(rebuilt).toHaveLength(1);
		expect(rebuilt?.[0]?.action).toBe('if');
		expect(rebuilt?.[0]?.children?.[0]?.action).toBe('move-forward');
	});

	test('keeps a program that flags the default and adds plain blocks after it', () => {
		const defaultItem = createSequenceItem('move-forward', {
			id: 'default-0',
			default: true,
			movable: false,
		});

		const rebuilt = restore(
			[{ action: 'move-forward', default: true }, { action: 'move-forward' }],
			[defaultItem],
		);

		expect(rebuilt).toHaveLength(2);
		expect(rebuilt?.[0]).toMatchObject({ id: 'default-0', default: true, movable: false });
		expect(rebuilt?.[1]).toMatchObject({ id: 'stored-1', default: false, movable: true });
	});

	test('rebuilds plain items as editable user blocks', () => {
		const rebuilt = restore(
			[
				{
					action: 'for',
					count: 2,
					children: [{ action: 'move-forward' }],
				},
			],
			[],
		);

		expect(rebuilt).toHaveLength(1);

		const rebuiltFor = rebuilt?.[0];
		expect(rebuiltFor).toMatchObject({
			kind: 'algorithm',
			id: 'stored-0',
			action: 'for',
			label: 'for label',
			default: false,
			movable: true,
			count: 2,
		});
		expect(rebuiltFor?.children?.[0]).toMatchObject({
			id: 'stored-0-c-0',
			action: 'move-forward',
			label: 'move-forward label',
		});
	});

	test('round-trips nested programs', () => {
		const items = [
			createSequenceItem('while', {
				children: [
					createSequenceItem('if', {
						condition: 'path-ahead',
						children: [createSequenceItem('move-forward')],
						elseChildren: [createSequenceItem('turn-right')],
					}),
				],
			}),
		];

		const rebuilt = restore(toStoredSequence(items), []);
		const rebuiltWhile = rebuilt?.[0];
		const rebuiltIf = rebuiltWhile?.children?.[0];

		expect(rebuiltWhile?.action).toBe('while');
		expect(rebuiltIf?.action).toBe('if');
		expect(rebuiltIf?.condition).toBe('path-ahead');
		expect(rebuiltIf?.elseChildren?.[0]?.action).toBe('turn-right');
	});

	test('round-trips the default flag through storage', () => {
		const defaultItem = createSequenceItem('move-forward', {
			id: 'default-0',
			default: true,
			movable: false,
		});

		const stored = toStoredSequence([createSequenceItem('start'), defaultItem]);
		const rebuilt = restore(stored, [defaultItem]);

		expect(stored).toEqual([{ action: 'move-forward', default: true }]);
		expect(rebuilt?.[0]).toMatchObject({ default: true, movable: false, id: 'default-0' });
	});
});
