const loopLetters = ['i', 'j', 'k'] as const;
const fallbackLoopLetter = 'k';

/** The block UI and the exported code label nested loops the same way. */
function loopLetterForDepth(depth: number): string {
	return loopLetters[depth] ?? fallbackLoopLetter;
}

export { loopLetterForDepth };
