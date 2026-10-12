import Activity from '../components/Activity';
import Level from '../features/level/Level';
import { resolveLevel, resolveNextSlug, resolvePrevSlug } from '../domain/level';
import { messages } from '../lib/i18n';
import { Link } from '../lib/router';

type LevelPageProps = {
	readonly slug: string;
	readonly id?: string;
};

function LevelPage({ slug, id }: LevelPageProps) {
	const currentSlug = slug ?? id ?? '1';
	const data = resolveLevel(currentSlug);
	const nextSlug = resolveNextSlug(currentSlug);
	const previousSlug = resolvePrevSlug(currentSlug);

	return (
		<Activity
			when={data !== null}
			children={
				<Level slug={currentSlug} data={data} nextSlug={nextSlug} previousSlug={previousSlug} />
			}
			fallback={<LoadingPlaceholder slug={currentSlug} />}
		/>
	);
}

type LoadingPlaceholderProps = {
	readonly slug: string;
};

function LoadingPlaceholder({ slug }: LoadingPlaceholderProps) {
	return (
		<p class='p-4'>
			{messages.level_page_coming_soon({ slug })}{' '}
			<Link href='/levels/1' class='underline hover:opacity-80 active:opacity-60'>
				{messages.level_page_back_to_level_one()}
			</Link>
		</p>
	);
}

export default LevelPage;
