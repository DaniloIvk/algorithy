import Activity from '../../../components/Activity';
import { detectExcessRepetitions } from '../../../domain/simulation';
import type { LevelData } from '../../../schemas/level.schema';
import type { SequenceItem } from '../../../schemas/sequence.schema';
import { messages } from '../../../lib/i18n';

type BlockCountFeedbackProperties = {
	readonly usedBlockCount: number;
	readonly optimalBlockCount: number;
};

function BlockCountFeedback({ usedBlockCount, optimalBlockCount }: BlockCountFeedbackProperties) {
	if (usedBlockCount > optimalBlockCount) {
		return (
			<span class='block'>
				{messages.outcome_details_blocks_over({
					used: usedBlockCount,
					optimal: optimalBlockCount,
				})}
			</span>
		);
	}

	if (usedBlockCount === optimalBlockCount) {
		return (
			<span class='block'>{messages.outcome_details_blocks_perfect({ used: usedBlockCount })}</span>
		);
	}

	return (
		<span class='text-success block'>
			{messages.outcome_details_blocks_under({
				used: usedBlockCount,
				optimal: optimalBlockCount,
			})}
		</span>
	);
}

type IterationFeedbackProperties = {
	readonly usedIterations: bigint;
	readonly optimalIterations: bigint;
	readonly hasExcessRepetitions: boolean;
};

function IterationFeedback({
	usedIterations,
	optimalIterations,
	hasExcessRepetitions,
}: IterationFeedbackProperties) {
	const used = Number(usedIterations);
	const optimal = Number(optimalIterations);

	if (usedIterations === optimalIterations) {
		return (
			<span class='text-success block'>{messages.outcome_details_cycles_perfect({ used })}</span>
		);
	}

	if (usedIterations < optimalIterations) {
		return (
			<span class='text-success block'>
				{messages.outcome_details_cycles_under({ used, optimal })}
			</span>
		);
	}

	if (hasExcessRepetitions) {
		return (
			<span class='text-warning block'>{messages.outcome_details_cycles_over_repetitions()}</span>
		);
	}

	return (
		<span class='text-warning block'>
			{messages.outcome_details_cycles_over({ used, optimal })}
		</span>
	);
}

type OutcomeDetailsProperties = {
	readonly level: LevelData;
	readonly sequence: readonly SequenceItem[];
	readonly usedBlockCount: number;
	readonly usedIterations: bigint;
};

function OutcomeDetails({
	level,
	sequence,
	usedBlockCount,
	usedIterations,
}: OutcomeDetailsProperties) {
	return (
		<>
			<BlockCountFeedback
				usedBlockCount={usedBlockCount}
				optimalBlockCount={level.optimalActionCount}
			/>
			<Activity
				when={level.optimalIterations !== undefined}
				children={
					<IterationFeedback
						usedIterations={usedIterations}
						optimalIterations={level.optimalIterations}
						hasExcessRepetitions={detectExcessRepetitions(sequence, level, usedIterations)}
					/>
				}
			/>
		</>
	);
}

export { BlockCountFeedback, IterationFeedback, OutcomeDetails };
