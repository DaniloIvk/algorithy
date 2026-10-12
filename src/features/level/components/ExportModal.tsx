import { useEffect, useMemo, useRef, useState } from 'hono/jsx';
import Activity from '../../../components/Activity';
import Lucide from '../../../components/Lucide';
import { Copy } from 'lucide';
import { classNames } from '../../../lib/cn';
import { messages } from '../../../lib/i18n';
import type { SequenceItem } from '../../../schemas/sequence.schema';
import {
	exportAlgorithm,
	exportLanguages,
	exportTargets,
	type ExportLanguage,
} from '../export-algorithm';
import LanguageLogo from './LanguageLogo';

type ExportModalProps = {
	readonly isOpen: boolean;
	readonly sequence: readonly SequenceItem[];
	readonly onClose: () => void;
};

type CodeTokenKind = 'plain' | 'keyword' | 'call' | 'number';

type CodeToken = {
	readonly text: string;
	readonly kind: CodeTokenKind;
};

/** How long the Copy button keeps its "copied" label before flipping back. */
const COPY_FEEDBACK_MS = 2000;

function clearCopiedTimeout(timeoutRef: { current: number | null }): void {
	if (timeoutRef.current !== null) {
		window.clearTimeout(timeoutRef.current);
		timeoutRef.current = null;
	}
}

const languageKeywords: Readonly<Record<ExportLanguage, readonly string[]>> = {
	c: ['for', 'int', 'if', 'else', 'while', 'void', 'return'],
	python: ['for', 'in', 'if', 'elif', 'else', 'while', 'not', 'pass', 'def', 'return', 'False'],
	javascript: ['for', 'let', 'if', 'else', 'while', 'function', 'return', 'false'],
};

function tokenizeLine(line: string, language: ExportLanguage): CodeToken[] {
	const keywordPattern = languageKeywords[language].join('|');
	const tokenPattern = new RegExp(
		`\\b(?:${keywordPattern})\\b|(\\b\\d+\\b)|([A-Za-z_]\\w*(?=\\())`,
		'g',
	);
	const tokens: CodeToken[] = [];
	let previousIndex = 0;

	for (const match of line.matchAll(tokenPattern)) {
		const matchIndex = match.index ?? 0;

		if (matchIndex > previousIndex) {
			tokens.push({ text: line.slice(previousIndex, matchIndex), kind: 'plain' });
		}

		if (match[1] !== undefined) {
			tokens.push({ text: match[0], kind: 'number' });
		} else if (match[2] !== undefined) {
			tokens.push({ text: match[0], kind: 'call' });
		} else {
			tokens.push({ text: match[0], kind: 'keyword' });
		}

		previousIndex = matchIndex + match[0].length;
	}

	if (previousIndex < line.length) {
		tokens.push({ text: line.slice(previousIndex), kind: 'plain' });
	}

	return tokens;
}

function tokenClass(kind: CodeTokenKind): string | undefined {
	if (kind === 'keyword') {
		return 'text-syntax-keyword';
	}

	if (kind === 'call') {
		return 'text-syntax-call';
	}

	if (kind === 'number') {
		return 'text-syntax-number';
	}

	return undefined;
}

