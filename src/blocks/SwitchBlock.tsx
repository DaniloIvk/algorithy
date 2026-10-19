import { useState } from 'hono/jsx';
import type { Child } from 'hono/jsx';
import type { JSX } from 'hono/jsx/dom/jsx-runtime';
import Lucide from '../components/Lucide';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide';
import BlockShell from './BlockShell';
import BlockCollapseToggle from './BlockCollapseToggle';
import Activity from '../components/Activity';
import { conditionLabel } from './conditionLabel';
import { useActiveZoneId, useDnd } from '../features/level/dnd';
import { classNames } from '../lib/cn';
import { messages } from '../lib/i18n';

const switchConditionNames = ['path-ahead', 'path-left', 'path-right', 'default'] as const;
type SwitchCondition = (typeof switchConditionNames)[number];

function switchConditionLabel(condition: SwitchCondition): string {
	return condition === 'default' ? messages.condition_default() : conditionLabel(condition);
}
type BranchData = {
	readonly condition: SwitchCondition;
	readonly children?: Child;
	readonly hasBlocks?: boolean;
};
type PaletteProps = { readonly variant: 'palette'; readonly depth?: number };
type SequenceProps = {
	readonly variant: 'sequence';
	readonly branches: readonly BranchData[];
	readonly zoneIdPrefix?: string;
	readonly onConditionChange?: (branchIndex: number, condition: SwitchCondition) => void;
	readonly onAddBranch?: () => void;
	readonly onRemoveBranch?: (branchIndex: number) => void;
	readonly onMoveBranch?: (from: number, to: number) => void;
	readonly allowedConditions?: readonly SwitchCondition[];
	readonly depth?: number;
	readonly modifiable?: boolean;
	readonly movable?: boolean;
	readonly grayed?: boolean;
	readonly expanded?: boolean;
	readonly onToggle?: () => void;
};
type SwitchBlockProps = PaletteProps | SequenceProps;
function childCount(children: Child | readonly Child[] | undefined): number {
	return !children ? 0 : Array.isArray(children) ? children.length : 1;
}
function SwitchBlock(props: SwitchBlockProps): JSX.Element {
	if (props.variant === 'palette')
		return (
			<BlockShell variant='orange'>
				<>{messages.block_switch_label()}</>
			</BlockShell>
		);
	const {
		branches,
		zoneIdPrefix,
		onConditionChange,
		onAddBranch,
		onRemoveBranch,
		onMoveBranch,
		allowedConditions,
		modifiable,
		expanded: controlledExpanded,
		onToggle: controlledOnToggle,
	} = props as SequenceProps;
	const dnd = useDnd();
	const activeZoneId = useActiveZoneId();
	const allowed = allowedConditions ?? switchConditionNames;
	const present = new Set(branches.map((branch) => branch.condition));
	const canAdd =
		modifiable !== false && !!onAddBranch && allowed.some((condition) => !present.has(condition));
	const [internalExpanded, setInternalExpanded] = useState<boolean>(true);
	const expanded = controlledExpanded ?? internalExpanded;
	const [branchExpanded, setBranchExpanded] = useState<Record<number, boolean>>({});
	// The header toggle drives the whole block: it also drops every branch back
	// to its default open state, so the branch chevrons always follow it instead
	// of keeping whatever each one was toggled to before.
	const toggle = () => {
		setBranchExpanded({});
		if (controlledOnToggle !== undefined) {
			controlledOnToggle();
			return;
		}
		setInternalExpanded((previousExpanded) => !previousExpanded);
	};
	const toggleBranch = (branchIndex: number) =>
		setBranchExpanded((previousBranches) => ({
			...previousBranches,
			[branchIndex]: !(previousBranches[branchIndex] ?? true),
		}));
	const isGrayed = (props as SequenceProps).grayed === true;
	return (
		<div
			class='relative flex w-max max-w-full flex-col select-none'
			style={{ isolation: 'isolate' }}
		>
			<BlockShell
				variant={isGrayed ? 'gray' : 'orange'}
				class='max-w-max flex-row flex-nowrap gap-1'
			>
				<BlockCollapseToggle
					expanded={expanded}
					onToggle={toggle}
					ariaLabel={expanded ? messages.common_collapse() : messages.common_expand()}
				/>
				<span class='inline-flex items-center gap-1.5 text-sm font-medium'>
					{messages.block_switch_label()}
				</span>
				<Activity
					when={canAdd}
					children={
						<button
							type='button'
							class='hover:bg-block-orange/30 active:bg-block-orange/40 flex cursor-pointer items-center justify-center rounded p-1'
							onClick={onAddBranch}
							aria-label={messages.block_switch_add_branch()}
						>
							<Lucide icon={Plus} class='size-4' />
						</button>
					}
				/>
			</BlockShell>
			<div class='flex flex-col gap-1' style={{ isolation: 'isolate' }}>
				{branches.map((branch, index) => {
					const hasBlocks = branch.hasBlocks ?? childCount(branch.children) > 0;
					const options = allowed.filter(
						(condition) => condition === branch.condition || !present.has(condition),
					);
					const label = switchConditionLabel(branch.condition);
					const open = branchExpanded[index] ?? true;
					// A branch is only really open while the whole switch is open,
					// so its chevron tracks the header toggle too.
					const branchOpen = expanded && open;
					const count = childCount(branch.children);
					const isDefault = branch.condition === 'default';
					const branchZoneId =
						zoneIdPrefix !== undefined ? `${zoneIdPrefix}:branch-${index}` : undefined;
					const isBranchDragOver = branchZoneId !== undefined && activeZoneId === branchZoneId;
					const canMoveUp = !isDefault && index > 0;
					const canMoveDown =
						!isDefault &&
						index < branches.length - 1 &&
						branches[index + 1]?.condition !== 'default';
					return (
						<div
							key={`${branch.condition}-${index}`}
							{...(zoneIdPrefix ? dnd.dropZoneProps(`${zoneIdPrefix}:branch-${index}`) : {})}
							aria-label={messages.block_switch_branch_drop_zone({ condition: label })}
							class='w-full'
							style={{ isolation: 'isolate' }}
						>
							<BlockShell
								variant={isGrayed ? 'washed-out-gray' : 'washed-out-orange'}
								class='w-full flex-col flex-nowrap gap-1 pt-1.5 pb-3.5'
								isDragOver={isBranchDragOver}
							>
								<div class='flex w-full items-center gap-1.5'>
									<BlockCollapseToggle
										expanded={branchOpen}
										onToggle={() => toggleBranch(index)}
										ariaLabel={
											branchOpen
												? messages.block_switch_collapse_branch()
												: messages.block_switch_expand_branch()
										}
										iconClass='size-3.5 shrink-0'
									/>
									<label class='inline-flex flex-row items-center-safe justify-center-safe gap-1'>
										<select
											value={branch.condition}
											aria-label={messages.block_switch_branch_condition()}
											onChange={(event: Event) =>
												onConditionChange?.(
													index,
													(event.target as HTMLSelectElement).value as SwitchCondition,
												)
											}
											disabled={modifiable === false || !onConditionChange}
											class={classNames(
												'rounded-[0.25rem] shrink-0 border-0 px-1 leading-none focus:ring-1 focus:outline-none disabled:opacity-85',
												isGrayed
													? 'bg-content/20 hover:bg-content/30 active:bg-content/45 focus:ring-content/25'
													: 'bg-block-orange-border/45 hover:bg-block-orange-border/60 active:bg-block-orange-border/80 focus:ring-block-orange-border',
											)}
										>
											{options.map((option) => (
												<option key={option} value={option}>
													{switchConditionLabel(option)}
												</option>
											))}
										</select>
									</label>
									<div class='ml-auto flex items-center gap-3 pl-2' data-branch-actions='true'>
										<Activity
											when={!isDefault && onMoveBranch !== undefined}
											children={
												<div class='flex gap-0.5'>
													<button
														type='button'
														class='hover:bg-block-orange/20 active:bg-block-orange/30 flex cursor-pointer items-center justify-center rounded p-1 disabled:opacity-30'
														onClick={() => onMoveBranch?.(index, index - 1)}
														disabled={!canMoveUp}
														aria-label={messages.block_switch_move_branch_up()}
													>
														<Lucide icon={ChevronUp} class='size-3.5 shrink-0' />
													</button>
													<button
														type='button'
														class='hover:bg-block-orange/20 active:bg-block-orange/30 flex cursor-pointer items-center justify-center rounded p-1 disabled:opacity-30'
														onClick={() => onMoveBranch?.(index, index + 1)}
														disabled={!canMoveDown}
														aria-label={messages.block_switch_move_branch_down()}
													>
														<Lucide icon={ChevronDown} class='size-3.5 shrink-0' />
													</button>
												</div>
											}
										/>
										<Activity
											when={
												modifiable !== false && branches.length > 1 && onRemoveBranch !== undefined
											}
											children={
												<button
													type='button'
													class='hover:bg-error/20 active:bg-error/30 flex cursor-pointer items-center justify-center rounded p-1'
													onClick={() => onRemoveBranch?.(index)}
													aria-label={messages.block_switch_remove_branch({ condition: label })}
												>
													<Lucide icon={Trash2} class='size-3.5 shrink-0' />
												</button>
											}
										/>
									</div>
								</div>
								<Activity
									when={branchOpen}
									fallback={messages.block_container_collapsed_count({ count })}
									children={
										<>
											{branch.children}
											<Activity
												when={!hasBlocks && !isBranchDragOver}
												children={messages.block_switch_branch_placeholder({
													condition: label,
												})}
											/>
										</>
									}
								/>
							</BlockShell>
						</div>
					);
				})}
			</div>
		</div>
	);
}
export { switchConditionNames };
export type { SwitchCondition };
export default SwitchBlock;
