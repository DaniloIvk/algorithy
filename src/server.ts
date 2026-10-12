import { join } from 'node:path';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { readRawMarkdown, renderDocumentationPage } from './features/documentation/docs';

const APP_ROOT = join(import.meta.dir, '..');
const DIST_ROOT = join(APP_ROOT, 'dist');
const PUBLIC_ROOT = join(APP_ROOT, 'public');
const SHELL_FILE = Bun.file(join(APP_ROOT, 'index.html'));

const DEFAULT_PORT = 3000;

/**
 * Build the Hono app without binding a port, so tests can exercise the real
 * routes (including the documentation pages) through `app.request(...)`.
 */
function createApp() {
	const app = new Hono();

	if (!isProduction) {
		// In dev the watchers rewrite dist/assets in place, so the browser must
		// never serve a cached copy (HTML or asset) after a rebuild.
		app.use('*', async (context, next) => {
			await next();
			context.header('Cache-Control', 'no-store');
		});
	}

	// Built client bundle + CSS live in dist/assets; favicon and other static
	// files live in public/assets. Try the build output first, then public.
	app.use('/assets/*', serveStatic({ root: DIST_ROOT }));
	app.use('/assets/*', serveStatic({ root: PUBLIC_ROOT }));

	// The documentation site: markdown rendered server-side with Bun's native
	// parser. Registered before the SPA fallback so /docs never returns the
	// game shell.
	app.get('/docs', (context) => {
		const html = renderDocumentationPage('');
		return html === null ? context.notFound() : context.html(html);
	});

	app.get('/docs/:slug', (context) => {
		const page = context.req.param('slug') ?? '';

		// /docs/<slug>.md serves the raw Markdown the page is rendered from.
		if (page.endsWith('.md')) {
			const markdown = readRawMarkdown(page.slice(0, -'.md'.length));
			return markdown === null
				? context.notFound()
				: context.newResponse(markdown, 200, { 'Content-Type': 'text/plain; charset=utf-8' });
		}

		const html = renderDocumentationPage(page);
		return html === null ? context.notFound() : context.html(html);
	});

	// SPA fallback: the client router resolves the level from the URL. Asset
	// requests that fell through must stay 404s instead of returning HTML.
	app.get('*', async (context) => {
		if (context.req.path.startsWith('/assets/')) {
			return context.notFound();
		}

		return context.html(await SHELL_FILE.text());
	});

	return app;
}

const isProduction = process.env['NODE_ENV'] === 'production';

function startServer(port = Number(process.env['PORT'] ?? DEFAULT_PORT)) {
	const server = Bun.serve({ port, fetch: createApp().fetch });
	console.log(`Algorithy running at http://localhost:${server.port}`);
	return server;
}

if (import.meta.main) startServer();

export { createApp, startServer };
