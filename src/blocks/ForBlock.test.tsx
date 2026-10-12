import { describe, expect, test } from 'bun:test';
import { mountComponent, settleDom } from '../dom-harness';
import { DndProvider } from '../features/level/dnd';
import { messages } from '../lib/i18n';
import ForBlock from './ForBlock';

describe('ForBlock', () => {
	test('is collapsible like the other container blocks', async () => {
		const container = mountComponent(
			<DndProvider setSequence={() => {}}>
				<ForBlock variant='sequence' count={3} onCountChange={() => {}}>
					<div data-child='true'>child</div>
				</ForBlock>
			</DndProvider>,
		);
		await settleDom();

		const toggle = container.querySelector(`button[aria-label="${messages.common_collapse()}"]`);
		expect(toggle).not.toBeNull();
		// Starts expanded, so the body is shown.
		expect(container.querySelector('[data-child]')).not.toBeNull();

		toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await settleDom();

		expect(container.querySelector('[data-child]')).toBeNull();
		expect(
			container.querySelector(`button[aria-label="${messages.common_expand()}"]`),
		).not.toBeNull();
	});
});
