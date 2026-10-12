import {
	parseCompletedLevelSlugs,
	parseLastLevelSlug,
	parseStoredSequence,
	type StoredSequenceItem,
} from '../schemas/persistence.schema';

const LEVEL_KEY_PREFIX = 'algorithy:level:';
const LAST_LEVEL_KEY = 'algorithy:last-level';
const COMPLETED_LEVELS_KEY = 'algorithy:completed-levels';
const BUILDER_DRAFT_KEY = 'algorithy:builder-draft';
const BUILDER_LEVEL_KEY = 'algorithy:builder-level';

type KeyValueStorage = {
	readonly getItem: (key: string) => string | null;
	readonly setItem: (key: string, value: string) => void;
};

function resolveStorage(): KeyValueStorage | null {
	try {
		// Reading the `localStorage` property itself can throw when storage is
		// blocked (embedded previews, strict privacy settings).
		return localStorage;
	} catch {
		return null;
	}
}

function readStoredValue(key: string, storage: KeyValueStorage | null): unknown {
	if (storage === null) {
		return null;
	}

	try {
		const storedValue = storage.getItem(key);

		return storedValue === null ? null : JSON.parse(storedValue);
	} catch {
		return null;
	}
}

function writeStoredValue(key: string, value: unknown, storage: KeyValueStorage | null): void {
	if (storage === null) {
		return;
	}

	try {
		storage.setItem(key, JSON.stringify(value));
	} catch {
		// Blocked or full storage: the app keeps working, the state is just not
		// persisted.
	}
}

function levelStorageKey(slug: string): string {
	return `${LEVEL_KEY_PREFIX}${slug}`;
}

function loadLevelSequence(
	slug: string,
	storage: KeyValueStorage | null = resolveStorage(),
): StoredSequenceItem[] | null {
	return parseStoredSequence(readStoredValue(levelStorageKey(slug), storage));
}

function saveLevelSequence(
	slug: string,
	storedSequence: readonly StoredSequenceItem[],
	storage: KeyValueStorage | null = resolveStorage(),
): void {
	writeStoredValue(levelStorageKey(slug), storedSequence, storage);
}

function loadLastLevelSlug(storage: KeyValueStorage | null = resolveStorage()): string | null {
	return parseLastLevelSlug(readStoredValue(LAST_LEVEL_KEY, storage));
}

function saveLastLevelSlug(slug: string, storage: KeyValueStorage | null = resolveStorage()): void {
	writeStoredValue(LAST_LEVEL_KEY, slug, storage);
}

function loadCompletedLevelSlugs(storage: KeyValueStorage | null = resolveStorage()): string[] {
	return parseCompletedLevelSlugs(readStoredValue(COMPLETED_LEVELS_KEY, storage)) ?? [];
}

function markLevelCompleted(
	slug: string,
	storage: KeyValueStorage | null = resolveStorage(),
): void {
	const completedLevelSlugs = loadCompletedLevelSlugs(storage);

	if (completedLevelSlugs.includes(slug)) {
		return;
	}

	writeStoredValue(COMPLETED_LEVELS_KEY, [...completedLevelSlugs, slug], storage);
}

/** The builder draft is the encoded share payload of the work in progress. */
function loadBuilderDraft(storage: KeyValueStorage | null = resolveStorage()): string | null {
	const storedValue = readStoredValue(BUILDER_DRAFT_KEY, storage);

	return typeof storedValue === 'string' && storedValue.length > 0 ? storedValue : null;
}

function saveBuilderDraft(
	encodedPayload: string,
	storage: KeyValueStorage | null = resolveStorage(),
): void {
	writeStoredValue(BUILDER_DRAFT_KEY, encodedPayload, storage);
}

/**
 * The one builder level the creator committed with Save. The draft keeps the
 * work in progress for reloads; this is the last level that was explicitly
 * saved, and it is what the Save/Share button compares against.
 */
function loadBuilderLevel(storage: KeyValueStorage | null = resolveStorage()): string | null {
	const storedValue = readStoredValue(BUILDER_LEVEL_KEY, storage);

	return typeof storedValue === 'string' && storedValue.length > 0 ? storedValue : null;
}

function saveBuilderLevel(
	encodedPayload: string,
	storage: KeyValueStorage | null = resolveStorage(),
): void {
	writeStoredValue(BUILDER_LEVEL_KEY, encodedPayload, storage);
}

export {
	BUILDER_DRAFT_KEY,
	BUILDER_LEVEL_KEY,
	COMPLETED_LEVELS_KEY,
	LAST_LEVEL_KEY,
	LEVEL_KEY_PREFIX,
	levelStorageKey,
	loadBuilderDraft,
	loadBuilderLevel,
	loadCompletedLevelSlugs,
	loadLastLevelSlug,
	loadLevelSequence,
	markLevelCompleted,
	saveBuilderDraft,
	saveBuilderLevel,
	saveLastLevelSlug,
	saveLevelSequence,
};
export type { KeyValueStorage };
