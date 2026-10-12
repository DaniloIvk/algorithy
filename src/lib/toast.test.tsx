import { describe, expect, test } from 'bun:test';
import { useState } from 'hono/jsx';
import { render } from 'hono/jsx/dom';
import ToastStack from '../features/level/components/ToastStack';
import { mountComponent, settleDom, waitForMilliseconds } from '../dom-harness';
import { ToastProvider, useToast } from './toast';

/**
 * The toast stack is the app's only feedback channel, so the tests drive the
 * real provider and the real stack: a message appears, can be closed by hand,
 * and disappears on its own after the duration it was given.
 */

function ToastTrigger() {
	const { addToast } = useToast();

	return (
		<button
			type='button'
			onClick={() => {
				addToast('Level saved', 'success', 40);
			}}
		>
			Trigger
		</button>
	);
}

/** Adds a toast that stays put, for the eviction test. */
function LongToastTrigger() {
	const { addToast } = useToast();

	return (
		<button
			type='button'
			onClick={() => {
				addToast('Level saved', 'success');
			}}
		>
			Trigger long
		</button>
	);
}

function mountToasts(): HTMLElement {
	return mountComponent(
		<ToastProvider>
			<ToastTrigger />
			<LongToastTrigger />
			<ToastStack />
		</ToastProvider>,
	);
}

function clickTrigger(container: HTMLElement): void {
	const trigger = [...container.querySelectorAll('button')].find(
		(button) => button.textContent === 'Trigger',
	);
	if (trigger === undefined) {
		throw new Error('toast trigger not found');
	}
	trigger.click();
}

function clickLongTrigger(container: HTMLElement): void {
	const trigger = [...container.querySelectorAll('button')].find(
		(button) => button.textContent === 'Trigger long',
	);
	if (trigger === undefined) {
		throw new Error('long toast trigger not found');
	}
	trigger.click();
}

describe('toasts', () => {
	test('shows the message and closes it on demand', async () => {
		const container = mountToasts();

		clickTrigger(container);
		await settleDom();
		expect(container.textContent).toContain('Level saved');

		const closeButton = container.querySelector('output button');
		if (!(closeButton instanceof HTMLButtonElement)) {
			throw new Error('toast close button not found');
		}
		closeButton.click();
		await settleDom();
		// The toast stays mounted while it animates out, then is removed.
		expect(container.querySelector('output')?.getAttribute('data-exiting')).toBe('true');

		await waitForMilliseconds(260);
		await settleDom();

		expect(container.textContent).not.toContain('Level saved');
	});

	test('dismisses itself after its duration', async () => {
		const container = mountToasts();

		clickTrigger(container);
		await settleDom();
		expect(container.textContent).toContain('Level saved');

		await waitForMilliseconds(320);
		await settleDom();

		expect(container.textContent).not.toContain('Level saved');
	});

	test('keeps only the five newest toasts', async () => {
		const container = mountToasts();

		for (let index = 0; index < 6; index += 1) {
			clickLongTrigger(container);
		}
		await settleDom();

		// One is animating out; once it finishes, the five newest remain.
		await waitForMilliseconds(260);
		await settleDom();

		expect(container.querySelectorAll('output')).toHaveLength(5);
	});

	test('clears its timers when the provider unmounts', async () => {
		const container = mountToasts();

		clickTrigger(container);
		await settleDom();
		expect(container.textContent).toContain('Level saved');

		render(null, container);
		expect(container.textContent).toBe('');
	});

	function KeyedToasts() {
		const [generation, setGeneration] = useState(0);

		return (
			<div>
				<button
					type='button'
					onClick={() => {
						setGeneration((value) => value + 1);
					}}
				>
					Remount
				</button>
				<ToastProvider key={generation}>
					<ToastTrigger />
					<ToastStack />
				</ToastProvider>
			</div>
		);
	}

	test('clears its timers when the provider is replaced', async () => {
		const container = mountComponent(<KeyedToasts />);

		clickTrigger(container);
		await settleDom();
		expect(container.textContent).toContain('Level saved');

		const remount = [...container.querySelectorAll('button')].find(
			(button) => button.textContent === 'Remount',
		);
		if (remount === undefined) {
			throw new Error('remount button not found');
		}
		remount.click();
		await settleDom();

		expect(container.querySelectorAll('output')).toHaveLength(0);
	});

	test('useToast outside a provider explains the misuse', () => {
		expect(() => mountComponent(<ToastTrigger />)).toThrow(
			'useToast must be used within ToastProvider',
		);
	});
});
