import type { BlockKind } from '../../schemas/block.schema';

/** What the brush can paint: every map kind plus the two entities. */
const builderTools = ['ground', 'wall', 'ice', 'lava', 'hole', 'player', 'target'] as const;

type BuilderTool = (typeof builderTools)[number];

function isBlockTool(tool: BuilderTool): tool is BlockKind {
	return tool !== 'player' && tool !== 'target';
}

export { builderTools, isBlockTool };
export type { BuilderTool };
