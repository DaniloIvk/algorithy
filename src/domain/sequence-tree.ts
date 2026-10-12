import type { SequenceItem } from '../schemas/sequence.schema';

type SwitchBranch = NonNullable<SequenceItem['branches']>[number];

/**
 * A drop zone is addressed by a string id:
 * - `root`               -> the top-level sequence
 * - `<itemId>`           -> that item's `children`
 * - `<itemId>:else`      -> that item's `elseChildren`
 * - `<itemId>:branch-<n>` -> that item's `branches[n].children`
 */
type ZoneLocation =
	| { readonly kind: 'root' }
	| { readonly kind: 'children'; readonly id: string }
	| { readonly kind: 'else'; readonly id: string }
	| { readonly kind: 'branch'; readonly id: string; readonly index: number };

const ROOT_ZONE = 'root';
const ELSE_SUFFIX = ':else';
const BRANCH_MARKER = ':branch-';

function parseZoneId(zoneId: string): ZoneLocation {
	if (zoneId === ROOT_ZONE) {
		return { kind: 'root' };
	}

	const branchIndex = zoneId.lastIndexOf(BRANCH_MARKER);
	if (branchIndex !== -1) {
		const index = Number.parseInt(zoneId.slice(branchIndex + BRANCH_MARKER.length), 10);
		if (!Number.isNaN(index)) {
			return { kind: 'branch', id: zoneId.slice(0, branchIndex), index };
		}
	}

	if (zoneId.endsWith(ELSE_SUFFIX)) {
		return { kind: 'else', id: zoneId.slice(0, -ELSE_SUFFIX.length) };
	}

	return { kind: 'children', id: zoneId };
}

function branchZoneId(itemId: string, branchIndex: number): string {
	return `${itemId}${BRANCH_MARKER}${branchIndex}`;
}

function elseZoneId(itemId: string): string {
	return `${itemId}${ELSE_SUFFIX}`;
}

function findItem(items: readonly SequenceItem[], id: string): SequenceItem | null {
	for (const item of items) {
		if (item.id === id) {
			return item;
		}

		const inChildren = item.children ? findItem(item.children, id) : null;
		if (inChildren !== null) {
			return inChildren;
		}

		const inElse = item.elseChildren ? findItem(item.elseChildren, id) : null;
		if (inElse !== null) {
			return inElse;
		}

		if (item.branches) {
			for (const branch of item.branches) {
				const inBranch = findItem(branch.children, id);
				if (inBranch !== null) {
					return inBranch;
				}
			}
		}
	}

	return null;
}

function getZoneItems(
	items: readonly SequenceItem[],
	zoneId: string,
): readonly SequenceItem[] | null {
	const location = parseZoneId(zoneId);

	if (location.kind === 'root') {
		return items;
	}

	const base = findItem(items, location.id);
	if (base === null) {
		return null;
	}

	if (location.kind === 'children') {
		return base.children ?? null;
	}

	if (location.kind === 'else') {
		return base.elseChildren ?? null;
	}

	return base.branches?.[location.index]?.children ?? null;
}

function getZoneLength(items: readonly SequenceItem[], zoneId: string): number {
	return getZoneItems(items, zoneId)?.length ?? 0;
}

function isMovableAt(
	items: readonly SequenceItem[],
	zoneId: string,
	index: number,
): boolean | null {
	const zone = getZoneItems(items, zoneId);
	const item = zone?.[index];
	return item === undefined ? null : item.movable;
}

/**
 * Replace a nested item by id. The updater runs once for the first item whose
 * id matches, anywhere in the tree. References are preserved for untouched
 * branches.
 */
function updateItem(
	items: readonly SequenceItem[],
	id: string,
	updater: (item: SequenceItem) => SequenceItem,
): SequenceItem[] {
	const next = mapItems(items, (item) => (item.id === id ? updater(item) : null));
	return [...next];
}

/** Replace the item array of a zone. Returns a fresh top-level array. */
function updateZone(
	items: readonly SequenceItem[],
	zoneId: string,
	updater: (current: readonly SequenceItem[]) => readonly SequenceItem[],
): SequenceItem[] {
	const location = parseZoneId(zoneId);

	if (location.kind === 'root') {
		return [...updater(items)];
	}

	return [...updateZoneInner(items, location, updater)];
}

/** Remove the item at `index` from a zone, returning it if it existed. */
function removeAt(
	items: readonly SequenceItem[],
	zoneId: string,
	index: number,
): { readonly sequence: SequenceItem[]; readonly removed?: SequenceItem } {
	let removed: SequenceItem | undefined;

	const sequence = updateZone(items, zoneId, (current) => {
		const next = [...current];
		removed = next.splice(index, 1)[0];
		return next;
	});

	return removed === undefined ? { sequence, removed: undefined } : { sequence, removed };
}

/**
 * Insert an item into a zone. `insertAt` and `moveWithinZone` run the index
 * through `clampInsertIndex`, and the renderer uses the same helper for the
 * drop placeholder, so the dashed slot always coincides with the landing spot.
 */
