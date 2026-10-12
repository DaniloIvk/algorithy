import { useLayoutEffect, useRef } from 'hono/jsx';
import { classNames } from '../../lib/cn';
import { readableInk } from '../../lib/contrast';
import { messages } from '../../lib/i18n';
import type { TerrainName } from '../../schemas/terrain.schema';
import { builderTools, type BuilderTool } from './tools';

/**
 * The tool palette below the playground, in the same spirit as the block
 * palette on a level: compact chips, the whole translated word on the colour
 * the brush actually paints, so the chip and the tile never disagree. The ink
 * is picked from that colour after render (see `readableInk`) so the label
 * always has contrast, whatever the theme or skin.
 */

const TOOL_LABELS: Record<BuilderTool, () => string> = {
	ground: messages.builder_tool_ground,
	wall: messages.builder_tool_wall,
	ice: messages.builder_tool_ice,
	lava: messages.builder_tool_lava,
	hole: messages.builder_tool_hole,
	player: messages.builder_tool_player,
	target: messages.builder_tool_target,
};

// Ground and wall follow the level's terrain, exactly like the board tiles.
const TERRAIN_GROUND: Record<TerrainName, string> = {
	default: 'var(--color-ground)',
	amber: 'var(--color-ground-amber)',
	forest: 'var(--color-ground-terrain)',
	frost: 'var(--color-ground-frost)',
	'icy-blue': 'var(--color-ground-blue-ice)',
	legend: 'var(--color-ground-legend)',
	boss: 'var(--color-ground-boss)',
	stone: 'var(--color-ground-stone)',
	ice: 'var(--color-ice)',
};

const TERRAIN_WALL: Record<TerrainName, string> = {
	default: 'var(--color-wall-orange)',
	amber: 'var(--color-wall-amber)',
	forest: 'var(--color-wall-terrain)',
	frost: 'var(--color-wall-frost)',
	'icy-blue': 'var(--color-wall-blue-ice)',
	legend: 'var(--color-wall-legend)',
	boss: 'var(--color-wall-boss)',
	stone: 'var(--color-wall-stone)',
	ice: 'var(--color-wall-blue-ice)',
};

const FIXED_BRUSH_COLORS: Record<Exclude<BuilderTool, 'ground' | 'wall'>, string> = {
	ice: 'var(--color-ice)',
	lava: 'var(--color-lava)',
	hole: 'var(--color-hole)',
	player: 'var(--color-player)',
	target: 'var(--color-target)',
};

function brushBackground(tool: BuilderTool, terrain: TerrainName): string {
	if (tool === 'ground') {
		return TERRAIN_GROUND[terrain];
	}
	if (tool === 'wall') {
		return TERRAIN_WALL[terrain];
	}
	return FIXED_BRUSH_COLORS[tool];
}

type BuilderToolsProps = {
	readonly tool: BuilderTool;
	readonly terrain: TerrainName;
	readonly onTool: (tool: BuilderTool) => void;
};

function BuilderTools({ tool, terrain, onTool }: BuilderToolsProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);

	// Paint and ink are both set imperatively, and this effect runs every
	// render: hono resets an element's inline style whenever a `style` prop is
	// applied, so an imperative colour would be wiped by the next render.
	useLayoutEffect(() => {
		const container = containerRef.current;
		if (container === null) {
			return;
		}

		const paintBrushes = () => {
			for (const swatch of container.querySelectorAll<HTMLButtonElement>('[data-paint]')) {
				const paint = swatch.dataset['paint'];
				if (paint === undefined) {
					continue;
				}
				swatch.style.backgroundColor = paint;
				swatch.style.color = readableInk(getComputedStyle(swatch).backgroundColor);
			}
		};

		paintBrushes();
		const scheme = window.matchMedia('(prefers-color-scheme: dark)');
		scheme.addEventListener('change', paintBrushes);
		return () => scheme.removeEventListener('change', paintBrushes);
	});

	return (
		<div
			ref={containerRef}
			class='flex w-full shrink-0 flex-wrap content-start items-center-safe justify-center-safe gap-1'
		>
			{builderTools.map((option) => {
				const isActive = option === tool;
				const label = TOOL_LABELS[option]();

				return (
					<button
						key={option}
						type='button'
						data-brush={option}
						data-paint={brushBackground(option, terrain)}
						aria-pressed={isActive}
						onClick={() => onTool(option)}
						class={classNames(
							'cursor-pointer rounded px-2 py-1 text-xs font-semibold transition select-none hover:brightness-95 active:scale-95 active:brightness-90',
							isActive ? 'ring-2 ring-content/80' : '',
						)}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
}

export default BuilderTools;
