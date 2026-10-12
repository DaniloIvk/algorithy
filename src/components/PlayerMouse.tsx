import { classNames } from '../lib/cn';

type PlayerMouseProps = {
	readonly class?: string;
	readonly walking?: boolean;
	/** Accumulated facing angle in degrees; omitted in static previews. */
	readonly angle?: number;
};

/**
 * The flat mouse player. Shared by the playground (walking, facing an angle)
 * and the skin pickers (static previews), so both always look the same.
 */
function PlayerMouse({ class: className, walking, angle }: PlayerMouseProps) {
	return (
		<div
			class={classNames('player-mouse', walking === true && 'player-mouse-walking', className)}
			style={angle === undefined ? undefined : { rotate: `${angle}deg` }}
			aria-hidden='true'
		>
			<span class='player-mouse-tail' />
			<span class='player-mouse-body' />
			<span class='player-mouse-ear player-mouse-ear-left' />
			<span class='player-mouse-ear player-mouse-ear-right' />
			<span class='player-mouse-eye player-mouse-eye-left' />
			<span class='player-mouse-eye player-mouse-eye-right' />
			<span class='player-mouse-nose' />
		</div>
	);
}

export default PlayerMouse;
