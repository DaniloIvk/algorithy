import { useToast } from '../../../lib/toast';
import { messages } from '../../../lib/i18n';

function ToastStack() {
	const { toasts, removeToast } = useToast();

	if (toasts.length === 0) {
		return null;
	}

	return (
		<div
			class='pointer-events-none fixed top-24 right-4 z-50 flex w-full max-w-[calc(100vw-2rem)] flex-col gap-2 sm:max-w-[28rem]'
			aria-live='polite'
			aria-atomic='false'
		>
			{toasts.map((toastRecord) => (
				<output
					key={toastRecord.id}
					data-exiting={toastRecord.exiting ? 'true' : undefined}
					class='toast-animated bg-surface-raised/80 border-hairline pointer-events-auto flex w-full max-w-[28rem] items-center gap-4 rounded-lg border-white/20 px-3 py-2 shadow-lg backdrop-blur-[10px] sm:px-4 sm:py-3'
				>
					<span class='text-content flex-1 text-base'>{toastRecord.message}</span>
					<button
						type='button'
						aria-label={messages.toast_close()}
						onClick={() => removeToast(toastRecord.id)}
						class='hover:bg-surface-hover active:bg-surface-active flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl leading-none'
					>
						×
					</button>
				</output>
			))}
		</div>
	);
}

export default ToastStack;
