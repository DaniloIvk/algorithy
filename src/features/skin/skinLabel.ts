import type { Skin } from '../../schemas/skin.schema';
import { messages } from '../../lib/i18n';

function skinLabel(skin: Skin): string {
	switch (skin) {
		case 'blue':
			return messages.skin_blue();
		case 'pink':
			return messages.skin_pink();
	}
}

export { skinLabel };
