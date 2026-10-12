import type { BlockKind, BlockLook, BlockProps } from '../schemas/block.schema';

const blocks = {
	ground: { passable: true, slidable: false },
	wall: { passable: false, slidable: false },
	ice: { passable: true, slidable: true },
	lava: { passable: true, slidable: false },
	hole: { passable: true, slidable: false },
} satisfies Record<BlockKind, BlockProps>;

const defaultLooks = {
	ground: { terrain: 'default' },
	wall: { terrain: 'default' },
	ice: { terrain: 'ice' },
	// lava/hole are drawn over the floor by GridCell; the level transform gives
	// their cell the ground look (see schemas/level.schema.ts).
	lava: { terrain: 'default' },
	hole: { terrain: 'default' },
} satisfies Record<BlockKind, BlockLook>;

export { blocks, defaultLooks };
