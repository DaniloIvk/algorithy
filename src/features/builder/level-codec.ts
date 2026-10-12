import { actionNames } from '../../domain/actions';
import { blockKinds, type BlockKind } from '../../schemas/block.schema';
import { terrainNames, type TerrainName } from '../../schemas/terrain.schema';
import type { Direction } from '../../schemas/level.schema';
import type { OptimalSolutionItem, SwitchCondition } from '../../schemas/sequence.schema';

/**
 * The share link codec.
 *
 * A shared level travels entirely inside its URL: the level is packed into
 * bytes (never raw JSON), the bytes carry a random salt and a checksum, and
 * the whole thing is base64url-encoded. Every save uses a fresh salt, so the
 * same level saved twice yields different links and a hand-edited payload
 * fails the checksum instead of loading.
 *
 * Decoding is total: anything malformed returns null and the caller shows a
 * friendly error. The decoded shape is still validated by
 * `schemas/shared-level.schema.ts` before it is trusted.
 */

const PAYLOAD_VERSION = 1;
const SALT_LENGTH = 4;
const CHECKSUM_LENGTH = 2;
const MAX_BYTE_LENGTH = 255;
const CELLS_PER_BYTE = 3;

const directions: readonly Direction[] = ['up', 'right', 'down', 'left'];
const conditions = ['path-ahead', 'path-left', 'path-right'] as const;
const switchConditions = ['path-ahead', 'path-left', 'path-right', 'default'] as const;

type LevelPayload = {
	readonly width: number;
	readonly height: number;
	readonly terrain: TerrainName;
	readonly player: { readonly x: number; readonly y: number; readonly direction: Direction };
	readonly target: { readonly x: number; readonly y: number };
	readonly cells: readonly BlockKind[];
	readonly title: string;
	readonly author: string;
	readonly solution: readonly OptimalSolutionItem[];
};

function fnv1a16(bytes: readonly number[]): number {
	let hash = 0x811c9dc5;

	for (const byte of bytes) {
		hash ^= byte;
		hash = Math.imul(hash, 0x01000193);
	}

	return ((hash >>> 16) ^ (hash & 0xffff)) & 0xffff;
}

/** A stable text digest (FNV-1a), used for share and level identities. */
function hashString(value: string): string {
	let hash = 0x811c9dc5;

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}

	return (hash >>> 0).toString(16).padStart(8, '0');
}

/** A stable, readable identity for a share link: the hash of its payload. */
function payloadHash(encoded: string): string {
	return hashString(encoded);
}

function randomSalt(): Uint8Array {
	const salt = new Uint8Array(SALT_LENGTH);
	crypto.getRandomValues(salt);
	return salt;
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(value: string): Uint8Array | null {
	if (value.length === 0 || !/^[A-Za-z0-9_-]+$/.test(value)) {
		return null;
	}

	const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

	try {
		const binary = atob(padded);
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index += 1) {
			bytes[index] = binary.charCodeAt(index);
		}
		return bytes;
	} catch {
		return null;
	}
}

function pushString(bytes: number[], value: string): boolean {
	const encoded = new TextEncoder().encode(value);

	if (encoded.length > MAX_BYTE_LENGTH) {
		return false;
	}

	bytes.push(encoded.length);
	bytes.push(...encoded);
	return true;
}

function pushCells(bytes: number[], cells: readonly BlockKind[]): void {
	let bitBuffer = 0;
	let bitCount = 0;

	for (const cell of cells) {
		const value = blockKinds.indexOf(cell);

		bitBuffer = (bitBuffer << CELLS_PER_BYTE) | value;
		bitCount += CELLS_PER_BYTE;

		if (bitCount >= 8) {
			bitCount -= 8;
			bytes.push((bitBuffer >> bitCount) & 0xff);
		}
	}

	if (bitCount > 0) {
		bytes.push((bitBuffer << (8 - bitCount)) & 0xff);
	}
}

function countSolutionItems(items: readonly OptimalSolutionItem[]): number {
	let total = items.length;

	for (const item of items) {
		total += countSolutionItems(item.children ?? []);
		total += countSolutionItems(item.elseChildren ?? []);
		for (const branch of item.branches ?? []) {
			total += countSolutionItems(branch.children);
		}
	}

	return total;
}

