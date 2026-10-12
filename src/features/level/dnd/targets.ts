import { computeHoverIndex } from '../../../lib/hover';
import type { DropTarget } from './types';

const ZONE_SELECTOR = '[data-drop-zone]';
const DELETE_SELECTOR = '[data-drop-delete]';

/** Resolve what is under the pointer: the delete zone, a drop zone, or nothing. */
function findDropTarget(
	clientX: number,
	clientY: number,
	canDelete: boolean,
	excludeId?: string,
): DropTarget | null {
	const element = document.elementFromPoint(clientX, clientY);
	if (!(element instanceof Element)) {
		return null;
	}

	if (canDelete && element.closest(DELETE_SELECTOR)) {
		return { kind: 'delete' };
	}

	const zoneElement = element.closest(ZONE_SELECTOR);
	if (!(zoneElement instanceof HTMLElement)) {
		return null;
	}

	const zoneId = zoneElement.getAttribute('data-drop-zone');
	if (zoneId === null) {
		return null;
	}

	return {
		kind: 'zone',
		zoneId,
		element: zoneElement,
		index: computeHoverIndex(zoneElement, clientY, excludeId),
	};
}

export { findDropTarget };
