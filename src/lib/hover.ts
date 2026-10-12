const DIRECT_ITEM_SELECTOR = '[data-drag-item], [data-locked], [data-start]';

/** Insertion index for a pointer inside a drop container. */
function computeHoverIndex(
	container: HTMLElement | null,
	clientY: number,
	excludeId?: string,
): number | null {
	if (!container) {
		return null;
	}

	const allItems = Array.from(container.querySelectorAll<HTMLElement>(DIRECT_ITEM_SELECTOR));
	const directItems = allItems.filter((element) => {
		if (excludeId !== undefined && element.id === excludeId) {
			return false;
		}
		let parent: HTMLElement | null = element.parentElement;
		while (parent && parent !== container) {
			if (parent.hasAttribute('data-drop-zone')) {
				return false;
			}
			parent = parent.parentElement;
		}
		return container.contains(element);
	});

	if (directItems.length === 0) {
		return 0;
	}

	for (let index = 0; index < directItems.length; index++) {
		const rect = directItems[index]!.getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		if (clientY < midpoint) {
			return index;
		}
	}

	return directItems.length;
}

export { computeHoverIndex };
