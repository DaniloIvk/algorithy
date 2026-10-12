import SequenceItemRenderer from '../level/components/SequenceItemRenderer';
import { useActiveDrag, useActiveDropIndex, useActiveZoneId, useDnd } from '../level/dnd';
import { messages } from '../../lib/i18n';
import type { SequenceItem } from '../../schemas/sequence.schema';

/**
 * The solution program area. The block palette that feeds it lives under the
 * playground, like on a level, and the program itself gets the whole right
 * column height because a real solution can be tall.
 */

type BuilderSolutionProps = {
	readonly items: readonly SequenceItem[];
	readonly setSequence: (
		action: SequenceItem[] | ((previous: SequenceItem[]) => SequenceItem[]),
	) => void;
};

function BuilderSolution({ items, setSequence }: BuilderSolutionProps) {
	const dnd = useDnd();
	const activeDrag = useActiveDrag();
	const activeZoneId = useActiveZoneId();
	const activeDropIndex = useActiveDropIndex();

	return (
		<div class='flex h-full min-h-0 flex-col gap-2'>
			<span class='text-content-masked text-xs'>{messages.builder_solution_label()}</span>
			<div
				{...dnd.dropZoneProps('root')}
				class='algorithm-zone bg-surface-raised/60 border-area relative flex min-h-24 w-full min-w-0 flex-1 flex-col items-center-safe justify-start overflow-y-auto rounded-lg border-white/20 p-2 backdrop-blur-[8px]'
			>
				{SequenceItemRenderer({
					items,
					dnd,
					activeDrag,
					setSequence,
					activeZoneId,
					activeDropIndex,
				})}
			</div>
		</div>
	);
}

export default BuilderSolution;
