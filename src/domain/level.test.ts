import { describe, expect, test } from 'bun:test';
import {
	assertUniqueLevels,
	levelEntries,
	parseLevelEntry,
	resolveLevel,
	resolveLevelEntry,
	resolveNextSlug,
	resolvePrevSlug,
	type LevelEntry,
} from './level';

/**
 * The level registry. It parses every shipped file once at module load and
 * powers routing (`/levels/<slug>`), the `/` redirect and the picker's
 * previous/next chevrons, so its resolution rules are worth pinning.
 */

describe('level registry', () => {
	test('loads all 20 levels sorted by numeric slug', () => {
		expect(levelEntries).toHaveLength(20);

		const slugs = levelEntries.map((entry) => entry.slug);
		expect(slugs[0]).toBe('1');
		expect(slugs.at(-1)).toBe('20');

		for (let index = 1; index < slugs.length; index += 1) {
			expect(Number(slugs[index])).toBeGreaterThan(Number(slugs[index - 1]));
		}
	});

	test('has unique ids and slugs', () => {
		expect(new Set(levelEntries.map((entry) => entry.id)).size).toBe(levelEntries.length);
		expect(new Set(levelEntries.map((entry) => entry.slug)).size).toBe(levelEntries.length);
	});

	test('resolves by slug, by uuid and by a padded number', () => {
		expect(resolveLevelEntry('1')?.slug).toBe('1');
		expect(resolveLevel('01') !== null).toBe(true);

		const firstEntry = levelEntries[0];
		if (firstEntry === undefined) {
			throw new Error('registry is empty');
		}

		expect(resolveLevelEntry(firstEntry.id)?.slug).toBe(firstEntry.slug);
	});

	test('resolves nothing for unknown levels', () => {
		expect(resolveLevel('999')).toBeNull();
		expect(resolveLevel('not-a-level')).toBeNull();
		expect(resolveLevelEntry('999')).toBeUndefined();
	});

	test('walks neighbours for the picker chevrons', () => {
		expect(resolveNextSlug('1')).toBe('2');
		expect(resolveNextSlug('19')).toBe('20');
		expect(resolveNextSlug('20')).toBeNull();
		expect(resolveNextSlug('999')).toBeNull();

		expect(resolvePrevSlug('2')).toBe('1');
		expect(resolvePrevSlug('1')).toBeNull();
	});
});

describe('level registry validation', () => {
	function firstEntry(): LevelEntry {
		const entry = levelEntries[0];
		if (entry === undefined) {
			throw new Error('registry is empty');
		}
		return entry;
	}

	test('parses a shipped file and rejects broken data', () => {
		const entry = firstEntry();
		const parsed = parseLevelEntry(entry.path, entry.data);

		expect(parsed.id).toBe(entry.id);
		expect(parsed.slug).toBe(entry.slug);

		expect(() => parseLevelEntry('broken.json', {})).toThrow('Invalid level data in broken.json');
	});

	test('rejects duplicate ids and slugs', () => {
		const entry = firstEntry();
		const sameSlug: LevelEntry = { ...entry, id: 'other-id' };

		expect(() => assertUniqueLevels([entry, entry])).toThrow(`Duplicate level id ${entry.id}`);
		expect(() => assertUniqueLevels([entry, sameSlug])).toThrow(
			`Duplicate level slug ${entry.slug}`,
		);
	});
});
