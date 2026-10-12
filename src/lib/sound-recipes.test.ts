import { describe, expect, test } from 'bun:test';
import { SOUND_RECIPES, soundNames } from './sound-recipes';

describe('sound recipes', () => {
	test('every sound has at least one voice', () => {
		for (const name of soundNames) {
			const recipe = SOUND_RECIPES[name];
			const voiceCount = (recipe.tones?.length ?? 0) + (recipe.noise?.length ?? 0);
			expect(voiceCount).toBeGreaterThan(0);
		}
	});

	test('voices stay quiet and are timed sensibly', () => {
		for (const name of soundNames) {
			const recipe = SOUND_RECIPES[name];

			for (const tone of recipe.tones ?? []) {
				expect(tone.frequency).toBeGreaterThan(0);
				expect(tone.gain).toBeGreaterThan(0);
				expect(tone.gain).toBeLessThanOrEqual(0.7);
				expect(tone.offset).toBeGreaterThanOrEqual(0);
				expect(tone.duration).toBeGreaterThan(0);
			}

			for (const noise of recipe.noise ?? []) {
				expect(noise.frequency).toBeGreaterThan(0);
				expect(noise.gain).toBeGreaterThan(0);
				expect(noise.gain).toBeLessThanOrEqual(0.7);
				expect(noise.offset).toBeGreaterThanOrEqual(0);
				expect(noise.duration).toBeGreaterThan(0);
			}
		}
	});
});
