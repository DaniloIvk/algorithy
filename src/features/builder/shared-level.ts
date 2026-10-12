import { actionNames, type ActionName } from '../../domain/actions';
import {
	countBlocks,
	countExecutedCycles,
	countIterations,
	runSequence,
	toSimulationSequence,
	type RunOutcome,
} from '../../domain/simulation';
import type { BlockKind, BlockLook } from '../../schemas/block.schema';
import type { Direction, LevelData, Position } from '../../schemas/level.schema';
import {
	parseSharedLevel,
	SHARED_LEVEL_MAX_SOLUTION_ITEMS,
	type SharedLevel,
} from '../../schemas/shared-level.schema';
import type { TerrainName } from '../../schemas/terrain.schema';
import {
	parseOptimalSolution,
	type OptimalSolutionItem,
	type SequenceItem,
} from '../../schemas/sequence.schema';
import { terrainNames } from '../../schemas/terrain.schema';
import { decodeLevelPayload, encodeLevelPayload, type LevelPayload } from './level-codec';
import { levelContentHash } from './level-identity';
import { sequenceItemsToStoredSolution } from './solution-sequence';
import type { BuilderTool } from './tools';

/**
 * The bridge between the builder, a share link and the regular level screen.
 *
 * A shared level is adapted into the same `LevelData` a built-in level uses,
 * so the Playground, the simulator, the outcome modal and the export all
 * work unchanged. Identity comes from the level's content, not the payload
 * hash: the share salt changes on every save, while the board does not, so
 * the same board keeps the same storage key and the same stored solution.
 */

/** Every action a shared level offers; the creator does not curate a palette. */
const SOLVER_ACTIONS: readonly ActionName[] = actionNames.filter((name) => name !== 'start');

/** Level themes a creator can pick. `ice` is a block kind, not a level theme. */
const BUILDER_THEMES: readonly TerrainName[] = terrainNames.filter((name) => name !== 'ice');

/** Authoring limits. The map and solution caps are what keep links short. */
const MAX_PAYLOAD_LENGTH = 2000;
const MAX_ESTIMATED_CYCLES = 200_000;

type BuilderDraft = {
	readonly width: number;
	readonly height: number;
	readonly terrain: TerrainName;
	readonly player: { readonly x: number; readonly y: number; readonly direction: Direction };
	readonly target: { readonly x: number; readonly y: number };
	/** Sparse painted cells, keyed `x:y`. Missing cells are plain ground. */
	readonly cells: ReadonlyMap<string, BlockKind>;
	readonly title: string;
	readonly author: string;
};

function cellKey(x: number, y: number): string {
	return `${x}:${y}`;
}

function clampCoordinate(value: number, maximum: number): number {
	return Math.min(Math.max(value, 0), Math.max(maximum - 1, 0));
}

function createDefaultDraft(width = 5, height = 5): BuilderDraft {
	return {
		width,
		height,
		terrain: 'default',
		player: { x: 1, y: 1, direction: 'right' },
		target: { x: clampCoordinate(width - 2, width), y: clampCoordinate(height - 2, height) },
		cells: new Map(),
		title: '',
		author: '',
	};
}

/** A resize keeps the sparse cells, so growing back restores what was cut. */
function resizeDraft(draft: BuilderDraft, width: number, height: number): BuilderDraft {
	return {
		...draft,
		width,
		height,
		player: {
			...draft.player,
			x: clampCoordinate(draft.player.x, width),
			y: clampCoordinate(draft.player.y, height),
		},
		target: {
			x: clampCoordinate(draft.target.x, width),
			y: clampCoordinate(draft.target.y, height),
		},
	};
}

/**
 * The painted cells as one row-major array. A player or target cell is forced
 * to ground, except that ice may stay underneath: the mouse and the cheese
 * always have a floor, but a level may start or finish on a slide, which
 * some built-in levels do.
 */
function draftCellsToArray(draft: BuilderDraft): BlockKind[] {
	const cells: BlockKind[] = [];
	const isPlayerCell = (x: number, y: number) => draft.player.x === x && draft.player.y === y;
	const isTargetCell = (x: number, y: number) => draft.target.x === x && draft.target.y === y;

	for (let y = 0; y < draft.height; y += 1) {
		for (let x = 0; x < draft.width; x += 1) {
			const painted = draft.cells.get(cellKey(x, y)) ?? 'ground';

			if (isPlayerCell(x, y) || isTargetCell(x, y)) {
				cells.push(painted === 'ice' ? 'ice' : 'ground');
				continue;
			}

			cells.push(painted);
		}
	}

	return cells;
}

