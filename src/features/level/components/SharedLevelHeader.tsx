import { messages } from '../../../lib/i18n';
import { Link } from '../../../lib/router';

type SharedLevelMeta = {
	readonly title: string;
	readonly author: string;
	readonly editHref: string;
};

/**
 * The shared level's header, in place of the level picker: the creator's
 * title, the author below it, and the edit button that opens the level in
 * the builder as a new draft.
 */
function SharedLevelHeader({ shared }: { readonly shared?: SharedLevelMeta }) {
	if (shared === undefined) {
		return null;
	}

	return (
		<div class='bg-surface-raised/60 flex w-full items-center-safe justify-between gap-2 rounded-lg px-3 py-2 backdrop-blur-[8px]'>
			<div class='min-w-0'>
				<span class='block truncate text-base leading-tight'>{shared.title}</span>
				<span class='text-content-masked block truncate text-xs'>
					{messages.shared_level_by({ author: shared.author })}
				</span>
			</div>
			<Link
				href={shared.editHref}
				class='hover:bg-surface-raised-hover active:bg-surface-raised-active border-area shrink-0 rounded-full border-white/20 px-3 py-1 text-sm'
			>
				{messages.builder_edit()}
			</Link>
		</div>
	);
}

export default SharedLevelHeader;
export type { SharedLevelMeta };
