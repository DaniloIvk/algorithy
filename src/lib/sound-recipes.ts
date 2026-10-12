/** Procedural game sounds: no audio files, no network. */

type SoundTone = {
	readonly wave: 'sine' | 'triangle';
	readonly frequency: number;
	readonly toFrequency?: number;
	readonly offset: number;
	readonly duration: number;
	readonly gain: number;
	readonly timbre?: 'mallet' | 'bell';
};

type SoundNoise = {
	readonly offset: number;
	readonly duration: number;
	readonly gain: number;
	readonly filter: 'lowpass' | 'highpass' | 'bandpass';
	readonly frequency: number;
	readonly toFrequency?: number;
	readonly q?: number;
};

type SoundRecipe = {
	readonly tones?: readonly SoundTone[];
	readonly noise?: readonly SoundNoise[];
};

const soundNames = [
	'won',
	'blocked',
	'not-reached',
	'infinite-loop',
	'hole',
	'lava',
	'run',
	'stop',
	'reset',
	'toast',
	'place',
	'remove',
] as const;

type SoundName = (typeof soundNames)[number];

const SOUND_RECIPES: Readonly<Record<SoundName, SoundRecipe>> = {
	won: {
		noise: [
			{
				offset: 0,
				duration: 0.05,
				gain: 0.35,
				filter: 'lowpass',
				frequency: 1500,
				toFrequency: 700,
				q: 0.8,
			},
		],
		tones: [
			{
				wave: 'triangle',
				frequency: 523.25,
				offset: 0.05,
				duration: 0.3,
				gain: 0.3,
				timbre: 'mallet',
			},
			{
				wave: 'triangle',
				frequency: 659.25,
				offset: 0.14,
				duration: 0.3,
				gain: 0.3,
				timbre: 'mallet',
			},
			{
				wave: 'triangle',
				frequency: 783.99,
				offset: 0.23,
				duration: 0.35,
				gain: 0.3,
				timbre: 'mallet',
			},
			{ wave: 'sine', frequency: 1567.98, offset: 0.23, duration: 0.4, gain: 0.1, timbre: 'bell' },
		],
	},
	blocked: {
		tones: [
			{
				wave: 'sine',
				frequency: 170,
				toFrequency: 110,
				offset: 0,
				duration: 0.16,
				gain: 0.45,
				timbre: 'mallet',
			},
		],
		noise: [
			{
				offset: 0,
				duration: 0.07,
				gain: 0.35,
				filter: 'lowpass',
				frequency: 600,
				toFrequency: 200,
				q: 0.7,
			},
		],
	},
	'not-reached': {
		tones: [
			{
				wave: 'triangle',
				frequency: 659.25,
				offset: 0,
				duration: 0.25,
				gain: 0.26,
				timbre: 'mallet',
			},
			{
				wave: 'triangle',
				frequency: 523.25,
				offset: 0.12,
				duration: 0.32,
				gain: 0.26,
				timbre: 'mallet',
			},
		],
	},
	'infinite-loop': {
		tones: [
			{
				wave: 'triangle',
				frequency: 783.99,
				offset: 0,
				duration: 0.14,
				gain: 0.24,
				timbre: 'mallet',
			},
			{
				wave: 'triangle',
				frequency: 698.46,
				offset: 0.16,
				duration: 0.14,
				gain: 0.24,
				timbre: 'mallet',
			},
			{
				wave: 'triangle',
				frequency: 783.99,
				offset: 0.32,
				duration: 0.18,
				gain: 0.24,
				timbre: 'mallet',
			},
		],
	},
	hole: {
		tones: [
			{ wave: 'sine', frequency: 760, toFrequency: 110, offset: 0, duration: 0.55, gain: 0.45 },
		],
		noise: [
			{
				offset: 0,
				duration: 0.5,
				gain: 0.1,
				filter: 'lowpass',
				frequency: 600,
				toFrequency: 150,
				q: 0.7,
			},
		],
	},
	lava: {
		noise: [
			{
				offset: 0,
				duration: 0.45,
				gain: 0.38,
				filter: 'highpass',
				frequency: 2600,
				toFrequency: 1100,
				q: 0.6,
			},
			{
				offset: 0,
				duration: 0.4,
				gain: 0.24,
				filter: 'lowpass',
				frequency: 700,
				toFrequency: 200,
				q: 0.7,
			},
		],
	},
	run: {
		tones: [
			{ wave: 'triangle', frequency: 880, offset: 0, duration: 0.09, gain: 0.22, timbre: 'mallet' },
		],
	},
	stop: {
		tones: [
			{
				wave: 'triangle',
				frequency: 659.25,
				offset: 0,
				duration: 0.09,
				gain: 0.2,
				timbre: 'mallet',
			},
		],
	},
	reset: {
		tones: [
			{ wave: 'triangle', frequency: 880, offset: 0, duration: 0.08, gain: 0.2, timbre: 'mallet' },
			{
				wave: 'triangle',
				frequency: 587.33,
				offset: 0.07,
				duration: 0.1,
				gain: 0.2,
				timbre: 'mallet',
			},
		],
	},
	toast: {
		tones: [{ wave: 'sine', frequency: 880, offset: 0, duration: 0.4, gain: 0.24, timbre: 'bell' }],
	},
	place: {
		tones: [
			{
				wave: 'triangle',
				frequency: 587.33,
				offset: 0,
				duration: 0.14,
				gain: 0.26,
				timbre: 'mallet',
			},
		],
	},
	remove: {
		noise: [
			{
				offset: 0,
				duration: 0.08,
				gain: 0.28,
				filter: 'lowpass',
				frequency: 2000,
				toFrequency: 500,
				q: 0.8,
			},
		],
	},
};

export { SOUND_RECIPES, soundNames };
export type { SoundName, SoundNoise, SoundRecipe, SoundTone };
