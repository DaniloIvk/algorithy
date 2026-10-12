import { describe, expect, test } from 'bun:test';
import { getStatusMessage, type Status } from './status';

const STATUSES: readonly Status[] = [
	'idle',
	'running',
	'won',
	'blocked',
	'not-reached',
	'infinite-loop',
	'trapped',
];

describe('getStatusMessage', () => {
	test('every status has its own non-empty message', () => {
		const statusMessages = STATUSES.map((status) => getStatusMessage(status));

		expect(statusMessages.every((message) => message.trim().length > 0)).toBe(true);
		expect(new Set(statusMessages).size).toBe(STATUSES.length);
	});
});
