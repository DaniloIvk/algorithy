import type { Child } from 'hono/jsx';
import { FileCode } from 'lucide';
import Lucide from '../../../components/Lucide';
import { classNames } from '../../../lib/cn';
import { messages } from '../../../lib/i18n';
import { useActiveZoneId, useDnd } from '../dnd';

type SequenceZoneProps = {
	readonly children: Child;
	readonly onExport: () => void;
};

function SequenceZone({ children, onExport }: SequenceZoneProps) {
	const dnd = useDnd();
	const activeZoneId = useActiveZoneId();

	return (
		<div
			{...dnd.dropZoneProps('root')}
			class={classNames(
				'algorithm-zone',
				'relative flex min-h-24 w-full min-w-0 max-w-full flex-1 flex-col items-center-safe justify-start rounded-lg border-area bg-surface-raised/60 p-2 pb-6 backdrop-blur-[8px] v-sm:min-h-28 v-sm:p-3 v-sm:pb-7 v-md:min-h-32 v-md:p-4 v-md:pb-8',
				activeZoneId === 'root' ? 'border-border' : 'border-white/20',
			)}
		>
			{children}
			<button
				type='button'
				aria-label={messages.export_algorithm_open()}
				title={messages.export_algorithm_open()}
				onClick={onExport}
				class='bg-surface-raised/80 text-content hover:bg-surface-raised-hover/80 active:bg-surface-raised-active/80 border-hairline absolute top-1.5 right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-md border-white/20 backdrop-blur-[6px]'
			>
				<Lucide icon={FileCode} class='size-4' />
			</button>
		</div>
	);
}

export default SequenceZone;
