import type { JSX } from 'hono/jsx/dom/jsx-runtime';
import { actions } from '../../../blocks/registry';
import ForBlock from '../../../blocks/ForBlock';
import WhileBlock from '../../../blocks/WhileBlock';
import IfBlock from '../../../blocks/IfBlock';
import SwitchBlock, {
	switchConditionNames,
	type SwitchCondition,
} from '../../../blocks/SwitchBlock';
import { clampInsertIndex, sortSwitchBranches, updateItem } from '../../../domain/sequence-tree';
import type { ConditionName } from '../../../domain/conditions';
import { classNames } from '../../../lib/cn';
import type { ActiveDrag, DndApi, DraggableDescriptor } from '../dnd';
import type { SequenceItem } from '../hooks/useSequence';

type SetStateAction<T> = T | ((previousValue: T) => T);

type RendererProps = {
	readonly items: readonly SequenceItem[];
	readonly dnd: DndApi;
	readonly activeDrag: ActiveDrag | null;
	readonly setSequence: (action: SetStateAction<SequenceItem[]>) => void;
	readonly forId?: string;
	readonly depth?: number;
	readonly activeZoneId?: string | null;
	readonly activeDropIndex?: number | null;
};

function renderDropPlaceholder(drag: ActiveDrag): JSX.Element {
	return (
		<div
			key='drop-placeholder'
			data-drop-placeholder='true'
			class='border-primary/60 bg-primary/10 border-block shrink-0 self-center rounded-md border-dashed'
			style={{ width: `${drag.width}px`, maxWidth: '100%', height: `${drag.height}px` }}
		/>
	);
}

