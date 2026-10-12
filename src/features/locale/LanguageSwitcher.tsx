import { useEffect } from 'hono/jsx';
import { render } from 'hono/jsx/dom';
import { classNames } from '../../lib/cn';
import { locales, messages, type Locale } from '../../lib/i18n';
import { useLocale } from './LocaleProvider';

function localeCode(locale: Locale): string {
	return (locale.split('-')[0] ?? locale).toUpperCase();
}

type LanguageButtonsProps = {
	readonly locale: Locale;
	readonly setLocale: (locale: Locale) => void;
};

function LanguageButtons({ locale, setLocale }: LanguageButtonsProps) {
	return (
		<fieldset
			class='m-0 flex items-center gap-1 border-0 p-0'
			aria-label={messages.language_switcher_label()}
		>
			{locales.map((option) => {
				const isActive = option === locale;
				return (
					<button
						key={option}
						type='button'
						aria-label={localeCode(option)}
						aria-pressed={isActive}
						title={localeCode(option)}
						onClick={() => setLocale(option)}
						class={classNames(
							'flex size-8 cursor-pointer items-center justify-center rounded-full border-block text-xs font-semibold transition-colors select-none',
							isActive
								? 'border-white/20 text-content scale-105'
								: 'text-content-masked hover:bg-surface-raised/40 hover:text-content active:bg-surface-raised/60 border-white/20 bg-transparent hover:border-white/30',
						)}
					>
						{localeCode(option)}
					</button>
				);
			})}
		</fieldset>
	);
}

function LanguageSwitcher() {
	const { locale, setLocale } = useLocale();

	useEffect(() => {
		const header = document.querySelector('header');
		if (!header) {
			return;
		}
		let slot = document.getElementById('header-language-slot') as HTMLDivElement | null;
		if (!slot) {
			slot = document.createElement('div');
			slot.id = 'header-language-slot';
			slot.className = 'flex items-center gap-1.5';
			header.appendChild(slot);
		}
		render(<LanguageButtons locale={locale} setLocale={setLocale} />, slot);
	}, [locale, setLocale]);

	return null;
}

export default LanguageSwitcher;
