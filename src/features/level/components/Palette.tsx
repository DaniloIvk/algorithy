import { Trash2 } from 'lucide';
import Lucide from '../../../components/Lucide';
import { classNames } from '../../../lib/cn';
import { useActiveDrag, useDnd } from '../dnd';
import { messages } from '../../../lib/i18n';
import type { BlockDefinition } from '../../../schemas/drag.schema';

type PaletteBlockProps = {
	readonly block: BlockDefinition;
};

function PaletteBlock({ block }: PaletteBlockProps) {
	const dnd = useDnd();
	const activeDrag = useActiveDrag();
	const isDragSource =
		activeDrag !== null && activeDrag.id === null && activeDrag.action === block.action;

	return (
		<div
			{...dnd.draggableProps({ action: block.action, label: block.label, default: false })}
			data-drag-item='true'
			class={classNames('cursor-grab select-none', isDragSource && 'invisible')}
		>
			{block.render()}
		</div>
	);
}

type PaletteProps = {
	readonly palette: readonly BlockDefinition[];
};

function Palette({ palette }: PaletteProps) {
	const dnd = useDnd();

	return (
		<div
			{...dnd.deleteZoneProps()}
			class='palette bg-surface-raised/60 v-sm:gap-3 v-sm:p-3 v-md:p-4 border-area relative flex h-[var(--palette-height)] w-full max-w-full min-w-0 shrink-0 scrollbar-none flex-row flex-wrap content-start items-center-safe justify-center-safe gap-2 overflow-y-auto rounded-lg border-white/20 p-2 backdrop-blur-[10px] select-none'
		>
			<div class='palette-blocks contents'>
				{palette.map((block) => (
					<PaletteBlock key={block.action} block={block} />
				))}
			</div>
			<div class='palette-delete-hint text-error pointer-events-none absolute inset-0 flex-col items-center-safe justify-center-safe gap-2'>
				<Lucide icon={Trash2} class='size-12' />
				<span class='text-sm font-medium'>{messages.palette_drop_to_delete()}</span>
			</div>
		</div>
	);
}

export default Palette;
