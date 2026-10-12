/**
 * Randomised holes for the cheese wedge target.
 *
 * Positions are rolled once at module load with `Math.random`, then constrained
 * to the wedge geometry declared in `style.css`: apex (10, 78), a slice from
 * -58deg to -22deg with radius 78, and a 16%-thick front cut face. Each hole
 * keeps clear of the slice edges and the other holes, so nothing clips or
 * clumps; the result is stable for the life of the page.
 */

type CheeseHole = {
	readonly left: number;
	readonly top: number;
	readonly size: number;
	readonly radius: string;
};

const APEX_X = 10;
const APEX_Y = 78;
const SLICE_NEAR = -58;
const SLICE_FAR = -22;
const SLICE_CENTER_MIN = 22;
const SLICE_RADIUS_MAX = 64;
const SLICE_LENGTH = 72.3;
const SLICE_DROP = 29.2;
const SLICE_THICKNESS = 16;
const TOP_HOLE_COUNT = 10;
const SIDE_HOLE_COUNT = 3;
const MAX_ATTEMPTS = 120;
const MIN_GAP = 1.5;

function randomBetween(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

function round(value: number): number {
	return Math.round(value * 100) / 100;
}

/** A slightly uneven, non-circular hole outline. */
function randomHoleRadius(): string {
	const corner = (): number => Math.round(randomBetween(40, 60));
	return `${corner()}% ${corner()}% ${corner()}% ${corner()}% / ${corner()}% ${corner()}% ${corner()}% ${corner()}%`;
}

function fits(candidate: CheeseHole, placed: readonly CheeseHole[]): boolean {
	const centerX = candidate.left + candidate.size / 2;
	const centerY = candidate.top + candidate.size / 2;
	return placed.every((hole) => {
		const dx = centerX - (hole.left + hole.size / 2);
		const dy = centerY - (hole.top + hole.size / 2);
		return Math.hypot(dx, dy) >= (candidate.size + hole.size) / 2 + MIN_GAP;
	});
}

function createTopHoles(count: number): CheeseHole[] {
	const holes: CheeseHole[] = [];
	for (let index = 0; index < count; index++) {
		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			const size = round(3 + Math.random() ** 2 * 5);
			const distance = randomBetween(SLICE_CENTER_MIN + size / 2, SLICE_RADIUS_MAX - size / 2);
			const halfAngle = (Math.atan2(size / 2, distance) * 180) / Math.PI;
			const minAngle = SLICE_NEAR + halfAngle + 1;
			const maxAngle = SLICE_FAR - halfAngle - 1;
			if (minAngle >= maxAngle) {
				continue;
			}
			const angle = randomBetween(minAngle, maxAngle);
			const radians = (angle * Math.PI) / 180;
			const hole: CheeseHole = {
				left: round(APEX_X + distance * Math.cos(radians) - size / 2),
				top: round(APEX_Y + distance * Math.sin(radians) - size / 2),
				size,
				radius: randomHoleRadius(),
			};
			if (fits(hole, holes)) {
				holes.push(hole);
				break;
			}
		}
	}
	return holes;
}

function createSideHoles(count: number, topHoles: readonly CheeseHole[]): CheeseHole[] {
	// Bias the cut-face holes away from every top-face hole so they never read
	// as the same hole showing through the wedge.
	const avoid = topHoles.map((hole) => hole.left + hole.size / 2);
	const holes: CheeseHole[] = [];
	for (let index = 0; index < count; index++) {
		let best: { hole: CheeseHole; clearance: number } | null = null;
		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			const size = round(3 + Math.random() * 3);
			const along = randomBetween(0.12, 0.84);
			const depth = randomBetween(0.34, 0.66);
			const hole: CheeseHole = {
				left: round(APEX_X + along * SLICE_LENGTH - size / 2),
				top: round(APEX_Y - along * SLICE_DROP + depth * SLICE_THICKNESS - size / 2),
				size,
				radius: randomHoleRadius(),
			};
			if (!fits(hole, holes)) {
				continue;
			}
			const centerX = hole.left + hole.size / 2;
			const clearance = Math.min(
				...avoid.map((avoidedCenterX) => Math.abs(centerX - avoidedCenterX)),
			);
			if (best === null || clearance > best.clearance) {
				best = { hole, clearance };
			}
		}
		if (best !== null) {
			holes.push(best.hole);
			avoid.push(best.hole.left + best.hole.size / 2);
		}
	}
	return holes;
}

const TOP_HOLES = createTopHoles(TOP_HOLE_COUNT);
const SIDE_HOLES = createSideHoles(SIDE_HOLE_COUNT, TOP_HOLES);

export { SIDE_HOLES, TOP_HOLES };
export type { CheeseHole };
