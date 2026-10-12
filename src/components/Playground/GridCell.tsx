import Activity from '../Activity';
import PlayerMouse from '../PlayerMouse';
import TargetCheese from '../TargetCheese';
import type { PlayerState } from '../../domain/simulation';
import type { BlockKind, BlockLook } from '../../schemas/block.schema';
import type { Position } from '../../schemas/level.schema';
import { classNames } from '../../lib/cn';
import { messages } from '../../lib/i18n';
import type { Child } from 'hono/jsx';

/**
 * Fixed light patches on the lava pool. Each one sits still and pulses its
 * opacity on its own linear clock, so the surface looks alive without moving.
 */
const LAVA_GLOWS = [
	{ left: 8, top: 12, size: 20, delay: -0.2, duration: 2.6 },
	{ left: 32, top: 6, size: 16, delay: -1.1, duration: 3.1 },
	{ left: 58, top: 10, size: 22, delay: -0.6, duration: 2.3 },
	{ left: 78, top: 18, size: 15, delay: -1.9, duration: 2.9 },
	{ left: 12, top: 34, size: 24, delay: -2.3, duration: 3.3 },
	{ left: 40, top: 32, size: 18, delay: -0.4, duration: 2.2 },
	{ left: 66, top: 38, size: 20, delay: -1.5, duration: 2.7 },
	{ left: 4, top: 58, size: 17, delay: -0.9, duration: 3.0 },
	{ left: 28, top: 56, size: 22, delay: -2.6, duration: 2.5 },
	{ left: 52, top: 60, size: 18, delay: -0.1, duration: 2.8 },
	{ left: 76, top: 58, size: 16, delay: -1.7, duration: 2.4 },
	{ left: 18, top: 76, size: 20, delay: -2.1, duration: 3.2 },
	{ left: 44, top: 80, size: 16, delay: -0.7, duration: 2.6 },
	{ left: 68, top: 76, size: 19, delay: -1.3, duration: 2.9 },
	{ left: 30, top: 42, size: 13, delay: -2.9, duration: 2.3 },
	{ left: 62, top: 66, size: 13, delay: -1.0, duration: 3.4 },
];

function blockKindLabel(kind: 'ground' | 'wall' | 'ice'): string {
	switch (kind) {
		case 'ground':
			return messages.playground_cell_ground();
		case 'wall':
			return messages.playground_cell_wall();
		case 'ice':
			return messages.playground_cell_ice();
	}
}

type GridCellProps = {
	readonly position: Position;
	readonly kind?: BlockKind;
	readonly look: BlockLook;
	readonly player: PlayerState;
	/** Accumulated facing angle in degrees (shortest-path turns). */
	readonly playerAngle?: number;
	/** Cell the mouse is walking in from for the step it is animating. */
	readonly playerFrom?: Position | null;
	/** Duration of that step, in milliseconds. */
	readonly playerStepMs?: number;
	readonly isTarget: boolean;
	readonly isRunning?: boolean;
	/** Builder mode: this cell reports its coordinate for the paint layer. */
	readonly builderCell?: boolean;
	readonly children?: Child;
};

