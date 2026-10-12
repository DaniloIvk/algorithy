import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderAllDocumentationPages } from '../src/features/documentation/docs';

const appRoot = join(import.meta.dir, '..');
const distDir = join(appRoot, 'dist');
const publicDir = join(appRoot, 'public');

function copyTree(sourceDir: string, targetDir: string): void {
	for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
		const source = join(sourceDir, entry.name);
		const target = join(targetDir, entry.name);

		if (entry.isDirectory()) {
			mkdirSync(target, { recursive: true });
			copyTree(source, target);
		} else {
			copyFileSync(source, target);
		}
	}
}

function writeDocumentationPages(): void {
	// Each page becomes dist/docs/<slug>/index.html, so a static host resolves
	// the same /docs/<slug> URLs the server renders, without an SPA fallback.
	// The index is written twice: once as its slug folder, once as
	// dist/docs/index.html so the bare /docs URL resolves too.
	for (const page of renderAllDocumentationPages()) {
		const pageDir = join(distDir, 'docs', page.slug);
		mkdirSync(pageDir, { recursive: true });
		writeFileSync(join(pageDir, 'index.html'), page.html, 'utf-8');

		// The raw Markdown variant, served at /docs/<slug>.md.
		writeFileSync(join(distDir, 'docs', `${page.slug}.md`), page.markdown, 'utf-8');

		if (page.slug === 'index') {
			mkdirSync(join(distDir, 'docs'), { recursive: true });
			writeFileSync(join(distDir, 'docs', 'index.html'), page.html, 'utf-8');
		}
	}
}

mkdirSync(distDir, { recursive: true });
copyFileSync(join(appRoot, 'index.html'), join(distDir, 'index.html'));
copyTree(publicDir, distDir);
writeDocumentationPages();

console.log('Assembled static site in dist/');
