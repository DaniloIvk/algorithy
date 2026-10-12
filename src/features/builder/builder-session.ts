import { draftStatusMessage } from './draft-message';
import type { DraftValidation } from './shared-level';

/**
 * The builder's publish session, kept out of the page so the rules can be
 * tested directly: whether the work differs from the one saved builder level,
 * whether Share may run, and the reason to show when it may not.
 */

type PublishState = {
	readonly isDirty: boolean;
	readonly canShare: boolean;
	readonly shareHint: string;
};

function publishState(
	savedFingerprint: string | null,
	currentFingerprint: string,
	shareCheck: DraftValidation,
): PublishState {
	const isDirty = savedFingerprint === null || savedFingerprint !== currentFingerprint;
	const canShare = shareCheck.status === 'valid';

	return {
		isDirty,
		canShare,
		shareHint: canShare ? '' : draftStatusMessage(shareCheck),
	};
}

export { publishState };
export type { PublishState };
