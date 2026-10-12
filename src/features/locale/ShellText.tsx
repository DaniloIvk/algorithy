import { useEffect } from 'hono/jsx';
import { messages } from '../../lib/i18n';
import { useLocale } from './LocaleProvider';

// The header, footer and description live in the static SPA shell, outside the
// app tree. This writes the active locale's text into them; the noscript copy
// in `index.html` stays bilingual because it must work without JavaScript.
function ShellText(): null {
	const { locale } = useLocale();

	useEffect(() => {
		const heading = document.querySelector('header h1');
		const headingLogo = heading?.querySelector('img');
		if (headingLogo) {
			// The header is a logo, not text: keep the mark and localise its name.
			headingLogo.setAttribute('alt', messages.app_title());
		} else if (heading) {
			heading.textContent = messages.app_title();
		}
		const footerCopy = document.querySelector('#footer-copy');
		if (footerCopy) {
			footerCopy.textContent = messages.app_footer_copyright();
		}
		const footerDocs = document.querySelector('#footer-docs');
		if (footerDocs) {
			footerDocs.textContent = messages.app_footer_documentation();
		}
		const description = document.querySelector('meta[name="description"]');
		if (description) {
			description.setAttribute('content', messages.app_description());
		}
	}, [locale]);

	return null;
}

export default ShellText;
