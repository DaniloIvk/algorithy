import {
	array,
	check,
	lazy,
	literal,
	object,
	optional,
	pipe,
	safeParse,
	string,
	type BaseIssue,
	type GenericSchema,
} from 'valibot';
import type { ActionName } from '../domain/actions';
import type { ConditionName } from '../domain/conditions';
import {
	ActionNameSchema,
	ConditionSchema,
	CountSchema,
	SwitchConditionSchema,
	type SwitchCondition,
} from './sequence.schema';

// Boundary schemas for the state kept in `localStorage`: each level's program,
// the last visited level and the completed-level slugs. Every read goes through
// a `parse*` helper and falls back to empty.

// The stored program holds the whole sequence structure (action, count,
// condition, children, elseChildren, branches) plus a `default` flag that marks
// an item as one of the level's default blocks. Internal fields (movable,
// modifiable, id, label) are never stored; the flag plus the action is the
// lookup that merges the default block back in on load.
type StoredSequenceItem = {
	readonly action: ActionName;
	readonly default?: true;
	readonly count?: number;
	readonly condition?: ConditionName;
	readonly children?: readonly StoredSequenceItem[];
	readonly elseChildren?: readonly StoredSequenceItem[];
	readonly branches?: readonly {
		readonly condition: SwitchCondition;
		readonly children: readonly StoredSequenceItem[];
	}[];
};

const StoredSequenceItemSchema = pipe(
	object({
		action: ActionNameSchema,
		default: optional(literal(true)),
		count: optional(CountSchema),
		condition: optional(ConditionSchema),
		children: optional(array(lazy(() => StoredSequenceItemSchema))),
		branches: optional(
			array(
				object({
					condition: SwitchConditionSchema,
					children: array(lazy(() => StoredSequenceItemSchema)),
				}),
			),
		),
		elseChildren: optional(array(lazy(() => StoredSequenceItemSchema))),
	}),
	check((item) => item.action !== 'start', 'stored sequence must not contain start'),
) as unknown as GenericSchema<unknown, StoredSequenceItem, BaseIssue<unknown>>;

const StoredSequenceSchema = array(StoredSequenceItemSchema);

const LastLevelSlugSchema = string();

const CompletedLevelSlugsSchema = array(string());

function parseStoredSequence(data: unknown): StoredSequenceItem[] | null {
	const result = safeParse(StoredSequenceSchema, data);

	return result.success ? [...result.output] : null;
}

function parseLastLevelSlug(data: unknown): string | null {
	const result = safeParse(LastLevelSlugSchema, data);

	return result.success ? result.output : null;
}

function parseCompletedLevelSlugs(data: unknown): string[] | null {
	const result = safeParse(CompletedLevelSlugsSchema, data);

	return result.success ? [...result.output] : null;
}

export {
	CompletedLevelSlugsSchema,
	LastLevelSlugSchema,
	StoredSequenceSchema,
	parseCompletedLevelSlugs,
	parseLastLevelSlug,
	parseStoredSequence,
};
export type { StoredSequenceItem };
