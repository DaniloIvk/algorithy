import { INFINITE_LOOP_REPETITION_THRESHOLD, type RunOutcome } from '../../domain/simulation';
import { messages } from '../../lib/i18n';

type Status = RunOutcome | 'idle' | 'running';

function getStatusMessage(status: Status): string {
	switch (status) {
		case 'idle':
			return messages.level_status_idle({ run: messages.controls_run() });
		case 'running':
			return messages.level_status_running();
		case 'won':
			return messages.level_status_won();
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

export { getStatusMessage };
export type { Status };