/** The look set for a single-theme level; traps borrow the ground theme. */
function looksForTerrain(terrain: TerrainName): Record<BlockKind, BlockLook> {
	return {
		ground: { terrain },
		wall: { terrain },
		ice: { terrain: 'ice' },
		lava: { terrain },
		hole: { terrain },
	};
}

/** Rebuild the sparse paint map from a decoded row-major cell list. */
function cellMapFromCells(
	cells: readonly BlockKind[],
	width: number,
	height: number,
): Map<string, BlockKind> {
	const map = new Map<string, BlockKind>();

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const kind = cells[y * width + x];
			if (kind !== undefined && kind !== 'ground') {
				map.set(cellKey(x, y), kind);
			}
		}
	}

	return map;
}

/** A draft loaded from a share link or the saved draft payload. */
function draftFromPayload(payload: {
	readonly width: number;
	readonly height: number;
	readonly terrain: TerrainName;
	readonly player: { readonly x: number; readonly y: number; readonly direction: Direction };
	readonly target: { readonly x: number; readonly y: number };
	readonly cells: readonly BlockKind[];
	readonly title: string;
	readonly author: string;
}): BuilderDraft {
	return {
		width: payload.width,
		height: payload.height,
		terrain: payload.terrain,
		player: payload.player,
		target: payload.target,
		cells: cellMapFromCells(payload.cells, payload.width, payload.height),
		title: payload.title,
		author: payload.author,
	};
}

/** The draft as a codec payload, ready to encode for a link or a save. */
function draftToPayload(
	draft: BuilderDraft,
	solution: readonly OptimalSolutionItem[],
): LevelPayload {
	return {
		width: draft.width,
		height: draft.height,
		terrain: draft.terrain,
		player: draft.player,
		target: draft.target,
		cells: draftCellsToArray(draft),
		title: draft.title,
		author: draft.author,
		solution,
	};
}

/**
 * Apply one brush stroke. The player and the target are unique: painting one
 * onto the other swaps them, so they can never share a cell.
 */
function paintDraft(draft: BuilderDraft, tool: BuilderTool, position: Position): BuilderDraft {
	if (tool === 'player') {
		const swapped = draft.target.x === position.x && draft.target.y === position.y;
		return {
			...draft,
			player: { ...draft.player, x: position.x, y: position.y },
			...(swapped ? { target: { x: draft.player.x, y: draft.player.y } } : {}),
		};
	}

	if (tool === 'target') {
		const swapped = draft.player.x === position.x && draft.player.y === position.y;
		return {
			...draft,
			target: { x: position.x, y: position.y },
			...(swapped ? { player: { ...draft.player, x: draft.target.x, y: draft.target.y } } : {}),
		};
	}

	const cells = new Map(draft.cells);

	if (tool === 'ground') {
		cells.delete(cellKey(position.x, position.y));
	} else {
		cells.set(cellKey(position.x, position.y), tool);
	}

	return { ...draft, cells };
}

function toLevelPayload(level: SharedLevel) {
	return {
		width: level.width,
		height: level.height,
		terrain: level.terrain,
		player: level.player,
		target: level.target,
		cells: level.cells,
		title: level.title,
		author: level.author,
		solution: level.solution,
	};
}

function buildLevelData(
	input: SharedLevel,
	identity: { readonly id: string; readonly slug: string },
) {
	const map: BlockKind[][] = [];

	for (let y = 0; y < input.height; y += 1) {
		const row: BlockKind[] = [];
		for (let x = 0; x < input.width; x += 1) {
			row.push(input.cells[y * input.width + x] ?? 'ground');
		}
		map.push(row);
	}

	const base: LevelData = {
		id: identity.id,
		title: { en: input.title },
		slug: identity.slug,
		width: input.width,
		height: input.height,
		map,
		player: { x: input.player.x, y: input.player.y, direction: input.player.direction },
		target: { x: input.target.x, y: input.target.y },
		allowedActions: SOLVER_ACTIONS,
		defaultActions: [],
		looks: looksForTerrain(input.terrain),
		optimalActionCount: 0,
		optimalIterations: 0n,
		optimalSolution: input.solution,
	};

	const simulationSequence = toSimulationSequence(input.solution);

	// A hostile or accidental program can be astronomically expensive to
	// simulate, so the static estimate gates the real run.
	if (countIterations(simulationSequence) > BigInt(MAX_ESTIMATED_CYCLES)) {
		return null;
	}

	const start = { x: input.player.x, y: input.player.y, direction: input.player.direction };

	return {
		...base,
		optimalActionCount: countBlocks(simulationSequence),
		optimalIterations: countExecutedCycles(simulationSequence, base, start),
	};
}

