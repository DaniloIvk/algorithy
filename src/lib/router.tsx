import { useEffect, useState } from 'hono/jsx';
import type { Child } from 'hono/jsx';
import type { JSX } from 'hono/jsx/dom/jsx-runtime';
import { resolveLevel } from '../domain/level';
import LevelPage from '../pages/LevelPage';
import BuilderPage from '../pages/BuilderPage';
import SharedLevelPage from '../pages/SharedLevelPage';
import NotFound from '../pages/NotFound';
import { loadLastLevelSlug } from './persistence';

const LEVELS_PATH = /^\/levels\/([^/]+)\/?$/i;
const BUILD_PATH = /^\/build(?:\/([^/]+))?\/?$/i;
const SHARED_PATH = /^\/shared\/([^/]+)\/?$/i;

/**
 * The current pathname as a small module store. The router renders from it,
 * and chrome outside the routed tree (the header actions) follows it too.
 * Every pushState/replaceState the app makes is paired with a synthetic
 * `popstate`, so one listener keeps the store in step.
 */
let currentPathname: string = globalThis.location.pathname;
const pathnameSubscribers = new Set<(pathname: string) => void>();

function updatePathname(): void {
	currentPathname = globalThis.location.pathname;
	for (const subscriber of pathnameSubscribers) {
		subscriber(currentPathname);
	}
}

function usePathname(): string {
	const [pathname, setPathname] = useState<string>(currentPathname);

	useEffect(() => {
		pathnameSubscribers.add(setPathname);
		return () => {
			pathnameSubscribers.delete(setPathname);
		};
	}, []);

	return pathname;
}

globalThis.addEventListener('popstate', updatePathname);

/** The last level this browser visited, when it still exists; level 1 otherwise. */
function resolveInitialLevelSlug(): string {
	const storedSlug = loadLastLevelSlug();

	if (storedSlug !== null && resolveLevel(storedSlug) !== null) {
		return storedSlug;
	}

	return '1';
}

function match(pathname: string): JSX.Element {
	const stripped = pathname.replace(/\?.*$/, '').replace(/#.*$/, '');
	const levels = LEVELS_PATH.exec(stripped);

	if (levels?.[1]) {
		return <LevelPage slug={levels[1]} />;
	}

	const build = BUILD_PATH.exec(stripped);
	if (build !== null) {
		return <BuilderPage payload={build[1] ?? null} key={build[1] ?? 'new'} />;
	}

	const shared = SHARED_PATH.exec(stripped);
	if (shared?.[1]) {
		return <SharedLevelPage payload={shared[1]} key={shared[1]} />;
	}

	if (stripped === '/') {
		return <LevelPage slug={resolveInitialLevelSlug()} />;
	}

	return <NotFound />;
}

function navigate(href: string): void {
	history.pushState(null, '', href);
	globalThis.dispatchEvent(new PopStateEvent('popstate'));
}

type LinkProps = {
	readonly href: string;
	readonly children: Child;
	readonly class?: string;
	readonly title?: string;
	readonly 'aria-label'?: string;
};

function Link({
	href,
	children,
	class: className,
	title,
	'aria-label': ariaLabel,
}: LinkProps): JSX.Element {
	const onClick = (event: MouseEvent) => {
		event.preventDefault();
		navigate(href);
	};

	return (
		<a href={href} class={className} title={title} aria-label={ariaLabel} onClick={onClick}>
			{children}
		</a>
	);
}

function Router(): JSX.Element {
	const pathname = usePathname();

	useEffect(() => {
		if (pathname !== '/') {
			return;
		}

		const initialSlug = resolveInitialLevelSlug();
		history.replaceState(null, '', `/levels/${initialSlug}`);
		updatePathname();
	}, [pathname]);

	return match(pathname);
}

export { Link, navigate, usePathname };
export default Router;
