import type { LevelData } from '../../../schemas/level.schema';
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

type OutcomeDetailsProperties = {
	readonly level: LevelData;
	readonly usedBlockCount: number;
};

function OutcomeDetails({ level, usedBlockCount }: OutcomeDetailsProperties) {
	return (
		<BlockCountFeedback
			usedBlockCount={usedBlockCount}
			optimalBlockCount={level.optimalActionCount}
		/>
	);
}

export { BlockCountFeedback, OutcomeDetails };
