import { useState } from 'hono/jsx';
import type { Child, PropsWithChildren } from 'hono/jsx';
import type { JSX } from 'hono/jsx/dom/jsx-runtime';
import Lucide from '../components/Lucide';
import { Repeat1 } from 'lucide';
import { parseCount } from '../schemas/sequence.schema';
import { loopLetterForDepth } from '../lib/loopLetter';
import BlockShell from './BlockShell';
import BlockCollapseToggle from './BlockCollapseToggle';
import Activity from '../components/Activity';
import { useActiveZoneId } from '../features/level/dnd';
import { classNames } from '../lib/cn';
import { messages } from '../lib/i18n';

type PaletteProps = {
	readonly variant: 'palette';
	readonly depth?: number;
	readonly onCountChange?: never;
};

type SequenceProps = {
	readonly variant: 'sequence';
	readonly count: number;
	readonly onCountChange: (count: number) => void;
	readonly depth?: number;
	readonly expanded?: boolean;
	readonly onToggle?: () => void;
	readonly children?: Child | readonly Child[];
	readonly modifiable?: boolean;
	readonly movable?: boolean;
	readonly grayed?: boolean;
	readonly zoneId?: string;
};

type ForBlockProps = PropsWithChildren<PaletteProps | SequenceProps>;

// A `for` loop takes children, so it collapses like the other container blocks.
function ForBlock(props: ForBlockProps): JSX.Element {
	const { variant, depth = 0, children } = props;
	const letter = loopLetterForDepth(depth);
	const isSequence = variant === 'sequence';
	const activeZoneId = useActiveZoneId();
	const zoneId = isSequence ? (props as SequenceProps).zoneId : undefined;
	const isDragOver = zoneId !== undefined && activeZoneId === zoneId;

	const [internalExpanded, setInternalExpanded] = useState<boolean>(true);
	const expanded = isSequence ? ((props as SequenceProps).expanded ?? internalExpanded) : false;
	const toggle = isSequence
		? ((props as SequenceProps).onToggle ?? (() => setInternalExpanded((previous) => !previous)))
		: () => {};

	const count = isSequence ? props.count : 1;
	const childCount = Array.isArray(children) ? children.length : children ? 1 : 0;
	const hasChildren = childCount > 0;
	const isModifiable = isSequence ? (props as SequenceProps).modifiable !== false : true;
	const isGrayed = isSequence && (props as SequenceProps).grayed === true;

	const handleCountChange = (event: Event) => {
		if (!isSequence) {
			return;
		}

		const eventTarget = event.target;
		if (!(eventTarget instanceof HTMLInputElement)) {
			return;
		}

		const parsed = parseCount(Number.parseInt(eventTarget.value, 10));
		if (parsed !== null) {
			const sequenceProps = props as SequenceProps;

			sequenceProps.onCountChange(parsed);
		}
	};

	return (
		<div
			class='relative flex w-max max-w-full flex-col select-none'
			style={{ isolation: 'isolate' }}
		>
			<BlockShell
				variant={isGrayed ? 'gray' : 'yellow'}
				class='max-w-max flex-row flex-nowrap gap-1.5'
			>
				<Activity
					when={isSequence}
					children={
						<BlockCollapseToggle
							expanded={expanded}
							onToggle={toggle}
							ariaLabel={expanded ? messages.common_collapse() : messages.common_expand()}
						/>
					}
				/>
				<label class='inline-flex flex-row flex-nowrap items-center-safe justify-center-safe gap-1.5'>
					{messages.block_for_header_prefix()}
					<code>{letter}</code>
					{messages.block_for_header_suffix()}
					<input
						type='number'
						min='1'
						max='99'
						value={count}
						onChange={handleCountChange}
						onInput={handleCountChange}
						disabled={!isSequence || !isModifiable}
						class={classNames(
							'bg-content/15 hover:bg-content/20 active:bg-content/30 h-6 w-12 shrink-0 rounded border-hairline px-1 text-center text-sm leading-none focus:ring-1 focus:outline-none disabled:opacity-85',
							isGrayed
								? 'border-content/25 focus:ring-content/25'
								: 'border-warning/50 focus:ring-warning',
						)}
					/>
					)
				</label>
				<Lucide icon={Repeat1} class='ml-auto size-4 shrink-0' />
			</BlockShell>
			<Activity when={isSequence}>
				<div style={{ isolation: 'isolate' }}>
					<BlockShell
						variant={isGrayed ? 'washed-out-gray' : 'washed-out-yellow'}
						class='flex-col flex-nowrap py-2'
						isDragOver={isDragOver}
					>
						<Activity
							when={expanded}
							children={
								<>
									{children}
									<Activity
										when={!hasChildren && !isDragOver}
										children={messages.block_container_place_blocks()}
									/>
								</>
							}
							fallback={messages.block_container_collapsed_count({ count: childCount })}
						/>
					</BlockShell>
				</div>
			</Activity>
		</div>
	);
}

export default ForBlock;