function ExportModal({ isOpen, sequence, onClose }: ExportModalProps) {
	const [activeLanguage, setActiveLanguage] = useState<ExportLanguage>('c');
	const [hasCopied, setHasCopied] = useState<boolean>(false);
	const copiedTimeout = useRef<number | null>(null);

	const code = useMemo(() => exportAlgorithm(sequence, activeLanguage), [sequence, activeLanguage]);
	const tokenizedLines = useMemo(() => {
		if (code === '') {
			return [];
		}

		return code.split('\n').map((line) => tokenizeLine(line, activeLanguage));
	}, [code, activeLanguage]);

	useEffect(() => {
		if (isOpen) {
			clearCopiedTimeout(copiedTimeout);
			setHasCopied(false);
		}
	}, [isOpen]);

	useEffect(() => () => clearCopiedTimeout(copiedTimeout), []);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
			if (keyboardEvent.key === 'Escape') {
				onClose();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose]);

	const handleSelectLanguage = (language: ExportLanguage) => {
		clearCopiedTimeout(copiedTimeout);
		setActiveLanguage(language);
		setHasCopied(false);
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(code);
			clearCopiedTimeout(copiedTimeout);
			setHasCopied(true);
			copiedTimeout.current = window.setTimeout(() => {
				copiedTimeout.current = null;
				setHasCopied(false);
			}, COPY_FEEDBACK_MS);
		} catch {
			clearCopiedTimeout(copiedTimeout);
			setHasCopied(false);
		}
	};

	return (
		<Activity when={isOpen}>
			<div class='fixed inset-0 z-50 flex items-center justify-center p-4'>
				<div aria-hidden='true' class='bg-overlay absolute inset-0 backdrop-blur-[8px]' />
				<dialog
					open
					aria-modal='true'
					aria-label={messages.export_algorithm_title()}
					class='bg-surface-raised/75 relative flex max-h-[85vh] w-full max-w-[42rem] flex-col gap-4 rounded-xl p-6 shadow backdrop-blur-[8px]'
				>
					<button
						type='button'
						aria-label={messages.common_close()}
						onClick={onClose}
						class='hover:bg-surface-hover active:bg-surface-active absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none'
					>
						×
					</button>
					<span class='pr-6 text-lg font-semibold'>{messages.export_algorithm_title()}</span>
					<div
						role='tablist'
						class='flex scrollbar-none gap-1 overflow-x-auto border-b border-white/15'
					>
						{exportLanguages.map((language) => {
							const target = exportTargets[language];
							const isActive = language === activeLanguage;

							return (
								<button
									key={language}
									type='button'
									role='tab'
									id={`export-tab-${language}`}
									aria-label={`${target.fileName} (${target.languageName})`}
									aria-selected={isActive}
									onClick={() => handleSelectLanguage(language)}
									class={classNames(
										'-mb-px flex shrink-0 cursor-pointer items-center-safe gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
										isActive
											? 'bg-content/10 border-white/20 text-content font-semibold'
											: 'text-content-masked hover:bg-content/5 hover:text-content border-transparent',
									)}
								>
									<LanguageLogo language={language} />
									{target.fileName}
								</button>
							);
						})}
					</div>
					<div
						role='tabpanel'
						aria-labelledby={`export-tab-${activeLanguage}`}
						class='bg-content/5 border-hairline max-h-[50vh] min-h-32 overflow-auto rounded-md border-white/15'
					>
						<pre class='w-max min-w-full p-3 text-left text-xs leading-5 sm:text-sm'>
							<code>
								{tokenizedLines.map((lineTokens, lineIndex) => (
									<span key={lineIndex} class='flex'>
										<span
											aria-hidden='true'
											class='text-content-masked w-8 shrink-0 pr-3 text-right select-none'
										>
											{lineIndex + 1}
										</span>
										<span class='whitespace-pre'>
											{lineTokens.map((token, tokenIndex) => (
												<span key={tokenIndex} class={tokenClass(token.kind)}>
													{token.text}
												</span>
											))}
										</span>
									</span>
								))}
							</code>
						</pre>
					</div>
					<div class='flex flex-col gap-3 sm:flex-row'>
						<button
							type='button'
							onClick={handleCopy}
							class='bg-content/15 hover:bg-content/20 active:bg-content/30 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 select-none'
						>
							<Lucide icon={Copy} class='size-4' />
							<Activity
								when={hasCopied}
								fallback={messages.export_algorithm_copy()}
								children={messages.export_algorithm_copied()}
							/>
						</button>
						<button
							type='button'
							onClick={onClose}
							class='bg-content/15 hover:bg-content/20 active:bg-content/30 flex-1 cursor-pointer rounded-md px-4 py-2 select-none'
						>
							{messages.common_close()}
						</button>
					</div>
				</dialog>
			</div>
		</Activity>
	);
}

export default ExportModal;
