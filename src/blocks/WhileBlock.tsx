import { useState } from 'hono/jsx';
import type { Child, PropsWithChildren } from 'hono/jsx';
import type { JSX } from 'hono/jsx/dom/jsx-runtime';
import Lucide from '../components/Lucide';
import { Infinity as InfinityIcon } from 'lucide';

import BlockShell from './BlockShell';
import BlockCollapseToggle from './BlockCollapseToggle';
import Activity from '../components/Activity';
import TargetCheese from '../components/TargetCheese';
import { useActiveZoneId } from '../features/level/dnd';
import { messages } from '../lib/i18n';

type PaletteProps = {
	readonly variant: 'palette';
	readonly depth?: number;

	readonly onToggle?: never;
};

type SequenceProps = {
	readonly variant: 'sequence';

	readonly depth?: number;
	readonly expanded?: boolean;
	readonly onToggle?: () => void;
	readonly children?: Child | readonly Child[];
	readonly modifiable?: boolean;
	readonly movable?: boolean;
	readonly grayed?: boolean;
	readonly zoneId?: string;
};

type WhileBlockProps = PropsWithChildren<PaletteProps | SequenceProps>;

function WhileBlock(props: WhileBlockProps): JSX.Element {
	const { variant, children } = props;

	const isSequence = variant === 'sequence';
	const activeZoneId = useActiveZoneId();
	const zoneId = isSequence ? (props as SequenceProps).zoneId : undefined;
	const isDragOver = zoneId !== undefined && activeZoneId === zoneId;

	const [internalExpanded, setInternalExpanded] = useState<boolean>(true);

	const expanded = isSequence ? (props.expanded ?? internalExpanded) : false;
	const toggle = isSequence
		? (props.onToggle ?? (() => setInternalExpanded((previous) => !previous)))
		: () => {};

	const childCount = Array.isArray(children) ? children.length : children ? 1 : 0;
	const hasChildren = childCount > 0;
	const isGrayed = isSequence && (props as SequenceProps).grayed === true;

	return (
		<div
			class='relative flex w-max max-w-full flex-col select-none'
			style={{ isolation: 'isolate' }}
		>
			<BlockShell
				variant={isGrayed ? 'gray' : 'red'}
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
				<span class='inline-flex flex-row flex-nowrap items-center-safe justify-center-safe gap-1.5'>
					{messages.block_while_header_prefix()}{' '}
					<span class='inline-flex h-5 w-5 shrink-0 items-center-safe justify-center-safe'>
						<TargetCheese />
					</span>{' '}
					{messages.block_while_header_suffix()}
				</span>
				<Lucide icon={InfinityIcon} class='ml-auto size-4 shrink-0' />
			</BlockShell>
			<Activity when={isSequence}>
				<div style={{ isolation: 'isolate' }}>
					<BlockShell
						variant={isGrayed ? 'washed-out-gray' : 'washed-out-red'}
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

export default WhileBlock;
