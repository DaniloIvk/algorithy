import {
	array,
	check,
	maxLength,
	minLength,
	number,
	object,
	optional,
	pipe,
	safeParse,
	string,
} from 'valibot';
import { BlockKindSchema, type BlockKind } from './block.schema';
import { TerrainNameSchema, type TerrainName } from './terrain.schema';
import { DirectionSchema, type Direction } from './level.schema';
import { OptimalSolutionSchema, type OptimalSolutionItem } from './sequence.schema';

/**
 * The shared level boundary. A share link decodes into exactly this shape
 * before it is trusted: the level fields a built-in level file has (map,
 * player, target, theme), plus a title, an author (possibly empty, meaning
 * anonymous) and the creator's solution. Identity, palette and optimum counts
 * are derived later, so they are deliberately absent here.
 */

const SHARED_LEVEL_MIN_SIZE = 3;
const SHARED_LEVEL_MAX_SIZE = 16;
const SHARED_LEVEL_MAX_TITLE_LENGTH = 60;
const SHARED_LEVEL_MAX_AUTHOR_LENGTH = 40;
const SHARED_LEVEL_MAX_SOLUTION_ITEMS = 20;

const SizeSchema = pipe(
	number(),
	check((value) => Number.isInteger(value), 'size must be an integer.'),
	check(
		(value) => value >= SHARED_LEVEL_MIN_SIZE && value <= SHARED_LEVEL_MAX_SIZE,
		`size must be between ${SHARED_LEVEL_MIN_SIZE} and ${SHARED_LEVEL_MAX_SIZE}.`,
	),
);

const CoordinateSchema = pipe(
	number(),
	check((value) => Number.isInteger(value), 'coordinate must be an integer.'),
);

const SharedLevelSchema = pipe(
	object({
		width: SizeSchema,
		height: SizeSchema,
		terrain: TerrainNameSchema,
		player: object({
			x: CoordinateSchema,
			y: CoordinateSchema,
			direction: optional(DirectionSchema, 'right'),
		}),
		target: object({ x: CoordinateSchema, y: CoordinateSchema }),
		cells: array(BlockKindSchema),
		title: pipe(string(), minLength(1), maxLength(SHARED_LEVEL_MAX_TITLE_LENGTH)),
		author: pipe(string(), maxLength(SHARED_LEVEL_MAX_AUTHOR_LENGTH)),
		solution: OptimalSolutionSchema,
	}),
	check(
		(level) => level.cells.length === level.width * level.height,
		'cells must match the level size.',
	),
	check(
		(level) =>
			level.player.x >= 0 &&
			level.player.x < level.width &&
			level.player.y >= 0 &&
			level.player.y < level.height,
		'player must be inside the level.',
	),
	check(
		(level) =>
			level.target.x >= 0 &&
			level.target.x < level.width &&
			level.target.y >= 0 &&
			level.target.y < level.height,
		'target must be inside the level.',
	),
	check((level) => level.solution.length > 0, 'a shared level needs a solution.'),
);

type SharedLevel = {
	readonly width: number;
	readonly height: number;
	readonly terrain: TerrainName;
	readonly player: { readonly x: number; readonly y: number; readonly direction: Direction };
	readonly target: { readonly x: number; readonly y: number };
	readonly cells: readonly BlockKind[];
	readonly title: string;
	readonly author: string;
	readonly solution: readonly OptimalSolutionItem[];
};

function parseSharedLevel(data: unknown): SharedLevel | null {
	const result = safeParse(SharedLevelSchema, data);

	return result.success ? result.output : null;
}

export {
	SHARED_LEVEL_MAX_AUTHOR_LENGTH,
	SHARED_LEVEL_MAX_SIZE,
	SHARED_LEVEL_MAX_SOLUTION_ITEMS,
	SHARED_LEVEL_MAX_TITLE_LENGTH,
	SHARED_LEVEL_MIN_SIZE,
	SharedLevelSchema,
	parseSharedLevel,
};
export type { SharedLevel };
