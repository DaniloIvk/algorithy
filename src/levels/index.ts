import Level1 from './Level1.json';
import Level2 from './Level2.json';
import Level3 from './Level3.json';
import Level4 from './Level4.json';
import Level5 from './Level5.json';
import Level6 from './Level6.json';
import Level7 from './Level7.json';
import Level8 from './Level8.json';
import Level9 from './Level9.json';
import Level10 from './Level10.json';
import Level11 from './Level11.json';
import Level12 from './Level12.json';
import Level13 from './Level13.json';
import Level14 from './Level14.json';
import Level15 from './Level15.json';
import Level16 from './Level16.json';
import Level17 from './Level17.json';
import Level18 from './Level18.json';
import Level19 from './Level19.json';
import Level20 from './Level20.json';

type LevelModule = { readonly default: unknown };

// Static registry of level modules. `domain/level.ts` consumes this; add an
// import and an entry here when adding a `LevelN.json`.
const levelModules: Record<string, LevelModule> = {
	'Level1.json': { default: Level1 },
	'Level2.json': { default: Level2 },
	'Level3.json': { default: Level3 },
	'Level4.json': { default: Level4 },
	'Level5.json': { default: Level5 },
	'Level6.json': { default: Level6 },
	'Level7.json': { default: Level7 },
	'Level8.json': { default: Level8 },
	'Level9.json': { default: Level9 },
	'Level10.json': { default: Level10 },
	'Level11.json': { default: Level11 },
	'Level12.json': { default: Level12 },
	'Level13.json': { default: Level13 },
	'Level14.json': { default: Level14 },
	'Level15.json': { default: Level15 },
	'Level16.json': { default: Level16 },
	'Level17.json': { default: Level17 },
	'Level18.json': { default: Level18 },
	'Level19.json': { default: Level19 },
	'Level20.json': { default: Level20 },
};

export { levelModules };
