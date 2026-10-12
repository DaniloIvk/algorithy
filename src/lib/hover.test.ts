import { describe, expect, test } from 'bun:test';
import { computeHoverIndex } from './hover';

/**
 * happy-dom has no layout, so these tests feed explicit rects to the helper.
 */

function makeRect(top: number, height: number): DOMRect {
	return {
		top,
		bottom: top + height,
		height,
		left: 0,
		right: 0,
		width: 0,
		x: 0,
		y: top,
		toJSON: () => ({}),
	} as DOMRect;
}

function makeItem(top: number, height: number): HTMLElement {
	const element = document.createElement('div');
	element.setAttribute('data-drag-item', 'true');
	element.getBoundingClientRect = () => makeRect(top, height);
	return element;
}

function makeContainer(children: readonly HTMLElement[]): HTMLElement {
	const container = document.createElement('div');
	container.setAttribute('data-drop-zone', 'root');
	for (const child of children) {
		container.append(child);
	}
	document.body.append(container);
	return container;
}

describe('computeHoverIndex', () => {
	test('maps the pointer to the slot it has crossed', () => {
		const first = makeItem(0, 50);
		const second = makeItem(50, 50);
		const third = makeItem(100, 50);
		const container = makeContainer([first, second, third]);

		expect(computeHoverIndex(container, 0)).toBe(0);
		expect(computeHoverIndex(container, 24)).toBe(0);
		expect(computeHoverIndex(container, 26)).toBe(1);
		expect(computeHoverIndex(container, 60)).toBe(1);
		expect(computeHoverIndex(container, 80)).toBe(2);
		expect(computeHoverIndex(container, 130)).toBe(3);
	});

	test('an empty container is always index 0', () => {
		const container = makeContainer([]);
		expect(computeHoverIndex(container, 500)).toBe(0);
	});

	test('excludes the dragged item from the geometry', () => {
		const first = makeItem(0, 50);
		first.id = 'a';
		const second = makeItem(50, 50);
		second.id = 'b';
		const third = makeItem(100, 50);
		third.id = 'c';
		const container = makeContainer([first, second, third]);

		// Dropping on the dragged item's own slot is a no-op in the shortened list.
		expect(computeHoverIndex(container, 10, 'b')).toBe(0);
		expect(computeHoverIndex(container, 60, 'b')).toBe(1);
		expect(computeHoverIndex(container, 75, 'b')).toBe(1);
		expect(computeHoverIndex(container, 130, 'b')).toBe(2);
	});

	test('ignores items nested inside another drop zone', () => {
		const outer = makeItem(0, 40);
		const nestedZone = document.createElement('div');
		nestedZone.setAttribute('data-drop-zone', 'outer-id');
		const nested = makeItem(40, 40);
		nestedZone.append(nested);
		outer.append(nestedZone);

		const container = makeContainer([outer]);
		expect(computeHoverIndex(container, 10)).toBe(0);
		expect(computeHoverIndex(container, 300)).toBe(1);
	});
});
