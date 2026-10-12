import { blocks } from './blocks';
import type { BlockKind } from '../schemas/block.schema';
import type { ActionName } from './actions';
import type { ConditionName } from './conditions';
import type { Direction, LevelData, Position } from '../schemas/level.schema';
import type { OptimalSolutionItem } from '../schemas/sequence.schema';

type PlayerState = { readonly direction: Direction } & Position;

const DIRECTION_DELTAS: Record<Direction, Position> = {
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 },
};

const TURN_RIGHT: Record<Direction, Direction> = {
	up: 'right',
	right: 'down',
	down: 'left',
	left: 'up',
};

const TURN_LEFT: Record<Direction, Direction> = {
	up: 'left',
	left: 'down',
	down: 'right',
	right: 'up',
};

const INFINITE_LOOP_REPETITION_THRESHOLD = 3;
const INITIAL_STATE_VISIT_COUNT = 1;

type SwitchBranch = {
	readonly condition: ConditionName | 'default';
	readonly children: readonly SequenceItem[];
};

type SequenceItem = {
	readonly action: ActionName;
	readonly count?: number;
	readonly condition?: ConditionName;
	readonly branches?: readonly SwitchBranch[];
	readonly children?: readonly SequenceItem[];
	readonly elseChildren?: readonly SequenceItem[];
};

type StepResult = {
	readonly playerState: PlayerState;
	readonly isSuccessful: boolean;
};

type RunOutcome = 'won' | 'blocked' | 'not-reached' | 'infinite-loop' | 'trapped';

type RunResult = {
	readonly playerState: PlayerState;
	readonly outcome: RunOutcome;
	readonly iterationsUsed: bigint;
	readonly executedCycles: bigint;
};

function buildPlayerKey(playerState: PlayerState): string {
	return `${playerState.x}:${playerState.y}:${playerState.direction}`;
}

function isAtTarget(position: Position, levelData: LevelData): boolean {
	return position.x === levelData.target.x && position.y === levelData.target.y;
}

function isTrapped(position: Position, levelData: LevelData): boolean {
	const kind = levelData.map[position.y]?.[position.x] as BlockKind | undefined;
	return kind === 'lava' || kind === 'hole';
}

function createInfiniteLoopDetector(initialPlayerState: PlayerState) {
	const visitedStateCounts = new Map<string, number>();
	visitedStateCounts.set(buildPlayerKey(initialPlayerState), INITIAL_STATE_VISIT_COUNT);

	return {
		recordStateAndCheckForLoop(currentPlayerState: PlayerState): boolean {
			const stateKey = buildPlayerKey(currentPlayerState);
			const occurrenceCount = (visitedStateCounts.get(stateKey) ?? 0) + 1;
			visitedStateCounts.set(stateKey, occurrenceCount);
			return occurrenceCount >= INFINITE_LOOP_REPETITION_THRESHOLD;
		},
	};
}

function isWithinBounds(position: Position, levelData: LevelData): boolean {
	return (
		position.x >= 0 &&
		position.y >= 0 &&
		position.x < levelData.width &&
		position.y < levelData.height
	);
}

function collectSlidingTrail(
	startPosition: Position,
	movementDelta: Position,
	levelData: LevelData,
): readonly Position[] {
	const slidingTrail: Position[] = [];
	let currentPosition: Position = startPosition;
	const maximumSlideSteps = levelData.width * levelData.height;
	let slideCount = 0;

	while (
		blocks[levelData.map[currentPosition.y]?.[currentPosition.x] as BlockKind]?.slidable &&
		slideCount < maximumSlideSteps
	) {
		if (isAtTarget(currentPosition, levelData)) {
			break;
		}

		const aheadPosition: Position = {
			x: currentPosition.x + movementDelta.x,
			y: currentPosition.y + movementDelta.y,
		};

		if (!isWithinBounds(aheadPosition, levelData)) {
			break;
		}

		const aheadCellKind = levelData.map[aheadPosition.y]?.[aheadPosition.x];
		if (!aheadCellKind) {
			break;
		}

		const aheadBlockProperties = blocks[aheadCellKind as BlockKind];
		if (!aheadBlockProperties?.passable) {
			break;
		}

		currentPosition = { x: aheadPosition.x, y: aheadPosition.y };
		slidingTrail.push({ x: currentPosition.x, y: currentPosition.y });
		slideCount += 1;

		if (isAtTarget(currentPosition, levelData)) {
			break;
		}

		if (!blocks[levelData.map[currentPosition.y]?.[currentPosition.x] as BlockKind]?.slidable) {
			break;
		}
	}

	return slidingTrail;
}

