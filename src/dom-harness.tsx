import '../happydom';
import type { Child } from 'hono/jsx';
import { flushSync, render } from 'hono/jsx/dom';

/**
 * Shared DOM test harness.
 *
 * Tests mount real components into the happy-dom document registered by the
 * `happydom.ts` preload, drive them with real events, and assert on the real
 * DOM, real timers and real `localStorage`. Nothing here is mocked.
 */

/** Mounts a component into a fresh container attached to the document. */
function mountComponent(component: Child): HTMLElement {
	const container = document.createElement('div');
	document.body.append(container);
	render(component, container);
	return container;
}

/** Lets queued effects and state updates run before the assertions. */
async function settleDom(): Promise<void> {
	flushSync(() => {});

	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});

	flushSync(() => {});
}

/** Waits for the given number of milliseconds on the real timer. */
async function waitForMilliseconds(milliseconds: number): Promise<void> {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

export { mountComponent, settleDom, waitForMilliseconds };
