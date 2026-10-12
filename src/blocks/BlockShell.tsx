import { useMemo, type Child } from 'hono/jsx';
import type { JSX } from 'hono/jsx/dom/jsx-runtime';
import { classNames } from '../lib/cn';

type BlockVariant =
	| 'sky'
	| 'emerald'
	| 'yellow'
	| 'washed-out-yellow'
	| 'green'
	| 'washed-out-green'
	| 'red'
	| 'washed-out-red'
	| 'orange'
	| 'washed-out-orange'
	| 'gray'
	| 'washed-out-gray';
type BlockShellProps = {
	readonly variant: BlockVariant;
	readonly children: Child;
	readonly class?: string;
	readonly isDragOver?: boolean;
};

const VARIANT_MAP: Record<
	BlockVariant,
	{
		readonly border: string;
		readonly background: string;
		readonly borderBackground: string;
		readonly reverseBorder: string;
		readonly reverseBackground: string;
	}
> = {
	// Glass-like defaults: solid blocks 80% opaque, washed 60% opaque, both with backdrop-blur-[6px]
	// Tested 70/50 vs 80/60: 70/50 too transparent and caused muddy stacking in nested for/if/while; 80/60 retains depth without mud
	sky: {
		border: 'border-block-sky-border',
		background:
			'bg-block-sky/80 backdrop-blur-[6px] group-hover:bg-block-sky-hover/80 group-active:bg-block-sky-active/80',
		borderBackground: 'bg-block-sky-border',
		reverseBorder: 'border-block-sky-border',
		reverseBackground: 'bg-block-sky/80 backdrop-blur-[6px]',
	},
	emerald: {
		border: 'border-block-emerald-border',
		background:
			'bg-block-emerald/80 backdrop-blur-[6px] group-hover:bg-block-emerald-hover/80 group-active:bg-block-emerald-active/80',
		borderBackground: 'bg-block-emerald-border',
		reverseBorder: 'border-block-emerald-border',
		reverseBackground: 'bg-block-emerald/80 backdrop-blur-[6px]',
	},
	yellow: {
		border: 'border-block-yellow-border',
		background:
			'bg-block-yellow/80 backdrop-blur-[6px] group-hover:bg-block-yellow-hover/80 group-active:bg-block-yellow-active/80',
		borderBackground: 'bg-block-yellow-border',
		reverseBorder: 'border-block-yellow-border',
		reverseBackground: 'bg-block-yellow/80 backdrop-blur-[6px]',
	},
	'washed-out-yellow': {
		border: 'border-block-yellow-washed-border',
		background: 'bg-block-yellow-washed/60 backdrop-blur-[6px]',
		borderBackground: 'bg-block-yellow-washed-border',
		reverseBorder: 'border-block-yellow-washed-border',
		reverseBackground: 'bg-block-yellow-washed/60 backdrop-blur-[6px]',
	},
	green: {
		border: 'border-block-green-border',
		background:
			'bg-block-green/80 backdrop-blur-[6px] group-hover:bg-block-green-hover/80 group-active:bg-block-green-active/80',
		borderBackground: 'bg-block-green-border',
		reverseBorder: 'border-block-green-border',
		reverseBackground: 'bg-block-green/80 backdrop-blur-[6px]',
	},
	'washed-out-green': {
		border: 'border-block-green-washed-border',
		background: 'bg-block-green-washed/60 backdrop-blur-[6px]',
		borderBackground: 'bg-block-green-washed-border',
		reverseBorder: 'border-block-green-washed-border',
		reverseBackground: 'bg-block-green-washed/60 backdrop-blur-[6px]',
	},
	red: {
		border: 'border-block-red-border',
		background:
			'bg-block-red/80 backdrop-blur-[6px] group-hover:bg-block-red-hover/80 group-active:bg-block-red-active/80',
		borderBackground: 'bg-block-red-border',
		reverseBorder: 'border-block-red-border',
		reverseBackground: 'bg-block-red/80 backdrop-blur-[6px]',
	},
	'washed-out-red': {
		border: 'border-block-red-washed-border',
		background: 'bg-block-red-washed/60 backdrop-blur-[6px]',
		borderBackground: 'bg-block-red-washed-border',
		reverseBorder: 'border-block-red-washed-border',
		reverseBackground: 'bg-block-red-washed/60 backdrop-blur-[6px]',
	},
	orange: {
		border: 'border-block-orange-border',
		background:
			'bg-block-orange/80 backdrop-blur-[6px] group-hover:bg-block-orange-hover/80 group-active:bg-block-orange-active/80',
		borderBackground: 'bg-block-orange-border',
		reverseBorder: 'border-block-orange-border',
		reverseBackground: 'bg-block-orange/80 backdrop-blur-[6px]',
	},
	'washed-out-orange': {
		border: 'border-block-orange-washed-border',
		background: 'bg-block-orange-washed/60 backdrop-blur-[6px]',
		borderBackground: 'bg-block-orange-washed-border',
		reverseBorder: 'border-block-orange-washed-border',
		reverseBackground: 'bg-block-orange-washed/60 backdrop-blur-[6px]',
	},
	gray: {
		border: 'border-block-gray-border',
		background:
			'bg-block-gray/80 backdrop-blur-[6px] group-hover:bg-block-gray-hover/80 group-active:bg-block-gray-active/80',
		borderBackground: 'bg-block-gray-border',
		reverseBorder: 'border-block-gray-border',
		reverseBackground: 'bg-block-gray/80 backdrop-blur-[6px]',
	},
	'washed-out-gray': {
		border: 'border-block-gray-washed-border',
		background: 'bg-block-gray-washed/60 backdrop-blur-[6px]',
		borderBackground: 'bg-block-gray-washed-border',
		reverseBorder: 'border-block-gray-washed-border',
		reverseBackground: 'bg-block-gray-washed/60 backdrop-blur-[6px]',
	},
};

