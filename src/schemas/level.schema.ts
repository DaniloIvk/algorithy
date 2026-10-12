import {
	array,
	boolean,
	check,
	intersect,
	lazy,
	literal,
	number,
	object,
	optional,
	pipe,
	readonly,
	record,
	safeParse,
	string,
	transform,
	union,
	uuid,
	type BaseIssue,
	type GenericSchema,
	type InferOutput,
} from 'valibot';
import type { ActionName } from '../domain/actions';
import { defaultLooks } from '../domain/blocks';
import {
	BlockKindSchema,
	LookSchema,
	blockKinds,
	type BlockKind,
	type BlockLook,
} from './block.schema';
import {
	ActionNameSchema,
	OptimalSolutionSchema,
	type OptimalSolutionItem,
} from './sequence.schema';

type Position = { readonly x: number; readonly y: number };
type Direction = 'up' | 'down' | 'left' | 'right';
type Player = {
	readonly color?: string;
	readonly direction: Direction;
	readonly x: number;
	readonly y: number;
};
type Target = { readonly color?: string; readonly x: number; readonly y: number };

const PositionSchema = object({ x: number(), y: number() });
const DirectionSchema = union([literal('up'), literal('down'), literal('left'), literal('right')]);
const PlayerSchema = intersect([
	object({ color: optional(string()), direction: optional(DirectionSchema, 'right') }),
	PositionSchema,
]);
const TargetSchema = intersect([object({ color: optional(string()) }), PositionSchema]);

type DefaultAction = {
	readonly action: ActionName;
	readonly movable: boolean;
	readonly modifiable?: boolean;
	readonly count?: number;
	readonly condition?: string;
	readonly branches?: readonly {
		readonly condition: string;
		readonly modifiable?: boolean;
		readonly children?: readonly DefaultAction[];
	}[];
	readonly children?: readonly DefaultAction[];
	readonly elseChildren?: readonly DefaultAction[];
};
const SwitchConditionForDefaultSchema = pipe(
	string(),
	check(
		(value) =>
			(['path-ahead', 'path-left', 'path-right', 'default'] as readonly string[]).includes(value),
		'Condition must be path-ahead, path-left, path-right or default.',
	),
);
const ConditionForDefaultSchema = pipe(
	string(),
	check(
		(value) => (['path-ahead', 'path-left', 'path-right'] as readonly string[]).includes(value),
		'Condition must be path-ahead, path-left or path-right.',
	),
);

const DefaultCountSchema = pipe(
	number(),
	check((value) => Number.isInteger(value), 'Count must be an integer.'),
	check((value) => value >= 1 && value <= 99, 'Count must be between 1 and 99.'),
);

let DefaultActionSchema = pipe(
	object({
		action: ActionNameSchema,
		movable: boolean(),
		modifiable: optional(boolean()),
		count: optional(DefaultCountSchema),
		condition: optional(ConditionForDefaultSchema),
		branches: optional(
			array(
				object({
					condition: SwitchConditionForDefaultSchema,
					children: optional(array(lazy(() => DefaultActionSchema))),
					modifiable: optional(boolean()),
				}),
			),
		),
		children: optional(array(lazy(() => DefaultActionSchema))),
		elseChildren: optional(array(lazy(() => DefaultActionSchema))),
	}),
	readonly(),
) as unknown as GenericSchema<unknown, DefaultAction, BaseIssue<unknown>>;

const OptimalActionCountSchema = pipe(
	number(),
	check((count) => count >= 2 && count < 100, 'optimalActionCount must be between 2 and 99.'),
);

const OptimalIterationsSchema = pipe(
	number(),
	check(
		(count) => count >= 1 && count <= 3000000000,
		'optimalIterations must be between 1 and 3000000000.',
	),
	transform((count) => BigInt(count)),
);

const TitleSchema = pipe(
	record(string(), string()),
	check((titles) => Object.keys(titles).length > 0, 'title must define at least one locale.'),
	check(
		(titles) =>
			Object.values(titles).every((value) => value.trim().length > 0 && value.length <= 80),
		'title values must be 1..80 characters.',
	),
);

const SlugSchema = pipe(
	string(),
	check(
		(value) => /^\d+$/.test(value),
		'slug must be numeric string, reserved for default levels.',
	),
	check((value) => value.length >= 1 && value.length <= 16, 'slug must be 1..16 characters.'),
);

