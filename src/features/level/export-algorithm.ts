import { loopLetterForDepth } from '../../lib/loopLetter';
import type { ConditionName } from '../../domain/conditions';
import type { ActionName } from '../../domain/actions';
import type { SequenceItem } from '../../schemas/sequence.schema';

type ExportLanguage = 'c' | 'python' | 'javascript';

const exportLanguages: readonly ExportLanguage[] = ['c', 'python', 'javascript'];

type ExportTarget = {
	readonly fileName: string;
	readonly languageName: string;
};

const exportTargets: Readonly<Record<ExportLanguage, ExportTarget>> = {
	c: { fileName: 'algorithm.c', languageName: 'C' },
	python: { fileName: 'algorithm.py', languageName: 'Python' },
	javascript: { fileName: 'algorithm.js', languageName: 'JavaScript' },
};

const INDENT = '    ';

type SymbolName =
	| 'move-forward'
	| 'turn-left'
	| 'turn-right'
	| 'path-ahead'
	| 'path-left'
	| 'path-right'
	| 'target-reached';

const camelCaseSymbolNames: Readonly<Record<SymbolName, string>> = {
	'move-forward': 'moveForward',
	'turn-left': 'turnLeft',
	'turn-right': 'turnRight',
	'path-ahead': 'pathAhead',
	'path-left': 'pathLeft',
	'path-right': 'pathRight',
	'target-reached': 'targetReached',
};

const snakeCaseSymbolNames: Readonly<Record<SymbolName, string>> = {
	'move-forward': 'move_forward',
	'turn-left': 'turn_left',
	'turn-right': 'turn_right',
	'path-ahead': 'path_ahead',
	'path-left': 'path_left',
	'path-right': 'path_right',
	'target-reached': 'target_reached',
};

/** The order stubs are declared in, so the same program always exports the same file. */
const symbolOrder: readonly SymbolName[] = [
	'move-forward',
	'turn-left',
	'turn-right',
	'path-ahead',
	'path-left',
	'path-right',
	'target-reached',
];

const conditionSymbols: ReadonlySet<SymbolName> = new Set([
	'path-ahead',
	'path-left',
	'path-right',
	'target-reached',
]);

function symbolName(symbol: SymbolName, language: ExportLanguage): string {
	return language === 'javascript' ? camelCaseSymbolNames[symbol] : snakeCaseSymbolNames[symbol];
}

function indent(depth: number): string {
	return INDENT.repeat(depth);
}

function indentBlock(lines: readonly string[]): string[] {
	return lines.map((line) => (line.length === 0 ? line : `${INDENT}${line}`));
}

function statement(expression: string, language: ExportLanguage): string {
	return language === 'python' ? expression : `${expression};`;
}

function conditionCall(
	condition: ConditionName,
	language: ExportLanguage,
	used: Set<SymbolName>,
): string {
	used.add(condition);
	return `${symbolName(condition, language)}()`;
}

function conditionHeader(keyword: string, condition: string, language: ExportLanguage): string {
	return language === 'python' ? `${keyword} ${condition}` : `${keyword} (${condition})`;
}

function whileCondition(language: ExportLanguage, used: Set<SymbolName>): string {
	used.add('target-reached');
	const targetCall = `${symbolName('target-reached', language)}()`;
	return language === 'python' ? `not ${targetCall}` : `!${targetCall}`;
}

function bodyLines(lines: readonly string[], depth: number, language: ExportLanguage): string[] {
	if (lines.length > 0 || language !== 'python') {
		return [...lines];
	}

	return [`${indent(depth)}pass`];
}

function blockLines(
	header: string,
	lines: readonly string[],
	depth: number,
	language: ExportLanguage,
): string[] {
	if (language === 'python') {
		return [`${indent(depth)}${header}:`, ...bodyLines(lines, depth + 1, language)];
	}

	return [`${indent(depth)}${header} {`, ...lines, `${indent(depth)}}`];
}

type ConditionalClause = {
	readonly condition: ConditionName | null;
	readonly lines: readonly string[];
};

function chainLines(
	clauses: readonly ConditionalClause[],
	depth: number,
	language: ExportLanguage,
	used: Set<SymbolName>,
): string[] {
	if (language === 'python') {
		const lines: string[] = [];

		for (const [index, clause] of clauses.entries()) {
			const keyword = clause.condition === null ? 'else' : index === 0 ? 'if' : 'elif';
			const header =
				clause.condition === null
					? keyword
					: conditionHeader(keyword, conditionCall(clause.condition, language, used), language);

			lines.push(`${indent(depth)}${header}:`, ...bodyLines(clause.lines, depth + 1, language));
		}

		return lines;
	}

	const lines: string[] = [];

	for (const [index, clause] of clauses.entries()) {
		const keyword = clause.condition === null ? 'else' : index === 0 ? 'if' : 'else if';
		const header =
			clause.condition === null
				? keyword
				: conditionHeader(keyword, conditionCall(clause.condition, language, used), language);

		lines.push(`${indent(depth)}${index === 0 ? '' : '} '}${header} {`, ...clause.lines);

		if (index === clauses.length - 1) {
			lines.push(`${indent(depth)}}`);
		}
	}

	return lines;
}

