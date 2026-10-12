import { useState } from 'hono/jsx';
import type { Child, PropsWithChildren } from 'hono/jsx';
import type { JSX } from 'hono/jsx/dom/jsx-runtime';
import Lucide from '../components/Lucide';
import { Check, CircleQuestionMark, X } from 'lucide';
import BlockShell from './BlockShell';
import BlockCollapseToggle from './BlockCollapseToggle';
import Activity from '../components/Activity';
import { conditionNames, type ConditionName } from '../domain/conditions';
import { useActiveZoneId, useDnd } from '../features/level/dnd';
import { classNames } from '../lib/cn';
import { messages } from '../lib/i18n';
import { conditionLabel } from './conditionLabel';

type PaletteProps = {
	readonly variant: 'palette';
	readonly depth?: number;
};

type SequenceProps = {
	readonly variant: 'sequence';
	readonly condition: ConditionName;
	readonly onConditionChange: (condition: ConditionName) => void;
	readonly depth?: number;
	readonly expanded?: boolean;
	readonly onToggle?: () => void;
	readonly children?: Child | readonly Child[];
	readonly elseChildren?: Child | readonly Child[];
	readonly thenHasBlocks?: boolean;
	readonly elseHasBlocks?: boolean;
	readonly thenZoneId?: string;
	readonly elseZoneId?: string;
	readonly modifiable?: boolean;
	readonly movable?: boolean;
	readonly grayed?: boolean;
};

type IfBlockProps = PropsWithChildren<PaletteProps | SequenceProps>;

function IfBlock(props: IfBlockProps): JSX.Element {
	const dnd = useDnd();
	const activeZoneId = useActiveZoneId();
	const isSequence = props.variant === 'sequence';
	const sequenceProps = isSequence ? (props as SequenceProps) : null;
	const [internalExpanded, setInternalExpanded] = useState<boolean>(true);
	const condition: ConditionName = sequenceProps ? sequenceProps.condition : 'path-ahead';
	const expanded = sequenceProps ? (sequenceProps.expanded ?? internalExpanded) : false;
	const toggle = sequenceProps
		? (sequenceProps.onToggle ?? (() => setInternalExpanded(!internalExpanded)))
		: () => {};
	const thenDragOver =
		sequenceProps?.thenZoneId !== undefined && activeZoneId === sequenceProps.thenZoneId;
	const elseDragOver =
		sequenceProps?.elseZoneId !== undefined && activeZoneId === sequenceProps.elseZoneId;

	const thenChildCount = Array.isArray(props.children)
		? props.children.length
		: props.children
			? 1
			: 0;
	const elseChildCount = Array.isArray(sequenceProps?.elseChildren)
		? sequenceProps?.elseChildren.length
		: sequenceProps?.elseChildren
			? 1
			: 0;

	const hasThenChildren = sequenceProps?.thenHasBlocks ?? false;
	const hasElseChildren = sequenceProps?.elseHasBlocks ?? false;
	const isModifiable = isSequence ? (sequenceProps as SequenceProps).modifiable !== false : true;
	const isGrayed = sequenceProps?.grayed === true;

	const handleConditionChange = (event: Event) => {
		if (!sequenceProps) {
			return;
		}
		const eventTarget = event.target;
		if (!(eventTarget instanceof HTMLSelectElement)) {
			return;
		}
		const value = eventTarget.value as ConditionName;
		if ((conditionNames as readonly string[]).includes(value)) {
			sequenceProps.onConditionChange(value);
		}
	};

	return (
		<div
			class='relative flex w-max max-w-full flex-col select-none'
			style={{ isolation: 'isolate' }}
		>
			<BlockShell
				variant={isGrayed ? 'gray' : 'green'}
				class='max-w-max flex-row flex-nowrap gap-1.5'
			>
				{isSequence ? (
					<BlockCollapseToggle
						expanded={expanded}
						onToggle={toggle}
						ariaLabel={expanded ? messages.common_collapse() : messages.common_expand()}
					/>
				) : (
					<div />
				)}
				<label class='inline-flex flex-row items-center-safe justify-center-safe gap-1.5'>
					{messages.block_if_label()}
					<select
						value={condition}
						onChange={handleConditionChange}
						disabled={!isSequence || !isModifiable}
						class={classNames(
							'bg-content/15 hover:bg-content/20 active:bg-content/30 shrink-0 rounded border-hairline px-1 leading-none focus:ring-1 focus:outline-none disabled:opacity-85',
							isGrayed
								? 'border-content/25 focus:ring-content/25'
								: 'border-success/50 focus:ring-success',
						)}
					>
						{conditionNames.map((name) => (
							<option value={name}>{conditionLabel(name)}</option>
						))}
					</select>
				</label>
				<Lucide icon={CircleQuestionMark} class='size-4' />
			</BlockShell>
			<Activity when={isSequence}>
				<div class='flex flex-col' style={{ isolation: 'isolate' }}>
					<div
						{...(sequenceProps?.thenZoneId ? dnd.dropZoneProps(sequenceProps.thenZoneId) : {})}
						class='w-full'
						style={{ isolation: 'isolate' }}
					>
						<BlockShell
							variant={isGrayed ? 'washed-out-gray' : 'washed-out-green'}
							class='w-full flex-col flex-nowrap py-2 pt-7'
							isDragOver={thenDragOver}
						>
							<div class='flex min-h-8 w-full flex-col items-center-safe p-2'>
								<ThenLabel />
								<Activity
									when={expanded}
									children={
										<>
											{sequenceProps?.children}
											<Activity
												when={!hasThenChildren && !thenDragOver}
												children={messages.block_if_then_placeholder()}
											/>
										</>
									}
									fallback={messages.block_container_collapsed_count({ count: thenChildCount })}
								/>
							</div>
						</BlockShell>
					</div>
					<div
						{...(sequenceProps?.elseZoneId ? dnd.dropZoneProps(sequenceProps.elseZoneId) : {})}
						class='w-full'
						style={{ isolation: 'isolate' }}
					>
						<BlockShell
							variant={isGrayed ? 'washed-out-gray' : 'washed-out-yellow'}
							class='w-full flex-col flex-nowrap py-2 pt-7'
							isDragOver={elseDragOver}
						>
							<div class='flex min-h-8 w-full flex-col items-center-safe p-2'>
								<ElseLabel />
								<Activity
									when={expanded}
									children={
										<>
											{sequenceProps?.elseChildren}
											<Activity
												when={!hasElseChildren && !elseDragOver}
												children={messages.block_if_else_placeholder()}
											/>
										</>
									}
									fallback={messages.block_container_collapsed_count({ count: elseChildCount })}
								/>
							</div>
						</BlockShell>
					</div>
				</div>
			</Activity>
		</div>
	);
}

function ThenLabel() {
	return (
		<div class='pointer-events-none absolute top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 text-xs'>
			<Lucide icon={Check} class='size-3.5' />
			<span>{messages.block_if_then()}</span>
		</div>
	);
}

function ElseLabel() {
	return (
		<div class='pointer-events-none absolute top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 text-xs'>
			<Lucide icon={X} class='size-3.5' />
			<span>{messages.block_if_else()}</span>
		</div>
	);
}

export default IfBlock;