const IdSchema = pipe(string(), uuid('id must be UUID v4'));

function collectOptimalActions(items: readonly OptimalSolutionItem[]): ActionName[] {
	const collected: ActionName[] = [];

	function walk(currentItems: readonly OptimalSolutionItem[]): void {
		for (const currentItem of currentItems) {
			collected.push(currentItem.action);

			if (currentItem.children !== undefined) {
				walk(currentItem.children);
			}

			if (currentItem.elseChildren !== undefined) {
				walk(currentItem.elseChildren);
			}
			if (currentItem.branches !== undefined) {
				for (const branch of currentItem.branches) {
					walk(branch.children);
				}
			}
		}
	}

	walk(items);

	return collected;
}

function collectDefaultActions(items: readonly DefaultAction[]): ActionName[] {
	const collected: ActionName[] = [];

	function walk(currentItems: readonly DefaultAction[]): void {
		for (const currentItem of currentItems) {
			collected.push(currentItem.action);

			if (currentItem.children !== undefined) {
				walk(currentItem.children);
			}

			if (currentItem.elseChildren !== undefined) {
				walk(currentItem.elseChildren);
			}
			if (currentItem.branches !== undefined) {
				for (const branch of currentItem.branches) {
					if (branch.children !== undefined) {
						walk(branch.children);
					}
				}
			}
		}
	}

	walk(items);

	return collected;
}

const LevelObjectSchema = object({
	id: IdSchema,
	title: TitleSchema,
	slug: SlugSchema,
	width: number(),
	height: number(),
	map: array(array(BlockKindSchema)),
	player: PlayerSchema,
	target: TargetSchema,
	allowedActions: pipe(
		array(ActionNameSchema),
		check((actions) => actions.length > 0, 'allowedActions must be non-empty.'),
		check(
			(actions) => new Set(actions).size === actions.length,
			'allowedActions must not contain duplicates.',
		),
	),
	defaultActions: optional(array(DefaultActionSchema), []),
	looks: optional(record(BlockKindSchema, LookSchema)),
	optimalActionCount: OptimalActionCountSchema,
	optimalIterations: OptimalIterationsSchema,
	optimalSolution: OptimalSolutionSchema,
});

type LevelInput = InferOutput<typeof LevelObjectSchema>;

type LevelData = {
	readonly id: string;
	readonly title: Readonly<Record<string, string>>;
	readonly slug: string;
	readonly width: number;
	readonly height: number;
	readonly map: readonly (readonly BlockKind[])[];
	readonly player: Player;
	readonly target: Target;
	readonly allowedActions: readonly ActionName[];
	readonly defaultActions: readonly DefaultAction[];
	readonly looks: Record<BlockKind, BlockLook>;
	readonly optimalActionCount: number;
	readonly optimalIterations: bigint;
	readonly optimalSolution: readonly OptimalSolutionItem[];
};

const LevelSchema = pipe(
	LevelObjectSchema,
	check(
		(level) =>
			level.map.length === level.height && level.map.every((row) => row.length === level.width),
		'Level map must match its width and height.',
	),
	check((level) => {
		const actions = collectDefaultActions(level.defaultActions);
		return actions.every((action) => level.allowedActions.includes(action));
	}, 'defaultActions must be among allowedActions.'),
	check((level) => {
		const actions = collectOptimalActions(level.optimalSolution);

		return actions.every((action) => level.allowedActions.includes(action));
	}, 'optimalSolution uses only allowedActions.'),
	transform<LevelInput, LevelData>((level) => ({
		...level,
		looks: Object.fromEntries(
			blockKinds.map((block) => [
				block,
				{
					// Traps are drawn on top of the floor, like the player and
					// target, so their cell background is the level's ground.
					...(block === 'lava' || block === 'hole'
						? (level.looks?.['ground'] ?? defaultLooks['ground'])
						: defaultLooks[block]),
					...level.looks?.[block],
				},
			]),
		) as Record<BlockKind, BlockLook>,
	})),
);

function parseLevel(data: unknown): LevelData | null {
	const result = safeParse(LevelSchema, data);

	if (result.success === false) {
		return null;
	}

	return result.output;
}

export { ActionNameSchema, DefaultActionSchema, DirectionSchema, LevelSchema, parseLevel };
export type { DefaultAction, Direction, LevelData, Player, Position, Target };