function BlockShell(props: BlockShellProps): JSX.Element {
	const baseColors = VARIANT_MAP[props.variant];
	const isDragOver = props.isDragOver ?? false;
	const isWashed = props.variant.startsWith('washed-out-');
	// Only the solid variants paint a hover/active state, through `group-hover:`
	// and `group-active:`. A washed container body must not be a hover group:
	// `.group:hover &` also matches every nested block, so hovering a body lit up
	// all of its children instead of only the block under the pointer.
	const hasHoverState = !isWashed;
	const colors = useMemo(() => {
		if (!isDragOver || !isWashed) return baseColors;
		switch (props.variant) {
			case 'washed-out-yellow':
				return {
					border: 'border-block-yellow-washed-hover-border',
					background: 'bg-block-yellow-washed-hover',
					borderBackground: 'bg-block-yellow-washed-hover-border',
					reverseBorder: 'border-block-yellow-washed-hover-border',
					reverseBackground: 'bg-block-yellow-washed-hover',
				};
			case 'washed-out-green':
				return {
					border: 'border-block-green-washed-hover-border',
					background: 'bg-block-green-washed-hover',
					borderBackground: 'bg-block-green-washed-hover-border',
					reverseBorder: 'border-block-green-washed-hover-border',
					reverseBackground: 'bg-block-green-washed-hover',
				};
			case 'washed-out-red':
				return {
					border: 'border-block-red-washed-hover-border',
					background: 'bg-block-red-washed-hover',
					borderBackground: 'bg-block-red-washed-hover-border',
					reverseBorder: 'border-block-red-washed-hover-border',
					reverseBackground: 'bg-block-red-washed-hover',
				};
			case 'washed-out-orange':
				return {
					border: 'border-block-orange-washed-hover-border',
					background: 'bg-block-orange-washed-hover',
					borderBackground: 'bg-block-orange-washed-hover-border',
					reverseBorder: 'border-block-orange-washed-hover-border',
					reverseBackground: 'bg-block-orange-washed-hover',
				};
			case 'washed-out-gray':
				return {
					border: 'border-block-gray-washed-hover-border',
					background: 'bg-block-gray-washed-hover',
					borderBackground: 'bg-block-gray-washed-hover-border',
					reverseBorder: 'border-block-gray-washed-hover-border',
					reverseBackground: 'bg-block-gray-washed-hover',
				};
			default:
				return baseColors;
		}
	}, [props.variant, baseColors, isDragOver, isWashed]);

	return (
		<div
			class={classNames(
				'xs:gap-2 relative z-10 flex min-h-[var(--block-height)] cursor-grab items-center-safe justify-center-safe gap-1.5 rounded px-[clamp(0.625rem,0.45rem_+_0.5vw,1rem)] py-[clamp(0.25rem,0.15rem_+_0.35vw,0.5rem)] text-black transition-colors select-none **:content-center-safe **:text-center **:align-middle **:text-[clamp(0.8125rem,0.7rem_+_0.3vw,1rem)] **:leading-[1.25] **:font-normal active:cursor-grabbing dark:text-white',
				hasHoverState && 'group',
			)}
		>
			<span
				class={classNames(
					'z-20 inline-flex flex-1 items-center justify-between whitespace-nowrap',
					props.class,
				)}
			>
				{props.children}
			</span>
			<div
				class={classNames(
					'clipart absolute inset-0 z-10 rounded-md border-block transition-colors',
					colors.border,
					colors.background,
				)}
			>
				<div
					class={classNames(
						'block-notch-border absolute transition-colors',
						colors.borderBackground,
					)}
					style={{ inset: 'calc(-1 * var(--border-block))' }}
				/>
			</div>
			<div
				class={classNames(
					'absolute top-full left-1/2 z-30 -mt-[0.525rem] h-[0.8rem] w-[0.8rem] -translate-x-1/2 rotate-45 rounded-[0.25rem] border-block transition-colors',
					colors.border,
					colors.background,
				)}
			/>
		</div>
	);
}

export default BlockShell;
export type { BlockShellProps, BlockVariant };
