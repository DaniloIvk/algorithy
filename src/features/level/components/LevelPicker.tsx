import { useEffect, useRef, useState } from 'hono/jsx';
import { ChevronLeft, ChevronRight, Layers, X } from 'lucide';
import Activity from '../../../components/Activity';
import Lucide from '../../../components/Lucide';
import { levelEntries, resolveNextSlug, resolvePrevSlug } from '../../../domain/level';
import { classNames } from '../../../lib/cn';
import { messages } from '../../../lib/i18n';
import { Link } from '../../../lib/router';

type TitleDirection = 'left' | 'right' | 'none';

type LevelPickerProps = {
	readonly currentSlug: string;
	readonly currentTitle: string;
	readonly titleDirection: TitleDirection;
	readonly completedLevelSlugs: readonly string[];
};

type LevelChyronProps = {
	readonly direction: 'previous' | 'next';
	readonly targetSlug: string | null;
	readonly variant: 'icon' | 'text';
};

const CHYRON_ENABLED_CLASS =
	'bg-surface-raised/60 text-content hover:bg-surface-raised-hover active:bg-surface-raised-active cursor-pointer';
const CHYRON_DISABLED_CLASS = 'bg-content/5 text-content-masked cursor-not-allowed';
const LEVEL_DOT_BASE_CLASS = 'v-sm:size-3 block size-2.5 rounded-full text-sm';

function LevelChyron({ direction, targetSlug, variant }: LevelChyronProps) {
	const isPrevious = direction === 'previous';
	const label = isPrevious
		? messages.level_picker_previous_level()
		: messages.level_picker_next_level();
	const icon = isPrevious ? ChevronLeft : ChevronRight;

	if (variant === 'icon') {
		const baseClass =
			'flex size-6 shrink-0 items-center justify-center rounded-full transition-colors';
		const iconClass = 'size-4';

		if (targetSlug === null) {
			return (
				<button
					type='button'
					disabled
					aria-label={label}
					title={label}
					class={classNames(baseClass, CHYRON_DISABLED_CLASS)}
				>
					<Lucide icon={icon} class={iconClass} />
				</button>
			);
		}

		return (
			<Link
				href={`/levels/${targetSlug}`}
				aria-label={label}
				title={label}
				class={classNames(baseClass, CHYRON_ENABLED_CLASS)}
			>
				<Lucide icon={icon} class={iconClass} />
			</Link>
		);
	}

	const textBaseClass =
		'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors';

	if (targetSlug === null) {
		return (
			<button
				type='button'
				disabled
				aria-label={label}
				title={label}
				class={classNames(textBaseClass, CHYRON_DISABLED_CLASS)}
			>
				<Lucide icon={icon} class='size-4' />
				<Activity
					when={isPrevious}
					fallback={messages.level_picker_next()}
					children={messages.level_picker_previous()}
				/>
			</button>
		);
	}

	return (
		<Link
			href={`/levels/${targetSlug}`}
			aria-label={label}
			title={label}
			class={classNames(textBaseClass, CHYRON_ENABLED_CLASS)}
		>
			<Lucide icon={icon} class='size-4' />
			<Activity
				when={isPrevious}
				fallback={messages.level_picker_next()}
				children={messages.level_picker_previous()}
			/>
		</Link>
	);
}

function titleAnimationClass(direction: TitleDirection): string | undefined {
	if (direction === 'left') {
		return 'level-title-in-left';
	}

	if (direction === 'right') {
		return 'level-title-in-right';
	}

	return undefined;
}

