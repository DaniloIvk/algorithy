import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { markdownToHtml } from './markdown';

/**
 * The documentation site.
 *
 * Content lives in `documentation/` as plain Markdown files. This module turns
 * them into complete, self-contained HTML pages: every page carries its own
 * inline stylesheet and a nav listing, so the same renderer feeds the Hono
 * `/docs/*` routes in `server.ts` and the static `dist/docs/*` copies written
 * by `scripts/assemble-dist.ts`.
 *
 * Pages are re-read and re-rendered per request. The catalog is small and
 * Bun's parser is native, so the cost is negligible, and edits to a page show
 * up on the next request instead of the next server restart.
 */

// This file sits in src/features/documentation; the Markdown sources live in
// the app's own documentation/ folder, three levels up.
const DOCUMENTATION_ROOT = join(import.meta.dir, '..', '..', '..', 'documentation');

const INDEX_SLUG = 'index';
const INDEX_TITLE = 'Algorithy Documentation';
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

type DocumentationPage = {
	/** URL segment, also the file name without its extension. */
	readonly slug: string;
	readonly title: string;
	readonly markdown: string;
};

function readPageFile(fileName: string): DocumentationPage | null {
	const extension = fileName.lastIndexOf('.');
	if (extension === -1 || fileName.slice(extension) !== '.md') {
		return null;
	}

	const slug = fileName.slice(0, extension);

	if (!SLUG_PATTERN.test(slug)) {
		return null;
	}

	const markdown = readFileSync(join(DOCUMENTATION_ROOT, fileName), 'utf-8');
	const title = extractTitle(markdown) ?? slug;

	return { slug, title, markdown };
}

/** The page title is the first `# ` heading, the way a reader sees it. */
function extractTitle(markdown: string): string | null {
	const heading = /^#\s+(.+)$/m.exec(markdown);
	return heading?.[1]?.trim() ?? null;
}

function listDocumentationPages(): readonly DocumentationPage[] {
	const fileNames = readdirSync(DOCUMENTATION_ROOT)
		.filter((fileName) => fileName.endsWith('.md'))
		.sort((first, second) => first.localeCompare(second));

	const pages: DocumentationPage[] = [];

	for (const fileName of fileNames) {
		const page = readPageFile(fileName);
		if (page !== null) {
			pages.push(page);
		}
	}

	// The index page opens the site, so it sorts ahead of the numbered pages
	// regardless of file-name order.
	pages.sort((first, second) => {
		if (first.slug === INDEX_SLUG) {
			return -1;
		}
		if (second.slug === INDEX_SLUG) {
			return 1;
		}
		return 0;
	});

	return pages;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

/**
 * Rewrite internal `*.md` links in rendered HTML into `/docs/<slug>` URLs.
 * The Markdown sources link with `./NN-slug.md` so the raw files stay
 * browsable, but a rendered page must link to the rendered page; the sidebar
 * and the page content then always agree.
 */
function rewriteInternalLinks(html: string): string {
	return html.replace(
		/href="(?:\.\/)?([a-z0-9][a-z0-9-]*)\.md(#([^"]*))?"/g,
		(_match, slug: string, suffix: string | undefined) => `href="/docs/${slug}${suffix ?? ''}"`,
	);
}

function renderNavigation(pages: readonly DocumentationPage[], currentSlug: string): string {
	const links = pages.map((page) => {
		const className =
			page.slug === currentSlug || (currentSlug === '' && page.slug === INDEX_SLUG)
				? 'docs-nav-link docs-nav-link-active'
				: 'docs-nav-link';
		return `<a class="${className}" href="/docs/${page.slug}">${escapeHtml(page.title)}</a>`;
	});

	return `<nav class="docs-nav">${links.join('\n')}</nav>`;
}

function renderSiblingLinks(pages: readonly DocumentationPage[], currentIndex: number): string {
	if (currentIndex === -1) {
		return '';
	}

	const previousPage = pages[currentIndex - 1];
	const nextPage = pages[currentIndex + 1];

	if (previousPage === undefined && nextPage === undefined) {
		return '';
	}

	const previousLink =
		previousPage === undefined
			? ''
			: `<a class="docs-sibling docs-sibling-prev" href="/docs/${previousPage.slug}">&#8592; ${escapeHtml(previousPage.title)}</a>`;
	const nextLink =
		nextPage === undefined
			? ''
			: `<a class="docs-sibling docs-sibling-next" href="/docs/${nextPage.slug}">${escapeHtml(nextPage.title)} &#8594;</a>`;

	return `<div class="docs-siblings">${previousLink}${nextLink}</div>`;
}

