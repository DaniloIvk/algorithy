import { useEffect, useState } from 'hono/jsx';
import { actions } from '../../../blocks/registry';
import { sortSwitchBranches } from '../../../domain/sequence-tree';
import type { ActionName } from '../../../domain/actions';
import { loadLevelSequence, saveLastLevelSlug, saveLevelSequence } from '../../../lib/persistence';
import type { LevelData } from '../../../schemas/level.schema';
import type { SequenceItem } from '../../../schemas/sequence.schema';
import { fromStoredSequence, toStoredSequence } from '../stored-sequence';

type PathCondition = 'path-ahead' | 'path-left' | 'path-right';
type BranchCondition = PathCondition | 'default';

function actionLabel(action: ActionName): string {
	return actions[action].label;
}

function isPathCondition(value: string): value is PathCondition {
	return value === 'path-ahead' || value === 'path-left' || value === 'path-right';
}

function toBranchCondition(value: string): BranchCondition {
	if (value === 'path-ahead' || value === 'path-left' || value === 'path-right') {
		return value;
	}
	return 'default';
}

function createSequenceItemFromDefault(
	defaultAction: LevelData['defaultActions'][number],
	id: string,
): SequenceItem {
	const children = defaultAction.children?.map((child, childIndex) =>
		createSequenceItemFromDefault(child, `${id}-c-${childIndex}`),
	);
	const elseChildren = defaultAction.elseChildren?.map((child, childIndex) =>
		createSequenceItemFromDefault(child, `${id}-e-${childIndex}`),
	);
	const branches = defaultAction.branches?.map((branch, branchIndex) => ({
		condition: toBranchCondition(branch.condition),
		modifiable: branch.modifiable,
		children: (branch.children ?? []).map((child, childIndex) =>
			createSequenceItemFromDefault(child, `${id}-b${branchIndex}-c${childIndex}`),
		),
	}));
	const { condition } = defaultAction;

	return {
		kind: 'algorithm',
		id,
		action: defaultAction.action,
		label: actionLabel(defaultAction.action),
		default: true,
		movable: defaultAction.movable,
		...(defaultAction.count === undefined ? {} : { count: defaultAction.count }),
		...(defaultAction.modifiable === undefined ? {} : { modifiable: defaultAction.modifiable }),
		...(condition === undefined || !isPathCondition(condition) ? {} : { condition }),
		...(children === undefined ? {} : { children }),
		...(elseChildren === undefined ? {} : { elseChildren }),
		...(branches === undefined ? {} : { branches: sortSwitchBranches(branches) }),
	};
}

function createStartItem(): SequenceItem {
	return {
		kind: 'algorithm',
		id: 'start',
		action: 'start',
		label: actionLabel('start'),
		default: true,
		movable: false,
	};
}

function buildDefaultSequence(level: LevelData): SequenceItem[] {
	return [
		createStartItem(),
		...level.defaultActions.map((defaultAction, index) =>
			createSequenceItemFromDefault(defaultAction, `default-${index}`),
		),
	];
}

function initialSequence(level: LevelData): SequenceItem[] {
	const defaultSequence = buildDefaultSequence(level);
	const storedSequence = loadLevelSequence(level.slug);

	if (storedSequence === null) {
		return defaultSequence;
	}

	const restoredSequence = fromStoredSequence(
		storedSequence,
		defaultSequence,
		level.allowedActions,
		actionLabel,
	);

	if (restoredSequence === null) {
		// Stale or tinkered data: keep the level's defaults. The mount save
		// writes them back over the stored program, so the bad data is
		// discarded for good.
		return defaultSequence;
	}

	return [createStartItem(), ...restoredSequence];
}

function useSequence(level: LevelData) {
	const [sequence, setSequence] = useState<SequenceItem[]>(() => initialSequence(level));

	// Each level keeps its own program under its own key. Writes are immediate:
	// the newest program is on disk before the next user event, so reloads and
	// the locale remount (which restores while rendering) both see it.
	useEffect(() => {
		saveLevelSequence(level.slug, toStoredSequence(sequence));
	}, [level.slug, sequence]);

	useEffect(() => {
		saveLastLevelSlug(level.slug);
	}, [level.slug]);

	const resetSequence = () => {
		setSequence(buildDefaultSequence(level));
	};

	return {
		sequence,
		setSequence,
		resetSequence,
	};
}

export { useSequence };
export type { SequenceItem };
