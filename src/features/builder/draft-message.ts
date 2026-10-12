import { INFINITE_LOOP_REPETITION_THRESHOLD, type RunOutcome } from '../../domain/simulation';
import { messages } from '../../lib/i18n';
import type { DraftPreparation, DraftValidation } from './shared-level';

/**
 * The one place a draft problem becomes a sentence. The builder shows these
 * through toasts when an action cannot run, never as a permanent status line.
 */

function outcomeMessage(outcome: Exclude<RunOutcome, 'won'>): string {
	switch (outcome) {
		case 'blocked':
			return messages.level_status_blocked();
		case 'not-reached':
			return messages.level_status_not_reached();
		case 'infinite-loop':
			return messages.level_status_infinite_loop({ count: INFINITE_LOOP_REPETITION_THRESHOLD });
		case 'trapped':
			return messages.level_status_trapped();
	}
}

function draftStatusMessage(draftStatus: DraftValidation | DraftPreparation): string {
	switch (draftStatus.status) {
		case 'empty-solution':
			return messages.builder_status_empty_solution();
		case 'too-many-blocks':
			return messages.builder_status_too_many_blocks();
		case 'no-name':
			return messages.builder_status_no_name();
		case 'shape':
			return messages.builder_status_shape();
		case 'too-heavy':
			return messages.builder_status_too_heavy();
		case 'not-won':
			return `${messages.builder_status_not_won()}: ${outcomeMessage(draftStatus.outcome)}`;
		case 'too-long':
			return messages.builder_status_too_long();
		case 'valid':
		case 'ready':
			return '';
	}
}

export { draftStatusMessage };
