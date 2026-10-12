import { describe, expect, test } from 'bun:test';
import { createApp } from '../../server';
import {
	extractTitle,
	listDocumentationPages,
	readPageFile,
	renderAllDocumentationPages,
	renderDocumentationPage,
	renderSiblingLinks,
} from './docs';

describe('documentation pages', () => {
	test('renders the index page as a complete HTML document', () => {
		const html = renderDocumentationPage('');

		expect(html).not.toBeNull();
		expect(html).toStartWith('<!doctype html>');
		expect(html).toContain('Algorithy Documentation');
		expect(html).toContain('<nav class="docs-nav">');
	});

	test('renders every listed page without throwing', () => {
		for (const page of listDocumentationPages()) {
			const html = renderDocumentationPage(page.slug);
			expect(html).not.toBeNull();
			expect(html).toContain(page.slug);
			expect(html).toContain(`<title>${escapeForTest(page.title)}`);
		}
	});

	test('rewrites internal .md links to /docs/ URLs in the rendered output', () => {
		const html = renderDocumentationPage('01-what-is-algorithy');

		expect(html).not.toBeNull();
		expect(html).toContain('href="/docs/02-getting-started"');
		expect(html).not.toContain('href="./');
	});

	test('headings carry ids and link to themselves', () => {
		const html = renderDocumentationPage('22-glossary');

		expect(html).not.toBeNull();
		expect(html).toContain('<h1 id="glossary">');
		expect(html).toContain('<a href="#glossary">');
	});

	test('extracts the title from the first heading', () => {
		expect(extractTitle('# Heading here\n\nbody')).toBe('Heading here');
		expect(extractTitle('intro\n\n# Second')).toBe('Second');
		expect(extractTitle('no heading at all')).toBeNull();
	});

	test('returns null for unknown slugs', () => {
		expect(renderDocumentationPage('not-a-page')).toBeNull();
		expect(renderDocumentationPage('..')).toBeNull();
	});

	test('renders every page for the static build, markdown included', () => {
		const pages = renderAllDocumentationPages();

		expect(pages).toHaveLength(listDocumentationPages().length);

		for (const page of pages) {
			expect(page.html).toContain('<!doctype html>');
			expect(page.markdown.length).toBeGreaterThan(0);
		}
	});

	test('ignores files that are not markdown pages', () => {
		expect(readPageFile('notes.txt')).toBeNull();
		expect(readPageFile('../escape.md')).toBeNull();
	});

	test('renders sibling links only when the list has a place for them', () => {
		expect(renderSiblingLinks([], -1)).toBe('');

		const firstPage = listDocumentationPages().slice(0, 1);
		expect(renderSiblingLinks(firstPage, 0)).toBe('');
	});
});

describe('documentation routes', () => {
	test('serves the index at /docs', async () => {
		const response = await createApp().request('/docs');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/html');
		expect(await response.text()).toContain('Algorithy Documentation');
	});

	test('serves a real page at /docs/:slug', async () => {
		const page = listDocumentationPages()[0];
		if (page === undefined) {
			throw new Error('documentation is empty');
		}

		const response = await createApp().request(`/docs/${page.slug}`);

		expect(response.status).toBe(200);
		expect(await response.text()).toContain(escapeForTest(page.title));
	});

	test('serves the raw markdown of a page at /docs/:slug.md', async () => {
		const response = await createApp().request('/docs/22-glossary.md');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/plain');
		expect(await response.text()).toStartWith('# Glossary');
	});

	test('answers 404 for an unknown documentation slug', async () => {
		const response = await createApp().request('/docs/definitely-not-a-page');

		expect(response.status).toBe(404);
	});

	test('answers 404 for an unknown raw markdown slug', async () => {
		const response = await createApp().request('/docs/definitely-not-a-page.md');

		expect(response.status).toBe(404);
	});

	test('answers 404 for a traversal-looking slug', async () => {
		const response = await createApp().request('/docs/..%2F..%2Fpackage');

		expect(response.status).toBe(404);
	});
});

function escapeForTest(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}
