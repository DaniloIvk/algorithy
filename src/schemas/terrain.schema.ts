import { literal, union } from 'valibot';

// One identifier per playground theme. A level picks a terrain and the tile
// renderer + CSS derive the ground/wall foreground, background and texture
// from it, instead of levels carrying `bg-*`/texture classes themselves.
const terrainNames = [
	'default',
	'amber',
	'forest',
	'frost',
	'icy-blue',
	'legend',
	'boss',
	'stone',
	'ice',
] as const;

type TerrainName = (typeof terrainNames)[number];

const TerrainNameSchema = union(terrainNames.map((name) => literal(name)));

export { TerrainNameSchema, terrainNames };
export type { TerrainName };
