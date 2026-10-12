import { type CompilerOptions } from '@inlang/paraglide-js';

// Self-contained Paraglide configuration for this app. `scripts/i18n.ts`
// compiles the messages into the gitignored `src/paraglide/`. The locale
// lives in localStorage only and never appears in the URL.
export const appParaglideConfig: CompilerOptions = {
	project: './project.inlang',
	outdir: './src/paraglide',
	strategy: ['localStorage', 'baseLocale'],
	emitGitIgnore: false,
	emitPrettierIgnore: false,
	emitReadme: false,
	emitTsDeclarations: true,
	localStorageKey: 'language',
	cookieName: 'language',
	outputStructure: 'locale-modules',
};
