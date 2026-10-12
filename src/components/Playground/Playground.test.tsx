import { describe, expect, test } from 'bun:test';
import { mountComponent } from '../../dom-harness';
import { looksForTerrain } from '../../features/builder/shared-level';
import { messages } from '../../lib/i18n';
import type { BlockKind } from '../../schemas/block.schema';
import type { Position } from '../../schemas/level.schema';
import Playground from './Playground';

/**
 * The playground is shared by every level and by the builder, so its tests
 * render the real grid and check what a player sees: the letter and number
 * labels, each painted kind in its cell, and the mouse and cheese on theirs.
 */

const LEVEL_MAP: BlockKind[][] = [
	['ground', 'wall', 'ground'],
	['ground', 'ice', 'ground'],
	['ground', 'lava', 'hole'],
];

type PlaygroundOverrides = {
	readonly playerFrom?: Position | null;
	readonly playerStepMs?: number;
};

function mountPlayground(overrides: PlaygroundOverrides = {}): HTMLElement {
	return mountComponent(
		<Playground
			width={3}
			height={3}
			map={LEVEL_MAP}
			player={{ x: 0, y: 0, direction: 'right' }}
			playerAngle={0}
			playerFrom={overrides.playerFrom ?? null}
			playerStepMs={overrides.playerStepMs}
			target={{ x: 2, y: 0 }}
			looks={looksForTerrain('default')}
			interactive
		/>,
	);
}

function findCell(container: HTMLElement, coordinate: string): HTMLElement {
	const found = container.querySelector(`[data-builder-cell="${coordinate}"]`);

	if (!(found instanceof HTMLElement)) {
		throw new Error(`cell ${coordinate} not found`);
	}

	return found;
}

describe('playground', () => {
	test('renders a track per cell plus the row and column labels', () => {
		const container = mountPlayground();

		expect(container.querySelectorAll('[data-playground-track="cell"]')).toHaveLength(9);
		expect(container.querySelectorAll('[data-playground-track="column-label"]')).toHaveLength(3);
		expect(container.querySelectorAll('[data-playground-track="row-label"]')).toHaveLength(3);
		expect(container.textContent).toContain('A');
		expect(container.textContent).toContain('3');
	});

	test('renders every painted kind in its own cell', () => {
		const container = mountPlayground();

		expect(findCell(container, '1:0').querySelector('[data-kind="wall"]')).not.toBeNull();
		expect(findCell(container, '1:1').querySelector('[data-terrain="ice"]')).not.toBeNull();
		expect(findCell(container, '1:2').querySelector('.lava-pool')).not.toBeNull();
		expect(findCell(container, '2:2').querySelector('.hole-pit')).not.toBeNull();
	});

	test('renders the player and the target in their cells', () => {
		const container = mountPlayground();

		expect(
			findCell(container, '0:0').querySelector(`[title="${messages.playground_cell_player()}"]`),
		).not.toBeNull();
		expect(
			findCell(container, '2:0').querySelector(`[title="${messages.playground_cell_target()}"]`),
		).not.toBeNull();
	});

	test('marks the step animation when the mouse walks in from another cell', () => {
		const container = mountPlayground({ playerFrom: { x: -1, y: 0 }, playerStepMs: 120 });
		const playerStep = findCell(container, '0:0').querySelector('.player-step');

		expect(playerStep).not.toBeNull();
		expect(playerStep?.getAttribute('style')).toContain('--step-x');
		expect(playerStep?.getAttribute('style')).toContain('120ms');
	});
});
