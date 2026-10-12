import { describe, expect, test } from 'bun:test';
import type { ActionName } from '../../domain/actions';
import type { OptimalSolutionItem } from '../../schemas/sequence.schema';
import { optimalItemsToSequenceItems, sequenceItemsToStoredSolution } from './solution-sequence';

const labelForAction = (action: ActionName): string => action;

const CONTAINER_SOLUTION: readonly OptimalSolutionItem[] = [
	{ action: 'for', count: 2, children: [{ action: 'move-forward' }] },
	{ action: 'while', children: [{ action: 'turn-left' }] },
	{
		action: 'if',
		condition: 'path-ahead',
		children: [{ action: 'move-forward' }],
		elseChildren: [{ action: 'turn-right' }],
	},
	{
		action: 'switch',
		branches: [{ condition: 'default', children: [{ action: 'move-forward' }] }],
	},
];

describe('builder solution conversion', () => {
	test('turns every container shape into a sequence and back', () => {
		const sequence = optimalItemsToSequenceItems(CONTAINER_SOLUTION, labelForAction);

		expect(sequence).toHaveLength(CONTAINER_SOLUTION.length);
		expect(sequenceItemsToStoredSolution(sequence)).toEqual(CONTAINER_SOLUTION);
	});

	test('keeps a leaf action untouched', () => {
		const sequence = optimalItemsToSequenceItems([{ action: 'move-forward' }], labelForAction);

		expect(sequence).toHaveLength(1);
		expect(sequenceItemsToStoredSolution(sequence)).toEqual([{ action: 'move-forward' }]);
	});
});
