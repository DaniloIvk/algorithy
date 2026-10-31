import { useEffect, useMemo, useRef, useState } from 'hono/jsx';
import Activity from '../../components/Activity';
import Playground from '../../components/Playground/Playground';
import { resolveActions } from '../../blocks/registry';
import { parseLevel, type LevelData } from '../../schemas/level.schema';
import { useSequence } from './hooks/useSequence';
import { useSimulation } from './hooks/useSimulation';
import { DndProvider, useActiveDrag, useActiveDropIndex, useActiveZoneId, useDnd } from './dnd';
import type { SequenceItem } from '../../schemas/sequence.schema';
import Controls from './components/Controls';
import LevelPicker, { type TitleDirection } from './components/LevelPicker';
import ExportModal from './components/ExportModal';
import OutcomeModal from './components/OutcomeModal';
import Palette from './components/Palette';
import SequenceItemRenderer from './components/SequenceItemRenderer';
import SequenceZone from './components/SequenceZone';
import { getStatusMessage } from './status';
import { playSound } from '../../lib/sound';
import { recordLevelOutcome } from './completion';
import { getLocale, localized, messages } from '../../lib/i18n';
import { revealElement } from '../../lib/reveal';
import ToastStack from './components/ToastStack';
import { classNames } from '../../lib/cn';
import { loadCompletedLevelSlugs } from '../../lib/persistence';
import { useToast } from '../../lib/toast';
import { levelEntries } from '../../domain/level';
import SharedLevelHeader, { type SharedLevelMeta } from './components/SharedLevelHeader';

type LevelPageProps = {
	readonly slug: string;
	readonly data?: unknown;
	readonly parsedLevel?: LevelData;
	readonly nextSlug: string | null;
	readonly previousSlug: string | null;
	readonly shared?: SharedLevelMeta;
};

type LevelContentProps = {
	readonly level: LevelData;
	readonly currentSlug: string;
	readonly nextSlug: string | null;
	readonly shared?: SharedLevelMeta;
};

// Module-level so the level title can slide in from the side the player came
// from. `LevelContent` is keyed by slug, so it remounts on every navigation.
let lastVisitedSlug: string | null = null;

function takeTitleDirection(slug: string): TitleDirection {
	const current = Number(slug);
	const previous = lastVisitedSlug === null ? null : Number(lastVisitedSlug);
	lastVisitedSlug = slug;

	if (
		previous === null ||
		!Number.isFinite(previous) ||
		!Number.isFinite(current) ||
		previous === current
	) {
		return 'none';
	}

	return current > previous ? 'right' : 'left';
}

