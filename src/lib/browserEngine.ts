/**
 * Stamp the browser engine onto an element as `data-browser-engine`, so CSS
 * can quirk-fix per engine without user-agent sniffing in selectors.
 */
function browserEngine(element: HTMLElement): void {
	let engine = 'other';
	const userAgent = navigator.userAgent;

	if (/Chrome\//.test(userAgent)) {
		engine = 'blink';
	} else if (/Gecko\//.test(userAgent)) {
		engine = 'gecko';
	} else if (/AppleWebKit\//.test(userAgent)) {
		engine = 'webkit';
	}

	element.dataset['browserEngine'] = engine;
}

export { browserEngine };