// The same palette as the app, so the documentation reads as part of it.
const DOCS_STYLESHEET = `
	@import url('https://fonts.cdnfonts.com/css/gilroy-bold?styles=20876,20877,20878,20879,20880,20881');
	*, *::before, *::after { box-sizing: border-box; }
	:root {
		color-scheme: light dark;
		--docs-surface: light-dark(oklch(0.965 0.012 285), oklch(0.21 0.03 275));
		--docs-surface-raised: light-dark(oklch(0.995 0.004 285), oklch(0.27 0.04 275));
		--docs-content: light-dark(oklch(0.19 0.02 285), oklch(0.95 0.015 275));
		--docs-content-masked: light-dark(oklch(0.44 0.035 285), oklch(0.72 0.02 275));
		--docs-border: color-mix(in oklch, var(--docs-content) 16%, transparent);
		--docs-primary: light-dark(oklch(0.585 0.233 277), oklch(0.673 0.182 277));
	}
	/* Scrollbars: a visible handle on a transparent track, everywhere. */
	* { scrollbar-width: thin; scrollbar-color: color-mix(in oklch, var(--docs-content) 30%, transparent) transparent; }
	*::-webkit-scrollbar { width: 10px; height: 10px; }
	*::-webkit-scrollbar-track, *::-webkit-scrollbar-corner { background: transparent; }
	*::-webkit-scrollbar-thumb {
		background-color: color-mix(in oklch, var(--docs-content) 28%, transparent);
		border: 2px solid transparent;
		border-radius: 9999px;
		background-clip: content-box;
	}
	*::-webkit-scrollbar-thumb:hover { background-color: color-mix(in oklch, var(--docs-content) 45%, transparent); }
	body { margin: 0; font-family: 'Gilroy-Regular', 'Gilroy-Light', 'Gilroy', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; background: var(--docs-surface); color: var(--docs-content); }
	.docs-layout { display: grid; grid-template-columns: minmax(14rem, 20rem) minmax(0, 1fr); min-height: 100vh; }
	.docs-sidebar {
		position: sticky;
		top: 0;
		align-self: start;
		height: 100dvh;
		overflow-y: auto;
		overscroll-behavior: contain;
		border-right: 1px solid var(--docs-border);
		padding: 1rem 1.25rem;
		background: var(--docs-surface);
	}
	.docs-nav { display: flex; flex-direction: column; gap: 0.125rem; }
	.docs-nav-link { padding: 0.35rem 0.6rem; border-radius: 0.5rem; color: var(--docs-content-masked); text-decoration: none; font-size: 0.925rem; }
	.docs-nav-link:hover { background: var(--docs-surface-raised); color: var(--docs-content); }
	.docs-nav-link-active { background: color-mix(in oklch, var(--docs-primary) 14%, transparent); font-weight: 600; color: var(--docs-primary); }
	.docs-content { padding: 1.5rem 2rem 4.5rem; max-width: 60rem; margin-inline: auto; }
	.docs-content h1 { margin-top: 0; }
	.docs-content a { color: var(--docs-primary); }
	.docs-content pre { padding: 0.75rem 1rem; border-radius: 0.5rem; overflow-x: auto; background: var(--docs-surface-raised); }
	.docs-content code { font-family: ui-monospace, monospace; }
	.docs-content :not(pre) > code { background: var(--docs-surface-raised); padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
	.docs-content table { border-collapse: collapse; margin: 1rem 0; }
	.docs-content th, .docs-content td { border: 1px solid var(--docs-border); padding: 0.4rem 0.7rem; text-align: left; vertical-align: top; }
	.docs-content img { max-width: 100%; }
	.docs-footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid var(--docs-border); color: var(--docs-content-masked); }
	.docs-back { text-decoration: none; color: var(--docs-primary); font-weight: 600; white-space: nowrap; }
	.docs-back:hover { text-decoration: underline; }
	.docs-siblings { display: flex; justify-content: space-between; gap: 1rem; }
	.docs-sibling { text-decoration: none; color: var(--docs-primary); }
	.docs-sibling:hover { text-decoration: underline; }
	a:focus-visible, button:focus-visible { outline: 2px solid var(--docs-primary); outline-offset: 2px; border-radius: 0.25rem; }

	/* Floating controls: no bar, no background, just buttons above the page.
	   Browse docs on the left, back to top on the right; uppercased by CSS. */
	.docs-controls {
		position: fixed;
		inset-inline: 0;
		bottom: calc(1rem + env(safe-area-inset-bottom));
		z-index: 70;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0 1.25rem;
		pointer-events: none;
	}
	.docs-browse, .docs-to-top {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		height: 2.5rem;
		border: 1px solid var(--docs-border);
		border-radius: 9999px;
		background: color-mix(in oklch, var(--docs-surface-raised) 92%, transparent);
		backdrop-filter: blur(8px);
		color: var(--docs-content);
		font: inherit;
		cursor: pointer;
		pointer-events: auto;
	}
	.docs-browse { display: none; padding: 0 1.1rem; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	.docs-browse:hover, .docs-to-top:hover { border-color: var(--docs-content-masked); }
	.docs-to-top {
		width: 2.5rem;
		padding: 0;
		opacity: 0;
		visibility: hidden;
		transform: translateY(0.5rem);
		transition: opacity 200ms ease, transform 200ms ease, visibility 0s linear 200ms;
	}
	html.docs-scrolled .docs-to-top { opacity: 1; visibility: visible; transform: translateY(0); transition: opacity 200ms ease, transform 200ms ease; }
	.docs-browse svg, .docs-to-top svg { flex: none; }

	@media (max-width: 64rem) {
		.docs-layout { display: block; }
		.docs-content { padding-bottom: calc(2.5rem + 3.5rem + env(safe-area-inset-bottom)); }
		.docs-browse { display: inline-flex; }
		/* Browse docs left, back to top right. */
		.docs-controls { justify-content: space-between; }
		/* Four footer links wrap into two rows of two on smaller screens; the
		   siblings container flattens so its links join the grid directly. */
		.docs-footer { display: grid; grid-template-columns: 1fr 1fr; row-gap: 0.5rem; }
		.docs-siblings { display: contents; }
		.docs-back, .docs-sibling-next { justify-self: start; }
		.docs-sibling-prev, .docs-raw { justify-self: end; }

		/* Shared drawer skin; each size class below sets where it docks. */
		.docs-sidebar {
			position: fixed;
			z-index: 60;
			height: auto;
			align-self: auto;
			overflow-y: auto;
			overscroll-behavior: contain;
			padding: 1rem;
			background: var(--docs-surface);
			border: 0;
			visibility: hidden;
		}
		html.docs-drawer-open .docs-sidebar { visibility: visible; }
		body::before {
			content: '';
			position: fixed;
			inset: 0;
			z-index: 55;
			background: color-mix(in oklch, black 35%, transparent);
			opacity: 0;
			pointer-events: none;
			transition: opacity 240ms ease;
		}
		html.docs-drawer-open body::before { opacity: 1; pointer-events: auto; }
	}

	/* Tablet: a left-side panel with the desktop sidebar's look, sliding in
	   from the left edge; the page list never changes sides. */
	@media (min-width: 48rem) and (max-width: 64rem) {
		.docs-sidebar {
			top: 0;
			bottom: 0;
			left: 0;
			right: auto;
			width: min(20rem, 85vw);
			max-height: 100dvh;
			padding: 1rem 1.25rem 4.5rem;
			border-right: 1px solid var(--docs-border);
			box-shadow: 8px 0 24px color-mix(in oklch, black 14%, transparent);
			transform: translateX(-100%);
			transition: transform 240ms ease, visibility 0s linear 240ms;
		}
		html.docs-drawer-open .docs-sidebar { transform: translateX(0); transition: transform 240ms ease; }
	}

	/* Mobile: always a full-width sheet, 70dvh, from the bottom. The floating
	   controls get out of the way while it is open. */
	@media (max-width: 48rem) {
		.docs-controls { transition: opacity 180ms ease, visibility 0s linear 180ms; }
		html.docs-drawer-open .docs-controls { opacity: 0; visibility: hidden; pointer-events: none; }
		.docs-sidebar {
			bottom: 0;
			top: auto;
			left: 0;
			right: 0;
			max-height: 70dvh;
			border-radius: 1rem 1rem 0 0;
			box-shadow: 0 -8px 24px color-mix(in oklch, black 14%, transparent);
			padding-bottom: calc(3.5rem + env(safe-area-inset-bottom));
			transform: translateY(100%);
			transition: transform 240ms ease, visibility 0s linear 240ms;
		}
		html.docs-drawer-open .docs-sidebar { transform: translateY(0); transition: transform 240ms ease; }
	}
`;

