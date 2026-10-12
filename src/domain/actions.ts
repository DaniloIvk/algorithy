const actionNames = [
	'start',
	'move-forward',
	'turn-right',
	'turn-left',
	'for',
	'if',
	'while',
	'switch',
] as const;

type ActionName = (typeof actionNames)[number];

export { actionNames };
export type { ActionName };
