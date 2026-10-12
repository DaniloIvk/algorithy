import { watch } from 'node:fs';
import { join } from 'node:path';

const APP_ROOT = join(import.meta.dir, '..');
const SRC_ROOT = join(APP_ROOT, 'src');
const MESSAGES_ROOT = join(APP_ROOT, 'messages');

const children: ReturnType<typeof Bun.spawn>[] = [];

function spawn(command: readonly string[]): void {
	const child = Bun.spawn([...command], {
		cwd: APP_ROOT,
		stdout: 'inherit',
		stderr: 'inherit',
		stdin: 'inherit',
	});
	children.push(child);
}

function shutdown(): void {
	for (const child of children) {
		child.kill();
	}
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const initialBuild = Bun.spawnSync(['bun', 'run', 'build'], {
	cwd: APP_ROOT,
	stdout: 'inherit',
	stderr: 'inherit',
});

if (initialBuild.exitCode !== 0) {
	process.exit(initialBuild.exitCode);
}

const tailwind = Bun.which('tailwindcss') ?? join(APP_ROOT, 'node_modules/.bin/tailwindcss');

function buildCss(): void {
	const result = Bun.spawnSync(
		[tailwind, '-i', './src/style.css', '-o', './dist/assets/index.css'],
		{ cwd: APP_ROOT, stdout: 'inherit', stderr: 'inherit' },
	);
	if (result.exitCode !== 0) {
		process.stderr.write('\ntailwindcss build failed\n');
	}
}

function compileMessages(): void {
	const result = Bun.spawnSync(['bun', 'run', 'i18n'], {
		cwd: APP_ROOT,
		stdout: 'inherit',
		stderr: 'inherit',
	});
	if (result.exitCode !== 0) {
		process.stderr.write('\ni18n compile failed\n');
	}
}

// Tailwind only watches files matched by `@source`, so CSS `@import`s (like
// `terrain.css`) would otherwise need a dev restart. Rebuild CSS ourselves on
// any source change; the client bundle has its own `--watch`.
let cssTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCssBuild(): void {
	if (cssTimer !== null) {
		clearTimeout(cssTimer);
	}
	cssTimer = setTimeout(() => {
		cssTimer = null;
		buildCss();
	}, 60);
}

// Recompile messages on change; the client watcher then picks up the output.
let messagesTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleMessagesCompile(): void {
	if (messagesTimer !== null) {
		clearTimeout(messagesTimer);
	}
	messagesTimer = setTimeout(() => {
		messagesTimer = null;
		compileMessages();
	}, 120);
}

watch(SRC_ROOT, { recursive: true }, (_event, filename) => {
	if (typeof filename !== 'string') {
		scheduleCssBuild();
		return;
	}
	if (filename.endsWith('.d.ts')) {
		return;
	}
	if (
		filename.endsWith('.css') ||
		filename.endsWith('.ts') ||
		filename.endsWith('.tsx') ||
		filename.endsWith('.json')
	) {
		scheduleCssBuild();
	}
});

watch(MESSAGES_ROOT, (_event, filename) => {
	if (typeof filename !== 'string' || filename.endsWith('.json')) {
		scheduleMessagesCompile();
	}
});

spawn([
	'bun',
	'build',
	'./src/client.tsx',
	'--outdir',
	'./dist/assets',
	'--target',
	'browser',
	'--watch',
]);
spawn(['bun', '--hot', './src/server.ts']);