function LevelPicker({
	currentSlug,
	currentTitle,
	titleDirection,
	completedLevelSlugs,
}: LevelPickerProps) {
	const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
	const stripRef = useRef<HTMLDivElement | null>(null);
	const previousSlug = resolvePrevSlug(currentSlug);
	const nextSlug = resolveNextSlug(currentSlug);

	const handleOpen = () => {
		setIsDrawerOpen(true);
	};

	const handleClose = () => {
		setIsDrawerOpen(false);
	};

	useEffect(() => {
		setIsDrawerOpen(false);
	}, [currentSlug]);

	// Keep the selected level visible in the desktop strip. Only nudge the
	// strip when the dot is actually out of view, and only as far as needed -
	// no centering, and nothing when it is already on screen.
	useEffect(() => {
		const strip = stripRef.current;
		if (strip === null) {
			return;
		}
		const frame = requestAnimationFrame(() => {
			const selected = strip.querySelector<HTMLElement>('[aria-current="page"]');
			if (selected === null) {
				return;
			}
			const stripRect = strip.getBoundingClientRect();
			if (stripRect.width === 0) {
				return;
			}
			const selectedRect = selected.getBoundingClientRect();
			const padding = 12;
			if (
				selectedRect.left >= stripRect.left + padding &&
				selectedRect.right <= stripRect.right - padding
			) {
				return;
			}
			const delta =
				selectedRect.left < stripRect.left + padding
					? selectedRect.left - (stripRect.left + padding)
					: selectedRect.right - (stripRect.right - padding);
			strip.scrollBy({ left: delta });
		});
		return () => cancelAnimationFrame(frame);
	}, [currentSlug]);

	return (
		<>
			<nav aria-label={messages.level_picker_heading()} class='hidden w-full shrink-0 sm:block'>
				<div class='flex max-h-[60vh] scrollbar-none flex-col items-center-safe justify-center-safe gap-1 rounded-lg p-2 not-sm:overflow-y-auto'>
					<span class='v-sm:text-lg text-base'>{messages.level_picker_heading()}</span>
					<div class='v-sm:gap-1.5 flex max-w-full min-w-0 items-center-safe justify-center-safe gap-1'>
						<LevelChyron variant='icon' direction='previous' targetSlug={previousSlug} />
						<div ref={stripRef} class='min-w-0 scrollbar-none overflow-x-auto'>
							<ol class='v-sm:h-12 v-sm:gap-3 mx-auto flex h-10 w-max flex-row items-center-safe justify-center-safe gap-2'>
								{levelEntries.map(({ slug }) => {
									const label = messages.level_page_title({ number: Number(slug) });
									const isCurrent = slug === currentSlug;
									const isCompleted = completedLevelSlugs.includes(slug);
									const accessibleLabel = isCompleted
										? messages.level_picker_completed_aria({ level: label })
										: label;
									return (
										<li
											key={slug}
											title={isCurrent ? accessibleLabel : undefined}
											aria-label={isCurrent ? accessibleLabel : undefined}
											aria-current={isCurrent ? 'page' : undefined}
										>
											<Activity
												when={isCurrent}
												children={
													<div
														aria-hidden='true'
														class={classNames(LEVEL_DOT_BASE_CLASS, 'bg-primary font-bold')}
													/>
												}
												fallback={
													<Link
														href={`/levels/${slug}`}
														title={accessibleLabel}
														aria-label={accessibleLabel}
														children=''
														class={classNames(
															LEVEL_DOT_BASE_CLASS,
															'font-medium',
															isCompleted
																? 'bg-success-strong hover:bg-success-strong/80 active:bg-success-strong/70'
																: 'bg-surface-raised hover:bg-surface-raised-hover active:bg-surface-raised-active',
														)}
													/>
												}
											/>
										</li>
									);
								})}
							</ol>
						</div>
						<LevelChyron variant='icon' direction='next' targetSlug={nextSlug} />
					</div>
					<span
						class={classNames(
							'max-w-full truncate text-base leading-none',
							titleAnimationClass(titleDirection),
						)}
					>
						{currentTitle}
					</span>
				</div>
			</nav>

			<Activity when={!isDrawerOpen}>
				<button
					type='button'
					aria-label={messages.level_picker_open()}
					aria-expanded={isDrawerOpen}
					onClick={handleOpen}
					class='bg-surface-raised/60 text-content hover:bg-surface-raised-hover/70 active:bg-surface-raised-active/80 v-sm:h-14 v-sm:w-14 fixed right-4 bottom-4 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-md backdrop-blur-[6px] transition sm:hidden'
				>
					<Lucide icon={Layers} class='size-6' />
				</button>
			</Activity>

			<Activity when={isDrawerOpen}>
				<div class='fixed inset-0 z-50 flex flex-col justify-end sm:hidden'>
					<button
						type='button'
						aria-label={messages.level_picker_close()}
						onClick={handleClose}
						class='bg-overlay absolute inset-0 backdrop-blur-[8px]'
					/>

					<dialog
						id='level-drawer'
						open
						aria-modal='true'
						aria-label={messages.level_picker_heading()}
						class='bg-surface-raised/75 relative max-h-[min(75vh,64rem)] w-full overflow-hidden rounded-t-xl p-4'
					>
						<div class='mb-3 flex items-center-safe justify-between'>
							<h2 class='text-base font-semibold'>{messages.level_picker_heading()}</h2>
							<button
								type='button'
								aria-label={messages.common_close()}
								onClick={handleClose}
								class='hover:bg-content/20 active:bg-content/30 flex h-8 w-8 items-center justify-center rounded-full'
							>
								<Lucide icon={X} class='size-5' />
							</button>
						</div>

						<div class='mb-3 flex items-center-safe gap-2'>
							<LevelChyron variant='text' direction='previous' targetSlug={previousSlug} />
							<LevelChyron variant='text' direction='next' targetSlug={nextSlug} />
						</div>

						<ol class='xs:grid-cols-2 grid max-h-[45vh] grid-flow-row grid-cols-1 gap-1 overflow-y-auto pr-1'>
							{levelEntries.map((entry) => {
								const label = messages.level_page_title({ number: Number(entry.slug) });
								const isCurrent = entry.slug === currentSlug;
								const isCompleted = completedLevelSlugs.includes(entry.slug);
								const accessibleLabel = isCompleted
									? messages.level_picker_completed_aria({ level: label })
									: label;
								const itemClass = classNames(
									'hover:bg-content/20 active:bg-content/30 block rounded-md px-4 py-3 text-sm',
									isCurrent ? 'font-bold' : 'font-medium',
								);
								const itemContent = (
									<>
										{label}
										<Activity when={isCompleted}>
											<span class='sr-only'>{messages.level_picker_completed()}</span>
											<span aria-hidden='true' class='text-success ml-1.5'>
												✓
											</span>
										</Activity>
									</>
								);
								return (
									<li key={entry.slug}>
										<Activity
											when={isCurrent}
											children={
												<span aria-current='page' class={itemClass}>
													{itemContent}
												</span>
											}
											fallback={
												<Link
													href={`/levels/${entry.slug}`}
													title={accessibleLabel}
													class={itemClass}
												>
													{itemContent}
												</Link>
											}
										/>
									</li>
								);
							})}
						</ol>
					</dialog>
				</div>
			</Activity>
		</>
	);
}

export default LevelPicker;
export type { TitleDirection };
