import { ChevronDown, ChevronRight } from 'lucide';
import Lucide from '../components/Lucide';
import { classNames } from '../lib/cn';

type BlockCollapseToggleProps = {
	readonly expanded: boolean;
	readonly onToggle: () => void;
	readonly ariaLabel: string;
	readonly iconClass?: string;
};

// Shared expand/collapse affordance for `for`, `if`, `while` and `switch`. A single
// neutral overlay (instead of a per-block tint) keeps the hover/active contrast
// identical and clearly visible on every block colour.
function BlockCollapseToggle({
	expanded,
	onToggle,
	ariaLabel,
	iconClass = 'size-4',
}: BlockCollapseToggleProps) {
	return (
		<button
			type='button'
			aria-label={ariaLabel}
			aria-expanded={expanded}
			onClick={onToggle}
			class={classNames(
				'flex shrink-0 cursor-pointer items-center justify-center rounded p-1 transition-colors',
				'hover:bg-content/35 active:bg-content/50',
				'focus-visible:ring-content/40 focus-visible:ring-2 focus-visible:outline-none',
			)}
		>
			<Lucide icon={expanded ? ChevronDown : ChevronRight} class={iconClass} />
		</button>
	);
}

export default BlockCollapseToggle;
