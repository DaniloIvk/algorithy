import { describe, expect, test } from 'bun:test';
import { publishState } from './builder-session';
import type { DraftValidation } from './shared-level';

const VALID: DraftValidation = { status: 'valid', encoded: 'payload', hash: 'a1b2c3d4' };

describe('publishState', () => {
	test('the work is dirty until it matches a saved level', () => {
		expect(publishState(null, 'current', VALID).isDirty).toBe(true);
		expect(publishState('current', 'current', VALID).isDirty).toBe(false);
		expect(publishState('older', 'current', VALID).isDirty).toBe(true);
	});

	test('Share is enabled only for a valid level', () => {
		expect(publishState('current', 'current', VALID).canShare).toBe(true);
		expect(publishState('current', 'current', VALID).shareHint).toBe('');
	});

	test('an invalid level keeps Share disabled and carries the reason', () => {
		const losing: DraftValidation = { status: 'not-won', outcome: 'not-reached' };
		const unnamed: DraftValidation = { status: 'no-name' };

		const losingState = publishState('current', 'current', losing);
		expect(losingState.canShare).toBe(false);
		expect(losingState.shareHint.length).toBeGreaterThan(0);

		const unnamedState = publishState('current', 'current', unnamed);
		expect(unnamedState.canShare).toBe(false);
		expect(unnamedState.shareHint).not.toBe(losingState.shareHint);
	});
});
