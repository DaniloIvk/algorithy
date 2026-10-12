import { useMemo } from 'hono/jsx';
import Level from '../features/level/Level';
import { levelFromPayload } from '../features/builder/shared-level';
import { messages } from '../lib/i18n';
import { Link } from '../lib/router';

/**
 * A shared level: the whole level arrives in the URL, is decoded and
 * validated, and then plays through the regular level screen. The only
 * differences are the header (title, author, an edit button) and the absent
 * level picker, since a shared level is not part of the built-in sequence.
 */

function InvalidSharedLevel() {
	return (
		<div class='flex min-h-[50vh] flex-col items-center-safe justify-center-safe gap-3 p-8 text-center'>
			<h2 class='text-lg font-semibold'>{messages.shared_level_invalid()}</h2>
			<p class='text-content-masked text-sm'>{messages.shared_level_invalid_hint()}</p>
			<Link href='/' class='underline hover:opacity-80 active:opacity-60'>
				{messages.not_found_go_home()}
			</Link>
		</div>
	);
}

type SharedLevelPageProps = {
	readonly payload: string;
};

function SharedLevelPage({ payload }: SharedLevelPageProps) {
	const restored = useMemo(() => levelFromPayload(payload), [payload]);

	if (restored === null) {
		return <InvalidSharedLevel />;
	}

	const author =
		restored.level.author.trim() === '' ? messages.shared_level_anonymous() : restored.level.author;

	return (
		<Level
			slug={restored.levelData.slug}
			parsedLevel={restored.levelData}
			nextSlug={null}
			previousSlug={null}
			shared={{
				title: restored.level.title,
				author,
				editHref: `/build/${payload}`,
			}}
		/>
	);
}

export default SharedLevelPage;
