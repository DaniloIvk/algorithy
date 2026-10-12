import { describe, expect, test } from 'bun:test';
import { createApp, startServer } from './server';

/**
 * The server routes. The docs routes have their own test file; these cases
 * cover the game side: the SPA fallback and the asset 404 guard, which is
 * what keeps a missing asset from quietly returning HTML.
 */

describe('server routing', () => {
	test('serves the SPA shell for a level path', async () => {
		const response = await createApp().request('/levels/1');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/html');

		const body = await response.text();
		expect(body).toContain('<!doctype html>');
		expect(body).toContain('id="root"');
	});

	test('serves the SPA shell for the root and unknown client routes', async () => {
		expect((await createApp().request('/')).status).toBe(200);
		expect((await createApp().request('/levels/999')).status).toBe(200);
	});

	test('serves the SPA shell for the builder and shared routes', async () => {
		const builderResponse = await createApp().request('/build');
		expect(builderResponse.status).toBe(200);
		expect(await builderResponse.text()).toContain('id="root"');

		const sharedResponse = await createApp().request('/shared/abc');
		expect(sharedResponse.status).toBe(200);
		expect(await sharedResponse.text()).toContain('id="root"');
	});

	test('answers 404 for a missing asset instead of the shell', async () => {
		const response = await createApp().request('/assets/definitely-missing-file.js');

		expect(response.status).toBe(404);
	});

	test('starts and stops on a real port', () => {
		const server = startServer(0);

		try {
			expect(server.port).toBeGreaterThan(0);
		} finally {
			void server.stop(true);
		}
	});
});