function SequenceItemRenderer({
	items,
	dnd,
	activeDrag,
	setSequence,
	forId = 'root',
	depth = 0,
	activeZoneId = null,
	activeDropIndex = null,
}: RendererProps): JSX.Element[] {
	// Always render the nested zone, even when it is empty: an empty body still
	// owns a drop zone, and that is exactly where the dashed placeholder has to
	// appear while a block hovers it.
	const renderNested = (
		nestedItems: readonly SequenceItem[] | undefined,
		zoneId: string,
	): JSX.Element[] =>
		SequenceItemRenderer({
			items: nestedItems ?? [],
			dnd,
			activeDrag,
			setSequence,
			forId: zoneId,
			depth: depth + 1,
			activeZoneId,
			activeDropIndex,
		});

	function renderItem(item: SequenceItem, index: number): JSX.Element {
		const descriptor: DraggableDescriptor = {
			id: item.id,
			action: item.action,
			label: item.label,
			default: item.default,
			count: item.count,
			condition: item.condition,
			from: index,
			zoneId: forId,
		};
		const dragProps = item.movable ? dnd.draggableProps(descriptor) : {};
		const wrapperProps = item.movable
			? { 'data-drag-item': 'true' }
			: item.action === 'start'
				? { 'data-start': 'true' }
				: { 'data-locked': 'true' };
		const isGrayed = item.action !== 'start' && (item.default || !item.movable);
		const wrapperClass = item.movable
			? 'w-fit cursor-grab select-none'
			: 'cursor-not-allowed select-none';

		if (item.action === 'for') {
			const nested = renderNested(item.children, item.id);
			const handleCountChange = (newCount: number) => {
				if (item.modifiable === false) return;
				setSequence((previousSequence) =>
					updateItem(previousSequence, item.id, (sequenceItem) => ({
						...sequenceItem,
						count: newCount,
					})),
				);
			};

			return (
				<div
					key={item.id}
					id={item.id}
					class={wrapperClass}
					style={{ isolation: 'isolate' }}
					{...wrapperProps}
					{...dragProps}
				>
					<div {...dnd.dropZoneProps(item.id)} style={{ isolation: 'isolate' }}>
						<ForBlock
							variant='sequence'
							count={item.count ?? 1}
							onCountChange={item.movable ? handleCountChange : () => {}}
							depth={depth}
							modifiable={item.modifiable}
							movable={item.movable}
							grayed={isGrayed}
							zoneId={item.id}
						>
							{nested}
						</ForBlock>
					</div>
				</div>
			);
		}

		if (item.action === 'while') {
			const nested = renderNested(item.children, item.id);

			return (
				<div
					key={item.id}
					id={item.id}
					class={wrapperClass}
					style={{ isolation: 'isolate' }}
					{...wrapperProps}
					{...dragProps}
				>
					<div {...dnd.dropZoneProps(item.id)} style={{ isolation: 'isolate' }}>
						<WhileBlock
							variant='sequence'
							depth={depth}
							modifiable={item.modifiable}
							movable={item.movable}
							grayed={isGrayed}
							zoneId={item.id}
						>
							{nested}
						</WhileBlock>
					</div>
				</div>
			);
		}

		if (item.action === 'switch') {
			const sortedBranches = sortSwitchBranches(item.branches ?? []);
			const handleConditionChange = (branchIndex: number, newCondition: SwitchCondition) => {
				if (item.modifiable === false) return;
				setSequence((previousSequence) =>
					updateItem(previousSequence, item.id, (sequenceItem) => ({
						...sequenceItem,
						branches: sortSwitchBranches(
							(sequenceItem.branches ?? []).map((branch, index) =>
								index === branchIndex ? { ...branch, condition: newCondition } : branch,
							),
						),
					})),
				);
			};
			const handleAddBranch = () => {
				if (item.modifiable === false) return;
				setSequence((previousSequence) =>
					updateItem(previousSequence, item.id, (sequenceItem) => {
						const branches = sequenceItem.branches ?? [];
						const nextCondition = switchConditionNames.find(
							(candidate) => !branches.some((branch) => branch.condition === candidate),
						);
						if (nextCondition === undefined) {
							return sequenceItem;
						}
						return {
							...sequenceItem,
							branches: sortSwitchBranches([
								...branches,
								{ condition: nextCondition, children: [] },
							]),
						};
					}),
				);
			};
			const handleMoveBranch = (fromIndex: number, toIndex: number) => {
				if (item.modifiable === false) return;
				if (
					fromIndex < 0 ||
					toIndex < 0 ||
					fromIndex >= sortedBranches.length ||
					toIndex >= sortedBranches.length
				) {
					return;
				}
				const targetBranch = sortedBranches[toIndex];
				if (
					targetBranch?.condition === 'default' ||
					sortedBranches[fromIndex]?.condition === 'default'
				) {
					return;
				}
				setSequence((previousSequence) =>
					updateItem(previousSequence, item.id, (sequenceItem) => {
						const branches = [...(sequenceItem.branches ?? [])];
						const [moved] = branches.splice(fromIndex, 1);
						if (moved === undefined) {
							return sequenceItem;
						}
						branches.splice(toIndex, 0, moved);
						return { ...sequenceItem, branches: sortSwitchBranches(branches) };
					}),
				);
			};
			const handleRemoveBranch = (branchIndex: number) => {
				if (item.modifiable === false) return;
				setSequence((previousSequence) =>
					updateItem(previousSequence, item.id, (sequenceItem) => ({
						...sequenceItem,
						branches: (sequenceItem.branches ?? []).filter((_, index) => index !== branchIndex),
					})),
				);
			};

			const branches = sortedBranches.map((branch, branchIndex) => ({
				condition: branch.condition as SwitchCondition,
				children: renderNested(branch.children, `${item.id}:branch-${branchIndex}`),
				hasBlocks: (branch.children?.length ?? 0) > 0,
			}));

			return (
				<div
					key={item.id}
					id={item.id}
					class={wrapperClass}
					style={{ isolation: 'isolate' }}
					{...wrapperProps}
					{...dragProps}
				>
					<SwitchBlock
						variant='sequence'
						zoneIdPrefix={item.id}
						branches={branches}
						onConditionChange={item.movable ? handleConditionChange : undefined}
						onAddBranch={item.movable ? handleAddBranch : undefined}
						onRemoveBranch={item.movable ? handleRemoveBranch : undefined}
						onMoveBranch={item.movable ? handleMoveBranch : undefined}
						allowedConditions={switchConditionNames}
						depth={depth}
						modifiable={item.modifiable}
						grayed={isGrayed}
					/>
				</div>
			);
		}

		if (item.action === 'if') {
			const nestedThen = renderNested(item.children, item.id);
			const nestedElse = renderNested(item.elseChildren, `${item.id}:else`);
			const handleConditionChange = (newCondition: ConditionName) => {
				if (item.modifiable === false) return;
				setSequence((previousSequence) =>
					updateItem(previousSequence, item.id, (sequenceItem) => ({
						...sequenceItem,
						condition: newCondition,
					})),
				);
			};

			return (
				<div
					key={item.id}
					id={item.id}
					class={wrapperClass}
					style={{ isolation: 'isolate' }}
					{...wrapperProps}
					{...dragProps}
				>
					<IfBlock
						variant='sequence'
						condition={(item.condition as ConditionName) ?? 'path-ahead'}
						onConditionChange={item.movable ? handleConditionChange : () => {}}
						depth={depth}
						modifiable={item.modifiable}
						movable={item.movable}
						grayed={isGrayed}
						thenZoneId={item.id}
						elseZoneId={`${item.id}:else`}
						thenHasBlocks={(item.children?.length ?? 0) > 0}
						elseHasBlocks={(item.elseChildren?.length ?? 0) > 0}
						elseChildren={nestedElse}
					>
						{nestedThen}
					</IfBlock>
				</div>
			);
		}

		return (
			<div
				key={item.id}
				id={item.id}
				class={classNames(
					item.movable ? 'cursor-grab select-none' : 'cursor-not-allowed select-none',
				)}
				{...wrapperProps}
				{...dragProps}
			>
				{actions[item.action].render({ grayed: isGrayed })}
			</div>
		);
	}

	// The dragged item leaves the list and a placeholder marks where it lands.
	// The index is run through the same clamp the drop uses, so the dashed slot
	// can never sit above the Start head (or another locked block) while the
	// block lands below it.
	const draggingId = activeDrag?.id ?? null;
	const isDropZoneActive = activeDrag !== null && activeZoneId !== null && activeZoneId === forId;
	const placeholderAt =
		isDropZoneActive && activeDropIndex !== null ? clampInsertIndex(items, activeDropIndex) : null;

	const rendered: JSX.Element[] = [];
	let collapsedIndex = 0;
	for (const [index, item] of items.entries()) {
		if (draggingId !== null && item.id === draggingId) {
			continue;
		}
		if (activeDrag !== null && placeholderAt !== null && collapsedIndex === placeholderAt) {
			rendered.push(renderDropPlaceholder(activeDrag));
		}
		rendered.push(renderItem(item, index));
		collapsedIndex += 1;
	}
	if (activeDrag !== null && placeholderAt !== null && placeholderAt >= collapsedIndex) {
		rendered.push(renderDropPlaceholder(activeDrag));
	}

	return rendered;
}

export default SequenceItemRenderer;
