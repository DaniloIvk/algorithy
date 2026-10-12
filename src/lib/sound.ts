import { parseSoundMuted } from '../schemas/sound.schema';
import {
	SOUND_RECIPES,
	type SoundName,
	type SoundNoise,
	type SoundRecipe,
	type SoundTone,
} from './sound-recipes';

/** The audio side of the game: synthesised Web Audio, quiet and additive. */

const SOUND_STORAGE_KEY = 'algorithy:sound-muted';
const MASTER_GAIN = 0.28;
const ATTACK_SECONDS = 0.006;
const MASTER_LOWPASS_HZ = 9000;
const REVERB_MIX = 0.2;
const REVERB_SECONDS = 0.9;
const RELEASE_TAIL_SECONDS = 0.02;
const SILENCE = 0.0001;

type SoundPartial = {
	readonly ratio: number;
	readonly gain: number;
	readonly decay: number;
};

const MALLET_PARTIALS: readonly SoundPartial[] = [
	{ ratio: 3.01, gain: 0.22, decay: 0.5 },
	{ ratio: 6.2, gain: 0.08, decay: 0.3 },
];

const BELL_PARTIALS: readonly SoundPartial[] = [
	{ ratio: 2, gain: 0.28, decay: 0.8 },
	{ ratio: 3.01, gain: 0.14, decay: 0.55 },
	{ ratio: 4.2, gain: 0.07, decay: 0.35 },
];

let sharedContext: AudioContext | null = null;
let sharedNoiseBuffer: AudioBuffer | null = null;
let sharedReverbBuffer: AudioBuffer | null = null;

function isSoundMuted(): boolean {
	try {
		const raw = localStorage.getItem(SOUND_STORAGE_KEY);
		if (raw === null) {
			return false;
		}
		return parseSoundMuted(JSON.parse(raw)) ?? false;
	} catch {
		return false;
	}
}

function setSoundMuted(muted: boolean): void {
	try {
		localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(muted));
	} catch {
		// Storage blocked; the toggle still works for this page.
	}
}

function getAudioContext(): AudioContext | null {
	if (typeof globalThis.AudioContext === 'undefined') {
		return null;
	}
	if (sharedContext === null) {
		sharedContext = new globalThis.AudioContext();
	}
	if (sharedContext.state === 'suspended') {
		void sharedContext.resume();
	}
	return sharedContext;
}

function getNoiseBuffer(context: AudioContext): AudioBuffer {
	if (sharedNoiseBuffer === null) {
		const length = Math.floor(context.sampleRate);
		const buffer = context.createBuffer(1, length, context.sampleRate);
		const data = buffer.getChannelData(0);
		for (let index = 0; index < length; index += 1) {
			data[index] = Math.random() * 2 - 1;
		}
		sharedNoiseBuffer = buffer;
	}
	return sharedNoiseBuffer;
}

function getReverbBuffer(context: AudioContext): AudioBuffer {
	if (sharedReverbBuffer === null) {
		const length = Math.floor(context.sampleRate * REVERB_SECONDS);
		const buffer = context.createBuffer(2, length, context.sampleRate);
		for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
			const data = buffer.getChannelData(channel);
			for (let index = 0; index < length; index += 1) {
				const decay = (1 - index / length) ** 2.5;
				data[index] = (Math.random() * 2 - 1) * decay;
			}
		}
		sharedReverbBuffer = buffer;
	}
	return sharedReverbBuffer;
}

function envelope(gain: GainNode, peak: number, start: number, end: number): void {
	const value = Math.max(peak, SILENCE);
	gain.gain.setValueAtTime(SILENCE, start);
	gain.gain.exponentialRampToValueAtTime(value, start + ATTACK_SECONDS);
	gain.gain.exponentialRampToValueAtTime(SILENCE, end);
}

