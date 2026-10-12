import { describe, expect, test } from 'bun:test';
import { mountComponent, settleDom } from '../../dom-harness';
import { STORAGE_KEY } from '../../lib/skin';
import { SkinProvider, useSkin } from './SkinProvider';

/**
 * The skin provider owns the player colour used everywhere (playground, brush
 * chip, switcher). These tests drive the real provider: choosing a skin writes
 * storage and mirrors it on the document, a stored skin comes back on mount,
 * and clearing removes both.
 */

function SkinProbe() {
	const { skin, hasChosen, setSkin, clearSkin } = useSkin();

	return (
		<div>
			<span class='skin-name'>{skin ?? 'none'}</span>
			<span class='skin-chosen'>{hasChosen ? 'chosen' : 'unchosen'}</span>
			<button
				type='button'
				onClick={() => {
					setSkin('blue');
				}}
			>
				Blue
			</button>
			<button
				type='button'
				onClick={() => {
					setSkin('pink');
				}}
			>
				Pink
			</button>
			<button
				type='button'
				onClick={() => {
					setSkin('green');
				}}
			>
				Green
			</button>
			<button type='button' onClick={clearSkin}>
				Clear
			</button>
		</div>
	);
}

function mountSkin(): HTMLElement {
	return mountComponent(
		<SkinProvider>
			<SkinProbe />
		</SkinProvider>,
	);
}

function clickButton(container: HTMLElement, label: string): void {
	const buttons = [...container.querySelectorAll('button')];
	const button = buttons.find((candidate) => candidate.textContent === label);

	if (button === undefined) {
		throw new Error(`button "${label}" not found`);
	}

	button.click();
}

describe('skin provider', () => {
	test('choosing a skin stores it and marks the document', async () => {
		const container = mountSkin();

		clickButton(container, 'Blue');
		await settleDom();

		expect(document.documentElement.getAttribute('data-player-skin')).toBe('blue');
		expect(localStorage.getItem(STORAGE_KEY)).toContain('blue');
		expect(container.querySelector('.skin-name')?.textContent).toBe('blue');
		expect(container.querySelector('.skin-chosen')?.textContent).toBe('chosen');
	});

	test('restores a skin stored earlier', async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify('pink'));

		const container = mountSkin();
		await settleDom();

		expect(document.documentElement.getAttribute('data-player-skin')).toBe('pink');
		expect(container.querySelector('.skin-name')?.textContent).toBe('pink');
	});

	test('clearing removes it from the document and storage', async () => {
		const container = mountSkin();

		clickButton(container, 'Blue');
		await settleDom();
		clickButton(container, 'Clear');
		await settleDom();

		expect(document.documentElement.hasAttribute('data-player-skin')).toBe(false);
		expect(localStorage.getItem(STORAGE_KEY)).toBe(null);
		expect(container.querySelector('.skin-name')?.textContent).toBe('none');
		expect(container.querySelector('.skin-chosen')?.textContent).toBe('unchosen');
	});

	test('ignores a skin it does not know', async () => {
		const container = mountSkin();

		clickButton(container, 'Green');
		await settleDom();

		expect(container.querySelector('.skin-name')?.textContent).toBe('none');
		expect(document.documentElement.hasAttribute('data-player-skin')).toBe(false);
		expect(localStorage.getItem(STORAGE_KEY)).toBe(null);
	});

	test('useSkin outside a provider explains the misuse', () => {
		expect(() => mountComponent(<SkinProbe />)).toThrow('useSkin must be used within SkinProvider');
	});
});
