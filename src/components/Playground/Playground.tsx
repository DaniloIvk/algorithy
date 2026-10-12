import { useMemo } from 'hono/jsx';
import type { PlayerState } from '../../domain/simulation';
import type { LevelData, Position, Target } from '../../schemas/level.schema';
import { columnLetter } from '../../lib/column';
import GridCell from './GridCell';
import Activity from '../Activity';

type PlaygroundProps = {
	readonly width: number;
	readonly height: number;
	readonly map: LevelData['map'];
	readonly player: PlayerState;
	/** Accumulated facing angle in degrees (shortest-path turns). */
	readonly playerAngle: number;
	/** Cell the mouse is walking in from for the step it is animating. */
	readonly playerFrom?: Position | null;
	/** Duration of that step, in milliseconds. */
	readonly playerStepMs?: number;
	readonly target: Target;
	readonly looks: LevelData['looks'];
	readonly isRunning?: boolean;
	/** Builder mode: cells expose `data-builder-cell` for the paint layer. */
	readonly interactive?: boolean;
};

function Playground(props: PlaygroundProps) {
	const columns = useMemo(() => Array.from({ length: props.width + 1 }), [props.width]);
	const playerProps = {
		player: props.player,
		playerAngle: props.playerAngle,
		playerFrom: props.playerFrom,
		playerStepMs: props.playerStepMs,
	};

	return (
		// The frame is the query container the grid measures its tiles against
		// (see the "Playground grid sizing" block in style.css).
		<div class='playground-frame flex h-full w-full items-center-safe justify-center-safe'>
			<table
				style={{
					'--playground-columns': `${props.width}`,
					'--playground-rows': `${props.height}`,
				}}
				class='playground-grid text-content/50 xs:text-sm relative isolate table-fixed text-center align-middle text-xs leading-none sm:text-base'
			>
				<thead>
					{columns.map((_, x) => (
						<Activity
							when={x >= 1}
							children={
								<GridCell
									key={`${x - 1},${-1}`}
									position={{ x: x - 1, y: -1 }}
									look={{ terrain: 'default' }}
									{...playerProps}
									isTarget={false}
									children={columnLetter(Math.max(0, x - 1))}
								/>
							}
							fallback={
								<GridCell
									key={`${-1},${-1}`}
									position={{ x: -1, y: -1 }}
									look={{ terrain: 'default' }}
									{...playerProps}
									isTarget={false}
									children=' '
								/>
							}
						/>
					))}
				</thead>
				<tbody>
					{props.map.map((rows, y) => (
						<tr>
							<GridCell
								key={`${-1},${y}`}
								position={{ x: -1, y }}
								look={{ terrain: 'default' }}
								{...playerProps}
								isTarget={false}
								children={y + 1}
							/>
							{rows.map((kind, x) => (
								<GridCell
									key={`${x},${y}`}
									position={{ x, y }}
									kind={kind}
									look={props.looks[kind]!}
									{...playerProps}
									isTarget={x === props.target.x && y === props.target.y}
									isRunning={props.isRunning}
									builderCell={props.interactive === true}
								/>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default Playground;