function playOscillator(
	context: AudioContext,
	destination: AudioNode,
	wave: OscillatorType,
	frequency: number,
	toFrequency: number | undefined,
	start: number,
	end: number,
	gainValue: number,
): void {
	const oscillator = context.createOscillator();
	const gain = context.createGain();

	oscillator.type = wave;
	oscillator.frequency.setValueAtTime(frequency, start);
	if (toFrequency !== undefined) {
		oscillator.frequency.exponentialRampToValueAtTime(toFrequency, end);
	}
	envelope(gain, gainValue, start, end);
	oscillator.connect(gain);
	gain.connect(destination);
	oscillator.start(start);
	oscillator.stop(end + RELEASE_TAIL_SECONDS);
}

function partialsFor(timbre: SoundTone['timbre']): readonly SoundPartial[] {
	if (timbre === 'mallet') {
		return MALLET_PARTIALS;
	}
	if (timbre === 'bell') {
		return BELL_PARTIALS;
	}
	return [];
}

function playTone(
	context: AudioContext,
	destination: AudioNode,
	tone: SoundTone,
	start: number,
): void {
	const toneStart = start + tone.offset;
	const toneEnd = toneStart + tone.duration;

	playOscillator(
		context,
		destination,
		tone.wave,
		tone.frequency,
		tone.toFrequency,
		toneStart,
		toneEnd,
		tone.gain,
	);

	for (const partial of partialsFor(tone.timbre)) {
		const partialEnd = toneStart + tone.duration * partial.decay;
		playOscillator(
			context,
			destination,
			'sine',
			tone.frequency * partial.ratio,
			undefined,
			toneStart,
			partialEnd,
			tone.gain * partial.gain,
		);
	}
}

function playNoise(
	context: AudioContext,
	destination: AudioNode,
	noise: SoundNoise,
	start: number,
): void {
	const noiseStart = start + noise.offset;
	const noiseEnd = noiseStart + noise.duration;
	const source = context.createBufferSource();
	const filter = context.createBiquadFilter();
	const gain = context.createGain();

	source.buffer = getNoiseBuffer(context);
	filter.type = noise.filter;
	filter.frequency.setValueAtTime(noise.frequency, noiseStart);
	filter.Q.value = noise.q ?? 1;
	if (noise.toFrequency !== undefined) {
		filter.frequency.exponentialRampToValueAtTime(noise.toFrequency, noiseEnd);
	}
	envelope(gain, noise.gain, noiseStart, noiseEnd);
	source.connect(filter);
	filter.connect(gain);
	gain.connect(destination);
	source.start(noiseStart, Math.random() * 0.5, noise.duration);
	source.stop(noiseEnd + RELEASE_TAIL_SECONDS);
}

function scheduleRecipe(context: AudioContext, recipe: SoundRecipe): void {
	const start = context.currentTime + 0.01;
	const master = context.createGain();
	master.gain.value = MASTER_GAIN;
	const softener = context.createBiquadFilter();
	softener.type = 'lowpass';
	softener.frequency.value = MASTER_LOWPASS_HZ;
	softener.Q.value = 0.5;
	master.connect(softener);
	softener.connect(context.destination);

	const reverb = context.createConvolver();
	reverb.buffer = getReverbBuffer(context);
	const reverbSend = context.createGain();
	reverbSend.gain.value = REVERB_MIX;
	master.connect(reverbSend);
	reverbSend.connect(reverb);
	reverb.connect(context.destination);

	for (const tone of recipe.tones ?? []) {
		playTone(context, master, tone, start);
	}
	for (const noise of recipe.noise ?? []) {
		playNoise(context, master, noise, start);
	}
}

function playSound(name: SoundName): void {
	if (isSoundMuted()) {
		return;
	}
	try {
		const context = getAudioContext();
		if (context === null) {
			return;
		}
		scheduleRecipe(context, SOUND_RECIPES[name]);
	} catch {
		// A missing or broken AudioContext must never break play.
	}
}

export { SOUND_STORAGE_KEY, isSoundMuted, playSound, setSoundMuted };
