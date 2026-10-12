import { describe, expect, test } from 'bun:test';
import { exportAlgorithm, exportLanguages, exportTargets } from './export-algorithm';
import type { SequenceItem } from '../../schemas/sequence.schema';

type SequenceItemOptions = {
	readonly count?: number;
	readonly condition?: SequenceItem['condition'];
	readonly children?: readonly SequenceItem[];
	readonly elseChildren?: readonly SequenceItem[];
	readonly branches?: SequenceItem['branches'];
};

function createSequenceItem(
	action: SequenceItem['action'],
	options: SequenceItemOptions = {},
): SequenceItem {
	return {
		kind: 'algorithm',
		id: `${action}-item`,
		action,
		label: `${action} label`,
		default: false,
		movable: true,
		...(options.count === undefined ? {} : { count: options.count }),
		...(options.condition === undefined ? {} : { condition: options.condition }),
		...(options.children === undefined ? {} : { children: options.children }),
		...(options.elseChildren === undefined ? {} : { elseChildren: options.elseChildren }),
		...(options.branches === undefined ? {} : { branches: options.branches }),
	};
}

describe('exportAlgorithm', () => {
	test('lists the languages with their file names', () => {
		expect(exportLanguages).toEqual(['c', 'python', 'javascript']);
		expect(exportTargets.c.fileName).toBe('algorithm.c');
		expect(exportTargets.python.fileName).toBe('algorithm.py');
		expect(exportTargets.javascript.fileName).toBe('algorithm.js');
	});

	test('declares a stub per used action and wraps C in main', () => {
		const sequence = [
			createSequenceItem('start'),
			createSequenceItem('move-forward'),
			createSequenceItem('turn-right'),
		];

		expect(exportAlgorithm(sequence, 'c')).toBe(
			[
				'void move_forward() {}',
				'',
				'void turn_right() {}',
				'',
				'void main() {',
				'    move_forward();',
				'    turn_right();',
				'}',
			].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'python')).toBe(
			[
				'def move_forward():',
				'    pass',
				'',
				'def turn_right():',
				'    pass',
				'',
				'move_forward()',
				'turn_right()',
			].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'javascript')).toBe(
			[
				'function moveForward() {}',
				'',
				'function turnRight() {}',
				'',
				'moveForward();',
				'turnRight();',
			].join('\n'),
		);
	});

	test('declares condition stubs only when the program uses them', () => {
		const sequence = [
			createSequenceItem('if', {
				condition: 'path-ahead',
				children: [createSequenceItem('move-forward')],
			}),
		];

		expect(exportAlgorithm(sequence, 'c')).toBe(
			[
				'void move_forward() {}',
				'',
				'int path_ahead() { return 0; }',
				'',
				'void main() {',
				'    if (path_ahead()) {',
				'        move_forward();',
				'    }',
				'}',
			].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'python')).toBe(
			[
				'def move_forward():',
				'    pass',
				'',
				'def path_ahead():',
				'    return False',
				'',
				'if path_ahead():',
				'    move_forward()',
			].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'javascript')).toBe(
			[
				'function moveForward() {}',
				'',
				'function pathAhead() { return false; }',
				'',
				'if (pathAhead()) {',
				'    moveForward();',
				'}',
			].join('\n'),
		);
	});

	test('exports for loops with the block letters and counts', () => {
		const sequence = [
			createSequenceItem('for', {
				count: 3,
				children: [createSequenceItem('move-forward')],
			}),
		];

		expect(exportAlgorithm(sequence, 'c')).toBe(
			[
				'void move_forward() {}',
				'',
				'void main() {',
				'    for (int i = 1; i <= 3; i++) {',
				'        move_forward();',
				'    }',
				'}',
			].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'python')).toBe(
			[
				'def move_forward():',
				'    pass',
				'',
				'for i in range(1, 3 + 1):',
				'    move_forward()',
			].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'javascript')).toBe(
			[
				'function moveForward() {}',
				'',
				'for (let i = 1; i <= 3; i++) {',
				'    moveForward();',
				'}',
			].join('\n'),
		);
	});

	test('labels nested loops like the block UI does', () => {
		const sequence = [
			createSequenceItem('for', {
				count: 2,
				children: [
					createSequenceItem('for', {
						count: 2,
						children: [createSequenceItem('move-forward')],
					}),
				],
			}),
		];

		expect(exportAlgorithm(sequence, 'javascript')).toBe(
			[
				'function moveForward() {}',
				'',
				'for (let i = 1; i <= 2; i++) {',
				'    for (let j = 1; j <= 2; j++) {',
				'        moveForward();',
				'    }',
				'}',
			].join('\n'),
		);
	});

	test('sets containers off by one blank line from neighbouring code', () => {
		const sequence = [
			createSequenceItem('move-forward'),
			createSequenceItem('turn-right'),
			createSequenceItem('for', {
				count: 2,
				children: [createSequenceItem('move-forward')],
			}),
			createSequenceItem('move-forward'),
			createSequenceItem('turn-left'),
		];

		expect(exportAlgorithm(sequence, 'javascript')).toBe(
			[
				'function moveForward() {}',
				'',
				'function turnLeft() {}',
				'',
				'function turnRight() {}',
				'',
				'moveForward();',
				'turnRight();',
				'',
				'for (let i = 1; i <= 2; i++) {',
				'    moveForward();',
				'}',
				'',
				'moveForward();',
				'turnLeft();',
			].join('\n'),
		);
	});

	test('does not pad body edges but separates nested structures', () => {
		const sequence = [
			createSequenceItem('for', {
				count: 2,
				children: [
					createSequenceItem('for', {
						count: 2,
						children: [createSequenceItem('move-forward')],
					}),
					createSequenceItem('turn-right'),
				],
			}),
		];

		expect(exportAlgorithm(sequence, 'python')).toBe(
			[
				'def move_forward():',
				'    pass',
				'',
				'def turn_right():',
				'    pass',
				'',
				'for i in range(1, 2 + 1):',
				'    for j in range(1, 2 + 1):',
				'        move_forward()',
				'',
				'    turn_right()',
			].join('\n'),
		);
	});

	test('exports while as repeating until the target is reached', () => {
		const sequence = [
			createSequenceItem('while', { children: [createSequenceItem('move-forward')] }),
		];

		expect(exportAlgorithm(sequence, 'c')).toBe(
			[
				'void move_forward() {}',
				'',
				'int target_reached() { return 0; }',
				'',
				'void main() {',
				'    while (!target_reached()) {',
				'        move_forward();',
				'    }',
				'}',
			].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'python')).toBe(
			[
				'def move_forward():',
				'    pass',
				'',
				'def target_reached():',
				'    return False',
				'',
				'while not target_reached():',
				'    move_forward()',
			].join('\n'),
		);
	});

	test('exports if blocks with an optional else', () => {
		const withoutElse = [
			createSequenceItem('if', {
				condition: 'path-ahead',
				children: [createSequenceItem('move-forward')],
			}),
		];
		const withElse = [
			createSequenceItem('if', {
				condition: 'path-ahead',
				children: [createSequenceItem('move-forward')],
				elseChildren: [createSequenceItem('turn-right')],
			}),
		];

		expect(exportAlgorithm(withoutElse, 'javascript')).toBe(
			[
				'function moveForward() {}',
				'',
				'function pathAhead() { return false; }',
				'',
				'if (pathAhead()) {',
				'    moveForward();',
				'}',
			].join('\n'),
		);
		expect(exportAlgorithm(withElse, 'javascript')).toBe(
			[
				'function moveForward() {}',
				'',
				'function turnRight() {}',
				'',
				'function pathAhead() { return false; }',
				'',
				'if (pathAhead()) {',
				'    moveForward();',
				'} else {',
				'    turnRight();',
				'}',
			].join('\n'),
		);
		expect(exportAlgorithm(withElse, 'python')).toBe(
			[
				'def move_forward():',
				'    pass',
				'',
				'def turn_right():',
				'    pass',
				'',
				'def path_ahead():',
				'    return False',
				'',
				'if path_ahead():',
				'    move_forward()',
				'else:',
				'    turn_right()',
			].join('\n'),
		);
	});

	test('exports switch branches as an if / else-if / else chain', () => {
		const sequence = [
			createSequenceItem('switch', {
				branches: [
					{ condition: 'path-left', children: [createSequenceItem('turn-left')] },
					{ condition: 'path-right', children: [createSequenceItem('turn-right')] },
					{ condition: 'default', children: [createSequenceItem('move-forward')] },
				],
			}),
		];

		expect(exportAlgorithm(sequence, 'javascript')).toBe(
			[
				'function moveForward() {}',
				'',
				'function turnLeft() {}',
				'',
				'function turnRight() {}',
				'',
				'function pathLeft() { return false; }',
				'',
				'function pathRight() { return false; }',
				'',
				'if (pathLeft()) {',
				'    turnLeft();',
				'} else if (pathRight()) {',
				'    turnRight();',
				'} else {',
				'    moveForward();',
				'}',
			].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'python')).toBe(
			[
				'def move_forward():',
				'    pass',
				'',
				'def turn_left():',
				'    pass',
				'',
				'def turn_right():',
				'    pass',
				'',
				'def path_left():',
				'    return False',
				'',
				'def path_right():',
				'    return False',
				'',
				'if path_left():',
				'    turn_left()',
				'elif path_right():',
				'    turn_right()',
				'else:',
				'    move_forward()',
			].join('\n'),
		);
	});

	test('fills empty blocks with pass or empty braces', () => {
		const sequence = [createSequenceItem('while', { children: [] })];

		expect(exportAlgorithm(sequence, 'c')).toBe(
			[
				'int target_reached() { return 0; }',
				'',
				'void main() {',
				'    while (!target_reached()) {',
				'    }',
				'}',
			].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'python')).toBe(
			[
				'def target_reached():',
				'    return False',
				'',
				'while not target_reached():',
				'    pass',
			].join('\n'),
		);
	});

	test('exercises a loop that calls nothing while still wrapping C', () => {
		const sequence = [createSequenceItem('for', { count: 2, children: [] })];

		expect(exportAlgorithm(sequence, 'python')).toBe(
			['for i in range(1, 2 + 1):', '    pass'].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'javascript')).toBe(
			['for (let i = 1; i <= 2; i++) {', '}'].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'c')).toBe(
			['void main() {', '    for (int i = 1; i <= 2; i++) {', '    }', '}'].join('\n'),
		);
	});

	test('exports an empty program as an empty script', () => {
		expect(exportAlgorithm([createSequenceItem('start')], 'python')).toBe('');
		expect(exportAlgorithm([createSequenceItem('start')], 'c')).toBe('');
	});

	test('unwraps a switch that only has a default branch', () => {
		const sequence = [
			createSequenceItem('switch', {
				branches: [{ condition: 'default', children: [createSequenceItem('move-forward')] }],
			}),
		];

		expect(exportAlgorithm(sequence, 'python')).toBe(
			['def move_forward():', '    pass', '', 'move_forward()'].join('\n'),
		);
		expect(exportAlgorithm(sequence, 'c')).toBe(
			['void move_forward() {}', '', 'void main() {', '    move_forward();', '}'].join('\n'),
		);
	});

	test('exports a switch with no branches as nothing', () => {
		const sequence = [createSequenceItem('switch', { branches: [] })];

		expect(exportAlgorithm(sequence, 'javascript')).toBe('');
	});
});
