import type { ConditionName } from '../domain/conditions';
import { messages } from '../lib/i18n';

function conditionLabel(condition: ConditionName): string {
	switch (condition) {
		case 'path-ahead':
			return messages.condition_path_ahead();
		case 'path-left':
			return messages.condition_path_left();
		case 'path-right':
			return messages.condition_path_right();
	}
}

export { conditionLabel };