type DraftPreparation =
	| { readonly status: 'empty-solution' }
	| { readonly status: 'too-many-blocks' }
	| { readonly status: 'shape' }
	| { readonly status: 'too-heavy' }
	| {
			readonly status: 'ready';
			readonly levelData: LevelData;
			readonly input: SharedLevel;
	  };

type DraftValidation =
	| { readonly status: 'empty-solution' }
	| { readonly status: 'too-many-blocks' }
	| { readonly status: 'no-name' }
	| { readonly status: 'shape' }
	| { readonly status: 'too-heavy' }
	| { readonly status: 'not-won'; readonly outcome: Exclude<RunOutcome, 'won'> }
	| { readonly status: 'too-long' }
	| { readonly status: 'valid'; readonly encoded: string; readonly hash: string };

/** How many authored blocks a draft solution holds, the `start` head aside. */
function authoredBlockCount(solution: readonly SequenceItem[]): number {
	return countBlocks(toSimulationSequence(sequenceItemsToStoredSolution(solution))) - 1;
}

/**
 * Turns a draft and its solution into a runnable level. This is the part the
 * in-page try needs: it neither needs a level name nor a winning program,
 * only a board and a program that can be represented and simulated.
 */
function prepareDraft(draft: BuilderDraft, solution: readonly SequenceItem[]): DraftPreparation {
	const authoredBlocks = authoredBlockCount(solution);

	if (authoredBlocks === 0) {
		return { status: 'empty-solution' };
	}
	if (authoredBlocks > SHARED_LEVEL_MAX_SOLUTION_ITEMS) {
		return { status: 'too-many-blocks' };
	}

	const parsedSolution = parseOptimalSolution(sequenceItemsToStoredSolution(solution));
	if (parsedSolution === null) {
		return { status: 'shape' };
	}

	const parsedLevel = parseSharedLevel({
		width: draft.width,
		height: draft.height,
		terrain: draft.terrain,
		player: draft.player,
		target: draft.target,
		cells: draftCellsToArray(draft),
		// The name is only required for sharing, so an unnamed draft runs under
		// a placeholder that never reaches a link or the screen.
		title: draft.title.trim().length > 0 ? draft.title.trim() : 'Draft',
		author: draft.author.trim(),
		solution: parsedSolution,
	});

	if (parsedLevel === null) {
		return { status: 'shape' };
	}

	const levelData = buildLevelData(parsedLevel, { id: 'builder-draft', slug: 'builder-draft' });
	if (levelData === null) {
		return { status: 'too-heavy' };
	}

	return { status: 'ready', levelData, input: parsedLevel };
}

/** The share check: a prepared draft, a name, a winning program, and a link. */
function validateBuilderDraft(
	draft: BuilderDraft,
	solution: readonly SequenceItem[],
	salt: Uint8Array,
): DraftValidation {
	const prepared = prepareDraft(draft, solution);

	if (prepared.status !== 'ready') {
		return { status: prepared.status };
	}

	if (draft.title.trim().length === 0) {
		return { status: 'no-name' };
	}

	const run = runSequence(toSimulationSequence(prepared.input.solution), prepared.levelData, {
		x: prepared.input.player.x,
		y: prepared.input.player.y,
		direction: prepared.input.player.direction,
	});

	if (run.outcome !== 'won') {
		return { status: 'not-won', outcome: run.outcome };
	}

	const encoded = encodeLevelPayload(toLevelPayload(prepared.input), salt) ?? '';

	return { status: 'valid', encoded, hash: levelContentHash(prepared.input, SOLVER_ACTIONS) };
}

/** Decode and validate a share link into a playable level, or null. */
function levelFromPayload(
	encoded: string,
): { readonly level: SharedLevel; readonly levelData: LevelData } | null {
	const decoded = decodeLevelPayload(encoded);
	if (decoded === null) {
		return null;
	}

	const level = parseSharedLevel(decoded);
	if (level === null) {
		return null;
	}

	const hash = levelContentHash(level, SOLVER_ACTIONS);
	const levelData = buildLevelData(level, { id: `shared-${hash}`, slug: `shared-${hash}` });
	if (levelData === null) {
		return null;
	}

	return { level, levelData };
}

export {
	authoredBlockCount,
	BUILDER_THEMES,
	buildLevelData,
	cellKey,
	createDefaultDraft,
	draftCellsToArray,
	draftFromPayload,
	draftToPayload,
	levelFromPayload,
	looksForTerrain,
	MAX_ESTIMATED_CYCLES,
	MAX_PAYLOAD_LENGTH,
	paintDraft,
	prepareDraft,
	resizeDraft,
	SOLVER_ACTIONS,
	toLevelPayload,
	validateBuilderDraft,
};
export type { BuilderDraft, DraftPreparation, DraftValidation };
