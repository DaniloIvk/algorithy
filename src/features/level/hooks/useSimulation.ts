import { useEffect, useRef, useState } from 'hono/jsx';
import {
	isTrapped,
	collectExecutedActions,
	countBlocks,
	countExecutedCycles,
	getMoveTrail,
	runSequence,
	stepAction,
	type PlayerState,
	type RunOutcome,
	type RunResult,
} from '../../../domain/simulation';
import type { Direction, LevelData, Position } from '../../../schemas/level.schema';
import { playSound } from '../../../lib/sound';
import { outcomeSound, trapKindAt } from '../outcome-sound';
import type { SequenceItem } from './useSequence';

// Let the final animation frame land on screen before the win/lose prompt
// appears, so the player can see where the mouse ended up.
const WIN_SETTLE_MS = 650;
const TRAP_SETTLE_MS = 850;
const FAILURE_SETTLE_MS = 250;

// One cell of walking, and one waypoint of an ice slide.
const MOVE_STEP_MS = 320;
const SLIDE_STEP_MS = 120;

// Directions are quarter turns; the shown angle accumulates on top of them, so
// a turn always takes the shortest way round instead of spinning 270 degrees.
const DIRECTION_ANGLES: Record<Direction, number> = {
	up: 0,
	right: 90,
	down: 180,
	left: 270,
};

/** The cell the mouse walks in from, while it is animating a step. */
type PlayerMotion = {
	readonly from: Position;
	readonly ms: number;
};

type PlayerView = {
	readonly player: PlayerState;
	readonly motion: PlayerMotion | null;
};

/** Shortest signed turn (in degrees) from one angle to another. */
function shortestTurn(from: number, to: number): number {
	const normalized = ((from % 360) + 360) % 360;
	return ((to - normalized + 540) % 360) - 180;
}

