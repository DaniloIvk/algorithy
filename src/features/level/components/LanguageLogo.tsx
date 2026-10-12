import type { ExportLanguage } from '../export-algorithm';

type LanguageLogoProps = {
	readonly language: ExportLanguage;
};

function LanguageLogo({ language }: LanguageLogoProps) {
	if (language === 'c') {
		return (
			<span
				aria-hidden='true'
				class='bg-logo-c flex size-4 shrink-0 items-center-safe justify-center-safe rounded-sm text-[0.625rem] leading-none font-bold text-white'
			>
				C
			</span>
		);
	}

	if (language === 'javascript') {
		return (
			<span
				aria-hidden='true'
				class='bg-logo-javascript flex size-4 shrink-0 items-center-safe justify-center-safe rounded-sm text-[0.625rem] leading-none font-bold text-black'
			>
				JS
			</span>
		);
	}

	return (
		<span
			aria-hidden='true'
			class='bg-logo-python text-logo-python-accent flex size-4 shrink-0 items-center-safe justify-center-safe rounded-sm text-[0.625rem] leading-none font-bold'
		>
			Py
		</span>
	);
}

export default LanguageLogo;
