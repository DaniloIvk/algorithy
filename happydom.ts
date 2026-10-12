import { afterEach } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Gives tests a real browser-like DOM, storage and timers. It is registered
// both through the `[test] preload` entry in `bunfig.toml` and by importing
// this module from the test harness, so the DOM tests also work when the
// suite is run from the monorepo root with the root Bun config.
if (typeof document === 'undefined') {
	GlobalRegistrator.register();
}

// Runs once per test for the whole run, so no test can leak DOM nodes, a
// stored skin or a chosen locale into the next one.
afterEach(() => {
	document.body.replaceChildren();
	localStorage.clear();
	document.documentElement.removeAttribute('data-player-skin');
});
