import { useEffect, useMemo, useRef, useState } from 'hono/jsx';
import Activity from '../components/Activity';
import { actions, resolveActions } from '../blocks/registry';
import type { ActionName } from '../domain/actions';
import { classNames } from '../lib/cn';
import { messages } from '../lib/i18n';
import {
	loadBuilderDraft,
	loadBuilderLevel,
	saveBuilderDraft,
	saveBuilderLevel,
} from '../lib/persistence';
import { Link, navigate } from '../lib/router';
import { revealElement } from '../lib/reveal';
import { useToast } from '../lib/toast';
import type { Position } from '../schemas/level.schema';
import {
	SHARED_LEVEL_MAX_AUTHOR_LENGTH,
	SHARED_LEVEL_MAX_TITLE_LENGTH,
	parseSharedLevel,
} from '../schemas/shared-level.schema';
import type { OptimalSolutionItem, SequenceItem } from '../schemas/sequence.schema';
import BuilderActions from '../features/builder/BuilderActions';
import BuilderCanvas from '../features/builder/BuilderCanvas';
import BuilderSolution from '../features/builder/BuilderSolution';
import BuilderToolbar from '../features/builder/BuilderToolbar';
import BuilderTools from '../features/builder/BuilderTools';
import Palette from '../features/level/components/Palette';
import ToastStack from '../features/level/components/ToastStack';
import { DndProvider } from '../features/level/dnd';
import { draftStatusMessage } from '../features/builder/draft-message';
import { publishState } from '../features/builder/builder-session';
import {
	decodeLevelPayload,
	encodeLevelPayload,
	randomSalt,
} from '../features/builder/level-codec';
import { levelFingerprint } from '../features/builder/level-identity';
import {
	buildLevelData,
	createDefaultDraft,
	draftFromPayload,
	draftToPayload,
	paintDraft,
	prepareDraft,
	resizeDraft,
	SOLVER_ACTIONS,
	validateBuilderDraft,
	type BuilderDraft,
	type DraftPreparation,
	type DraftValidation,
} from '../features/builder/shared-level';
import {
	createBuilderStartItem,
	optimalItemsToSequenceItems,
	sequenceItemsToStoredSolution,
} from '../features/builder/solution-sequence';
import type { BuilderTool } from '../features/builder/tools';
import { useSimulation } from '../features/level/hooks/useSimulation';
import { getStatusMessage } from '../features/level/status';
import { playSound } from '../lib/sound';

/**
 * The level builder. The draft never touches JSON: it is painted on the
 * regular playground, edited with the regular block palette, tried in place
 * with the regular simulator, debounce validated, and shared as a link that
 * carries the whole level.
 */

const labelForAction = (action: ActionName): string => actions[action].label;

// The builder is a quick try-and-fix loop, so its toasts clear faster than the
// level screen's.
const BUILDER_TOAST_DURATION_MS = 3500;

type BuilderPageProps = {
	readonly payload: string | null;
};

type BuilderInitialState = {
	readonly draft: BuilderDraft;
	readonly solution: SequenceItem[];
	/** The fingerprint of the one saved builder level, or null when none. */
	readonly savedFingerprint: string | null;
};

function buildSolutionItems(solution: readonly OptimalSolutionItem[]): SequenceItem[] {
	return [
		createBuilderStartItem(labelForAction),
		...optimalItemsToSequenceItems(solution, labelForAction),
	];
}

function fingerprintOf(encoded: string | null): string | null {
	if (encoded === null) {
		return null;
	}

	const decoded = decodeLevelPayload(encoded);

	return decoded === null ? null : levelFingerprint(decoded);
}

function initialFromPayload(
	decoded: { readonly solution: readonly OptimalSolutionItem[] },
	draft: BuilderDraft,
	savedFingerprint: string | null,
): BuilderInitialState {
	return { draft, solution: buildSolutionItems(decoded.solution), savedFingerprint };
}

