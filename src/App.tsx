import { useEffect } from 'hono/jsx';
import { browserEngine } from './lib/browserEngine';
import Router from './lib/router';
import { playSound } from './lib/sound';
import { ToastProvider } from './lib/toast';
import { SkinProvider } from './features/skin/SkinProvider';
import SkinChooser from './features/skin/SkinChooser';
import SkinSwitcher from './features/skin/SkinSwitcher';
import SoundToggle from './features/sound/SoundToggle';
import { LocaleProvider, useLocale } from './features/locale/LocaleProvider';
import LanguageSwitcher from './features/locale/LanguageSwitcher';
import HeaderTitle from './features/locale/HeaderTitle';
import ShellText from './features/locale/ShellText';
import BuildLink from './features/builder/BuildLink';

/** One generic cue for every toast. */
function playToastSound(): void {
	playSound('toast');
}

function App() {
	useEffect(() => {
		browserEngine(document.documentElement);
	}, []);

	return (
		<LocaleProvider>
			<AppShell />
		</LocaleProvider>
	);
}

function AppShell() {
	const { locale } = useLocale();

	// Keying on the locale forces every rendered message to be re-evaluated
	// when the language changes; no reload and no locale in the URL.
	return (
		<ToastProvider key={locale} onToast={playToastSound}>
			<SkinProvider>
				<Router />
				<SkinChooser />
				<SkinSwitcher />
				<SoundToggle />
				<LanguageSwitcher />
				<BuildLink />
				<ShellText />
				<HeaderTitle />
			</SkinProvider>
		</ToastProvider>
	);
}

export default App;
