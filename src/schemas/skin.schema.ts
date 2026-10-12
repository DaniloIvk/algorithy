import { literal, safeParse, union, type InferOutput } from 'valibot';

const skinNames = ['blue', 'pink'] as const;

type Skin = (typeof skinNames)[number];

const SkinSchema = union(skinNames.map((name) => literal(name)));

function parseSkin(data: unknown): Skin | null {
	const result = safeParse(SkinSchema, data);
	return result.success ? result.output : null;
}

export { skinNames, SkinSchema, parseSkin };
export type { InferOutput, Skin };
