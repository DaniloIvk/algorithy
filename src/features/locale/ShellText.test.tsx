import { describe, expect, test } from 'bun:test';
import { mountComponent, settleDom } from '../../dom-harness';
import { messages } from '../../lib/i18n';
import { LocaleProvider } from './LocaleProvider';
import ShellText from './ShellText';

/**
 * ShellText writes locale-dependent copy into the static SPA shell that lives
 * outside the app tree. The header is a logo, so it must keep the mark and
 * only localise its accessible name; the title text is a fallback for a shell
 * without the logo. The footer and description keep their normal behaviour.
 */

type ShellHarness = {
	readonly heading: HTMLElement;
	readonly footerCopy: HTMLElement;
	readonly footerDocs: HTMLElement;
	readonly description: HTMLElement;
};

function mountShell(withLogo: boolean): ShellHarness {
	const header = document.createElement('header');
	const heading = document.createElement('h1');

	if (withLogo) {
		const image = document.createElement('img');
		image.src = '/assets/logo.svg';
		heading.append(image);
	}

	header.append(heading);

	const footerCopy = document.createElement('span');
	footerCopy.id = 'footer-copy';
	const footerDocs = document.createElement('a');
	footerDocs.id = 'footer-docs';

	// happy-dom's cleanup clears the body but not the head, so drop any
	// description a previous test left behind before adding this one.
	for (const existing of document.querySelectorAll('meta[name="description"]')) {
		existing.remove();
	}
	const description = document.createElement('meta');
	description.setAttribute('name', 'description');

	document.head.append(description);
	document.body.append(header, footerCopy, footerDocs);

	mountComponent(
		<LocaleProvider>
			<ShellText />
		</LocaleProvider>,
	);

	return { heading, footerCopy, footerDocs, description };
}

describe('ShellText', () => {
	test('keeps the header logo and localises the shell copy', async () => {
		const shell = mountShell(true);

		await settleDom();

		expect(shell.heading.querySelector('img')).not.toBeNull();
		expect(shell.heading.querySelector('img')?.getAttribute('alt')).toBe(messages.app_title());
		expect(shell.heading.textContent).toBe('');
		expect(shell.footerCopy.textContent).toBe(messages.app_footer_copyright());
		expect(shell.footerDocs.textContent).toBe(messages.app_footer_documentation());
		expect(shell.description.getAttribute('content')).toBe(messages.app_description());
	});

	test('falls back to the title text when the shell has no logo', async () => {
		const shell = mountShell(false);

		await settleDom();

		expect(shell.heading.querySelector('img')).toBeNull();
		expect(shell.heading.textContent).toBe(messages.app_title());
	});
});
