import type { Child } from 'hono/jsx';
import type { JSX } from 'hono/jsx/dom/jsx-runtime';
import type { ActionName } from '../domain/actions';
import type { ConditionName } from '../domain/conditions';

type BlockDefinition = {
	readonly action: ActionName;
	readonly label: string;
	readonly render: (props?: {
		count?: number;
		condition?: ConditionName;
		grayed?: boolean;
		onCountChange?: (count: number) => void;
		onConditionChange?: (condition: ConditionName) => void;
		children?: Child;
		elseChildren?: Child;
	}) => JSX.Element;
};

export type { BlockDefinition };
