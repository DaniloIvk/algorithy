import { useRef, useState } from 'hono/jsx';
import Activity from '../../components/Activity';
import Lucide from '../../components/Lucide';
import Playground from '../../components/Playground/Playground';
import type { Position } from '../../schemas/level.schema';
import type { BlockKind } from '../../schemas/block.schema';
import { PenTool } from 'lucide';
import { DIRECTION_ANGLES } from '../level/hooks/useSimulation';
import type { PlayerState } from '../../domain/simulation';
import { BuilderToolBadge } from './BuilderToolBadge';
import { draftCellsToArray, looksForTerrain, type BuilderDraft } from './shared-level';
import type { BuilderTool } from './tools';

/**
 * The drawing board. It renders the regular Playground (the mouse, the
 * cheese and the terrain all look native) and overlays pointer handling:
 * every data cell carries `data-builder-cell`, so a drag paints whatever the
 * pointer passes over. While a try is animating, the board shows the
 * simulated player and stops accepting strokes.
 */

type BuilderRunState = {
	readonly player: PlayerState;
	readonly angle: number;
	readonly from: Position | null;
	readonly stepMs?: number;
};

type BuilderCanvasProps = {
	readonly draft: BuilderDraft;
	readonly tool: BuilderTool;
	readonly onPaint: (position: Position) => void;
	readonly run?: BuilderRunState;
};

function BuilderCanvas({ draft, tool, onPaint, run }: BuilderCanvasProps) {
	const [brush, setBrush] = useState<{ readonly x: number; readonly y: number } | null>(null);
	const isPainting = useRef(false);
	const isRunning = run !== undefined;

	const paintAt = (clientX: number, clientY: number) => {
		if (isRunning) {
			return;
		}

		const element = document.elementFromPoint(clientX, clientY);
		const cell = element instanceof Element ? element.closest('[data-builder-cell]') : null;

		if (!(cell instanceof HTMLElement)) {
			return;
		}

		const value = cell.getAttribute('data-builder-cell');
		if (value === null) {
			return;
		}

		const [x, y] = value.split(':').map(Number);
		if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
			return;
		}

		onPaint({ x, y });
	};

	const endPainting = () => {
		isPainting.current = false;
	};

	const cellArray = draftCellsToArray(draft);
	const map: BlockKind[][] = [];

	for (let y = 0; y < draft.height; y += 1) {
		const row: BlockKind[] = [];
		for (let x = 0; x < draft.width; x += 1) {
			row.push(cellArray[y * draft.width + x] ?? 'ground');
		}
		map.push(row);
	}

	return (
		<div
			class='relative h-full w-full cursor-none touch-none select-none'
			onPointerDown={(event) => {
				if (isRunning || (event.pointerType === 'mouse' && event.button !== 0)) {
					return;
				}
				isPainting.current = true;
				if (event.currentTarget instanceof HTMLElement) {
					event.currentTarget.setPointerCapture(event.pointerId);
				}
				setBrush({ x: event.clientX, y: event.clientY });
				paintAt(event.clientX, event.clientY);
			}}
			onPointerMove={(event) => {
				if (!isRunning) {
					setBrush({ x: event.clientX, y: event.clientY });
				}
				if (isPainting.current) {
					paintAt(event.clientX, event.clientY);
				}
			}}
			onPointerUp={endPainting}
			onPointerCancel={endPainting}
			onPointerLeave={() => {
				setBrush(null);
				endPainting();
			}}
		>
			<Playground
				width={draft.width}
				height={draft.height}
				map={map}
				player={
					run?.player ?? { x: draft.player.x, y: draft.player.y, direction: draft.player.direction }
				}
				playerAngle={run?.angle ?? DIRECTION_ANGLES[draft.player.direction]}
				playerFrom={run?.from ?? null}
				playerStepMs={run?.stepMs}
				target={{ x: draft.target.x, y: draft.target.y }}
				looks={looksForTerrain(draft.terrain)}
				isRunning={isRunning}
				interactive
			/>
			<Activity
				when={brush !== null && !isRunning}
				children={
					<div
						class='builder-brush'
						style={{ left: `${brush?.x ?? 0}px`, top: `${brush?.y ?? 0}px` }}
					>
						<span class='builder-brush-pen'>
							<Lucide icon={PenTool} class='block size-6' />
						</span>
						<span class='builder-brush-tool'>
							<BuilderToolBadge tool={tool} />
						</span>
					</div>
				}
			/>
		</div>
	);
}

export default BuilderCanvas;
export type { BuilderRunState };