function pushItems(bytes: number[], items: readonly OptimalSolutionItem[]): boolean {
	bytes.push(items.length);

	for (const item of items) {
		const actionIndex = actionNames.indexOf(item.action);
		if (actionIndex <= 0) {
			return false; // start is implicit and never encoded
		}
		bytes.push(actionIndex);

		if (item.action === 'for') {
			if (item.count === undefined || item.count < 1 || item.count > 99) {
				return false;
			}
			bytes.push(item.count);
			if (!pushItems(bytes, item.children ?? [])) {
				return false;
			}
			continue;
		}

		if (item.action === 'while') {
			if (!pushItems(bytes, item.children ?? [])) {
				return false;
			}
			continue;
		}

		if (item.action === 'if') {
			const conditionIndex = conditions.indexOf(item.condition ?? 'path-ahead');
			bytes.push(conditionIndex);
			if (!pushItems(bytes, item.children ?? [])) {
				return false;
			}
			if (!pushItems(bytes, item.elseChildren ?? [])) {
				return false;
			}
			continue;
		}

		if (item.action === 'switch') {
			const branches = item.branches ?? [];
			if (branches.length > MAX_BYTE_LENGTH) {
				return false;
			}
			bytes.push(branches.length);
			for (const branch of branches) {
				const conditionIndex = switchConditions.indexOf(branch.condition);
				bytes.push(conditionIndex);
				if (!pushItems(bytes, branch.children)) {
					return false;
				}
			}
		}
	}

	return true;
}

function encodeLevelPayload(payload: LevelPayload, salt: Uint8Array): string | null {
	const cells = payload.cells;
	const cellCount = payload.width * payload.height;

	if (payload.width < 1 || payload.width > MAX_BYTE_LENGTH) {
		return null;
	}
	if (payload.height < 1 || payload.height > MAX_BYTE_LENGTH) {
		return null;
	}
	if (cells.length !== cellCount) {
		return null;
	}
	if (countSolutionItems(payload.solution) > MAX_BYTE_LENGTH) {
		return null;
	}

	const terrainIndex = terrainNames.indexOf(payload.terrain);
	const directionIndex = directions.indexOf(payload.player.direction);

	const bytes: number[] = [];
	bytes.push(PAYLOAD_VERSION);

	for (let index = 0; index < SALT_LENGTH; index += 1) {
		bytes.push(salt[index] ?? 0);
	}

	bytes.push(payload.width, payload.height, terrainIndex);
	bytes.push(payload.player.x, payload.player.y, directionIndex);
	bytes.push(payload.target.x, payload.target.y);

	pushCells(bytes, cells);
	if (!pushString(bytes, payload.title)) {
		return null;
	}
	if (!pushString(bytes, payload.author)) {
		return null;
	}
	if (!pushItems(bytes, payload.solution)) {
		return null;
	}

	const checksum = fnv1a16(bytes);
	bytes.push((checksum >> 8) & 0xff, checksum & 0xff);

	return toBase64Url(Uint8Array.from(bytes));
}

type ByteReader = {
	readonly readByte: () => number | null;
	readonly readString: () => string | null;
};

function createByteReader(bytes: Uint8Array): ByteReader {
	let offset = 0;

	const readByte = (): number | null => {
		if (offset >= bytes.length) {
			return null;
		}
		const value = bytes[offset];
		offset += 1;
		return value ?? null;
	};

	return {
		readByte,
		readString: (): string | null => {
			const length = readByte();
			if (length === null) {
				return null;
			}
			const values = [];
			for (let index = 0; index < length; index += 1) {
				const value = readByte();
				if (value === null) {
					return null;
				}
				values.push(value);
			}
			return new TextDecoder().decode(Uint8Array.from(values));
		},
	};
}

function readCells(reader: ByteReader, cellCount: number): BlockKind[] | null {
	const cells: BlockKind[] = [];
	let bitBuffer = 0;
	let bitCount = 0;

	for (let index = 0; index < cellCount; index += 1) {
		while (bitCount < CELLS_PER_BYTE) {
			const value = reader.readByte();
			if (value === null) {
				return null;
			}
			bitBuffer = (bitBuffer << 8) | value;
			bitCount += 8;
		}

		bitCount -= CELLS_PER_BYTE;
		const cellIndex = (bitBuffer >> bitCount) & 0x7;
		const kind = blockKinds[cellIndex];
		if (kind === undefined) {
			return null;
		}
		cells.push(kind);
	}

	return cells;
}