function stepAction(
	playerState: PlayerState,
	actionName: ActionName,
	levelData: LevelData,
): StepResult {
	if (actionName === 'turn-right') {
		const nextPlayerState: PlayerState = {
			...playerState,
			direction: TURN_RIGHT[playerState.direction],
		};
		return {
			playerState: nextPlayerState,
			isSuccessful: true,
		};
	}

	if (actionName === 'turn-left') {
		const nextPlayerState: PlayerState = {
			...playerState,
			direction: TURN_LEFT[playerState.direction],
		};
		return {
			playerState: nextPlayerState,
			isSuccessful: true,
		};
	}

	if (actionName === 'move-forward') {
		const movementDelta = DIRECTION_DELTAS[playerState.direction];
		const nextPosition: Position = {
			x: playerState.x + movementDelta.x,
			y: playerState.y + movementDelta.y,
		};

		if (!isWithinBounds(nextPosition, levelData)) {
			return { playerState, isSuccessful: false };
		}

		const targetCellKind = levelData.map[nextPosition.y]?.[nextPosition.x];
		if (!targetCellKind) {
			return { playerState, isSuccessful: false };
		}

		const targetBlockProperties = blocks[targetCellKind as BlockKind];
		if (!targetBlockProperties?.passable) {
			return { playerState, isSuccessful: false };
		}

		let destinationPlayerState: PlayerState = {
			...playerState,
			x: nextPosition.x,
			y: nextPosition.y,
			direction: playerState.direction,
		};

		const slidingTrail = collectSlidingTrail(nextPosition, movementDelta, levelData);

		if (slidingTrail.length > 0) {
			const finalPosition = slidingTrail.at(-1);
			if (finalPosition) {
				destinationPlayerState = {
					...destinationPlayerState,
					x: finalPosition.x,
					y: finalPosition.y,
				};
			}
		}

		return {
			playerState: destinationPlayerState,
			isSuccessful: true,
		};
	}

	return { playerState, isSuccessful: true };
}

function getMoveTrail(
	playerState: PlayerState,
	actionName: ActionName,
	levelData: LevelData,
): readonly Position[] {
	if (actionName !== 'move-forward') {
		return [];
	}

	const movementDelta = DIRECTION_DELTAS[playerState.direction];
	const nextPosition: Position = {
		x: playerState.x + movementDelta.x,
		y: playerState.y + movementDelta.y,
	};

	if (!isWithinBounds(nextPosition, levelData)) {
		return [];
	}

	const targetCellKind = levelData.map[nextPosition.y]?.[nextPosition.x];
	if (!targetCellKind) {
		return [];
	}

	const targetBlockProperties = blocks[targetCellKind as BlockKind];
	if (!targetBlockProperties?.passable) {
		return [];
	}

	const initialTrail: Position[] = [{ x: nextPosition.x, y: nextPosition.y }];
	const slidingTrail = collectSlidingTrail(nextPosition, movementDelta, levelData);

	return [...initialTrail, ...slidingTrail];
}

