import { describe, expect, test } from 'bun:test';
import { actionNames } from '../../domain/actions';
import {
	decodeLevelPayload,
	encodeLevelPayload,
	fnv1a16,
	payloadHash,
	randomSalt,
	toBase64Url,
} from './level-codec';
import type { LevelPayload } from './level-codec';
import type { BlockKind } from '../../schemas/block.schema';
import type { OptimalSolutionItem } from '../../schemas/sequence.schema';

/**
 * The share link codec. The link carries the whole level, so the round trip
 * and every rejection path matter: a malformed link must never throw, and a
 * tampered one must never load.
 */

const SALT = Uint8Array.from([7, 13, 42, 99]);

function createPayload(overrides: Partial<LevelPayload> = {}): LevelPayload {
	return {
		width: 3,
		height: 3,
		terrain: 'default',
		player: { x: 0, y: 1, direction: 'right' },
		target: { x: 2, y: 1 },
		cells: ['wall', 'ground', 'ground', 'wall', 'ground', 'ground', 'wall', 'wall', 'wall'],
		title: 'Little level',
		author: 'Anon',
		solution: [{ action: 'move-forward' }, { action: 'move-forward' }],
		...overrides,
	};
}

describe('level-codec round trips', () => {
	test('encodes and decodes a minimal level', () => {
		const encoded = encodeLevelPayload(createPayload(), SALT);
		expect(encoded).not.toBeNull();

		const decoded = decodeLevelPayload(encoded ?? '');
		expect(decoded).toEqual(createPayload());
	});

	test('keeps unicode titles and authors intact', () => {
		const payload = createPayload({ title: 'Krivudava šuma', author: 'Đorđe 🤖' });
		const decoded = decodeLevelPayload(encodeLevelPayload(payload, SALT) ?? '');

		expect(decoded?.title).toBe('Krivudava šuma');
		expect(decoded?.author).toBe('Đorđe 🤖');
	});

	test('keeps every block kind and every container shape', () => {
		const cells: BlockKind[] = [
			'ground',
			'wall',
			'ice',
			'lava',
			'hole',
			'ground',
			'ice',
			'wall',
			'ground',
		];
		const solution: OptimalSolutionItem[] = [
			{
				action: 'for',
				count: 3,
				children: [{ action: 'move-forward' }, { action: 'turn-left' }],
			},
			{
				action: 'if',
				condition: 'path-right',
				children: [{ action: 'turn-right' }],
				elseChildren: [{ action: 'move-forward' }],
			},
			{
				action: 'switch',
				branches: [
					{ condition: 'path-ahead', children: [{ action: 'move-forward' }] },
					{ condition: 'default', children: [{ action: 'turn-left' }] },
				],
			},
			{ action: 'while', children: [{ action: 'move-forward' }] },
		];

		const payload = createPayload({ cells, solution });
		const decoded = decodeLevelPayload(encodeLevelPayload(payload, SALT) ?? '');

		expect(decoded?.cells).toEqual(cells);
		expect(decoded?.solution).toEqual(solution);
	});

	test('a 16x16 level with a full title, author and a deep solution stays far under the URL budget', () => {
		const width = 16;
		const height = 16;
		const cells: BlockKind[] = Array.from({ length: width * height }, (_, index) =>
			index % 7 === 0 ? 'wall' : index % 11 === 0 ? 'ice' : 'ground',
		);
		const nestedTwenty: OptimalSolutionItem[] = [
			{
				action: 'for',
				count: 99,
				children: [
					{
						action: 'for',
						count: 99,
						children: [
							{
								action: 'if',
								condition: 'path-ahead',
								children: [
									{ action: 'move-forward' },
									{ action: 'turn-right' },
									{ action: 'turn-left' },
								],
								elseChildren: [],
							},
						],
					},
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
					{ action: 'move-forward' },
				],
			},
		];

		const payload = createPayload({
			width,
			height,
			cells,
			title: 'x'.repeat(60),
			author: 'y'.repeat(40),
			solution: nestedTwenty,
		});

		const encoded = encodeLevelPayload(payload, SALT);
		expect(encoded).not.toBeNull();
		expect((encoded ?? '').length).toBeLessThan(2000);
	});

	test('the same level with a different salt has a different link and hash', () => {
		const payload = createPayload();
		const first = encodeLevelPayload(payload, SALT) ?? '';
		const second = encodeLevelPayload(payload, Uint8Array.from([1, 2, 3, 4])) ?? '';

		expect(first).not.toBe(second);
		expect(payloadHash(first)).not.toBe(payloadHash(second));
	});

	test('randomSalt produces fresh four byte salts', () => {
		const first = randomSalt();
		const second = randomSalt();

		expect(first).toHaveLength(4);
		expect(first).not.toEqual(second);
	});
});

