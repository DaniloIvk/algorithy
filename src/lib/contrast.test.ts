import { describe, expect, test } from 'bun:test';
import { readableInk } from './contrast';

/**
 * The brush ink must stay readable on whatever it paints. The call is made on
 * perceived lightness, so a saturated blue gets white ink while orange and the
 * pale terrains get dark ink, whatever serialization the browser returns.
 */

const DARK_INK = '#16141c';
const LIGHT_INK = '#ffffff';

describe('readableInk', () => {
	test('uses dark ink on light rgb colours', () => {
		expect(readableInk('rgb(255, 255, 255)')).toBe(DARK_INK);
		expect(readableInk('rgb(240, 240, 240)')).toBe(DARK_INK);
		expect(readableInk('rgb(95% 95% 95%)')).toBe(DARK_INK);
	});

	test('uses white ink on dark rgb colours', () => {
		expect(readableInk('rgb(0, 0, 0)')).toBe(LIGHT_INK);
		expect(readableInk('rgb(40, 40, 40)')).toBe(LIGHT_INK);
	});

	test('uses white ink on a saturated blue even though its measured contrast favours black', () => {
		expect(readableInk('rgb(99, 102, 241)')).toBe(LIGHT_INK);
		expect(readableInk('oklch(0.62 0.19 250)')).toBe(LIGHT_INK);
	});

	test('uses dark ink on orange and the pale terrains', () => {
		expect(readableInk('oklch(0.72 0.2 50)')).toBe(DARK_INK);
		expect(readableInk('oklch(0.92 0 0)')).toBe(DARK_INK);
		expect(readableInk('oklch(0.88 0.19 95)')).toBe(DARK_INK);
	});

	test('ignores alpha when reading the channels', () => {
		expect(readableInk('rgba(240, 240, 240, 0.5)')).toBe(DARK_INK);
		expect(readableInk('rgba(10, 10, 10, 0.5)')).toBe(LIGHT_INK);
	});

	test('reads oklch and oklab lightness, including percentages', () => {
		expect(readableInk('oklch(0.93 0.09 210)')).toBe(DARK_INK);
		expect(readableInk('oklch(0.46 0 0)')).toBe(LIGHT_INK);
		expect(readableInk('oklch(72% 0.2 50)')).toBe(DARK_INK);
		expect(readableInk('oklab(0.3 0.02 -0.1)')).toBe(LIGHT_INK);
	});

	test('reads color(srgb) channels', () => {
		expect(readableInk('color(srgb 0.9 0.9 0.9)')).toBe(DARK_INK);
		expect(readableInk('color(srgb 0.1 0.1 0.1)')).toBe(LIGHT_INK);
	});

	test('falls back to the light ink for an unknown format', () => {
		expect(readableInk('transparent')).toBe(LIGHT_INK);
	});
});
