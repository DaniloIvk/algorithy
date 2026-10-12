import {
	array,
	boolean,
	check,
	lazy,
	literal,
	number,
	object,
	optional,
	pipe,
	readonly,
	safeParse,
	string,
	union,
	type BaseIssue,
	type GenericSchema,
} from 'valibot';
import { actionNames, type ActionName } from '../domain/actions';
import { conditionNames, type ConditionName } from '../domain/conditions';

const switchConditionNames = ['path-ahead', 'path-left', 'path-right', 'default'] as const;
type SwitchCondition = (typeof switchConditionNames)[number];

const SwitchConditionSchema = pipe(
	string(),
	check(
		(value) => (switchConditionNames as readonly string[]).includes(value),
		'Condition must be path-ahead, path-left, path-right or default.',
	),
);

const ActionNameSchema = union(actionNames.map((actionName) => literal(actionName)));

const CountSchema = pipe(
	number(),
	check((value) => Number.isInteger(value), 'Count must be an integer.'),
	check((value) => value >= 1 && value <= 99, 'Count must be between 1 and 99.'),
);

const ConditionSchema = pipe(
	string(),
	check(
		(value) => (conditionNames as readonly string[]).includes(value),
		'Condition must be path-ahead, path-left or path-right.',
	),
);

type SwitchBranch = {
	readonly condition: SwitchCondition;
	readonly children: readonly SequenceItem[];
	readonly modifiable?: boolean;
};

type SequenceItem = {
	readonly kind: 'algorithm';
	readonly id: string;
	readonly action: ActionName;
	readonly label: string;
	readonly from?: number;
	readonly sourceId?: string;
	readonly default: boolean;
	readonly count?: number;
	readonly condition?: ConditionName;
	readonly branches?: readonly SwitchBranch[];
	readonly movable: boolean;
	readonly modifiable?: boolean;
	readonly children?: readonly SequenceItem[];
	readonly elseChildren?: readonly SequenceItem[];
};

const SequenceItemSchema = pipe(
	object({
		kind: literal('algorithm'),
		id: string(),
		action: ActionNameSchema,
		label: string(),
		from: optional(number()),
		sourceId: optional(string()),
		default: boolean(),
		count: optional(CountSchema),
		condition: optional(ConditionSchema),
		movable: boolean(),
		modifiable: optional(boolean()),
		children: optional(array(lazy(() => SequenceItemSchema))),
		branches: optional(
			array(
				object({
					condition: SwitchConditionSchema,
					children: array(lazy(() => SequenceItemSchema)),
					modifiable: optional(boolean()),
				}),
			),
		),
		elseChildren: optional(array(lazy(() => SequenceItemSchema))),
	}),
	readonly(),
) as unknown as GenericSchema<unknown, SequenceItem, BaseIssue<unknown>>;

const SequenceSchema = pipe(array(SequenceItemSchema), readonly()) as unknown as GenericSchema<
	unknown,
	readonly SequenceItem[],
	BaseIssue<unknown>
>;

type SwitchBranchOptimal = {
	readonly condition: SwitchCondition;
	readonly children: readonly OptimalSolutionItem[];
	readonly modifiable?: boolean;
};

type OptimalSolutionItem = {
	readonly action: ActionName;
	readonly count?: number;
	readonly condition?: ConditionName;
	readonly modifiable?: boolean;
	readonly children?: readonly OptimalSolutionItem[];
	readonly elseChildren?: readonly OptimalSolutionItem[];
	readonly branches?: readonly SwitchBranchOptimal[];
};

const OptimalSolutionItemSchema = pipe(
	object({
		action: ActionNameSchema,
		count: optional(CountSchema),
		condition: optional(ConditionSchema),
		modifiable: optional(boolean()),
		children: optional(array(lazy(() => OptimalSolutionItemSchema))),
		branches: optional(
			array(
				object({
					condition: SwitchConditionSchema,
					children: array(lazy(() => OptimalSolutionItemSchema)),
					modifiable: optional(boolean()),
				}),
			),
		),
		elseChildren: optional(array(lazy(() => OptimalSolutionItemSchema))),
	}),
	check((item) => {
		if (item.action === 'start') {
			return false;
		}

		return true;
	}, 'optimalSolution must not contain start'),
	check((item) => {
		if (item.action === 'for') {
			return item.count !== undefined && item.children !== undefined && item.children.length > 0;
		}

		if (item.action === 'while') {
			return item.children !== undefined && item.children.length > 0;
		}

		if (item.count !== undefined) {
			return false;
		}

		return true;
	}, 'for requires count and non-empty children, while requires non-empty children, other actions must not have count'),
	check((item) => {
		if (item.action === 'if') {
			return item.condition !== undefined;
		}

		if (item.condition !== undefined) {
			return false;
		}

		return true;
	}, 'if requires condition, other actions must not have condition'),
	check((item) => {
		if (item.action === 'for' && item.elseChildren !== undefined) {
			return false;
		}

		if (item.action === 'while' && item.count !== undefined) {
			return false;
		}

		if (item.action === 'while' && item.elseChildren !== undefined) {
			return false;
		}

		return true;
	}, 'for and while must not have elseChildren, while must not have count'),
	check((item) => {
		if (
			item.action !== 'for' &&
			item.action !== 'if' &&
			item.action !== 'while' &&
			item.action !== 'switch'
		) {
			return item.children === undefined && item.elseChildren === undefined;
		}

		return true;
	}, 'only for, if, while and switch may have children'),
	check((item) => {
		if (item.action === 'switch') {
			return item.branches !== undefined && item.branches.length > 0;
		}
		if (item.branches !== undefined) {
			return false;
		}
		return true;
	}, 'switch requires non-empty branches, other actions must not have branches'),
	readonly(),
) as unknown as GenericSchema<unknown, OptimalSolutionItem, BaseIssue<unknown>>;

const OptimalSolutionSchema = pipe(
	array(OptimalSolutionItemSchema),
	readonly(),
) as unknown as GenericSchema<unknown, readonly OptimalSolutionItem[], BaseIssue<unknown>>;

function parseSequence(data: unknown): SequenceItem[] | null {
	const result = safeParse(SequenceSchema, data);

	if (result.success === false) {
		return null;
	}

	return [...result.output];
}

function parseCount(value: unknown): number | null {
	const result = safeParse(CountSchema, value);

	if (result.success === false) {
		return null;
	}

	return result.output;
}

function parseOptimalSolution(data: unknown): readonly OptimalSolutionItem[] | null {
	const result = safeParse(OptimalSolutionSchema, data);

	if (result.success === false) {
		return null;
	}

	return [...result.output];
}

export {
	ActionNameSchema,
	ConditionSchema,
	CountSchema,
	OptimalSolutionItemSchema,
	OptimalSolutionSchema,
	SequenceItemSchema,
	SequenceSchema,
	SwitchConditionSchema,
	parseCount,
	parseOptimalSolution,
	parseSequence,
};
export type { OptimalSolutionItem, SequenceItem, SwitchCondition };
