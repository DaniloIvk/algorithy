import { parseLevel } from '../schemas/level.schema';
import { levelModules } from '../levels';

type LevelEntry = {
	readonly id: string;
	readonly slug: string;
	readonly title: Readonly<Record<string, string>>;
	readonly data: unknown;
	readonly path: string;
};

function parseLevelEntry(path: string, rawData: unknown): LevelEntry {
	const parsedLevel = parseLevel(rawData);

	if (parsedLevel === null) {
		throw new Error(`Invalid level data in ${path}`);
	}

	return {
		id: parsedLevel.id,
		slug: parsedLevel.slug,
		title: parsedLevel.title,
		data: rawData,
		path,
	};
}

function assertUniqueLevels(entries: readonly LevelEntry[]): void {
	const seenIds = new Set<string>();
	const seenSlugs = new Set<string>();

	for (const entry of entries) {
		if (seenIds.has(entry.id)) {
			throw new Error(`Duplicate level id ${entry.id} in ${entry.path}`);
		}

		if (seenSlugs.has(entry.slug)) {
			throw new Error(`Duplicate level slug ${entry.slug} in ${entry.path}`);
		}

		seenIds.add(entry.id);
		seenSlugs.add(entry.slug);
	}
}

const levelEntries: readonly LevelEntry[] = (() => {
	const entries = Object.entries(levelModules).map(([path, levelModule]) =>
		parseLevelEntry(path, levelModule.default),
	);

	entries.sort((firstEntry, secondEntry) => Number(firstEntry.slug) - Number(secondEntry.slug));
	assertUniqueLevels(entries);

	return entries;
})();

const levelBySlug = new Map<string, LevelEntry>();
const levelById = new Map<string, LevelEntry>();

for (const entry of levelEntries) {
	levelBySlug.set(entry.slug, entry);
	levelById.set(entry.id, entry);
}

function resolveLevelEntry(input: string): LevelEntry | undefined {
	const bySlug = levelBySlug.get(input);

	if (bySlug !== undefined) {
		return bySlug;
	}

	const byId = levelById.get(input);

	if (byId !== undefined) {
		return byId;
	}

	return levelBySlug.get(String(Number(input)));
}

function resolveLevel(input: string): unknown {
	return resolveLevelEntry(input)?.data ?? null;
}

function resolveNextSlug(currentSlug: string): string | null {
	const currentIndex = levelEntries.findIndex((entry) => entry.slug === currentSlug);

	if (currentIndex === -1) {
		return null;
	}

	const nextEntry = levelEntries[currentIndex + 1];

	if (nextEntry === undefined) {
		return null;
	}

	return nextEntry.slug;
}

function resolvePrevSlug(currentSlug: string): string | null {
	const currentIndex = levelEntries.findIndex((entry) => entry.slug === currentSlug);

	if (currentIndex <= 0) {
		return null;
	}

	return levelEntries[currentIndex - 1]?.slug ?? null;
}

export {
	levelEntries,
	assertUniqueLevels,
	parseLevelEntry,
	resolveLevel,
	resolveLevelEntry,
	resolveNextSlug,
	resolvePrevSlug,
};
export type { LevelEntry };
