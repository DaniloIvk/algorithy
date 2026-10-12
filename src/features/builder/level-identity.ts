import type { ActionName } from '../../domain/actions';
import type { BlockKind } from '../../schemas/block.schema';
import type { Direction } from '../../schemas/level.schema';
import type { OptimalSolutionItem } from '../../schemas/sequence.schema';
import type { TerrainName } from '../../schemas/terrain.schema';
import { hashString, type LevelPayload } from './level-codec';

/**
 * Level identity, kept apart from the share link.
 *
 * The share link carries a fresh random salt every time it is generated, so
 * two links for the same level differ. `levelContentHash` is the opposite: a
 * deterministic digest of the board alone (map, player, target, theme and the
 * level's action palette). The same board always yields the same hash, title
 * and author are ignored, so sharing again, or renaming the level, keeps the
 * same stored player program and completion. Changing the board yields a new
 * hash, which is what makes the stored solution follow the board, not the
 * URL.
 *
 * `levelFingerprint` is the authoring counterpart: every authored detail
 * except the salt, used to tell whether the work in progress still matches
 * the one saved builder level.
 */

type BoardIdentity = {
	readonly width: number;
	readonly height: number;
	readonly terrain: TerrainName;
	readonly player: { readonly x: number; readonly y: number; readonly direction: Direction };
	readonly target: { readonly x: number; readonly y: number };
	readonly cells: readonly BlockKind[];
};

function boardParts(board: BoardIdentity): readonly unknown[] {
	return [
		board.width,
		board.height,
		board.terrain,
		board.player.x,
		board.player.y,
		board.player.direction,
		board.target.x,
		board.target.y,
		board.cells,
	];
}

/**
 * A deterministic identity for a board, independent of the share salt, the
 * title, the author and the creator's solution.
 */
function levelContentHash(board: BoardIdentity, allowedActions: readonly ActionName[]): string {
	return hashString(JSON.stringify([...boardParts(board), allowedActions]));
}

/** The solution as plain arrays, with absent fields normalised away. */
function canonicalSolution(items: readonly OptimalSolutionItem[]): readonly unknown[] {
	return items.map((item) => {
		if (item.action === 'for') {
			return ['for', item.count ?? 0, canonicalSolution(item.children ?? [])];
		}

		if (item.action === 'while') {
			return ['while', canonicalSolution(item.children ?? [])];
		}

		if (item.action === 'if') {
			return [
				'if',
				item.condition ?? 'path-ahead',
				canonicalSolution(item.children ?? []),
				canonicalSolution(item.elseChildren ?? []),
			];
		}

		if (item.action === 'switch') {
			return [
				'switch',
				(item.branches ?? []).map((branch) => [
					branch.condition,
					canonicalSolution(branch.children),
				]),
			];
		}

		return [item.action];
	});
}

/** Every authored detail except the salt, for the Save/Share dirty check. */
function levelFingerprint(payload: LevelPayload): string {
	return JSON.stringify([
		...boardParts(payload),
		payload.title,
		payload.author,
		canonicalSolution(payload.solution),
	]);
}

export { levelContentHash, levelFingerprint };
export type { BoardIdentity };
