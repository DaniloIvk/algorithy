import type { Status } from './status';
import { markLevelCompleted, type KeyValueStorage } from '../../lib/persistence';

/**
 * A level is completed only by a win; every failure outcome (blocked,
 * not-reached, infinite-loop, trapped) and every unfinished status leaves the
 * completion record untouched. Returns whether the level was completed, so the
 * caller can refresh what it shows.
 */
function recordLevelOutcome(
	slug: string,
	status: Status,
	storage?: KeyValueStorage | null,
): boolean {
	if (status !== 'won') {
		return false;
	}

	markLevelCompleted(slug, storage);
	return true;
}

export { recordLevelOutcome };
