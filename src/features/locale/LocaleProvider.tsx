import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'hono/jsx';
import type { Child } from 'hono/jsx';
import { getLocale, setLocale as setParaglideLocale, type Locale } from '../../lib/i18n';

type LocaleContextValue = {
	readonly locale: Locale;
	readonly setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyLocaleToDocument(locale: Locale): void {
	document.documentElement.lang = locale;
}

function LocaleProvider({ children }: { readonly children: Child }) {
	const [locale, setLocaleState] = useState<Locale>(() => getLocale());

	const setLocale = useCallback((nextLocale: Locale) => {
		// Persist to localStorage and update the Paraglide runtime without a
		// reload; the keyed subtree in App re-renders every message call.
		void setParaglideLocale(nextLocale, { reload: false });
		setLocaleState(nextLocale);
		applyLocaleToDocument(nextLocale);
	}, []);

	useEffect(() => {
		applyLocaleToDocument(locale);
	}, [locale]);

	const value = useMemo<LocaleContextValue>(
		() => ({
			locale,
			setLocale,
		}),
		[locale, setLocale],
	);

	return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocale(): LocaleContextValue {
	const context = useContext(LocaleContext);
	if (context === null) {
		throw new Error('useLocale must be used within LocaleProvider');
	}
	return context;
}

export { LocaleProvider, useLocale };
export type { LocaleContextValue };