function evaluateCondition(
	playerState: PlayerState,
	conditionName: ConditionName,
	levelData: LevelData,
): boolean {
	const relativeDirection = conditionName.split('-')[1] as 'ahead' | 'left' | 'right';
	const resolvedDirection =
		relativeDirection === 'ahead'
			? playerState.direction
			: relativeDirection === 'left'
				? TURN_LEFT[playerState.direction]
				: TURN_RIGHT[playerState.direction];
	const movementDelta = DIRECTION_DELTAS[resolvedDirection];
	const adjacentPosition: Position = {
		x: playerState.x + movementDelta.x,
		y: playerState.y + movementDelta.y,
	};

	if (!isWithinBounds(adjacentPosition, levelData)) {
		return false;
	}

	const adjacentCellKind = levelData.map[adjacentPosition.y]?.[adjacentPosition.x];
	if (!adjacentCellKind) {
		return false;
	}

	const adjacentBlockProperties = blocks[adjacentCellKind as BlockKind];
	return adjacentBlockProperties?.passable ?? false;
}

function countIterations(sequenceItems: readonly SequenceItem[]): bigint {
	return sequenceItems.reduce((totalCycles: bigint, sequenceItem) => {
		if (sequenceItem.action === 'start') {
			return totalCycles;
		}

		if (sequenceItem.action === 'for') {
			const innerCycleCount = sequenceItem.children ? countIterations(sequenceItem.children) : 0n;
			const repeatCount = BigInt(sequenceItem.count ?? 1);
			return totalCycles + 2n + repeatCount * (2n + innerCycleCount);
		}

		if (sequenceItem.action === 'switch') {
			const branchList = sequenceItem.branches ?? [];
			let maximumBranchCycles = 0n;
			for (const switchBranch of branchList) {
				const branchCycleCount = countIterations(switchBranch.children);
				if (branchCycleCount > maximumBranchCycles) {
					maximumBranchCycles = branchCycleCount;
				}
			}
			return totalCycles + 1n + maximumBranchCycles;
		}

		if (sequenceItem.action === 'while') {
			const innerCycleCount = sequenceItem.children ? countIterations(sequenceItem.children) : 0n;
			return totalCycles + 1n + innerCycleCount;
		}

		if (sequenceItem.action === 'if') {
			const thenCycleCount = sequenceItem.children ? countIterations(sequenceItem.children) : 0n;
			const elseCycleCount = sequenceItem.elseChildren
				? countIterations(sequenceItem.elseChildren)
				: 0n;
			const maximumBranchCycles = thenCycleCount > elseCycleCount ? thenCycleCount : elseCycleCount;
			return totalCycles + 1n + maximumBranchCycles;
		}

		return totalCycles + 1n;
	}, 0n);
}

function formatCycles(cycleCount: bigint): string {
	return cycleCount.toString();
}

/**
 * Cost of the written program: the full cycle count, independent of when the
 * mouse reaches the target. Blocks after the winning move are counted, and a
 * `for` loop always runs all of its repetitions, so a program that keeps
 * repeating after the goal costs more than the optimum. This is deliberate -
 * the cost reflects the program the player wrote, not just the walk that won.
 *
 * Visual execution (`runSequence`, `collectExecutedActions`) stops at the
 * target instead, so the player sees the win the moment it happens. `while` is
 * the exception here as well: its condition is "target not reached", so it
 * stops naturally when the target is reached.
 */
