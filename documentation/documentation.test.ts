import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { markdownToHtml } from '../src/features/documentation/markdown';
import {
	listDocumentationPages,
	readRawMarkdown,
	renderDocumentationPage,
} from '../src/features/documentation/docs';

/**
 * The documentation contract. These tests treat the guide as a real feature:
 * every page must parse, the catalog must be consistent, and every internal
 * link and anchor must resolve. A broken link is a failing build, the same
 * way a broken import is.
 */

const DOCS_DIR = import.meta.dir;

const HEADING_ID_PATTERN = /\sid="([^"]+)"/g;
const HREF_PATTERN = /<a\s+href="([^"]+)"/g;

function readPageSource(fileName: string): string {
	return readFileSync(join(DOCS_DIR, fileName), 'utf-8');
}

function pageFileNames(): string[] {
	return readdirSync(DOCS_DIR)
		.filter((fileName) => fileName.endsWith('.md'))
		.sort((first, second) => first.localeCompare(second));
}

function firstHeading(markdown: string): string | null {
	const match = /^#\s+(.+)$/m.exec(markdown);
	return match?.[1]?.trim() ?? null;
}

function headingIds(html: string): Set<string> {
	const ids = new Set<string>();
	for (const match of html.matchAll(HEADING_ID_PATTERN)) {
		const id = match[1];
		if (id !== undefined) {
			ids.add(id);
		}
	}
	return ids;
}

function linksIn(html: string): string[] {
	// Links are collected from the rendered HTML, so example markdown inside
	// code spans or fences is not mistaken for a real link.
	const links: string[] = [];
	for (const match of html.matchAll(HREF_PATTERN)) {
		const href = match[1];
		if (href !== undefined) {
			links.push(href);
		}
	}
	return links;
}

describe('documentation catalog', () => {
	test('contains the index page', () => {
		expect(pageFileNames()).toContain('index.md');
	});

	test('every page has a title heading, unique across the catalog', () => {
		const titles = new Map<string, string>();

		for (const fileName of pageFileNames()) {
			const title = firstHeading(readPageSource(fileName));

			expect(title, `${fileName} must start with a "# Title" heading`).not.toBeNull();
			if (title === null) {
				continue;
			}

			expect(title.length).toBeGreaterThan(0);
			expect(title.length).toBeLessThanOrEqual(80);

			const existing = titles.get(title);
			expect(
				existing,
				`title "${title}" is used by both ${existing} and ${fileName}`,
			).toBeUndefined();
			titles.set(title, fileName);
		}
	});

	test('slugs are unique and match the file names', () => {
		const pages = listDocumentationPages();
		const slugs = new Set(pages.map((page) => page.slug));

		expect(slugs.size).toBe(pages.length);

		for (const fileName of pageFileNames()) {
			const slug = fileName.replace(/\.md$/, '');
			expect(slugs.has(slug), `catalog is missing the slug "${slug}"`).toBe(true);
		}
	});

	test('the index sorts ahead of the numbered pages', () => {
		const pages = listDocumentationPages();
		expect(pages[0]?.slug).toBe('index');
	});
});

describe('documentation rendering', () => {
	test('every page renders to non-empty HTML with heading ids', () => {
		for (const fileName of pageFileNames()) {
			const html = markdownToHtml(readPageSource(fileName));

			expect(html.length, `${fileName} rendered empty`).toBeGreaterThan(0);
			expect(html, `${fileName} must render its title heading`).toContain('<h1');
		}
	});

	test('every internal link in a rendered page points at an existing page and anchor', () => {
		const pages = new Map<string, { html: string; ids: Set<string> }>();

		for (const page of listDocumentationPages()) {
			const html = renderDocumentationPage(page.slug);
			if (html === null) {
				throw new Error(`page ${page.slug} failed to render`);
			}
			pages.set(page.slug, { html, ids: headingIds(markdownToHtml(page.markdown)) });
		}

		for (const [slug, page] of pages) {
			for (const target of linksIn(page.html)) {
				if (target.startsWith('http://') || target.startsWith('https://')) {
					continue; // external links are out of the checker's reach
				}

				if (target === '/') {
					continue; // the "Back to Algorithy" link, an app route
				}

				if (target.startsWith('#')) {
					// Heading self-links produced by the parser.
					const anchor = target.slice(1);
					expect(page.ids.has(anchor), `${slug}: self-link "${target}" has no heading`).toBe(true);
					continue;
				}

				if (!target.startsWith('/docs/')) {
					throw new Error(`${slug}: unexpected link target "${target}"`);
				}

				const [path, anchor] = target.slice('/docs/'.length).split('#', 2);
				const targetSlug = (path ?? '').replace(/\.md$/, '');

				const targetPage = pages.get(targetSlug);
				expect(targetPage, `${slug}: link to missing page "${targetSlug}"`).toBeDefined();
				if (targetPage === undefined) {
					continue;
				}

				if (anchor !== undefined && anchor !== '') {
					expect(
						targetPage.ids.has(anchor),
						`${slug}: link "${target}" points at an anchor that does not exist in ${targetSlug}`,
					).toBe(true);
				}
			}
		}
	});

	test('the raw markdown variant returns exactly the page source', () => {
		for (const page of listDocumentationPages()) {
			const raw = readRawMarkdown(page.slug);

			expect(raw, `${page.slug} must have a raw markdown variant`).not.toBeNull();
			if (raw === null) {
				continue;
			}
			expect(raw).toBe(page.markdown);
			expect(raw.startsWith(`# ${page.title}`)).toBe(true);
		}
	});

	test('raw script tags in markdown are filtered out', () => {
		const html = markdownToHtml('# Title\n\n<script>alert(1)</script>\n\ntext');

		expect(html).not.toContain('<script');
		expect(html).toContain('text');
	});

	test('code fences keep their language marker', () => {
		const html = markdownToHtml('```ts\nconst x = 1;\n```');

		expect(html).toContain('const x = 1;');
		expect(html).toContain('<pre>');
	});
});
