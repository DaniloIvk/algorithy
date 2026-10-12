import Activity from '../../../components/Activity';
import { messages } from '../../../lib/i18n';

type ControlsProps = {
	readonly isRunning: boolean;
	readonly canReset: boolean;
	readonly onRun: () => void;
	readonly onStop: () => void;
	readonly onReset: () => void;
};

function Controls({ isRunning, canReset, onRun, onStop, onReset }: ControlsProps) {
	return (
		<div class='v-sm:gap-3 flex w-full flex-col items-stretch justify-stretch gap-2 md:flex-row'>
			<Activity
				when={isRunning}
				children={
					<button
						type='button'
						class='bg-stop hover:bg-stop-hover active:bg-stop-active border-stop-border v-sm:px-4 v-sm:py-2 v-sm:text-base border-hairline flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm text-white select-none disabled:cursor-not-allowed'
						onClick={onStop}
					>
						{messages.controls_stop()}
					</button>
				}
				fallback={
					<button
						type='button'
						class='bg-primary-gradient v-sm:px-4 v-sm:py-2 v-sm:text-base border-hairline flex-1 cursor-pointer rounded-md border-transparent px-3 py-1.5 text-sm font-semibold text-white select-none hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60'
						onClick={onRun}
					>
						{messages.controls_run()}
					</button>
				}
			/>
			<button
				type='button'
				class='bg-content/15 hover:bg-content/20 active:bg-content/30 disabled:bg-content/10 v-sm:px-4 v-sm:py-2 v-sm:text-base border-hairline flex-1 cursor-pointer rounded-md border-transparent px-3 py-1.5 text-sm select-none disabled:cursor-not-allowed disabled:opacity-85'
				disabled={!canReset}
				onClick={onReset}
			>
				{messages.controls_reset()}
			</button>
		</div>
	);
}

export default Controls;
