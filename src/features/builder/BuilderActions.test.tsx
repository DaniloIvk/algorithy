import { describe, expect, test } from 'bun:test';
import { mountComponent } from '../../dom-harness';
import { messages } from '../../lib/i18n';
import BuilderActions from './BuilderActions';

/**
 * The publish button is the builder's commit point. These tests render the
 * real component and prove the wiring the page relies on: the dirty state
 * picks Save or Share, Save runs its handler, Share is disabled with a reason
 * until the level validates, and the two states keep their own colours.
 */

type ActionsHarness = {
	readonly container: HTMLElement;
	readonly saveCount: () => number;
	readonly shareCount: () => number;
};

function mountActions(input: {
	readonly isDirty: boolean;
	readonly canShare: boolean;
	readonly shareHint?: string;
}): ActionsHarness {
	let saveCount = 0;
	let shareCount = 0;

	const container = mountComponent(
		<BuilderActions
			isRunning={false}
			isDirty={input.isDirty}
			canShare={input.canShare}
			shareHint={input.shareHint ?? ''}
			onTry={() => {}}
			onSave={() => {
				saveCount += 1;
			}}
			onShare={() => {
				shareCount += 1;
			}}
			onOpen={() => {}}
			onReset={() => {}}
		/>,
	);

	return { container, saveCount: () => saveCount, shareCount: () => shareCount };
}

function findPublishButton(container: HTMLElement): HTMLButtonElement {
	const saveLabel = messages.builder_save();
	const shareLabel = messages.builder_share();
	const button = [...container.querySelectorAll('button')].find(
		(candidate) => candidate.textContent === saveLabel || candidate.textContent === shareLabel,
	);

	if (!(button instanceof HTMLButtonElement)) {
		throw new Error('publish button not found');
	}

	return button;
}

describe('builder publish button', () => {
	test('dirty work shows a green Save that runs the save handler', () => {
		const harness = mountActions({ isDirty: true, canShare: false, shareHint: 'not ready' });
		const button = findPublishButton(harness.container);

		expect(button.textContent).toBe(messages.builder_save());
		expect(button.disabled).toBe(false);
		expect(button.classList.contains('bg-block-green/80')).toBe(true);

		button.click();
		expect(harness.saveCount()).toBe(1);
		expect(harness.shareCount()).toBe(0);
	});

	test('a shareable saved level shows an enabled gradient Share', () => {
		const harness = mountActions({ isDirty: false, canShare: true });
		const button = findPublishButton(harness.container);

		expect(button.textContent).toBe(messages.builder_share());
		expect(button.disabled).toBe(false);
		expect(button.classList.contains('bg-primary-gradient')).toBe(true);

		button.click();
		expect(harness.shareCount()).toBe(1);
		expect(harness.saveCount()).toBe(0);
	});

	test('an unshareable saved level shows a disabled Share with the reason', () => {
		const harness = mountActions({
			isDirty: false,
			canShare: false,
			shareHint: 'the program does not win yet',
		});
		const button = findPublishButton(harness.container);

		expect(button.textContent).toBe(messages.builder_share());
		expect(button.disabled).toBe(true);
		expect(button.title).toBe('the program does not win yet');

		button.click();
		expect(harness.shareCount()).toBe(0);
	});
});