// The tiny script that drives the bottom controls. Plain DOM, no
// dependencies, so the pages stay fully static apart from this interaction.
const DOCS_DRAWER_SCRIPT = `(() => {
	const root = document.documentElement;
	const toggle = document.getElementById('docs-drawer-toggle');
	const sidebar = document.getElementById('docs-sidebar');
	const toTop = document.getElementById('docs-to-top');

	function setOpen(open) {
		root.classList.toggle('docs-drawer-open', open);
		if (toggle) toggle.setAttribute('aria-expanded', String(open));
	}

	toggle?.addEventListener('click', () => setOpen(!root.classList.contains('docs-drawer-open')));
	document.addEventListener('click', (event) => {
		if (
			root.classList.contains('docs-drawer-open') &&
			sidebar &&
			event.target instanceof Node &&
			!sidebar.contains(event.target) &&
			!(toggle instanceof Node && toggle.contains(event.target))
		) {
			setOpen(false);
		}
	});
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') setOpen(false);
	});

	function updateToTop() {
		root.classList.toggle('docs-scrolled', window.scrollY > 320);
	}

	window.addEventListener('scroll', updateToTop, { passive: true });
	updateToTop();
	toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();`;

/**
 * Resolve the page to show for a slug. `''` (the `/docs` index route) resolves
 * to `index.md`; an unknown slug resolves to null, which the caller turns into
 * a 404.
 */
