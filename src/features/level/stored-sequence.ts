import { sortSwitchBranches } from '../../domain/sequence-tree';
import type { ActionName } from '../../domain/actions';
import type { StoredSequenceItem } from '../../schemas/persistence.schema';
import type { SequenceItem, SwitchCondition } from '../../schemas/sequence.schema';

// The stored program holds the whole sequence structure (action, count,
// condition, children, elseChildren, branches) plus a `default` flag that marks
// an item as one of the level's default blocks. Internal fields (movable,
// modifiable, id, label) are never stored: on load a flagged item takes them
// from the matching default block, and a plain item is rebuilt as an editable
// user block. A flagged item without a matching default, or a program that
// leaves one of the level's defaults unflagged, marks the data as tinkered,
// which the caller discards.

type ActionLabelLookup = (action: ActionName) => string;

type DefaultItemLookup = Map<ActionName, SequenceItem[]>;

function toStoredSequenceItem(sequenceItem: SequenceItem): StoredSequenceItem {
	const children = sequenceItem.children?.map((child) => toStoredSequenceItem(child));
	const elseChildren = sequenceItem.elseChildren?.map((child) => toStoredSequenceItem(child));
	const branches = sequenceItem.branches?.map((branch) => ({
		condition: branch.condition,
		children: branch.children.map((child) => toStoredSequenceItem(child)),
	}));

	return {
		action: sequenceItem.action,
		...(sequenceItem.default ? ({ default: true } as const) : {}),
		...(sequenceItem.count === undefined ? {} : { count: sequenceItem.count }),
		...(sequenceItem.condition === undefined ? {} : { condition: sequenceItem.condition }),
		...(children === undefined ? {} : { children }),
		...(elseChildren === undefined ? {} : { elseChildren }),
		...(branches === undefined ? {} : { branches }),
	};
}

/** The `start` head is implicit and is not part of a stored program. */
function toStoredSequence(sequenceItems: readonly SequenceItem[]): StoredSequenceItem[] {
	return sequenceItems
		.filter((sequenceItem) => sequenceItem.action !== 'start')
		.map((sequenceItem) => toStoredSequenceItem(sequenceItem));
}

/**
 * Queues the level's default blocks by action, in traversal order. Several
 * defaults can share one action, so the stored flag plus this order is the
 * whole lookup that brings their internal fields back.
 */
function collectDefaultItems(items: readonly SequenceItem[], lookup: DefaultItemLookup): void {
	for (const item of items) {
		if (item.action === 'start') {
			continue;
		}

		const defaultItemsForAction = lookup.get(item.action);

		if (defaultItemsForAction === undefined) {
			lookup.set(item.action, [item]);
		} else {
			defaultItemsForAction.push(item);
		}

		collectDefaultItems(item.children ?? [], lookup);
		collectDefaultItems(item.elseChildren ?? [], lookup);

		for (const branch of item.branches ?? []) {
			collectDefaultItems(branch.children, lookup);
		}
	}
}

function rebuildItemList(
	storedItems: readonly StoredSequenceItem[],
	idPrefix: string,
	labelForAction: ActionLabelLookup,
	defaultItemLookup: DefaultItemLookup,
): SequenceItem[] | null {
	const rebuiltItems: SequenceItem[] = [];

	for (const [index, storedItem] of storedItems.entries()) {
		const rebuiltItem = createSequenceItemFromStored(
			storedItem,
			`${idPrefix}${index}`,
			labelForAction,
			defaultItemLookup,
		);

		if (rebuiltItem === null) {
			return null;
		}

		rebuiltItems.push(rebuiltItem);
	}

	return rebuiltItems;
}

function rebuildBranches(
	storedBranches: NonNullable<StoredSequenceItem['branches']>,
	id: string,
	labelForAction: ActionLabelLookup,
	defaultItemLookup: DefaultItemLookup,
): NonNullable<SequenceItem['branches']> | null {
	const rebuiltBranches: {
		condition: SwitchCondition;
		children: SequenceItem[];
	}[] = [];

	for (const [branchIndex, storedBranch] of storedBranches.entries()) {
		const branchChildren = rebuildItemList(
			storedBranch.children,
			`${id}-b${branchIndex}-c-`,
			labelForAction,
			defaultItemLookup,
		);

		if (branchChildren === null) {
			return null;
		}

		rebuiltBranches.push({
			condition: storedBranch.condition,
			children: branchChildren,
		});
	}

	return sortSwitchBranches(rebuiltBranches);
}

