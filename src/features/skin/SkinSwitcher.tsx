import { useEffect } from 'hono/jsx';
import { render } from 'hono/jsx/dom';
import type { Skin } from '../../schemas/skin.schema';
import { useSkin } from './SkinProvider';
import { skinLabel } from './skinLabel';
import { messages } from '../../lib/i18n';
import { classNames } from '../../lib/cn';

function SkinButtons({
	skin,
	setSkin,
}: {
	readonly skin: Skin | null;
	readonly setSkin: (skin: Skin) => void;
}) {
	const options: readonly Skin[] = ['blue', 'pink'] as const;
	return (
		<fieldset
			class='m-0 flex items-center gap-1.5 border-0 p-0'
			aria-label={messages.skin_switcher_label()}
		>
			{options.map((option) => {
				const isActive = skin === option;
				const label = messages.skin_pick({ color: skinLabel(option) });
				return (
					<button
						key={option}
						type='button'
						data-player-skin={option}
						aria-label={label}
						aria-pressed={isActive}
						title={label}
						onClick={() => setSkin(option)}
						class={classNames(
							'flex size-8 items-center justify-center rounded-full border-block transition-colors cursor-pointer select-none',
							isActive
								? 'bg-player border-player scale-105'
								: 'border-white/20 bg-transparent hover:border-white/30 hover:bg-surface-raised/40 active:bg-surface-raised/60',
						)}
					>
						<span
							class={classNames('size-3.5 rounded-full', isActive ? 'bg-white' : 'bg-player')}
							aria-hidden='true'
						/>
					</button>
				);
			})}
		</fieldset>
	);
}

function SkinSwitcher() {
	const { skin, setSkin } = useSkin();

	useEffect(() => {
		const header = document.querySelector('header');
		if (!header) {
			return;
		}
		let slot = document.getElementById('header-skin-slot') as HTMLDivElement | null;
		if (!slot) {
			slot = document.createElement('div');
			slot.id = 'header-skin-slot';
			slot.className = 'flex items-center gap-1.5';
			header.appendChild(slot);
		}
		render(<SkinButtons skin={skin} setSkin={setSkin} />, slot);
	}, [skin, setSkin]);

	return null;
}

export default SkinSwitcher;
