import { describe, expect, test } from 'bun:test';
import { SIDE_HOLES, TOP_HOLES, type CheeseHole } from './cheeseHoles';

/**
 * The holes are rolled at module load from `Math.random`, so the tests pin the
 * invariants the generator promises rather than exact coordinates: the counts,
 * a valid shape string, and that two holes never overlap or clump.
 */

function centresAreFarEnoughApart(first: CheeseHole, second: CheeseHole): boolean {
	const deltaX = first.left + first.size / 2 - (second.left + second.size / 2);
	const deltaY = first.top + first.size / 2 - (second.top + second.size / 2);

	return Math.hypot(deltaX, deltaY) >= (first.size + second.size) / 2;
}

const ALL_HOLES = [...TOP_HOLES, ...SIDE_HOLES];

describe('cheese holes', () => {
	test('produces the expected number of holes', () => {
		expect(TOP_HOLES).toHaveLength(10);
		expect(SIDE_HOLES).toHaveLength(3);
	});

	test('every hole has a size and a four-corner outline', () => {
		for (const hole of ALL_HOLES) {
			expect(hole.size).toBeGreaterThan(0);
			expect(Number.isFinite(hole.left)).toBe(true);
			expect(Number.isFinite(hole.top)).toBe(true);
			expect(hole.radius).toMatch(/^\d+% \d+% \d+% \d+% \/ \d+% \d+% \d+% \d+%$/);
		}
	});

	test('no two holes overlap', () => {
		for (let first = 0; first < ALL_HOLES.length; first += 1) {
			for (let second = first + 1; second < ALL_HOLES.length; second += 1) {
				expect(centresAreFarEnoughApart(ALL_HOLES[first]!, ALL_HOLES[second]!)).toBe(true);
			}
		}
	});
});