function countExecutedCycles(
	sequenceItems: readonly SequenceItem[],
	levelData: LevelData,
	initialPlayerState: PlayerState,
): bigint {
	let executedCycleCount = 0n;
	let currentPlayerState = initialPlayerState;
	let hasDetectedInfiniteLoop = false;
	let hasTrapped = false;

	function incrementCycle(): void {
		executedCycleCount += 1n;
	}

	function walk(currentItems: readonly SequenceItem[]): boolean {
		for (const sequenceItem of currentItems) {
			if (hasDetectedInfiniteLoop) {
				return true;
			}

			if (hasTrapped) {
				return true;
			}

			if (sequenceItem.action === 'start') {
				continue;
			}

			if (sequenceItem.action === 'for') {
				incrementCycle();

				const repeatCount = BigInt(sequenceItem.count ?? 1);
				const childItems = sequenceItem.children ?? [];

				for (let repetitionIndex = 0n; repetitionIndex < repeatCount; repetitionIndex++) {
					incrementCycle();

					if (walk(childItems)) {
						return true;
					}

					if (hasDetectedInfiniteLoop) {
						return true;
					}

					incrementCycle();
				}

				incrementCycle();

				continue;
			}

			if (sequenceItem.action === 'while') {
				incrementCycle();

				const childItems = sequenceItem.children ?? [];
				const loopDetector = createInfiniteLoopDetector(currentPlayerState);

				while (!isAtTarget(currentPlayerState, levelData)) {
					incrementCycle();

					if (walk(childItems)) {
						if (hasDetectedInfiniteLoop) {
							return true;
						}
						return true;
					}

					if (hasDetectedInfiniteLoop) {
						return true;
					}

					if (loopDetector.recordStateAndCheckForLoop(currentPlayerState)) {
						hasDetectedInfiniteLoop = true;
						return true;
					}
				}

				continue;
			}

			if (sequenceItem.action === 'switch' && sequenceItem.branches) {
				let matchedBranch: (typeof sequenceItem.branches)[number] | null = null;

				for (const switchBranch of sequenceItem.branches) {
					if (
						switchBranch.condition === 'default' ||
						evaluateCondition(
							currentPlayerState,
							switchBranch.condition as ConditionName,
							levelData,
						)
					) {
						matchedBranch = switchBranch;
						break;
					}
				}

				if (matchedBranch && matchedBranch.children.length === 0) {
					incrementCycle();
					continue;
				}

				incrementCycle();

				if (matchedBranch) {
					if (walk(matchedBranch.children)) {
						if (hasDetectedInfiniteLoop) {
							return true;
						}
						return true;
					}

					if (hasDetectedInfiniteLoop) {
						return true;
					}
				}

				continue;
			}

			if (sequenceItem.action === 'if') {
				incrementCycle();

				const branchItems = evaluateCondition(
					currentPlayerState,
					(sequenceItem.condition ?? 'path-ahead') as ConditionName,
					levelData,
				)
					? (sequenceItem.children ?? [])
					: (sequenceItem.elseChildren ?? []);

				if (walk(branchItems)) {
					if (hasDetectedInfiniteLoop) {
						return true;
					}
					return true;
				}

				if (hasDetectedInfiniteLoop) {
					return true;
				}

				continue;
			}

			incrementCycle();

			if (isAtTarget(currentPlayerState, levelData)) {
				continue;
			}

			const stepResult = stepAction(currentPlayerState, sequenceItem.action, levelData);
			if (!stepResult.isSuccessful) {
				return true;
			}

			if (isTrapped(stepResult.playerState, levelData)) {
				hasTrapped = true;
				return true;
			}

			currentPlayerState = stepResult.playerState;
		}

		return false;
	}

	walk(sequenceItems);
	return executedCycleCount;
}

/** A tree node that can carry `for` repetitions, in the player's or authored shape. */
type RepetitionNode = {
	readonly action: ActionName;
	readonly count?: number;
	readonly children?: readonly RepetitionNode[];
	readonly elseChildren?: readonly RepetitionNode[];
	readonly branches?: readonly { readonly children: readonly RepetitionNode[] }[];
};

type LevelOptimum = {
	readonly optimalIterations: bigint;
	readonly optimalSolution: readonly RepetitionNode[];
};

function collectForRepetitionCounts(items: readonly RepetitionNode[]): number[] {
	const repetitionCounts: number[] = [];

	for (const item of items) {
		if (item.action === 'for') {
			repetitionCounts.push(item.count ?? 1);
		}

		if (item.children !== undefined) {
			repetitionCounts.push(...collectForRepetitionCounts(item.children));
		}

		if (item.elseChildren !== undefined) {
			repetitionCounts.push(...collectForRepetitionCounts(item.elseChildren));
		}

		if (item.branches !== undefined) {
			for (const branch of item.branches) {
				repetitionCounts.push(...collectForRepetitionCounts(branch.children));
			}
		}
	}

	return repetitionCounts;
}

/**
 * True when a run used more cycles than the optimum and the excess can be
 * explained by `for` loops repeating more times than the authored solution
 * (paired loop by loop, in traversal order). A hint for the outcome message,
 * never a correctness rule.
 */
