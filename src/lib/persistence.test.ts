import { describe, expect, test } from 'bun:test';
import {
	COMPLETED_LEVELS_KEY,
	LAST_LEVEL_KEY,
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
	type KeyValueStorage,
} from './persistence';
import type { StoredSequenceItem } from '../schemas/persistence.schema';

type MemoryStorage = KeyValueStorage & {
	readonly values: Map<string, string>;
};

function createMemoryStorage(): MemoryStorage {
	const values = new Map<string, string>();

	return {
		values,
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => {
			values.set(key, value);
		},
	};
}

function createBlockedStorage(): KeyValueStorage {
	return {
		getItem: () => {
			throw new Error('storage blocked');
		},
		setItem: () => {
			throw new Error('storage blocked');
		},
	};
}

const storedForLoop: StoredSequenceItem = {
	action: 'for',
	count: 3,
	children: [{ action: 'move-forward' }],
};

describe('persistence', () => {
	test('round-trips a level program under a per-level key', () => {
		const storage = createMemoryStorage();

		saveLevelSequence('7', [storedForLoop], storage);

		expect(levelStorageKey('7')).toBe('algorithy:level:7');
		expect([...storage.values.keys()]).toEqual([levelStorageKey('7')]);
		expect(loadLevelSequence('7', storage)).toEqual([storedForLoop]);
	});

	test('keeps every level program separate', () => {
		const storage = createMemoryStorage();

		saveLevelSequence('1', [{ action: 'move-forward' }], storage);
		saveLevelSequence('2', [{ action: 'turn-right' }], storage);

		expect(loadLevelSequence('1', storage)).toEqual([{ action: 'move-forward' }]);
		expect(loadLevelSequence('2', storage)).toEqual([{ action: 'turn-right' }]);
	});

	test('round-trips an empty program', () => {
		const storage = createMemoryStorage();

		saveLevelSequence('3', [], storage);

		expect(loadLevelSequence('3', storage)).toEqual([]);
	});

	test('round-trips the default flag', () => {
		const storage = createMemoryStorage();

		saveLevelSequence('1', [{ action: 'move-forward', default: true }], storage);

		expect(loadLevelSequence('1', storage)).toEqual([{ action: 'move-forward', default: true }]);
	});

	test('returns null for a missing, malformed or impossible level program', () => {
		const storage = createMemoryStorage();

		expect(loadLevelSequence('5', storage)).toBe(null);

		storage.setItem(levelStorageKey('5'), 'not json');
		expect(loadLevelSequence('5', storage)).toBe(null);

		storage.setItem(levelStorageKey('5'), JSON.stringify([{ action: 'dance' }]));
		expect(loadLevelSequence('5', storage)).toBe(null);

		storage.setItem(levelStorageKey('5'), JSON.stringify([{ action: 'start' }]));
		expect(loadLevelSequence('5', storage)).toBe(null);
	});

	test('round-trips the last visited level', () => {
		const storage = createMemoryStorage();

		expect(loadLastLevelSlug(storage)).toBe(null);

		saveLastLevelSlug('12', storage);

		expect(storage.values.get(LAST_LEVEL_KEY)).toBe('"12"');
		expect(loadLastLevelSlug(storage)).toBe('12');
	});

	test('collects completed levels without duplicates', () => {
		const storage = createMemoryStorage();

		expect(loadCompletedLevelSlugs(storage)).toEqual([]);

		markLevelCompleted('2', storage);
		markLevelCompleted('5', storage);
		markLevelCompleted('2', storage);

		expect(loadCompletedLevelSlugs(storage)).toEqual(['2', '5']);
		expect(storage.values.get(COMPLETED_LEVELS_KEY)).toBe('["2","5"]');
	});

	test('ignores invalid completion records', () => {
		const storage = createMemoryStorage();

		storage.setItem(COMPLETED_LEVELS_KEY, JSON.stringify({ '5': true }));

		expect(loadCompletedLevelSlugs(storage)).toEqual([]);
	});

	test('survives blocked storage instead of throwing', () => {
		const storage = createBlockedStorage();

		expect(loadLevelSequence('1', storage)).toBe(null);
		expect(loadLastLevelSlug(storage)).toBe(null);
		expect(loadCompletedLevelSlugs(storage)).toEqual([]);

		expect(() => saveLevelSequence('1', [{ action: 'move-forward' }], storage)).not.toThrow();
		expect(() => saveLastLevelSlug('1', storage)).not.toThrow();
		expect(() => markLevelCompleted('1', storage)).not.toThrow();
	});

	test('falls back when a stored value is not valid JSON', () => {
		const storage = createMemoryStorage();

		storage.setItem(levelStorageKey('1'), '{not json');
		storage.setItem(LAST_LEVEL_KEY, 'also not json');

		expect(loadLevelSequence('1', storage)).toBe(null);
		expect(loadLastLevelSlug(storage)).toBe(null);
	});

	test('round-trips the builder draft payload', () => {
		const storage = createMemoryStorage();

		saveBuilderDraft('builder-payload', storage);
		expect(loadBuilderDraft(storage)).toBe('builder-payload');

		expect(loadBuilderDraft(createMemoryStorage())).toBe(null);
		expect(() => saveBuilderDraft('x', createBlockedStorage())).not.toThrow();
	});

	test('round-trips the one saved builder level', () => {
		const storage = createMemoryStorage();

		saveBuilderLevel('saved-payload', storage);
		expect(loadBuilderLevel(storage)).toBe('saved-payload');

		expect(loadBuilderLevel(createMemoryStorage())).toBe(null);
		expect(() => saveBuilderLevel('x', createBlockedStorage())).not.toThrow();
	});

	test('the saved builder level overwrites the previous one', () => {
		const storage = createMemoryStorage();

		saveBuilderLevel('first', storage);
		saveBuilderLevel('second', storage);

		expect(loadBuilderLevel(storage)).toBe('second');
	});

	test('falls back to nothing when there is no storage at all', () => {
		expect(loadBuilderDraft(null)).toBe(null);
		expect(loadBuilderLevel(null)).toBe(null);
		expect(loadLevelSequence('1', null)).toBe(null);
		expect(loadLastLevelSlug(null)).toBe(null);
		expect(loadCompletedLevelSlugs(null)).toEqual([]);

		expect(() => saveBuilderDraft('x', null)).not.toThrow();
		expect(() => saveBuilderLevel('x', null)).not.toThrow();
		expect(() => saveLevelSequence('1', [], null)).not.toThrow();
		expect(() => saveLastLevelSlug('1', null)).not.toThrow();
		expect(() => markLevelCompleted('1', null)).not.toThrow();
	});

	test('works through the real storage when none is injected', () => {
		saveBuilderDraft('draft-payload');
		expect(loadBuilderDraft()).toBe('draft-payload');

		saveBuilderLevel('level-payload');
		expect(loadBuilderLevel()).toBe('level-payload');
	});

	test('falls back to nothing when the storage property itself throws', () => {
		const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			get() {
				throw new Error('blocked');
			},
		});

		try {
			expect(loadBuilderDraft()).toBe(null);
			expect(loadBuilderLevel()).toBe(null);
		} finally {
			if (descriptor === undefined) {
				Reflect.deleteProperty(globalThis, 'localStorage');
			} else {
				Object.defineProperty(globalThis, 'localStorage', descriptor);
			}
		}
	});
});
