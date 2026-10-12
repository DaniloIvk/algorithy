import { describe, expect, test } from 'bun:test';
import { SOUND_STORAGE_KEY, isSoundMuted, playSound, setSoundMuted } from './sound';
import { soundNames } from './sound-recipes';

describe('sound preference', () => {
	test('defaults to sound on', () => {
		expect(isSoundMuted()).toBe(false);
	});

	test('persists the muted flag', () => {
		setSoundMuted(true);
		expect(isSoundMuted()).toBe(true);
		expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('true');

		setSoundMuted(false);
		expect(isSoundMuted()).toBe(false);
	});

	test('ignores a stored value that is not a boolean', () => {
		localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify('loud'));
		expect(isSoundMuted()).toBe(false);
	});

	test('treats corrupt stored JSON as sound on', () => {
		localStorage.setItem(SOUND_STORAGE_KEY, '{ not json');
		expect(isSoundMuted()).toBe(false);
	});
});

describe('playSound', () => {
	test('never throws for any cue when there is no working audio', () => {
		for (const name of soundNames) {
			expect(() => playSound(name)).not.toThrow();
		}
	});
});