function itemLines(
	item: SequenceItem,
	depth: number,
	language: ExportLanguage,
	used: Set<SymbolName>,
): string[] {
	switch (item.action) {
		case 'start':
			return [];

		case 'move-forward':
		case 'turn-left':
		case 'turn-right':
			used.add(item.action);
			return [`${indent(depth)}${statement(`${symbolName(item.action, language)}()`, language)}`];

		case 'for': {
			const letter = loopLetterForDepth(depth);
			const repeatCount = item.count ?? 1;
			const header =
				language === 'c'
					? `for (int ${letter} = 1; ${letter} <= ${repeatCount}; ${letter}++)`
					: language === 'javascript'
						? `for (let ${letter} = 1; ${letter} <= ${repeatCount}; ${letter}++)`
						: `for ${letter} in range(1, ${repeatCount} + 1)`;

			return blockLines(
				header,
				itemsLines(item.children ?? [], depth + 1, language, used),
				depth,
				language,
			);
		}

		case 'while':
			return blockLines(
				conditionHeader('while', whileCondition(language, used), language),
				itemsLines(item.children ?? [], depth + 1, language, used),
				depth,
				language,
			);

		case 'if': {
			const clauses: ConditionalClause[] = [
				{
					condition: item.condition ?? 'path-ahead',
					lines: itemsLines(item.children ?? [], depth + 1, language, used),
				},
			];
			const elseChildren = item.elseChildren ?? [];

			if (elseChildren.length > 0) {
				clauses.push({
					condition: null,
					lines: itemsLines(elseChildren, depth + 1, language, used),
				});
			}

			return chainLines(clauses, depth, language, used);
		}

		case 'switch': {
			const branches = item.branches ?? [];
			const clauses: ConditionalClause[] = [];
			let defaultBranch: (typeof branches)[number] | null = null;

			for (const branch of branches) {
				if (branch.condition === 'default') {
					defaultBranch = branch;
					continue;
				}

				clauses.push({
					condition: branch.condition,
					lines: itemsLines(branch.children, depth + 1, language, used),
				});
			}

			if (clauses.length === 0) {
				return defaultBranch === null
					? []
					: itemsLines(defaultBranch.children, depth, language, used);
			}

			if (defaultBranch !== null) {
				clauses.push({
					condition: null,
					lines: itemsLines(defaultBranch.children, depth + 1, language, used),
				});
			}

			return chainLines(clauses, depth, language, used);
		}
	}
}

type RenderedItem = {
	readonly action: ActionName;
	readonly lines: readonly string[];
};

function isContainerAction(action: ActionName): boolean {
	return action === 'for' || action === 'while' || action === 'if' || action === 'switch';
}

/**
 * Plain actions stay together, and a container is set off by one blank line
 * from whatever precedes or follows it at the same level. Bodies are never
 * padded, so the blank lines mark where a structure begins and ends, and a
 * structure nested as the first or last thing in a body sits flush with it.
 */
function itemsLines(
	items: readonly SequenceItem[],
	depth: number,
	language: ExportLanguage,
	used: Set<SymbolName>,
): string[] {
	const renderedItems: RenderedItem[] = [];

	for (const item of items) {
		const itemBlock = itemLines(item, depth, language, used);

		if (itemBlock.length > 0) {
			renderedItems.push({ action: item.action, lines: itemBlock });
		}
	}

	const lines: string[] = [];

	for (const [index, renderedItem] of renderedItems.entries()) {
		const previousItem = renderedItems[index - 1];

		if (
			previousItem !== undefined &&
			(isContainerAction(previousItem.action) || isContainerAction(renderedItem.action))
		) {
			lines.push('');
		}

		lines.push(...renderedItem.lines);
	}

	return lines;
}

/**
 * A stub for one function the program calls. Actions are `void`; conditions
 * return a falsy value so a pasted file still compiles and runs.
 */
function symbolDefinition(symbol: SymbolName, language: ExportLanguage): string {
	const name = symbolName(symbol, language);

	if (language === 'c') {
		return conditionSymbols.has(symbol) ? `int ${name}() { return 0; }` : `void ${name}() {}`;
	}

	if (language === 'python') {
		return conditionSymbols.has(symbol)
			? `def ${name}():\n${INDENT}return False`
			: `def ${name}():\n${INDENT}pass`;
	}

	return conditionSymbols.has(symbol)
		? `function ${name}() { return false; }`
		: `function ${name}() {}`;
}

/**
 * The functions the program calls get a stub first, so the file is accepted by
 * the sibling C course that expects student code in that shape. C wraps the
 * program in `main`; Python and JavaScript keep the program at the top level.
 */
function exportAlgorithm(sequenceItems: readonly SequenceItem[], language: ExportLanguage): string {
	const used = new Set<SymbolName>();
	const body = itemsLines(sequenceItems, 0, language, used);

	if (body.length === 0) {
		return '';
	}

	const definitionLines = symbolOrder
		.filter((symbol) => used.has(symbol))
		.map((symbol) => symbolDefinition(symbol, language));

	if (language === 'c') {
		const mainText = ['void main() {', ...indentBlock(body), '}'].join('\n');
		return [...definitionLines, mainText].join('\n\n');
	}

	const bodyText = body.join('\n');

	if (definitionLines.length === 0) {
		return bodyText;
	}

	return `${definitionLines.join('\n\n')}\n\n${bodyText}`;
}

export { exportAlgorithm, exportLanguages, exportTargets };
export type { ExportLanguage };
