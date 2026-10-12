import { literal, object, optional, union } from 'valibot';
import { TerrainNameSchema, type TerrainName } from './terrain.schema';

const blockKinds = ['ground', 'wall', 'ice', 'lava', 'hole'] as const;

type BlockKind = (typeof blockKinds)[number];

type BlockProps = {
	readonly passable: boolean;
	readonly slidable: boolean;
};

type BlockLook = { readonly terrain: TerrainName };

const BlockKindSchema = union(blockKinds.map((kind) => literal(kind)));

const LookSchema = object({ terrain: optional(TerrainNameSchema) });

export { BlockKindSchema, LookSchema, blockKinds };
export type { BlockKind, BlockLook, BlockProps };