describe('level-codec rejections', () => {
	test('rejects garbage, empty input and non-base64url characters', () => {
		expect(decodeLevelPayload('')).toBeNull();
		expect(decodeLevelPayload('not a link!')).toBeNull();
		expect(decodeLevelPayload('%%%%')).toBeNull();
	});

	test('rejects a truncated link', () => {
		const encoded = encodeLevelPayload(createPayload(), SALT) ?? '';

		for (const keep of [4, 8, 12, 16]) {
			expect(decodeLevelPayload(encoded.slice(0, encoded.length - keep))).toBeNull();
		}
	});

	test('rejects a single flipped bit through the checksum', () => {
		const encoded = encodeLevelPayload(createPayload(), SALT) ?? '';
		const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
		const position = 20;
		const original = encoded[position] ?? 'A';
		const replacement = original === 'A' ? 'B' : 'A';

		const tampered = encoded.slice(0, position) + replacement + encoded.slice(position + 1);
		expect(decodeLevelPayload(tampered)).toBeNull();
		expect(alphabet.includes(replacement)).toBe(true);
	});

	test('refuses to encode lengths and shapes it cannot represent', () => {
		expect(encodeLevelPayload(createPayload({ title: 'x'.repeat(300) }), SALT)).toBeNull();
		expect(encodeLevelPayload(createPayload({ author: 'x'.repeat(300) }), SALT)).toBeNull();
		expect(encodeLevelPayload(createPayload({ width: 0, cells: [] }), SALT)).toBeNull();
		expect(encodeLevelPayload(createPayload({ height: 0, cells: [] }), SALT)).toBeNull();
		expect(encodeLevelPayload(createPayload({ cells: ['ground'] }), SALT)).toBeNull();
		expect(encodeLevelPayload(createPayload({ solution: [{ action: 'start' }] }), SALT)).toBeNull();
		expect(
			encodeLevelPayload(
				createPayload({ solution: [{ action: 'for', count: 0, children: [] }] }),
				SALT,
			),
		).toBeNull();

		const tooMany = Array.from({ length: 256 }, () => ({ action: 'move-forward' as const }));
		expect(encodeLevelPayload(createPayload({ solution: tooMany }), SALT)).toBeNull();

		const tooManyBranches = Array.from({ length: 256 }, () => ({
			condition: 'default' as const,
			children: [],
		}));
		expect(
			encodeLevelPayload(
				createPayload({ solution: [{ action: 'switch', branches: tooManyBranches }] }),
				SALT,
			),
		).toBeNull();
	});

	test('refuses a container body that holds the implicit start', () => {
		expect(
			encodeLevelPayload(
				createPayload({ solution: [{ action: 'for', count: 1, children: [{ action: 'start' }] }] }),
				SALT,
			),
		).toBeNull();
		expect(
			encodeLevelPayload(
				createPayload({ solution: [{ action: 'while', children: [{ action: 'start' }] }] }),
				SALT,
			),
		).toBeNull();
		expect(
			encodeLevelPayload(
				createPayload({
					solution: [{ action: 'if', condition: 'path-ahead', children: [{ action: 'start' }] }],
				}),
				SALT,
			),
		).toBeNull();
		expect(
			encodeLevelPayload(
				createPayload({
					solution: [
						{
							action: 'if',
							condition: 'path-ahead',
							children: [],
							elseChildren: [{ action: 'start' }],
						},
					],
				}),
				SALT,
			),
		).toBeNull();
		expect(
			encodeLevelPayload(
				createPayload({
					solution: [
						{
							action: 'switch',
							branches: [{ condition: 'default', children: [{ action: 'start' }] }],
						},
					],
				}),
				SALT,
			),
		).toBeNull();
	});
});

describe('level-codec crafted payloads', () => {
	function encodeBody(body: readonly number[]): string {
		const checksum = fnv1a16(body);
		return toBase64Url(Uint8Array.from([...body, (checksum >> 8) & 0xff, checksum & 0xff]));
	}

	// version, salt(4), width 1, height 1, terrain 0, player (0,0) right,
	// target (0,0): the smallest well-formed header.
	const HEADER = [1, 1, 2, 3, 4, 1, 1, 0, 0, 0, 1, 0, 0];

	test('rejects a wrong version, base64 that cannot decode and bad sizes', () => {
		expect(decodeLevelPayload('AAAAA')).toBeNull();
		expect(decodeLevelPayload(encodeBody([99, 1, 2, 3, 4, 1, 1, 0, 0, 0, 1, 0, 0, 0]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([1, 1, 2, 3, 4, 0, 1, 0, 0, 0, 1, 0, 0, 0]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([1, 1, 2, 3, 4, 1, 0, 0, 0, 0, 1, 0, 0, 0]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([1, 1, 2, 3, 4, 1, 1, 200, 0, 0, 1, 0, 0, 0]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([1, 1, 2, 3, 4, 1, 1, 0, 0, 0, 200, 0, 0, 0]))).toBeNull();
	});

	test('rejects a bad cell kind, short cells and missing strings', () => {
		expect(decodeLevelPayload(encodeBody([...HEADER, 0b10100000]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([1, 1, 2, 3, 4, 16, 16, 0, 0, 0, 1, 0, 0, 0]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...HEADER, 0x00]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...HEADER, 0x00, 0x05, 0x41]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...HEADER, 0x00, 0x00, 0x00]))).toBeNull();
	});

	test('returns null when the base64 decoder itself throws', () => {
		const originalAtob = globalThis.atob;
		globalThis.atob = () => {
			throw new Error('broken decoder');
		};

		try {
			expect(decodeLevelPayload('AAAA')).toBeNull();
		} finally {
			globalThis.atob = originalAtob;
		}
	});

	test('rejects every broken solution item', () => {
		const forIndex = actionNames.indexOf('for');
		const whileIndex = actionNames.indexOf('while');
		const ifIndex = actionNames.indexOf('if');
		const switchIndex = actionNames.indexOf('switch');
		const prefix = [...HEADER, 0x00, 0x00, 0x00];

		expect(decodeLevelPayload(encodeBody([...prefix, 0x01, 0x00]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...prefix, 0x01, 250]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...prefix, 0x01, forIndex]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...prefix, 0x01, forIndex, 0x02]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...prefix, 0x01, whileIndex]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...prefix, 0x01, ifIndex, 200]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...prefix, 0x01, ifIndex, 0x00]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...prefix, 0x01, switchIndex]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...prefix, 0x01, switchIndex, 0x01, 200]))).toBeNull();
		expect(decodeLevelPayload(encodeBody([...prefix, 0x01, switchIndex, 0x01, 0x03]))).toBeNull();
	});
});
