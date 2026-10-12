/** Scrolls an element into view and resolves once the scroll settles. */
function revealElement(element: Element | null): Promise<void> {
	if (element === null) {
		return Promise.resolve();
	}

	const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
	const rect = element.getBoundingClientRect();
	if (rect.top >= headerHeight && rect.bottom <= window.innerHeight) {
		return Promise.resolve();
	}

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });

	if (reduceMotion) {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		let settleTimer = 0;

		function finish(): void {
			window.clearTimeout(settleTimer);
			window.removeEventListener('scroll', handleScroll, true);
			resolve();
		}

		function handleScroll(): void {
			window.clearTimeout(settleTimer);
			settleTimer = window.setTimeout(finish, 120);
		}

		settleTimer = window.setTimeout(finish, 150);
		window.addEventListener('scroll', handleScroll, true);
	});
}

export { revealElement };
