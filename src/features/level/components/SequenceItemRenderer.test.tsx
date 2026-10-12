import { describe, expect, test } from 'bun:test';
import { mountComponent, settleDom } from '../../../dom-harness';
import type { SequenceItem } from '../../../schemas/sequence.schema';
import type { ActiveDrag, DndApi } from '../dnd';
import SequenceItemRenderer from './SequenceItemRenderer';

const dnd: DndApi = {
	draggableProps: () => ({ onPointerDown: () => {} }),
	dropZoneProps: (zoneId: string) => ({ 'data-drop-zone': zoneId }),
	deleteZoneProps: () => ({ 'data-drop-delete': 'true' }),
};

function makeItem(id: string, action: SequenceItem['action'], movable = true): SequenceItem {
	return {
		kind: 'algorithm',
		id,
		action,
		label: action,
		default: false,
		movable,
	};
}

const paletteDrag: ActiveDrag = {
	id: null,
	action: 'move-forward',
	width: 120,
	height: 40,
};

const items = [
	makeItem('start', 'start', false),
	makeItem('a', 'move-forward'),
	makeItem('b', 'turn-left'),
];

// Mirrors the app: the renderer's array sits inside the zone element, followed
// by the (absolutely positioned) export button.
function renderZone(
	zoneItems: readonly SequenceItem[],
	zoneId: string,
	activeDropIndex: number,
): HTMLElement {
	return mountComponent(
		<div data-drop-zone={zoneId}>
			<>
				{SequenceItemRenderer({
					items: zoneItems,
					dnd,
					activeDrag: paletteDrag,
					setSequence: () => {},
					forId: zoneId,
					activeZoneId: zoneId,
					activeDropIndex,
				})}
			</>
			<button type='button' aria-label='export' data-export='true' />
		</div>,
	);
}

describe('SequenceItemRenderer drop placeholder', () => {
	test('clamps a pre-head index to the slot below Start', async () => {
		const container = renderZone(items, 'root', 0);
		await settleDom();

		const placeholder = container.querySelector('[data-drop-placeholder]');
		expect(placeholder).not.toBeNull();
		// The block lands below Start, so the placeholder must too.
		expect(placeholder?.previousElementSibling).toBe(container.querySelector('[data-start]'));
	});

	test('draws the placeholder at the end when the pointer is past the last block', async () => {
		const container = renderZone(items, 'root', 3);
		await settleDom();

		const placeholder = container.querySelector('[data-drop-placeholder]');
		expect(placeholder).not.toBeNull();
		// Sits after every block, just before the export button.
		expect(placeholder?.nextElementSibling).toBe(container.querySelector('[data-export]'));
	});

	test('draws the placeholder inside an empty body zone', async () => {
		const container = renderZone([], 'if-1', 0);
		await settleDom();

		expect(container.querySelector('[data-drop-placeholder]')).not.toBeNull();
	});
});