function detectExcessRepetitions(
	sequenceItems: readonly RepetitionNode[],
	levelOptimum: LevelOptimum,
	executedCycles: bigint,
): boolean {
	if (executedCycles <= levelOptimum.optimalIterations) {
		return false;
	}

	const executedRepetitionCounts = collectForRepetitionCounts(sequenceItems);
	const optimalRepetitionCounts = collectForRepetitionCounts(levelOptimum.optimalSolution);

	if (executedRepetitionCounts.length > optimalRepetitionCounts.length) {
		return true;
	}

	return executedRepetitionCounts.some((executedCount, index) => {
		const optimalCount = optimalRepetitionCounts[index];
		return optimalCount !== undefined && executedCount > optimalCount;
	});
}

function countBlocks(sequenceItems: readonly SequenceItem[]): number {
	return sequenceItems.reduce((totalBlocks, sequenceItem) => {
		if (sequenceItem.action === 'for' && sequenceItem.children) {
			return totalBlocks + 1 + countBlocks(sequenceItem.children);
		}

		if (sequenceItem.action === 'while' && sequenceItem.children) {
			return totalBlocks + 1 + countBlocks(sequenceItem.children);
		}

		if (sequenceItem.action === 'switch' && sequenceItem.branches) {
			return (
				totalBlocks +
				1 +
				sequenceItem.branches.reduce(
					(branchTotal, switchBranch) => branchTotal + countBlocks(switchBranch.children),
					0,
				)
			);
		}

		if (sequenceItem.action === 'if') {
			const thenBlockCount = sequenceItem.children ? countBlocks(sequenceItem.children) : 0;
			const elseBlockCount = sequenceItem.elseChildren ? countBlocks(sequenceItem.elseChildren) : 0;
			return totalBlocks + 1 + thenBlockCount + elseBlockCount;
		}

		return totalBlocks + 1;
	}, 0);
}

function collectExecutedActions(
	sequenceItems: readonly SequenceItem[],
	levelData: LevelData,
	initialPlayerState: PlayerState,
): ActionName[] {
	const executedActions: ActionName[] = [];
	let currentPlayerState = initialPlayerState;
	let hasDetectedInfiniteLoop = false;
	let hasTrapped = false;

	function walk(currentItems: readonly SequenceItem[]): boolean {
		for (const sequenceItem of currentItems) {
			if (hasDetectedInfiniteLoop) {
				return true;
			}

			if (hasTrapped) {
				return true;
			}

			if (isAtTarget(currentPlayerState, levelData)) {
				return true;
			}

			if (sequenceItem.action === 'start') {
				continue;
			}

			if (sequenceItem.action === 'for' && sequenceItem.children) {
				const repeatCount = sequenceItem.count ?? 1;
				for (let repetitionIndex = 0; repetitionIndex < repeatCount; repetitionIndex++) {
					if (isAtTarget(currentPlayerState, levelData)) {
						return true;
					}

					if (walk(sequenceItem.children)) {
						return true;
					}

					if (hasDetectedInfiniteLoop) {
						return true;
					}
				}
				continue;
			}

			if (sequenceItem.action === 'while' && sequenceItem.children) {
				const loopDetector = createInfiniteLoopDetector(currentPlayerState);

				while (!isAtTarget(currentPlayerState, levelData)) {
					if (walk(sequenceItem.children)) {
						if (hasDetectedInfiniteLoop) {
							return true;
						}
						return true;
					}

					if (hasDetectedInfiniteLoop) {
						return true;
					}

					if (isAtTarget(currentPlayerState, levelData)) {
						break;
					}

					if (loopDetector.recordStateAndCheckForLoop(currentPlayerState)) {
						hasDetectedInfiniteLoop = true;
						return true;
					}
				}

				if (hasDetectedInfiniteLoop) {
					return true;
				}

				continue;
			}

			if (sequenceItem.action === 'switch' && sequenceItem.branches) {
				for (const switchBranch of sequenceItem.branches) {
					if (
						switchBranch.condition === 'default' ||
						evaluateCondition(
							currentPlayerState,
							switchBranch.condition as ConditionName,
							levelData,
						)
					) {
						if (walk(switchBranch.children)) {
							if (hasDetectedInfiniteLoop) {
								return true;
							}
							return true;
						}

						if (hasDetectedInfiniteLoop) {
							return true;
						}

						break;
					}
				}
				continue;
			}

			if (sequenceItem.action === 'if') {
				const conditionName = sequenceItem.condition ?? 'path-ahead';
				const branchItems = evaluateCondition(
					currentPlayerState,
					conditionName as ConditionName,
					levelData,
				)
					? (sequenceItem.children ?? [])
					: (sequenceItem.elseChildren ?? []);

				if (walk(branchItems)) {
					if (hasDetectedInfiniteLoop) {
						return true;
					}
					return true;
				}

				if (hasDetectedInfiniteLoop) {
					return true;
				}

				continue;
			}

			executedActions.push(sequenceItem.action);
			const stepResult = stepAction(currentPlayerState, sequenceItem.action, levelData);
			if (!stepResult.isSuccessful) {
				return true;
			}

			if (isTrapped(stepResult.playerState, levelData)) {
				hasTrapped = true;
				return true;
			}

			currentPlayerState = stepResult.playerState;
		}

		return false;
	}

	walk(sequenceItems);
	return executedActions;
}

