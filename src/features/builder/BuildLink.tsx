import { useEffect } from 'hono/jsx';
import { render } from 'hono/jsx/dom';
import { ArrowLeft, Paintbrush } from 'lucide';
import Lucide from '../../components/Lucide';
import { messages } from '../../lib/i18n';
import { Link, usePathname } from '../../lib/router';
import { useLocale } from '../locale/LocaleProvider';

/**
 * The header's left action: "Build a level" everywhere, and "Back to the game"
 * on the builder itself, where the builder entry point would be redundant.
 */

const BUILDER_PATH = /^\/build(?:\/|$)/i;

const ACTION_CLASS =
	'text-content-masked hover:bg-surface-raised/40 hover:text-content active:bg-surface-raised/60 border-block flex h-8 items-center-safe justify-center-safe gap-1.5 rounded-full border-white/20 bg-transparent px-3 transition-colors hover:border-white/30';

function HeaderAction() {
	const pathname = usePathname();

	if (BUILDER_PATH.test(pathname)) {
		const label = messages.builder_back_to_game();
		return (
			<Link href='/' aria-label={label} title={label} class={ACTION_CLASS}>
				<Lucide icon={ArrowLeft} class='size-4 shrink-0' />
				<span class='text-xs font-medium'>{label}</span>
			</Link>
		);
	}

	const label = messages.builder_open();
	return (
		<Link href='/build' aria-label={label} title={label} class={ACTION_CLASS}>
			<Lucide icon={Paintbrush} class='size-4 shrink-0' />
			<span class='text-xs font-medium'>{label}</span>
		</Link>
	);
}

function BuildLink() {
	const { locale } = useLocale();

	useEffect(() => {
		const header = document.querySelector('header');
		if (!header) {
			return;
		}
		let slot = document.getElementById('header-build-slot') as HTMLDivElement | null;
		if (!slot) {
			slot = document.createElement('div');
			slot.id = 'header-build-slot';
			slot.className = 'flex items-center';
			header.appendChild(slot);
		}
		render(<HeaderAction />, slot);
	}, [locale]);

	return null;
}

export default BuildLink;