function loadInitialState(payload: string | null): BuilderInitialState | null {
	const savedFingerprint = fingerprintOf(loadBuilderLevel());

	if (payload !== null) {
		const decoded = decodeLevelPayload(payload);
		const shared = decoded === null ? null : parseSharedLevel(decoded);

		if (shared === null) {
			return null;
		}

		return initialFromPayload(shared, draftFromPayload(shared), savedFingerprint);
	}

	const storedDraft = loadBuilderDraft();
	if (storedDraft !== null) {
		const decoded = decodeLevelPayload(storedDraft);
		if (decoded !== null) {
			return initialFromPayload(decoded, draftFromPayload(decoded), savedFingerprint);
		}
	}

	const savedLevel = loadBuilderLevel();
	if (savedLevel !== null) {
		const decoded = decodeLevelPayload(savedLevel);
		if (decoded !== null) {
			return initialFromPayload(decoded, draftFromPayload(decoded), savedFingerprint);
		}
	}

	return {
		draft: createDefaultDraft(),
		solution: [createBuilderStartItem(labelForAction)],
		savedFingerprint,
	};
}

function InvalidBuilderLink() {
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

/** A level the simulator can hold before the first draft is prepared. */
function useFallbackLevel() {
	return useMemo(() => {
		const built = buildLevelData(
			{
				width: 3,
				height: 3,
				terrain: 'default',
				player: { x: 0, y: 1, direction: 'right' },
				target: { x: 2, y: 1 },
				cells: ['wall', 'ground', 'ground', 'wall', 'ground', 'ground', 'wall', 'wall', 'wall'],
				title: 'Draft',
				author: '',
				solution: [{ action: 'move-forward' }],
			},
			{ id: 'builder-fallback', slug: 'builder-fallback' },
		);

		if (built === null) {
			throw new Error('builder fallback level failed to build');
		}

		return built;
	}, []);
}

type BuilderWorkspaceProps = {
	readonly initial: BuilderInitialState;
};

function BuilderWorkspace({ initial }: BuilderWorkspaceProps) {
	const [draft, setDraft] = useState<BuilderDraft>(initial.draft);
	const [sequence, setSequence] = useState<SequenceItem[]>(initial.solution);
	const [tool, setTool] = useState<BuilderTool>('ground');
	const [salt] = useState<Uint8Array>(() => randomSalt());
	const [shareCheck, setShareCheck] = useState<DraftValidation>(() =>
		validateBuilderDraft(initial.draft, initial.solution, salt),
	);
	const [prepared, setPrepared] = useState<DraftPreparation | null>(null);
	const [isResetOpen, setIsResetOpen] = useState<boolean>(false);
	const [savedFingerprint, setSavedFingerprint] = useState<string | null>(initial.savedFingerprint);
	const pendingRun = useRef(false);
	const playgroundRef = useRef<HTMLDivElement | null>(null);
	const { addToast } = useToast();
	const fallbackLevel = useFallbackLevel();
	const actionPalette = resolveActions(SOLVER_ACTIONS);

	// The button shows Save while the work differs from the one saved builder
	// level (or nothing is saved yet), and Share once the two match.
	const currentFingerprint = useMemo(
		() => levelFingerprint(draftToPayload(draft, sequenceItemsToStoredSolution(sequence))),
		[draft, sequence],
	);
	// Share stays disabled until the level is actually shareable (a winning
	// program, a name and a link that fits); the hint explains why on hover.
	const { isDirty, canShare, shareHint } = publishState(
		savedFingerprint,
		currentFingerprint,
		shareCheck,
	);

	const simulation = useSimulation(
		prepared?.status === 'ready' ? prepared.levelData : fallbackLevel,
		sequence,
	);

	// Continuous painting must not be interrupted, so the draft and its
	// prepared run wait 300ms after the last change.
	useEffect(() => {
		const timer = setTimeout(() => {
			setPrepared(prepareDraft(draft, sequence));
			setShareCheck(validateBuilderDraft(draft, sequence, salt));

			const encoded = encodeLevelPayload(
				draftToPayload(draft, sequenceItemsToStoredSolution(sequence)),
				salt,
			);

			if (encoded !== null) {
				saveBuilderDraft(encoded);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [draft, sequence, salt]);

	// A try is prepared on click, so the next render carries its level.
	useEffect(() => {
		if (pendingRun.current && simulation.status === 'idle') {
			pendingRun.current = false;
			simulation.run();
		}
	}, [prepared, simulation.status]);

	useEffect(() => {
		const status = simulation.status;
		if (status === 'idle' || status === 'running') {
			return;
		}
		addToast(
			getStatusMessage(status),
			status === 'won' ? 'success' : 'error',
			BUILDER_TOAST_DURATION_MS,
		);
	}, [simulation.status, simulation.runId, addToast]);

	const tryRun = () => {
		if (simulation.isRunning) {
			playSound('stop');
			simulation.stop();
			return;
		}

		const fresh = prepareDraft(draft, sequence);
		if (fresh.status !== 'ready') {
			addToast(draftStatusMessage(fresh), 'error', BUILDER_TOAST_DURATION_MS);
			return;
		}

		playSound('run');
		void revealElement(playgroundRef.current).then(() => {
			pendingRun.current = true;
			setPrepared(fresh);
		});
	};

	const share = async () => {
		const fresh = validateBuilderDraft(draft, sequence, salt);
		if (fresh.status !== 'valid') {
			addToast(draftStatusMessage(fresh), 'error', BUILDER_TOAST_DURATION_MS);
			return;
		}

		const url = `${globalThis.location.origin}/shared/${fresh.encoded}`;

		try {
			await navigator.clipboard.writeText(url);
			addToast(messages.builder_share_copied(), 'success', BUILDER_TOAST_DURATION_MS);
		} catch {
			addToast(messages.builder_share_failed(), 'error', BUILDER_TOAST_DURATION_MS);
		}
	};

	const openLevel = () => {
		const fresh = validateBuilderDraft(draft, sequence, salt);
		if (fresh.status !== 'valid') {
			addToast(draftStatusMessage(fresh), 'error', BUILDER_TOAST_DURATION_MS);
			return;
		}

		navigate(`/shared/${fresh.encoded}`);
	};

	/**
	 * Save never validates: an empty or unfinished level is still the one
	 * builder level, and it is what the Share button will publish next.
	 */
	const save = () => {
		const encoded = encodeLevelPayload(
			draftToPayload(draft, sequenceItemsToStoredSolution(sequence)),
			salt,
		);

		if (encoded === null) {
			addToast(messages.builder_save_failed(), 'error', BUILDER_TOAST_DURATION_MS);
			return;
		}

		saveBuilderLevel(encoded);
		setSavedFingerprint(currentFingerprint);
		setShareCheck(validateBuilderDraft(draft, sequence, salt));
	};

	const resetLevel = () => {
		playSound('reset');
		simulation.stop();
		setDraft(createDefaultDraft());
		setSequence([createBuilderStartItem(labelForAction)]);
		setPrepared(null);
		setIsResetOpen(false);
	};

	return (
		<div class='v-sm:gap-4 flex flex-1 flex-col gap-3' style={{ '--playground-reserved': '13rem' }}>
			<title>{messages.builder_title()}</title>
			<DndProvider setSequence={setSequence}>
				<div class='v-sm:gap-4 flex flex-1 flex-col justify-stretch gap-3 md:flex-row md:items-stretch'>
					<div class='v-sm:gap-4 flex w-full max-w-full min-w-0 flex-col items-center-safe gap-3 sm:justify-stretch md:basis-1/2'>
						<BuilderToolbar
							draft={draft}
							onMetadata={(changes) => setDraft((current) => ({ ...current, ...changes }))}
							onResize={(width, height) =>
								setDraft((current) => resizeDraft(current, width, height))
							}
							onDirection={(direction) =>
								setDraft((current) => ({
									...current,
									player: { ...current.player, direction },
								}))
							}
						/>
						<BuilderTools tool={tool} terrain={draft.terrain} onTool={setTool} />
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
									<BuilderCanvas
										draft={draft}
										tool={tool}
										onPaint={(position: Position) =>
											setDraft((current) => paintDraft(current, tool, position))
										}
										run={
											simulation.isRunning
												? {
														player: simulation.player,
														angle: simulation.angle,
														from: simulation.motion?.from ?? null,
														stepMs: simulation.motion?.ms,
													}
												: undefined
										}
									/>
								</div>
							</div>
						</div>
						<Palette palette={actionPalette} />
					</div>
					<div class='v-sm:gap-3 flex min-h-0 min-w-0 flex-1 flex-col gap-2'>
						<div class='flex flex-col gap-2 sm:flex-row'>
							<label class='flex min-w-0 flex-1 flex-col gap-1 text-xs'>
								<span class='text-content-masked'>{messages.builder_level_title_label()}</span>
								<input
									type='text'
									value={draft.title}
									maxLength={SHARED_LEVEL_MAX_TITLE_LENGTH}
									placeholder={messages.builder_level_title_placeholder()}
									onInput={(event) => {
										if (event.target instanceof HTMLInputElement) {
											const value = event.target.value;
											setDraft((current) => ({ ...current, title: value }));
										}
									}}
								/>
							</label>
							<label class='flex min-w-0 flex-1 flex-col gap-1 text-xs'>
								<span class='text-content-masked'>{messages.builder_author_label()}</span>
								<input
									type='text'
									value={draft.author}
									maxLength={SHARED_LEVEL_MAX_AUTHOR_LENGTH}
									placeholder={messages.builder_author_placeholder()}
									onInput={(event) => {
										if (event.target instanceof HTMLInputElement) {
											const value = event.target.value;
											setDraft((current) => ({ ...current, author: value }));
										}
									}}
								/>
							</label>
						</div>
						<BuilderSolution items={sequence} setSequence={setSequence} />
						<BuilderActions
							isRunning={simulation.isRunning}
							isDirty={isDirty}
							canShare={canShare}
							shareHint={shareHint}
							onTry={tryRun}
							onSave={save}
							onShare={share}
							onOpen={openLevel}
							onReset={() => setIsResetOpen(true)}
						/>
					</div>
				</div>
			</DndProvider>
			<Activity
				when={isResetOpen}
				children={
					<div class='fixed inset-0 z-50 flex items-center justify-center p-4'>
						<button
							type='button'
							aria-label={messages.builder_reset_cancel()}
							onClick={() => setIsResetOpen(false)}
							class='bg-overlay absolute inset-0 backdrop-blur-[8px]'
						/>
						<dialog
							open
							aria-modal='true'
							aria-label={messages.controls_reset()}
							class='bg-surface-raised/75 relative flex w-full max-w-[24rem] flex-col gap-4 rounded-xl p-6 shadow backdrop-blur-[8px]'
						>
							<p class='text-base'>{messages.builder_reset_confirm()}</p>
							<div class='flex flex-col gap-3 sm:flex-row'>
								<button
									type='button'
									onClick={() => setIsResetOpen(false)}
									class='bg-content/15 hover:bg-content/20 active:bg-content/30 flex-1 cursor-pointer rounded-md px-4 py-2 select-none'
								>
									{messages.builder_reset_cancel()}
								</button>
								<button
									type='button'
									onClick={resetLevel}
									class='bg-stop hover:bg-stop-hover active:bg-stop-active border-stop-border border-hairline flex-1 cursor-pointer rounded-md px-4 py-2 text-white select-none'
								>
									{messages.controls_reset()}
								</button>
							</div>
						</dialog>
					</div>
				}
			/>
			<ToastStack />
		</div>
	);
}

function BuilderPage({ payload }: BuilderPageProps) {
	const initial = useMemo(() => loadInitialState(payload), [payload]);

	if (initial === null) {
		return <InvalidBuilderLink />;
	}

	return <BuilderWorkspace initial={initial} key={payload ?? 'new'} />;
}

export default BuilderPage;
