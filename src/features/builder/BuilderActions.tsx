import Activity from '../../components/Activity';
import { messages } from '../../lib/i18n';

/**
 * The builder's actions, below the playground like the run controls on a
 * level. Errors are not shown here: pressing an action that cannot run yet
 * explains itself through a toast, so the page stays quiet while creating.
 *
 * The publish button flips: it is Save while the work differs from the one
 * saved builder level, and Share once it matches. Saving never validates;
 * Share stays disabled until the saved level validates, with the reason as
 * its tooltip.
 */

type BuilderActionsProps = {
	readonly isRunning: boolean;
	readonly isDirty: boolean;
	readonly canShare: boolean;
	readonly shareHint: string;
	readonly onTry: () => void;
	readonly onSave: () => void;
	readonly onShare: () => void;
	readonly onOpen: () => void;
	readonly onReset: () => void;
};

function BuilderActions({
	isRunning,
	isDirty,
	canShare,
	shareHint,
	onTry,
	onSave,
	onShare,
	onOpen,
	onReset,
}: BuilderActionsProps) {
	const shareDisabled = !isDirty && !canShare;
	const publishClick = isDirty ? onSave : onShare;
	const publishTitle = shareDisabled ? shareHint : undefined;
	const publishClass = isDirty
		? 'bg-block-green/80 hover:bg-block-green-hover/80 active:bg-block-green-active/80 grow basis-[calc(50%_-_0.25rem)] lg:basis-0 cursor-pointer rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-content select-none v-sm:px-4 v-sm:py-2'
		: 'bg-primary-gradient hover:opacity-90 active:opacity-80 grow basis-[calc(50%_-_0.25rem)] lg:basis-0 cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white select-none disabled:cursor-not-allowed disabled:opacity-60 v-sm:px-4 v-sm:py-2';

	return (
		<div class='flex w-full flex-row flex-wrap items-stretch justify-stretch gap-2'>
			<Activity
				when={isRunning}
				children={
					<button
						type='button'
						onClick={onTry}
						class='bg-stop hover:bg-stop-hover active:bg-stop-active border-stop-border v-sm:px-4 v-sm:py-2 border-hairline grow basis-[calc(50%_-_0.25rem)] cursor-pointer rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-white select-none lg:basis-0'
					>
						{messages.controls_stop()}
					</button>
				}
				fallback={
					<button
						type='button'
						onClick={onTry}
						class='bg-content/15 hover:bg-content/20 active:bg-content/30 v-sm:px-4 v-sm:py-2 grow basis-[calc(50%_-_0.25rem)] cursor-pointer rounded-md px-3 py-1.5 text-sm whitespace-nowrap select-none lg:basis-0'
					>
						{messages.builder_test()}
					</button>
				}
			/>
			<button
				type='button'
				disabled={shareDisabled}
				title={publishTitle}
				onClick={publishClick}
				class={publishClass}
			>
				<Activity
					when={isDirty}
					fallback={messages.builder_share()}
					children={messages.builder_save()}
				/>
			</button>
			<button
				type='button'
				onClick={onOpen}
				class='bg-content/15 hover:bg-content/20 active:bg-content/30 v-sm:px-4 v-sm:py-2 grow basis-[calc(50%_-_0.25rem)] cursor-pointer rounded-md px-3 py-1.5 text-sm whitespace-nowrap select-none lg:basis-0'
			>
				{messages.builder_open_level()}
			</button>
			<button
				type='button'
				onClick={onReset}
				class='bg-stop-soft hover:bg-stop-soft-hover active:bg-stop-soft-active v-sm:px-4 v-sm:py-2 grow basis-[calc(50%_-_0.25rem)] cursor-pointer rounded-md px-3 py-1.5 text-sm whitespace-nowrap select-none lg:basis-0'
			>
				{messages.controls_reset()}
			</button>
		</div>
	);
}

export default BuilderActions;