function insertAt(
	items: readonly SequenceItem[],
	zoneId: string,
	index: number,
	item: SequenceItem,
): SequenceItem[] {
	return updateZone(items, zoneId, (current) => {
		const next = [...current];
		next.splice(clampInsertIndex(current, index), 0, item);
		return next;
	});
}

/** Reorder an item inside its own zone. */
function moveWithinZone(
	items: readonly SequenceItem[],
	zoneId: string,
	fromIndex: number,
	targetIndex: number,
): SequenceItem[] {
	return updateZone(items, zoneId, (current) => {
		const target = clampInsertIndex(current, targetIndex);
		if (fromIndex === target || fromIndex + 1 === target) {
			return current;
		}

		const next = [...current];
		const [moved] = next.splice(fromIndex, 1);
		if (moved === undefined) {
			return next;
		}

		next.splice(fromIndex < target ? target - 1 : target, 0, moved);
		return next;
	});
}

/** `default` branches always sort last, whatever order they arrive in. */
function sortSwitchBranches(branches: readonly SwitchBranch[]): SwitchBranch[] {
	const withoutDefault: SwitchBranch[] = [];
	const withDefault: SwitchBranch[] = [];

	for (const branch of branches) {
		if (branch.condition === 'default') {
			withDefault.push(branch);
		} else {
			withoutDefault.push(branch);
		}
	}

	return [...withoutDefault, ...withDefault];
}

function countLocked(items: readonly SequenceItem[]): number {
	let count = 0;
	for (const item of items) {
		if (!item.movable) {
			count += 1;
		}
	}
	return count;
}

/**
 * Clamp a raw drop index to the first writable slot. Locked (non-movable)
 * items stay ahead of anything the player places, so the program head and any
 * pre-placed locked starter blocks cannot be pushed out of the way. The drop
 * (`insertAt`/`moveWithinZone`) and the renderer's drop placeholder both call
 * this, so the preview always sits exactly where the block lands.
 */
function clampInsertIndex(items: readonly SequenceItem[], index: number): number {
	return Math.max(index, countLocked(items));
}

type ItemUpdater = (item: SequenceItem) => SequenceItem | null;

function mapItems(items: readonly SequenceItem[], updater: ItemUpdater): readonly SequenceItem[] {
	let changed = false;

	const next = items.map((item) => {
		const replacement = updater(item);
		if (replacement !== null) {
			if (replacement !== item) {
				changed = true;
			}
			return replacement;
		}

		const children = item.children ? mapItems(item.children, updater) : item.children;
		const elseChildren = item.elseChildren
			? mapItems(item.elseChildren, updater)
			: item.elseChildren;

		let branches = item.branches;
		if (item.branches) {
			let branchesChanged = false;
			const nextBranches = item.branches.map((branch) => {
				const nextChildren = mapItems(branch.children, updater);
				if (nextChildren !== branch.children) {
					branchesChanged = true;
					return { ...branch, children: nextChildren };
				}
				return branch;
			});
			if (branchesChanged) {
				branches = nextBranches;
			}
		}

		if (
			children !== item.children ||
			elseChildren !== item.elseChildren ||
			branches !== item.branches
		) {
			changed = true;
			return { ...item, children, elseChildren, branches };
		}

		return item;
	});

	return changed ? next : items;
}

function updateZoneInner(
	items: readonly SequenceItem[],
	location: Exclude<ZoneLocation, { kind: 'root' }>,
	updater: (current: readonly SequenceItem[]) => readonly SequenceItem[],
): readonly SequenceItem[] {
	let changed = false;

	const next = items.map((item) => {
		if (item.id === location.id) {
			changed = true;

			if (location.kind === 'children') {
				return { ...item, children: updater(item.children ?? []) };
			}

			if (location.kind === 'else') {
				return { ...item, elseChildren: updater(item.elseChildren ?? []) };
			}

			const branches = [...(item.branches ?? [])];
			const branch = branches[location.index];
			if (branch === undefined) {
				return item;
			}
			branches[location.index] = { ...branch, children: updater(branch.children) };
			return { ...item, branches };
		}

		if (item.children) {
			const children = updateZoneInner(item.children, location, updater);
			if (children !== item.children) {
				changed = true;
				return { ...item, children };
			}
		}

		if (item.elseChildren) {
			const elseChildren = updateZoneInner(item.elseChildren, location, updater);
			if (elseChildren !== item.elseChildren) {
				changed = true;
				return { ...item, elseChildren };
			}
		}

		if (item.branches) {
			let branchesChanged = false;
			const nextBranches = item.branches.map((branch) => {
				const children = updateZoneInner(branch.children, location, updater);
				if (children !== branch.children) {
					branchesChanged = true;
					return { ...branch, children };
				}
				return branch;
			});
			if (branchesChanged) {
				changed = true;
				return { ...item, branches: nextBranches };
			}
		}

		return item;
	});

	return changed ? next : items;
}

export {
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
};
export type { SwitchBranch, ZoneLocation };
