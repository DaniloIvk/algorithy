import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { safeParse } from 'valibot';
import {
	countBlocks,
	countExecutedCycles,
	formatCycles,
	runSequence,
	toSimulationSequence,
} from '../domain/simulation';
import { LevelSchema } from './level.schema';

function getTargetFilePaths(): readonly string[] {
	const environmentPath = process.env['LEVEL_PATH'];

	if (environmentPath !== undefined && environmentPath !== '') {
		const resolvedPath = resolve(environmentPath);

		return [resolvedPath];
	}

	const allArguments: string[] = [...process.argv];

	if (typeof Bun !== 'undefined' && Bun.argv !== undefined) {
		for (const argument of Bun.argv) {
			if (typeof argument === 'string') {
				allArguments.push(argument);
			}
		}
	}

	const argumentPath = allArguments.find((argument) => {
		return typeof argument === 'string' && argument.endsWith('.json');
	});

	if (argumentPath !== undefined) {
		const resolvedPath = resolve(argumentPath);

		return [resolvedPath];
	}

	const levelArgument = allArguments.find((argument) => {
		return typeof argument === 'string' && argument.startsWith('--level=');
	});

	if (levelArgument !== undefined) {
		const pathValue = levelArgument.slice('--level='.length);
		const resolvedPath = resolve(pathValue);

		return [resolvedPath];
	}

	const levelsDirectoryFromMeta = resolve(join(import.meta.dir, '..', 'levels'));

	let levelsDirectory = levelsDirectoryFromMeta;

	try {
		readdirSync(levelsDirectory);
	} catch {
		levelsDirectory = resolve(join(process.cwd(), 'src', 'levels'));

		try {
			readdirSync(levelsDirectory);
		} catch {
			levelsDirectory = resolve(join(process.cwd(), 'apps', 'app', 'src', 'levels'));
		}
	}

	const fileNames = readdirSync(levelsDirectory);
	const levelFileNames = fileNames.filter((fileName) => {
		return fileName.startsWith('Level') && fileName.endsWith('.json');
	});

	const fullPaths = levelFileNames.map((fileName) => {
		return join(levelsDirectory, fileName);
	});

	fullPaths.sort();

	return fullPaths;
}

function readJsonFile(filePath: string): unknown {
	const fileContent = readFileSync(filePath, 'utf-8');
	const parsedData: unknown = JSON.parse(fileContent);

	return parsedData;
}

describe('level optimalSolution', () => {
	const targetFilePaths = getTargetFilePaths();

	for (const filePath of targetFilePaths) {
		test(`validates ${filePath}`, () => {
			const rawData: unknown = readJsonFile(filePath);
			const parsedResult = safeParse(LevelSchema, rawData);

			if (parsedResult.success === false) {
				const firstIssue = parsedResult.issues[0];

				if (firstIssue !== undefined) {
					throw new Error(`Schema failed for ${filePath}: ${firstIssue.message}`);
				}

				throw new Error(`Schema failed for ${filePath}`);
			}

			const levelData = parsedResult.output;
			const simulationSequence = toSimulationSequence(levelData.optimalSolution);
			const startState = {
				x: levelData.player.x,
				y: levelData.player.y,
				direction: levelData.player.direction,
			};

			const runResult = runSequence(simulationSequence, levelData, startState);

			expect(runResult.outcome).toBe('won');

			const blockCount = countBlocks(simulationSequence);

			expect(blockCount).toBe(levelData.optimalActionCount);

			const executedCycles = countExecutedCycles(simulationSequence, levelData, startState);

			expect(executedCycles).toBe(levelData.optimalIterations);

			const formattedCycles = formatCycles(executedCycles);

			expect(formattedCycles.includes('e')).toBe(false);
			expect(formattedCycles.includes('E')).toBe(false);
		});
	}
});