function resolvePage(slug: string): DocumentationPage | null {
	const pages = listDocumentationPages();
	const wantedSlug = slug === '' ? INDEX_SLUG : slug;
	return pages.find((page) => page.slug === wantedSlug) ?? null;
}

/** The raw Markdown of a page, served at `/docs/<slug>.md`. */
function readRawMarkdown(slug: string): string | null {
	return resolvePage(slug)?.markdown ?? null;
}

function renderDocumentationPage(slug: string): string | null {
	const pages = listDocumentationPages();
	const page = resolvePage(slug);

	if (page === null) {
		return null;
	}

	const title = page.slug === INDEX_SLUG ? INDEX_TITLE : page.title;
	const currentIndex = pages.findIndex((candidate) => candidate.slug === page.slug);
	const contentHtml = rewriteInternalLinks(markdownToHtml(page.markdown));
	const navigationHtml = renderNavigation(pages, page.slug);
	const siblingsHtml = renderSiblingLinks(pages, currentIndex);

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="referrer" content="no-referrer" />
	<title>${escapeHtml(title)} &#183; Algorithy Documentation</title>
	<style>${DOCS_STYLESHEET}</style>
</head>
<body>
	<div class="docs-layout">
		<aside class="docs-sidebar" id="docs-sidebar">
			${navigationHtml}
		</aside>
		<main class="docs-content">
			${contentHtml}
			<div class="docs-footer">
				<a class="docs-back" href="/">&#8592; Back to Algorithy</a>
				${siblingsHtml}
				<a class="docs-sibling docs-raw" href="/docs/${page.slug}.md">Raw markdown</a>
			</div>
		</main>
	</div>
	<div class="docs-controls">
		<button
			type="button"
			class="docs-browse"
			id="docs-drawer-toggle"
			aria-expanded="false"
			aria-controls="docs-sidebar"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				aria-hidden="true"
			>
				<path d="M4 6h16M4 12h16M4 18h16" />
			</svg>
			Browse docs
		</button>
		<button type="button" class="docs-to-top" id="docs-to-top" aria-label="Back to top">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M12 19V5" />
				<path d="m5 12 7-7 7 7" />
			</svg>
		</button>
	</div>
	<script>${DOCS_DRAWER_SCRIPT}</script>
</body>
</html>`;
}

/** Every page, rendered: used by the static build to fill `dist/docs/`. */
function renderAllDocumentationPages(): readonly {
	readonly slug: string;
	readonly html: string;
	readonly markdown: string;
}[] {
	const pages = listDocumentationPages();

	return pages.map((page) => ({
		slug: page.slug,
		html: renderDocumentationPage(page.slug) ?? '',
		markdown: page.markdown,
	}));
}

export {
	DOCUMENTATION_ROOT,
	INDEX_SLUG,
	SLUG_PATTERN,
	extractTitle,
	listDocumentationPages,
	readPageFile,
	readRawMarkdown,
	renderAllDocumentationPages,
	renderDocumentationPage,
	renderSiblingLinks,
};
export type { DocumentationPage };
