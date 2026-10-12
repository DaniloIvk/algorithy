import { describe, expect, test } from 'bun:test';
import { recordLevelOutcome } from './completion';
import { loadCompletedLevelSlugs, type KeyValueStorage } from '../../lib/persistence';

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

describe('recordLevelOutcome', () => {
	test('a win marks the level as completed', () => {
		const storage = createMemoryStorage();

		expect(recordLevelOutcome('5', 'won', storage)).toBe(true);
		expect(loadCompletedLevelSlugs(storage)).toEqual(['5']);
	});

	test('failure and unfinished statuses never complete a level', () => {
		const storage = createMemoryStorage();

		for (const status of [
			'blocked',
			'not-reached',
			'infinite-loop',
			'trapped',
			'idle',
			'running',
		] as const) {
			expect(recordLevelOutcome('5', status, storage)).toBe(false);
		}

		expect(loadCompletedLevelSlugs(storage)).toEqual([]);
	});

	test('completing one level keeps the others', () => {
		const storage = createMemoryStorage();

		recordLevelOutcome('5', 'won', storage);
		recordLevelOutcome('6', 'won', storage);

		expect(loadCompletedLevelSlugs(storage)).toEqual(['5', '6']);
	});
});