function LevelContent({ level, currentSlug, nextSlug, shared }: LevelContentProps) {
	const sequenceState = useSequence(level);
	const simulationState = useSimulation(level, sequenceState.sequence);
	const actionPalette = resolveActions(level.allowedActions);
	const { addToast } = useToast();
	const [completedLevelSlugs, setCompletedLevelSlugs] = useState<readonly string[]>(() =>
		loadCompletedLevelSlugs(),
	);
	const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
	const playgroundRef = useRef<HTMLDivElement | null>(null);

	// Resolved once per level mount: the locale switch remounts this subtree, so
	// there is no need to recompute either of these on later re-renders.
	const locale = useMemo(() => getLocale(), []);
	const title = useMemo(() => localized(level.title, locale), [level.title, locale]);
	const titleDirection = useMemo(
		() => (shared === undefined ? takeTitleDirection(level.slug) : 'none'),
		[level.slug, shared],
	);
	const allLevelsCompleted = useMemo(
		() => levelEntries.every((entry) => completedLevelSlugs.includes(entry.slug)),
		[completedLevelSlugs],
	);

	useEffect(() => {
		const currentStatus = simulationState.status;
		const isFailureStatus =
			currentStatus === 'blocked' ||
			currentStatus === 'not-reached' ||
			currentStatus === 'infinite-loop' ||
			currentStatus === 'trapped';
		if (!isFailureStatus) {
			return;
		}
		addToast(getStatusMessage(currentStatus), 'error');
	}, [simulationState.status, simulationState.runId, addToast]);

	useEffect(() => {
		if (recordLevelOutcome(level.slug, simulationState.status)) {
			setCompletedLevelSlugs(loadCompletedLevelSlugs());
		}
	}, [simulationState.status, simulationState.runId, level.slug]);

	return (
		<DndProvider setSequence={sequenceState.setSequence}>
			<div class='flex flex-1 flex-col gap-3 select-none v-sm:gap-4 v-md:gap-6'>
				<title>{messages.level_page_document_title({ title })}</title>
				<div class='flex flex-1 flex-col justify-stretch gap-3 v-sm:gap-4 md:flex-row md:items-stretch'>
					<div class='flex w-full min-w-0 max-w-full flex-col items-center-safe gap-3 v-sm:gap-4 v-md:gap-6 sm:justify-stretch md:basis-1/2'>
						<div class='flex flex-1 flex-col items-center-safe justify-center-safe place-self-stretch'>
							<div
								ref={playgroundRef}
								class={classNames(
									'playground-box',
									'flex h-full w-full flex-1 content-center-safe items-center-safe justify-center-safe',
								)}
							>
								<div
									class={classNames(
										'playground-box',
										'flex h-full w-full flex-1 flex-col content-center-safe items-center-safe justify-center-safe',
									)}
								>
									<Playground
										width={level.width}
										height={level.height}
										map={level.map}
										player={simulationState.player}
										playerAngle={simulationState.angle}
										playerFrom={simulationState.motion?.from ?? null}
										playerStepMs={simulationState.motion?.ms}
										target={level.target}
										looks={level.looks}
										isRunning={simulationState.isRunning}
									/>
								</div>
							</div>
						</div>
						<Palette palette={actionPalette} />
					</div>
					<div class='flex min-w-0 flex-1 flex-col gap-2 v-sm:gap-3'>
						<Activity
							when={shared === undefined}
							children={
								<LevelPicker
									currentSlug={currentSlug}
									currentTitle={title}
									titleDirection={titleDirection}
									completedLevelSlugs={completedLevelSlugs}
								/>
							}
							fallback={<SharedLevelHeader shared={shared} />}
						/>
						<SequenceZone onExport={() => setIsExportOpen(true)}>
							<SequenceCanvas
								items={sequenceState.sequence}
								setSequence={sequenceState.setSequence}
							/>
						</SequenceZone>
						<Controls
							isRunning={simulationState.isRunning}
							canReset={simulationState.canReset}
							onRun={() => {
								playSound('run');
								void revealElement(playgroundRef.current).then(() => {
									simulationState.run();
								});
							}}
							onStop={() => {
								playSound('stop');
								simulationState.stop();
							}}
							onReset={() => {
								playSound('reset');
								simulationState.reset(sequenceState.resetSequence);
							}}
						/>
					</div>
				</div>
				<OutcomeModal
					status={simulationState.status}
					level={level}
					nextSlug={nextSlug}
					usedBlockCount={simulationState.usedBlockCount}
					showBuilderLink={allLevelsCompleted}
					isExportOpen={isExportOpen}
					onExport={() => setIsExportOpen(true)}
					onClose={() => simulationState.setStatus('idle')}
				/>
				<ExportModal
					isOpen={isExportOpen}
					sequence={sequenceState.sequence}
					onClose={() => setIsExportOpen(false)}
				/>
				<ToastStack />
			</div>
		</DndProvider>
	);
}

type SequenceCanvasProps = {
	readonly items: readonly SequenceItem[];
	readonly setSequence: (
		action: SequenceItem[] | ((previous: SequenceItem[]) => SequenceItem[]),
	) => void;
};

function SequenceCanvas({ items, setSequence }: SequenceCanvasProps) {
	const dnd = useDnd();
	const activeDrag = useActiveDrag();
	const activeZoneId = useActiveZoneId();
	const activeDropIndex = useActiveDropIndex();

	return (
		<>
			{SequenceItemRenderer({
				items,
				dnd,
				activeDrag,
				setSequence,
				activeZoneId,
				activeDropIndex,
			})}
		</>
	);
}

function Level(levelPageProperties: LevelPageProps) {
	const parsedLevelData = useMemo<LevelData | null>(() => {
		if (levelPageProperties.parsedLevel !== undefined) {
			return levelPageProperties.parsedLevel;
		}

		return levelPageProperties.data === undefined ? null : parseLevel(levelPageProperties.data);
	}, [levelPageProperties.parsedLevel, levelPageProperties.data]);

	return (
		<Activity
			when={parsedLevelData !== null}
			children={
				parsedLevelData ? (
					<LevelContent
						key={levelPageProperties.slug}
						level={parsedLevelData}
						currentSlug={levelPageProperties.slug}
						nextSlug={levelPageProperties.nextSlug}
						shared={levelPageProperties.shared}
					/>
				) : null
			}
			fallback={<p class='text-error p-4'>{messages.level_page_invalid_data()}</p>}
		/>
	);
}

export default Level;
