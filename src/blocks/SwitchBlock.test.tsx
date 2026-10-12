import { describe, expect, test } from 'bun:test';
import { mountComponent, settleDom } from '../dom-harness';
import { DndProvider } from '../features/level/dnd';
import { messages } from '../lib/i18n';
import SwitchBlock from './SwitchBlock';

function renderSwitch(): HTMLElement {
	return mountComponent(
		<DndProvider setSequence={() => {}}>
			<SwitchBlock
				variant='sequence'
				zoneIdPrefix='switch-1'
				branches={[
					{ condition: 'path-ahead', hasBlocks: false },
					{ condition: 'default', hasBlocks: false },
				]}
				onConditionChange={() => {}}
				onAddBranch={() => {}}
				onRemoveBranch={() => {}}
				onMoveBranch={() => {}}
			/>
		</DndProvider>,
	);
}

function click(element: Element | null): void {
	element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('SwitchBlock branch header', () => {
	test('right-aligns the actions for the default branch too', async () => {
		const container = renderSwitch();
		await settleDom();

		const groups = container.querySelectorAll('[data-branch-actions]');
		expect(groups.length).toBe(2);
		for (const group of groups) {
			// The group owns the right-align, so the remove button lands on the
			// far right whatever else is (not) in the row.
			expect(group.classList.contains('ml-auto')).toBe(true);
			expect(group.querySelectorAll('button').length).toBeGreaterThan(0);
		}
		// The default branch has only the remove button; the other has reorder too.
		expect(groups[1]?.querySelectorAll('button').length).toBe(1);
	});

	test('the header toggle resyncs every branch', async () => {
		const container = renderSwitch();
		await settleDom();

		const collapseBranch = messages.block_switch_collapse_branch();
		const expandBranch = messages.block_switch_expand_branch();

		// Collapse the first branch on its own.
		click(container.querySelector(`button[aria-label="${collapseBranch}"]`));
		await settleDom();
		expect(container.querySelectorAll(`button[aria-label="${expandBranch}"]`).length).toBe(1);

		// The header toggle drops the branches back to their default, so they
		// follow it instead of keeping the branch's own previous state.
		click(container.querySelector(`button[aria-label="${messages.common_collapse()}"]`));
		await settleDom();
		expect(container.querySelectorAll(`button[aria-label="${expandBranch}"]`).length).toBe(2);

		click(container.querySelector(`button[aria-label="${messages.common_expand()}"]`));
		await settleDom();
		expect(container.querySelectorAll(`button[aria-label="${expandBranch}"]`).length).toBe(0);
	});
});