function readItems(reader: ByteReader): OptimalSolutionItem[] | null {
	const count = reader.readByte();
	if (count === null) {
		return null;
	}

	const items: OptimalSolutionItem[] = [];

	for (let index = 0; index < count; index += 1) {
		const actionIndex = reader.readByte();
		if (actionIndex === null || actionIndex === 0 || actionIndex >= actionNames.length) {
			return null;
		}

		const action = actionNames[actionIndex]!;

		if (action === 'for') {
			const itemCount = reader.readByte();
			if (itemCount === null) {
				return null;
			}
			const children = readItems(reader);
			if (children === null) {
				return null;
			}
			items.push({ action, count: itemCount, children });
			continue;
		}

		if (action === 'while') {
			const children = readItems(reader);
			if (children === null) {
				return null;
			}
			items.push({ action, children });
			continue;
		}

		if (action === 'if') {
			const conditionIndex = reader.readByte();
			const condition = conditionIndex === null ? undefined : conditions[conditionIndex];
			if (condition === undefined) {
				return null;
			}
			const children = readItems(reader);
			const elseChildren = readItems(reader);
			if (children === null || elseChildren === null) {
				return null;
			}
			items.push({ action, condition, children, elseChildren });
			continue;
		}

		if (action === 'switch') {
			const branchCount = reader.readByte();
			if (branchCount === null) {
				return null;
			}
			const branches: { condition: SwitchCondition; children: OptimalSolutionItem[] }[] = [];
			for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
				const conditionIndex = reader.readByte();
				const condition = conditionIndex === null ? undefined : switchConditions[conditionIndex];
				if (condition === undefined) {
					return null;
				}
				const children = readItems(reader);
				if (children === null) {
					return null;
				}
				branches.push({ condition, children });
			}
			items.push({ action, branches });
			continue;
		}

		items.push({ action });
	}

	return items;
}

function decodeLevelPayload(encoded: string): LevelPayload | null {
	const bytes = fromBase64Url(encoded);
	if (bytes === null) {
		return null;
	}

	const minimumLength = 1 + SALT_LENGTH + 8 + 1 + CHECKSUM_LENGTH;
	if (bytes.length < minimumLength) {
		return null;
	}

	const body = bytes.subarray(0, bytes.length - CHECKSUM_LENGTH);
	const storedChecksum = ((bytes[bytes.length - 2] ?? 0) << 8) | (bytes[bytes.length - 1] ?? 0);
	if (fnv1a16([...body]) !== storedChecksum) {
		return null;
	}

	const reader = createByteReader(body);
	if (reader.readByte() !== PAYLOAD_VERSION) {
		return null;
	}

	for (let index = 0; index < SALT_LENGTH; index += 1) {
		reader.readByte();
	}

	const width = reader.readByte();
	const height = reader.readByte();
	const terrainIndex = reader.readByte();
	const terrain = terrainIndex === null ? undefined : terrainNames[terrainIndex];
	if (width === null || height === null || terrain === undefined || width < 1 || height < 1) {
		return null;
	}

	const playerX = reader.readByte();
	const playerY = reader.readByte();
	const directionIndex = reader.readByte();
	const direction = directionIndex === null ? undefined : directions[directionIndex];
	if (playerX === null || playerY === null || direction === undefined) {
		return null;
	}

	const targetX = reader.readByte() ?? 0;
	const targetY = reader.readByte() ?? 0;

	const cells = readCells(reader, width * height);
	if (cells === null) {
		return null;
	}

	const title = reader.readString();
	const author = reader.readString();
	if (title === null || author === null) {
		return null;
	}

	const solution = readItems(reader);
	if (solution === null) {
		return null;
	}

	return {
		width,
		height,
		terrain,
		player: { x: playerX, y: playerY, direction },
		target: { x: targetX, y: targetY },
		cells,
		title,
		author,
		solution,
	};
}

export {
	decodeLevelPayload,
	encodeLevelPayload,
	fnv1a16,
	hashString,
	payloadHash,
	randomSalt,
	SALT_LENGTH,
	toBase64Url,
};
export type { LevelPayload };
