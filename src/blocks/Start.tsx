import { messages } from '../lib/i18n';

function Start() {
	return (
		<div
			class='group relative z-10 flex min-h-(--block-height) cursor-grab items-center-safe justify-center-safe gap-2 rounded px-[clamp(0.75rem,0.6rem_+_0.4vw,1rem)] py-1.5 text-black transition-colors select-none **:content-center-safe **:text-center **:align-middle **:text-base **:leading-6 **:font-normal active:cursor-grabbing dark:text-white'
			data-start='true'
		>
			<span class='z-20 inline-flex flex-1 items-center justify-between whitespace-nowrap'>
				{messages.block_start_label()}
			</span>
			<div class='border-block-green-border bg-block-green border-block absolute inset-0 z-10 rounded-md transition-colors' />
			<div class='border-block-green-border bg-block-green border-block absolute top-full left-1/2 z-30 -mt-[0.525rem] h-[0.8rem] w-[0.8rem] -translate-x-1/2 rotate-45 rounded-[0.25rem] transition-colors' />
		</div>
	);
}

export default Start;