function runSequence(
	sequenceItems: readonly SequenceItem[],
	levelData: LevelData,
	initialPlayerState: PlayerState,
): RunResult {
	const iterationsUsed = countIterations(sequenceItems);
	const executedCycles = countExecutedCycles(sequenceItems, levelData, initialPlayerState);
	let currentPlayerState = initialPlayerState;
	let outcome: RunOutcome = 'not-reached';
	let hasEncounteredBlock = false;
	let hasDetectedInfiniteLoop = false;
	let hasTrapped = false;

	function walk(currentItems: readonly SequenceItem[]): boolean {
		for (const sequenceItem of currentItems) {
			if (hasDetectedInfiniteLoop) {
				return true;
			}

			if (hasTrapped) {
				return true;
			}

			if (isAtTarget(currentPlayerState, levelData)) {
				outcome = 'won';
				return true;
			}

			if (sequenceItem.action === 'start') {
				continue;
			}

			if (sequenceItem.action === 'for' && sequenceItem.children) {
				const repeatCount = sequenceItem.count ?? 1;
				for (let repetitionIndex = 0; repetitionIndex < repeatCount; repetitionIndex++) {
					if (isAtTarget(currentPlayerState, levelData)) {
						outcome = 'won';
						return true;
					}

					if (walk(sequenceItem.children)) {
						if (hasDetectedInfiniteLoop) {
							return true;
						}
						return true;
					}

					if (hasDetectedInfiniteLoop) {
						return true;
					}

					if (hasTrapped) {
						return true;
					}

					if (hasEncounteredBlock) {
						return true;
					}
				}
				continue;
			}

			if (sequenceItem.action === 'while' && sequenceItem.children) {
				const loopDetector = createInfiniteLoopDetector(currentPlayerState);

				while (!isAtTarget(currentPlayerState, levelData)) {
					if (walk(sequenceItem.children)) {
						if (hasDetectedInfiniteLoop) {
							return true;
						}
						return true;
					}

					if (hasDetectedInfiniteLoop) {
						return true;
					}

					if (hasTrapped) {
						return true;
					}

					if (hasEncounteredBlock) {
						return true;
					}

					if (isAtTarget(currentPlayerState, levelData)) {
						break;
					}

					if (loopDetector.recordStateAndCheckForLoop(currentPlayerState)) {
						hasDetectedInfiniteLoop = true;
						outcome = 'infinite-loop';
						return true;
					}
				}

				if (hasDetectedInfiniteLoop) {
					return true;
				}

				continue;
			}

			if (sequenceItem.action === 'switch' && sequenceItem.branches) {
				for (const switchBranch of sequenceItem.branches) {
					if (
						switchBranch.condition === 'default' ||
						evaluateCondition(
							currentPlayerState,
							switchBranch.condition as ConditionName,
							levelData,
						)
					) {
						if (walk(switchBranch.children)) {
							if (hasDetectedInfiniteLoop) {
								return true;
							}
							return true;
						}

						if (hasDetectedInfiniteLoop) {
							return true;
						}

						if (hasTrapped) {
							return true;
						}

						if (hasEncounteredBlock) {
							return true;
						}

						break;
					}
				}
				continue;
			}

			if (sequenceItem.action === 'if') {
				const conditionName = sequenceItem.condition ?? 'path-ahead';
				const branchItems = evaluateCondition(
					currentPlayerState,
					conditionName as ConditionName,
					levelData,
				)
					? (sequenceItem.children ?? [])
					: (sequenceItem.elseChildren ?? []);

				if (walk(branchItems)) {
					if (hasDetectedInfiniteLoop) {
						return true;
					}
					return true;
				}

				if (hasDetectedInfiniteLoop) {
					return true;
				}

				if (hasTrapped) {
					return true;
				}

				if (hasEncounteredBlock) {
					return true;
				}

				continue;
			}

			const stepResult = stepAction(currentPlayerState, sequenceItem.action, levelData);
			if (!stepResult.isSuccessful) {
				hasEncounteredBlock = true;
				outcome = 'blocked';
				return true;
			}

			if (isTrapped(stepResult.playerState, levelData)) {
				hasTrapped = true;
				outcome = 'trapped';
				currentPlayerState = stepResult.playerState;
				return true;
			}

			currentPlayerState = stepResult.playerState;
		}

		return false;
	}

	walk(sequenceItems);

	if (hasDetectedInfiniteLoop) {
		outcome = 'infinite-loop';
	} else if (hasTrapped) {
		outcome = 'trapped';
	} else if (!hasEncounteredBlock) {
		if ((outcome as string) === 'won' || isAtTarget(currentPlayerState, levelData)) {
			outcome = 'won';
		} else {
			outcome = 'not-reached';
		}
	}

	return {
		playerState: currentPlayerState,
		outcome,
		iterationsUsed,
		executedCycles,
	};
}

