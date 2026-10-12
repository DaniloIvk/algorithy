import { useEffect, useState } from 'hono/jsx';
import { render } from 'hono/jsx/dom';
import { Volume2, VolumeX } from 'lucide';
import Lucide from '../../components/Lucide';
import { classNames } from '../../lib/cn';
import { messages } from '../../lib/i18n';
import { isSoundMuted, setSoundMuted } from '../../lib/sound';

function SoundButton() {
	const [muted, setMuted] = useState<boolean>(() => isSoundMuted());

	const toggleMuted = () => {
		const nextMuted = !muted;
		setSoundMuted(nextMuted);
		setMuted(nextMuted);
	};

	return (
		<button
			type='button'
			aria-label={messages.sound_toggle()}
			title={messages.sound_toggle()}
			aria-pressed={!muted}
			onClick={toggleMuted}
			class={classNames(
				'flex size-8 cursor-pointer items-center justify-center rounded-full border-block transition-colors select-none',
				muted
					? 'text-content-masked hover:bg-surface-raised/40 hover:text-content active:bg-surface-raised/60 border-white/20 bg-transparent hover:border-white/30'
					: 'text-content border-white/20 bg-surface-raised/40',
			)}
		>
			<Lucide icon={muted ? VolumeX : Volume2} class='size-4' />
		</button>
	);
}

function SoundToggle() {
	useEffect(() => {
		const header = document.querySelector('header');
		if (!header) {
			return;
		}
		let slot = document.getElementById('header-sound-slot') as HTMLDivElement | null;
		if (!slot) {
			slot = document.createElement('div');
			slot.id = 'header-sound-slot';
			slot.className = 'flex items-center';
			header.appendChild(slot);
		}
		render(<SoundButton />, slot);
	}, []);

	return null;
}

export default SoundToggle;
