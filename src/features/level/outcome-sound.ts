import type { RunOutcome } from '../../domain/simulation';
import type { SoundName } from '../../lib/sound-recipes';
import type { LevelData, Position } from '../../schemas/level.schema';

/** The two lethal cells; a `trapped` run always ends on one of them. */
type TrapKind = 'hole' | 'lava';

function trapKindAt(level: LevelData, position: Position): TrapKind | null {
	const kind = level.map[position.y]?.[position.x];
	return kind === 'lava' || kind === 'hole' ? kind : null;
}

function outcomeSound(outcome: RunOutcome, trapKind: TrapKind | null): SoundName {
	switch (outcome) {
		case 'won':
			return 'won';
		case 'blocked':
			return 'blocked';
		case 'not-reached':
			return 'not-reached';
		case 'infinite-loop':
			return 'infinite-loop';
		case 'trapped':
			return trapKind === 'lava' ? 'lava' : 'hole';
	}
}

export { outcomeSound, trapKindAt };
export type { TrapKind };