function createSequenceItemFromStored(
	storedItem: StoredSequenceItem,
	id: string,
	labelForAction: ActionLabelLookup,
	defaultItemLookup: DefaultItemLookup,
): SequenceItem | null {
	const isDefaultItem = storedItem.default === true;
	const defaultItem = isDefaultItem ? defaultItemLookup.get(storedItem.action)?.shift() : undefined;

	if (isDefaultItem && defaultItem === undefined) {
		return null;
	}

	const children =
		storedItem.children === undefined
			? undefined
			: rebuildItemList(storedItem.children, `${id}-c-`, labelForAction, defaultItemLookup);

	if (children === null) {
		return null;
	}

	const elseChildren =
		storedItem.elseChildren === undefined
			? undefined
			: rebuildItemList(storedItem.elseChildren, `${id}-e-`, labelForAction, defaultItemLookup);

	if (elseChildren === null) {
		return null;
	}

	const branches =
		storedItem.branches === undefined
			? undefined
			: rebuildBranches(storedItem.branches, id, labelForAction, defaultItemLookup);

	if (branches === null) {
		return null;
	}

	return {
		kind: 'algorithm',
		id: defaultItem?.id ?? id,
		action: storedItem.action,
		label: defaultItem?.label ?? labelForAction(storedItem.action),
		default: defaultItem?.default ?? false,
		movable: defaultItem?.movable ?? true,
		...(defaultItem?.modifiable === undefined ? {} : { modifiable: defaultItem.modifiable }),
		...(storedItem.count === undefined ? {} : { count: storedItem.count }),
		...(storedItem.condition === undefined ? {} : { condition: storedItem.condition }),
		...(children === undefined ? {} : { children }),
		...(elseChildren === undefined ? {} : { elseChildren }),
		...(branches === undefined ? {} : { branches }),
	};
}

function collectStoredActions(
	storedItems: readonly StoredSequenceItem[],
	collectedActions: ActionName[],
): void {
	for (const storedItem of storedItems) {
		collectedActions.push(storedItem.action);

		if (storedItem.children !== undefined) {
			collectStoredActions(storedItem.children, collectedActions);
		}

		if (storedItem.elseChildren !== undefined) {
			collectStoredActions(storedItem.elseChildren, collectedActions);
		}

		for (const branch of storedItem.branches ?? []) {
			collectStoredActions(branch.children, collectedActions);
		}
	}
}

/**
 * True when every action in the stored program is still offered by the level.
 * A level's palette can change (an action can be dropped from
 * `allowedActions`), and a program that uses the dropped action can no longer
 * be built or edited from the palette, so it is stale data.
 */
function usesOnlyAllowedActions(
	storedItems: readonly StoredSequenceItem[],
	allowedActions: readonly ActionName[],
): boolean {
	const collectedActions: ActionName[] = [];
	collectStoredActions(storedItems, collectedActions);

	return collectedActions.every((action) => allowedActions.includes(action));
}

/**
 * Rebuilds a stored program against the level's defaults, merging the internal
 * fields of every matched default block. Returns null when the data is stale
 * or tinkered: an action the level no longer offers, a stored default flag
 * with no matching default, or one of the level's defaults left unflagged.
 */
function fromStoredSequence(
	storedItems: readonly StoredSequenceItem[],
	defaultItems: readonly SequenceItem[],
	allowedActions: readonly ActionName[],
	labelForAction: ActionLabelLookup,
): SequenceItem[] | null {
	if (!usesOnlyAllowedActions(storedItems, allowedActions)) {
		return null;
	}

	const defaultItemLookup: DefaultItemLookup = new Map();
	collectDefaultItems(defaultItems, defaultItemLookup);

	const rebuiltItems = rebuildItemList(storedItems, 'stored-', labelForAction, defaultItemLookup);

	if (rebuiltItems === null) {
		return null;
	}

	// Every default block must come back flagged. A default still sitting in
	// the lookup was not flagged in the stored program, so the program is
	// tinkered data too.
	for (const unmatched of defaultItemLookup.values()) {
		if (unmatched.length > 0) {
			return null;
		}
	}

	return rebuiltItems;
}

export { fromStoredSequence, toStoredSequence };