function GridCell(props: GridCellProps) {
	const isPlayer = props.position.x === props.player.x && props.position.y === props.player.y;
	const checkerClass =
		(props.position.x + props.position.y) % 2 === 0 ? 'bg-content/7' : 'bg-surface/7';
	// Walk in from the previous cell: the mouse starts offset there and slides
	// to its own cell, instead of jumping.
	const stepFrom = props.playerFrom ?? null;
	const stepX = stepFrom === null ? 0 : stepFrom.x - props.position.x;
	const stepY = stepFrom === null ? 0 : stepFrom.y - props.position.y;
	const stepStyle =
		stepFrom !== null && (stepX !== 0 || stepY !== 0)
			? {
					'--step-x': `${stepX}`,
					'--step-y': `${stepY}`,
					'--step-ms': `${props.playerStepMs ?? 320}ms`,
				}
			: undefined;
	// True while the mouse is sliding into this cell from another one. The
	// cheese on the target waits for the mouse to actually land, not for the
	// move to merely start, so it stays visible for this step.
	const isSteppingIn = stepFrom !== null && (stepX !== 0 || stepY !== 0);
	const playerTrapClass =
		props.kind === 'hole' ? 'player-fall' : props.kind === 'lava' ? 'player-burn' : undefined;
	// The trap's label should be the one shown while the player is on it.
	const playerLabel =
		props.kind === 'lava'
			? messages.playground_cell_lava()
			: props.kind === 'hole'
				? messages.playground_cell_hole()
				: messages.playground_cell_player();
	// Traps are drawn on the floor, so their cell uses the ground theme.
	const tileKind =
		props.kind === undefined
			? undefined
			: props.kind === 'lava' || props.kind === 'hole'
				? 'ground'
				: props.kind;
	const tileTerrain =
		props.kind === undefined ? undefined : props.kind === 'ice' ? 'ice' : props.look.terrain;
	const tileTitle =
		props.kind === undefined || props.kind === 'lava' || props.kind === 'hole'
			? undefined
			: blockKindLabel(props.kind);
	// Playground grid tracks: the top row holds the column letters and the left
	// column the row numbers, both marked by a -1 coordinate; every other cell
	// is a data cell. See the "Playground grid sizing" block in style.css.
	const track =
		props.position.x === -1
			? props.position.y === -1
				? 'corner'
				: 'row-label'
			: props.position.y === -1
				? 'column-label'
				: 'cell';

	const isDataCell = track === 'cell';

	return (
		<td
			data-playground-track={track}
			class={classNames(
				'relative m-0 border-0 p-0',
				props.builderCell === true && isDataCell && 'touch-none',
			)}
			{...(props.builderCell === true && isDataCell
				? { 'data-builder-cell': `${props.position.x}:${props.position.y}` }
				: {})}
		>
			<div data-terrain={tileTerrain} data-kind={tileKind} class='absolute inset-0'>
				&nbsp;
			</div>
			<Activity
				when={!props.children}
				children={
					<div title={tileTitle} class={classNames(checkerClass, 'absolute inset-0')}>
						<span class='sr-only'>{tileTitle}</span>
					</div>
				}
			/>
			<Activity
				when={props.kind === 'lava'}
				children={
					<div
						title={messages.playground_cell_lava()}
						class='absolute inset-0 flex items-center-safe justify-center-safe'
					>
						<span class='sr-only'>{messages.playground_cell_lava()}</span>
						<div class='lava-pool'>
							{LAVA_GLOWS.map((glow) => (
								<span
									key={`${glow.left}-${glow.top}`}
									class='lava-glow'
									style={{
										left: `${glow.left}%`,
										top: `${glow.top}%`,
										width: `${glow.size}%`,
										height: `${glow.size}%`,
										animationDelay: `${glow.delay}s`,
										animationDuration: `${glow.duration}s`,
									}}
								/>
							))}
						</div>
					</div>
				}
			/>
			<Activity
				when={props.kind === 'hole'}
				children={
					<div
						title={messages.playground_cell_hole()}
						class='absolute inset-0 flex items-center-safe justify-center-safe'
					>
						<span class='sr-only'>{messages.playground_cell_hole()}</span>
						<div class='hole-pit' />
					</div>
				}
			/>
			<Activity
				when={props.isTarget && (!isPlayer || isSteppingIn)}
				children={
					<div
						title={isPlayer ? undefined : messages.playground_cell_target()}
						aria-hidden={isPlayer ? 'true' : undefined}
						class={classNames(
							'absolute inset-0 flex items-center-safe justify-center-safe',
							isPlayer && 'target-arrive',
						)}
						style={isPlayer ? { '--step-ms': `${props.playerStepMs ?? 320}ms` } : undefined}
					>
						<span class='sr-only'>{messages.playground_cell_target()}</span>
						<TargetCheese />
					</div>
				}
			/>
			<Activity
				when={isPlayer}
				children={
					<div
						title={playerLabel}
						class={classNames(
							'player-figure absolute inset-0 flex items-center-safe justify-center-safe',
							playerTrapClass,
						)}
					>
						<span class='sr-only'>{playerLabel}</span>
						<div
							class='player-step absolute inset-0 flex items-center-safe justify-center-safe'
							style={stepStyle}
						>
							<PlayerMouse walking={props.isRunning === true} angle={props.playerAngle ?? 0} />
						</div>
					</div>
				}
			/>
			{props.children}
		</td>
	);
}

export default GridCell;
