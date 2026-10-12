import { boolean, safeParse } from 'valibot';

/** The persisted sound preference: `true` means muted. */
const SoundMutedSchema = boolean();

function parseSoundMuted(data: unknown): boolean | null {
	const result = safeParse(SoundMutedSchema, data);
	return result.success ? result.output : null;
}

export { SoundMutedSchema, parseSoundMuted };
