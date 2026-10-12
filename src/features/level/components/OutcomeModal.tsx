import { useEffect } from 'hono/jsx';
import Activity from '../../../components/Activity';
import type { RunOutcome } from '../../../domain/simulation';
import type { LevelData } from '../../../schemas/level.schema';
import type { SequenceItem } from '../../../schemas/sequence.schema';
import { Link } from '../../../lib/router';
import { messages } from '../../../lib/i18n';
import { OutcomeDetails } from './OutcomeDetails';

type OutcomeModalProperties = {
	readonly status: RunOutcome | 'idle' | 'running';
	readonly level: LevelData;
	readonly sequence: readonly SequenceItem[];
	readonly nextSlug: string | null;
	readonly usedBlockCount: number;
	readonly usedIterations: bigint;
	readonly showBuilderLink: boolean;
	readonly isExportOpen: boolean;
	readonly onExport: () => void;
	readonly onClose: () => void;
};

function OutcomeModal({
	status,
	level,
	sequence,
	nextSlug,
	usedBlockCount,
	usedIterations,
	showBuilderLink,
	isExportOpen,
	onExport,
	onClose,
}: OutcomeModalProperties) {
	useEffect(() => {
		if (status !== 'won' || isExportOpen) {
			return;
		}

		const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
			if (keyboardEvent.key === 'Escape') {
				onClose();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [status, isExportOpen, onClose]);

	return (
		<Activity when={status === 'won'}>
			<div class='fixed inset-0 z-50 flex items-center justify-center p-4'>
				<div aria-hidden='true' class='bg-overlay absolute inset-0 backdrop-blur-[8px]' />
				<dialog
					open
					aria-modal='true'
					aria-label={messages.outcome_modal_aria_label()}
					class='bg-surface-raised/75 relative flex w-full max-w-[28rem] flex-col gap-4 rounded-xl p-6 shadow backdrop-blur-[8px]'
				>
					<button
						type='button'
						aria-label={messages.common_close()}
						onClick={onClose}
						class='hover:bg-surface-hover active:bg-surface-active absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none'
					>
						×
					</button>
					<div class='text-content pr-6 text-base'>
						<span class='block text-lg font-semibold'>{messages.outcome_modal_title_won()}</span>
						<OutcomeDetails
							level={level}
							sequence={sequence}
							usedBlockCount={usedBlockCount}
							usedIterations={usedIterations}
						/>
					</div>
					<div class='flex flex-col gap-3'>
						<div class='flex flex-col gap-3 sm:flex-row'>
							<Activity
								when={nextSlug !== null}
								children={
									<Link
										href={`/levels/${nextSlug}`}
										class='bg-content/15 hover:bg-content/20 active:bg-content/30 flex-1 rounded-md px-4 py-2 text-center select-none'
									>
										{messages.outcome_modal_next_level()}
									</Link>
								}
							/>
							<button
								type='button'
								onClick={onClose}
								class='bg-content/15 hover:bg-content/20 active:bg-content/30 flex-1 cursor-pointer rounded-md px-4 py-2 select-none'
							>
								{messages.common_close()}
							</button>
						</div>
						<button
							type='button'
							onClick={onExport}
							class='text-content-masked hover:text-content w-full cursor-pointer text-center text-sm underline'
						>
							{messages.export_algorithm_open()}
						</button>
						<Activity
							when={showBuilderLink}
							children={
								<Link
									href='/build'
									class='text-content-masked hover:text-content w-full text-center text-sm underline'
								>
									{messages.builder_open()}
								</Link>
							}
						/>
					</div>
				</dialog>
			</div>
		</Activity>
	);
}

export default OutcomeModal;
