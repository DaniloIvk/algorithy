import PlayerMouse from '../../components/PlayerMouse';
import TargetCheese from '../../components/TargetCheese';
import { classNames } from '../../lib/cn';
import type { BuilderTool } from './tools';

/**
 * One consistent badge for a paint tool, reused by the tool picker and the
 * brush preview. The mouse and the cheese show their native art; the map
 * kinds show their initial in the block's colour family.
 */

const TOOL_LETTERS: Readonly<Record<string, string>> = {
	ground: 'G',
	wall: 'W',
	ice: 'I',
	lava: 'L',
	hole: 'H',
};

const TOOL_CLASSES: Readonly<Record<string, string>> = {
	ground: 'bg-ground text-content',
	wall: 'bg-block-gray text-content',
	ice: 'bg-block-sky text-content',
	lava: 'bg-block-red text-content',
	hole: 'bg-black text-white',
};

function BuilderToolBadge({
	tool,
	class: className,
}: {
	readonly tool: BuilderTool;
	readonly class?: string;
}) {
	if (tool === 'player') {
		return (
			<span class={classNames('relative flex size-6 items-center justify-center', className)}>
				<PlayerMouse />
			</span>
		);
	}

	if (tool === 'target') {
		return (
			<span class={classNames('relative flex size-6 items-center justify-center', className)}>
				<TargetCheese />
			</span>
		);
	}

	return (
		<span
			class={classNames(
				'flex size-6 items-center justify-center rounded-sm text-xs leading-none font-bold',
				TOOL_CLASSES[tool],
				className,
			)}
		>
			{TOOL_LETTERS[tool]}
		</span>
	);
}

export { BuilderToolBadge };