function toSimulationSequence(
	optimalItems: readonly OptimalSolutionItem[],
): readonly SequenceItem[] {
	const startItem: SequenceItem = { action: 'start' };
	const convertedItems = optimalItems.map((optimalItem) => convertOptimalItem(optimalItem));
	return [startItem, ...convertedItems];
}

function convertOptimalItem(optimalItem: OptimalSolutionItem): SequenceItem {
	let convertedItem: SequenceItem = { action: optimalItem.action };

	if (optimalItem.count !== undefined) {
		convertedItem = { ...convertedItem, count: optimalItem.count };
	}

	if (optimalItem.condition !== undefined) {
		convertedItem = { ...convertedItem, condition: optimalItem.condition };
	}

	if (optimalItem.children !== undefined) {
		const convertedChildren = optimalItem.children.map((childItem) =>
			convertOptimalItem(childItem),
		);
		convertedItem = { ...convertedItem, children: convertedChildren };
	}

	if (optimalItem.elseChildren !== undefined) {
		const convertedElseChildren = optimalItem.elseChildren.map((childItem) =>
			convertOptimalItem(childItem),
		);
		convertedItem = { ...convertedItem, elseChildren: convertedElseChildren };
	}

	if (optimalItem.branches !== undefined) {
		const convertedBranches = optimalItem.branches.map((switchBranch) => ({
			condition: switchBranch.condition as ConditionName | 'default',
			children: switchBranch.children.map((childItem) => convertOptimalItem(childItem)),
		}));
		convertedItem = { ...convertedItem, branches: convertedBranches };
	}

	return convertedItem;
}

export {
	INFINITE_LOOP_REPETITION_THRESHOLD,
	isTrapped,
	collectExecutedActions,
	countBlocks,
	countExecutedCycles,
	countIterations,
	detectExcessRepetitions,
	formatCycles,
	getMoveTrail,
	runSequence,
	stepAction,
	toSimulationSequence,
};
export type { LevelOptimum, PlayerState, RepetitionNode, RunOutcome, RunResult };
