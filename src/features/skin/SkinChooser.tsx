import PlayerMouse from '../../components/PlayerMouse';
import { skinNames, type Skin } from '../../schemas/skin.schema';
import { useSkin } from './SkinProvider';
import { skinLabel } from './skinLabel';
import { messages } from '../../lib/i18n';
import { classNames } from '../../lib/cn';

type SkinOptionProps = {
	readonly skin: Skin;
	readonly active: boolean;
	readonly onSelect: (skin: Skin) => void;
};

function SkinOption({ skin, active, onSelect }: SkinOptionProps) {
	const label = skinLabel(skin);

	return (
		<button
			type='button'
			data-player-skin={skin}
			onClick={() => onSelect(skin)}
			aria-label={messages.skin_pick({ color: label })}
			aria-pressed={active}
			class={classNames(
				'group flex flex-1 flex-col items-center gap-4 rounded-xl border-area p-5 text-center backdrop-blur-[8px] transition-colors select-none',
				active
					? 'border-primary bg-primary/8 ring-1 ring-primary'
					: 'border-white/10 bg-white/2 hover:bg-white/5 hover:border-white/15 active:bg-white/[0.07]',
			)}
		>
			<div class='relative flex size-16 items-center justify-center rounded-full'>
				<div
					class={classNames(
						'absolute inset-0 overflow-hidden rounded-full p-0.75 transition-all duration-300 group-hover:p-1',
						active && 'brightness-125 saturate-150',
					)}
				>
					<div class='skin-ring skin-ring-a' aria-hidden='true' />
					<div class='skin-ring skin-ring-b' aria-hidden='true' />
					<div class='skin-ring skin-ring-c' aria-hidden='true' />
				</div>
				<div class='bg-surface-raised relative flex size-14.5 items-center justify-center rounded-full group-hover:size-14'>
					<PlayerMouse />
				</div>
			</div>
			<span class='text-base font-semibold tracking-wide'>{label}</span>
		</button>
	);
}

function SkinChooser() {
	const { skin, setSkin, hasChosen } = useSkin();

	if (hasChosen) {
		return null;
	}

	return (
		<div class='fixed inset-0 z-50 flex items-center justify-center p-4'>
			<div aria-hidden='true' class='bg-overlay absolute inset-0 backdrop-blur-[8px]' />
			<dialog
				open
				aria-modal='true'
				aria-label={messages.skin_chooser_title()}
				class='bg-surface-raised/75 relative flex w-full max-w-[28rem] flex-col gap-4 rounded-xl p-6 shadow backdrop-blur-[8px]'
			>
				<div class='text-content pr-2 text-base'>
					<span class='block text-lg font-semibold'>{messages.skin_chooser_title()}</span>
					<span class='text-content-masked mt-1 block text-sm'>
						{messages.skin_chooser_description()}
					</span>
				</div>
				<div class='flex gap-3'>
					{skinNames.map((option) => (
						<SkinOption key={option} skin={option} active={skin === option} onSelect={setSkin} />
					))}
				</div>
				<p class='text-content-masked text-center text-xs'>{messages.skin_chooser_saved()}</p>
			</dialog>
		</div>
	);
}

export default SkinChooser;