function useSimulation(level: LevelData, sequence: readonly SequenceItem[]) {
	const runningRef = useRef<boolean>(false);
	const timerRef = useRef<number | null>(null);
	const frameRef = useRef<number | null>(null);
	const [view, setView] = useState<PlayerView>(() => ({
		player: { x: level.player.x, y: level.player.y, direction: level.player.direction },
		motion: null,
	}));
	const [angle, setAngle] = useState<number>(() => DIRECTION_ANGLES[level.player.direction]);
	const [status, setStatus] = useState<RunOutcome | 'idle' | 'running'>('idle');

	function clearFrame() {
		if (frameRef.current !== null) {
			window.cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
		}
	}

	function clearTimer() {
		clearFrame();
		if (timerRef.current !== null) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}

	/** Move the mouse to `next`, sliding in from `from` when it is a step. */
	function applyPlayer(next: PlayerState, from?: Position, ms: number = MOVE_STEP_MS): void {
		setView({ player: next, motion: from === undefined ? null : { from, ms } });
		setAngle((current) => current + shortestTurn(current, DIRECTION_ANGLES[next.direction]));
	}

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			if (frameRef.current !== null) {
				window.cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
		};
	}, []);

	const [lastRun, setLastRun] = useState<{ blocks: number; cycles: bigint } | null>(null);
	const [runId, setRunId] = useState<number>(0);

	useEffect(() => {
		clearTimer();
		runningRef.current = false;
		setStatus('idle');
		setLastRun(null);
		setView({
			player: { x: level.player.x, y: level.player.y, direction: level.player.direction },
			motion: null,
		});
		setAngle(
			(current) => current + shortestTurn(current, DIRECTION_ANGLES[level.player.direction]),
		);
	}, [level, sequence]);

	const usedBlockCount = lastRun ? lastRun.blocks : countBlocks(sequence);
	const usedIterations = lastRun ? lastRun.cycles : 0n;
	const isRunning = status === 'running';
	const canReset = true;

	function run() {
		if (runningRef.current || sequence[0]?.action !== 'start') {
			return;
		}
		clearTimer();

		const start: PlayerState = {
			x: level.player.x,
			y: level.player.y,
			direction: level.player.direction,
		};

		function finish(nextStatus: RunOutcome | 'idle' | 'running', delayMs: number) {
			runningRef.current = false;
			if (delayMs <= 0) {
				setStatus(nextStatus);
				return;
			}
			timerRef.current = window.setTimeout(() => {
				timerRef.current = null;
				setStatus(nextStatus);
			}, delayMs);
		}

		function win() {
			playSound('won');
			finish('won', WIN_SETTLE_MS);
		}

		setLastRun({
			blocks: countBlocks(sequence),
			cycles: countExecutedCycles(sequence, level, start),
		});
		setRunId((previousRunId) => previousRunId + 1);
		applyPlayer(start);
		setStatus('running');
		runningRef.current = true;

		const result = runSequence(sequence, level, start);

		function animateResult(res: RunResult, steps: readonly SequenceItem[]) {
			let current = start;
			let index = 0;
			const flatSteps = collectExecutedActions(steps, level, start);

			function finishOutcome() {
				playSound(outcomeSound(res.outcome, trapKindAt(level, current)));
				finish(res.outcome, FAILURE_SETTLE_MS);
			}

			function tick() {
				if (!runningRef.current) {
					return;
				}
				if (current.x === level.target.x && current.y === level.target.y) {
					applyPlayer(current);
					win();
					return;
				}

				if (index >= flatSteps.length) {
					finishOutcome();
					return;
				}

				const nextAction = flatSteps[index];
				if (!nextAction) {
					finishOutcome();
					return;
				}
				const step = stepAction(current, nextAction, level);
				if (isTrapped(step.playerState, level)) {
					applyPlayer(step.playerState, current, MOVE_STEP_MS);
					playSound(outcomeSound('trapped', trapKindAt(level, step.playerState)));
					finish('trapped', TRAP_SETTLE_MS);
					return;
				}
				if (!step.isSuccessful) {
					applyPlayer(current);
					playSound('blocked');
					finish('blocked', FAILURE_SETTLE_MS);
					return;
				}
				const trail = getMoveTrail(current, nextAction, level);
				if (trail.length > 1) {
					let trailIndex = 0;
					function animateTrail() {
						if (!runningRef.current) {
							return;
						}
						if (trailIndex >= trail.length) {
							const previous = current;
							current = step.playerState;
							applyPlayer(current, previous, SLIDE_STEP_MS);
							index += 1;
							if (current.x === level.target.x && current.y === level.target.y) {
								win();
								return;
							}
							timerRef.current = window.setTimeout(tick, 80);
							return;
						}
						const position = trail[trailIndex]!;
						const previous = current;
						current = { ...current, x: position.x, y: position.y };
						applyPlayer(current, previous, SLIDE_STEP_MS);
						if (isTrapped(current, level)) {
							playSound(outcomeSound('trapped', trapKindAt(level, current)));
							finish('trapped', TRAP_SETTLE_MS);
							return;
						}
						if (current.x === level.target.x && current.y === level.target.y) {
							win();
							return;
						}
						trailIndex += 1;
						timerRef.current = window.setTimeout(animateTrail, SLIDE_STEP_MS);
					}
					animateTrail();
					return;
				}
				const previous = current;
				current = step.playerState;
				const moved = previous.x !== current.x || previous.y !== current.y;
				applyPlayer(current, moved ? previous : undefined, MOVE_STEP_MS);
				if (isTrapped(current, level)) {
					playSound(outcomeSound('trapped', trapKindAt(level, current)));
					finish('trapped', TRAP_SETTLE_MS);
					return;
				}
				index += 1;

				if (current.x === level.target.x && current.y === level.target.y) {
					win();
					return;
				}

				timerRef.current = window.setTimeout(tick, 400);
			}

			// Paint the reset state before the first action.
			frameRef.current = window.requestAnimationFrame(() => {
				frameRef.current = window.requestAnimationFrame(() => {
					frameRef.current = null;
					tick();
				});
			});
		}

		animateResult(result, sequence);
	}

	function stop() {
		clearTimer();
		runningRef.current = false;
		setStatus('idle');
		applyPlayer({ x: level.player.x, y: level.player.y, direction: level.player.direction });
	}

	function reset(resetSequence: () => void) {
		clearTimer();

		runningRef.current = false;
		applyPlayer({ x: level.player.x, y: level.player.y, direction: level.player.direction });
		resetSequence();
		setStatus('idle');
		setLastRun(null);
	}

	return {
		player: view.player,
		motion: view.motion,
		angle,
		status,
		setStatus,
		usedBlockCount,
		usedIterations,
		isRunning,
		canReset,
		run,
		stop,
		reset,
		runningRef,
		timerRef,
		runId,
	};
}

export { DIRECTION_ANGLES, useSimulation };
export type { PlayerMotion };
