import type { ActionName } from '../../domain/actions';
import type { OptimalSolutionItem, SequenceItem } from '../../schemas/sequence.schema';
import { toStoredSequence } from '../level/stored-sequence';

/**
 * Conversions between the authored solution shape and the UI sequence the
 * builder edits with the normal block palette. Labels arrive as a lookup so
 * this module stays free of the block UI and testable on its own; the stored
 * shape and the authored solution shape are the same data minus the display
 * fields, so `toStoredSequence` is reused for the way back.
 */

type LabelForAction = (action: ActionName) => string;

function createBuilderStartItem(labelForAction: LabelForAction): SequenceItem {
	return {
		kind: 'algorithm',
		id: 'start',
		action: 'start',
		label: labelForAction('start'),
		default: true,
		movable: false,
	};
}

function optimalItemsToSequenceItems(
	items: readonly OptimalSolutionItem[],
	labelForAction: LabelForAction,
): SequenceItem[] {
	let nextId = 0;

	function convert(list: readonly OptimalSolutionItem[]): SequenceItem[] {
		return list.map((item) => {
			nextId += 1;
			const id = `builder-${nextId}`;
			const base: SequenceItem = {
				kind: 'algorithm',
				id,
				action: item.action,
				label: labelForAction(item.action),
				default: false,
				movable: true,
			};

			const children = item.children === undefined ? undefined : convert(item.children);
			const elseChildren = item.elseChildren === undefined ? undefined : convert(item.elseChildren);
			const branches =
				item.branches === undefined
					? undefined
					: item.branches.map((branch) => ({
							condition: branch.condition,
							children: convert(branch.children),
						}));

			return {
				...base,
				...(item.count === undefined ? {} : { count: item.count }),
				...(item.condition === undefined ? {} : { condition: item.condition }),
				...(children === undefined ? {} : { children }),
				...(elseChildren === undefined ? {} : { elseChildren }),
				...(branches === undefined ? {} : { branches }),
			};
		});
	}

	return convert(items);
}

/** The UI sequence as the authored solution shape, the `start` head aside. */
function sequenceItemsToStoredSolution(
	items: readonly SequenceItem[],
): readonly OptimalSolutionItem[] {
	return toStoredSequence(items);
}

export { createBuilderStartItem, optimalItemsToSequenceItems, sequenceItemsToStoredSolution };
export type { LabelForAction };
