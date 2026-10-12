import ForBlock from './ForBlock';
import WhileBlock from './WhileBlock';
import IfBlock from './IfBlock';
import SwitchBlock from './SwitchBlock';
import MoveForward from './MoveForward';
import TurnLeft from './TurnLeft';
import TurnRight from './TurnRight';
import Start from './Start';
import type { BlockDefinition } from '../schemas/drag.schema';
import type { ActionName } from '../domain/actions';

const forBlockDefinition: BlockDefinition = {
	action: 'for',
	label: 'For loop',
	render: (props) => {
		if (props?.onCountChange) {
			return (
				<ForBlock
					variant='sequence'
					count={props.count ?? 1}
					onCountChange={props.onCountChange}
					depth={0}
				>
					{props.children}
				</ForBlock>
			);
		}
		return <ForBlock variant='palette' />;
	},
};

const whileBlockDefinition: BlockDefinition = {
	action: 'while',
	label: 'While target not reached',
	render: (props) => {
		if (props?.children) {
			return (
				<WhileBlock variant='sequence' depth={0}>
					{props.children}
				</WhileBlock>
			);
		}
		return <WhileBlock variant='palette' />;
	},
};

const switchBlockDefinition: BlockDefinition = {
	action: 'switch',
	label: 'Switch',
	render: () => <SwitchBlock variant='palette' />,
};

const ifBlockDefinition: BlockDefinition = {
	action: 'if',
	label: 'If',
	render: (props) => {
		if (props?.onConditionChange) {
			return (
				<IfBlock
					variant='sequence'
					condition={props.condition ?? 'path-ahead'}
					onConditionChange={props.onConditionChange}
					depth={0}
				>
					{props.children}
				</IfBlock>
			);
		}
		return <IfBlock variant='palette' />;
	},
};

const actions: Readonly<Record<ActionName, BlockDefinition>> = {
	start: { action: 'start', label: 'Start', render: Start },
	'move-forward': { action: 'move-forward', label: 'Move forward', render: MoveForward },
	'turn-right': { action: 'turn-right', label: 'Turn right', render: TurnRight },
	'turn-left': { action: 'turn-left', label: 'Turn left', render: TurnLeft },
	for: forBlockDefinition,
	while: whileBlockDefinition,
	switch: switchBlockDefinition,
	if: ifBlockDefinition,
};

function resolveActions(names: readonly ActionName[]): readonly BlockDefinition[] {
	return names.map((name) => actions[name]);
}

export { actions, forBlockDefinition, whileBlockDefinition, switchBlockDefinition, resolveActions };
