import { messages } from '../../lib/i18n';
import type { Direction } from '../../schemas/level.schema';
import { SHARED_LEVEL_MAX_SIZE, SHARED_LEVEL_MIN_SIZE } from '../../schemas/shared-level.schema';
import type { TerrainName } from '../../schemas/terrain.schema';
import { BUILDER_THEMES, type BuilderDraft } from './shared-level';

/**
 * The level settings, all three directly above the playground: size, theme
 * and the player's start direction. Every field keeps its label on top and
 * its normal size; fields never squeeze or clip. When the row is too narrow
 * for all three, whole fields wrap to the next line and the group stays
 * centered, so the row below is always pushed down, never overlapped.
 *
 * The fields are plain `div`s, not `label`s: the global form CSS makes every
 * `label` that contains an `input` full width, which would give the size
 * field a whole line of its own and break the row. The controls carry their
 * own `aria-label` instead.
 */

const THEME_LABELS: Partial<Record<TerrainName, () => string>> = {
	default: messages.builder_theme_default,
	amber: messages.builder_theme_amber,
	forest: messages.builder_theme_forest,
	frost: messages.builder_theme_frost,
	'icy-blue': messages.builder_theme_icy_blue,
	legend: messages.builder_theme_legend,
	boss: messages.builder_theme_boss,
	stone: messages.builder_theme_stone,
};

const DIRECTION_LABELS: Record<Direction, () => string> = {
	up: messages.builder_direction_up,
	right: messages.builder_direction_right,
	down: messages.builder_direction_down,
	left: messages.builder_direction_left,
};

type BuilderToolbarProps = {
	readonly draft: BuilderDraft;
	readonly onMetadata: (changes: Partial<Pick<BuilderDraft, 'terrain'>>) => void;
	readonly onResize: (width: number, height: number) => void;
	readonly onDirection: (direction: Direction) => void;
};

function clampSize(value: number, fallback: number): number {
	if (!Number.isFinite(value)) {
		return fallback;
	}
	return Math.min(Math.max(Math.round(value), SHARED_LEVEL_MIN_SIZE), SHARED_LEVEL_MAX_SIZE);
}

function BuilderToolbar({ draft, onMetadata, onResize, onDirection }: BuilderToolbarProps) {
	return (
		<div class='flex w-full shrink-0 flex-wrap content-start items-start justify-center gap-3'>
			<div class='flex shrink-0 flex-col gap-1 text-xs'>
				<span class='text-content-masked truncate'>{messages.builder_size_label()}</span>
				<span class='flex items-center gap-1'>
					<input
						type='number'
						class='bg-surface-raised hover:bg-surface-raised-hover active:bg-surface-raised-active h-8 w-16 rounded px-2 text-sm'
						value={draft.width}
						min={SHARED_LEVEL_MIN_SIZE}
						max={SHARED_LEVEL_MAX_SIZE}
						aria-label={`${messages.builder_size_label()} (width)`}
						onChange={(event) => {
							if (event.target instanceof HTMLInputElement) {
								onResize(clampSize(Number(event.target.value), draft.width), draft.height);
							}
						}}
					/>
					<span class='text-content-masked'>x</span>
					<input
						type='number'
						class='bg-surface-raised hover:bg-surface-raised-hover active:bg-surface-raised-active h-8 w-16 rounded px-2 text-sm'
						value={draft.height}
						min={SHARED_LEVEL_MIN_SIZE}
						max={SHARED_LEVEL_MAX_SIZE}
						aria-label={`${messages.builder_size_label()} (height)`}
						onChange={(event) => {
							if (event.target instanceof HTMLInputElement) {
								onResize(draft.width, clampSize(Number(event.target.value), draft.height));
							}
						}}
					/>
				</span>
			</div>

			<div class='flex shrink-0 flex-col gap-1 text-xs'>
				<span class='text-content-masked truncate'>{messages.builder_theme_label()}</span>
				<select
					class='bg-surface-raised hover:bg-surface-raised-hover active:bg-surface-raised-active h-8 rounded px-2 text-sm'
					aria-label={messages.builder_theme_label()}
					value={draft.terrain}
					onChange={(event) => {
						if (event.target instanceof HTMLSelectElement) {
							const value = event.target.value;
							const terrain = BUILDER_THEMES.find((name) => name === value);
							if (terrain !== undefined) {
								onMetadata({ terrain });
							}
						}
					}}
				>
					{BUILDER_THEMES.map((terrain) => (
						<option key={terrain} value={terrain}>
							{(THEME_LABELS[terrain] ?? (() => terrain))()}
						</option>
					))}
				</select>
			</div>

			<div class='flex shrink-0 flex-col gap-1 text-xs'>
				<span class='text-content-masked truncate'>{messages.builder_direction_label()}</span>
				<select
					class='bg-surface-raised hover:bg-surface-raised-hover active:bg-surface-raised-active h-8 rounded px-2 text-sm'
					aria-label={messages.builder_direction_label()}
					value={draft.player.direction}
					onChange={(event) => {
						if (event.target instanceof HTMLSelectElement) {
							const value = event.target.value;
							const direction = (['up', 'right', 'down', 'left'] as const).find(
								(name) => name === value,
							);
							if (direction !== undefined) {
								onDirection(direction);
							}
						}
					}}
				>
					{(['up', 'right', 'down', 'left'] as const).map((direction) => (
						<option key={direction} value={direction}>
							{DIRECTION_LABELS[direction]()}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}

export default BuilderToolbar;
