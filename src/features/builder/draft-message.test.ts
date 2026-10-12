import { describe, expect, test } from 'bun:test';
import { draftStatusMessage } from './draft-message';
import type { DraftValidation } from './shared-level';

const VALID: DraftValidation = { status: 'valid', encoded: 'payload', hash: 'a1b2c3d4' };

const PROBLEM_STATUSES: readonly DraftValidation[] = [
	{ status: 'empty-solution' },
	{ status: 'too-many-blocks' },
	{ status: 'no-name' },
	{ status: 'shape' },
	{ status: 'too-heavy' },
	{ status: 'too-long' },
	{ status: 'not-won', outcome: 'blocked' },
	{ status: 'not-won', outcome: 'not-reached' },
	{ status: 'not-won', outcome: 'infinite-loop' },
	{ status: 'not-won', outcome: 'trapped' },
];

describe('draftStatusMessage', () => {
	test('has a sentence for every problem status', () => {
		const sentences = PROBLEM_STATUSES.map((status) => draftStatusMessage(status));

		expect(sentences.every((sentence) => sentence.trim().length > 0)).toBe(true);
		expect(new Set(sentences).size).toBe(PROBLEM_STATUSES.length);
	});

	test('has nothing to say once the level is valid', () => {
		expect(draftStatusMessage(VALID)).toBe('');
	});
});
