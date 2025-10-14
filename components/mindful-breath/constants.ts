import type {
	AmbientTrack,
	Mode,
	PhaseKey,
	SoundKey,
} from "./types";

export const MODES: readonly Mode[] = [
	{
		key: "equal",
		name: "Even Flow (5-5)",
		note: "Cultivate a gentle balance",
		gradient: "from-cyan-400 to-emerald-500",
		phases: { inhale: 5, hold1: 0, exhale: 5, hold2: 0 },
		prompts: {
			inhale: "Lengthen through the crown of your head as the breath rises.",
			exhale: "Let your shoulders melt away from your ears.",
			hold2: "Notice the quiet space before the next inhale.",
		},
	},
	{
		key: "box",
		name: "Box Rhythm (4-4-4-4)",
		note: "Settle into steady focus",
		gradient: "from-violet-400 to-fuchsia-500",
		phases: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
		prompts: {
			inhale: "Trace the first side of your box from belly to collarbones.",
			hold1: "Hover in the pause and rest awareness behind your heart.",
			exhale: "Release down the next side, softening the muscles around your eyes.",
			hold2: "Feel both feet grounded as you complete the square.",
		},
	},
	{
		key: "478",
		name: "4-7-8 Calm",
		note: "Invite deep rest",
		gradient: "from-sky-400 to-indigo-500",
		phases: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
		prompts: {
			inhale: "Draw breath low and wide into the belly.",
			hold1: "Unclench your jaw and rest the tongue behind your teeth.",
			exhale: "Let the out-breath spill out like a long whisper.",
		},
	},
	{
		key: "resonance",
		name: "Resonant Wave (~6 bpm)",
		note: "Sync with heart coherence",
		gradient: "from-rose-400 to-orange-500",
		phases: { inhale: 5, hold1: 0, exhale: 5, hold2: 0 },
		prompts: {
			inhale: "Imagine a gentle wave lifting through your ribs.",
			exhale: "Ride the wave back down, softening the chest.",
			hold2: "Sense your heartbeat settling into the rhythm.",
		},
	},
] as const;

export const AMBIENT_TRACKS: readonly AmbientTrack[] = [
	{
		key: "oceanWaves",
		label: "Ocean Waves",
		file: "/audio/ocean-waves.mp3",
		gain: 1,
		playback: {
			type: "randomSlice",
			minRatio: 0.5,
			maxRatio: 0.75,
			fadeDuration: 0.08,
			scheduleAhead: 4,
		},
	},
	{
		key: "rainCarRoof",
		label: "Rain on Car Roof",
		file: "/audio/rain-car-roof.mp3",
		gain: 1,
		playback: {
			type: "randomSlice",
			minRatio: 0.5,
			maxRatio: 0.8,
			fadeDuration: 0.08,
			scheduleAhead: 4,
		},
	},
	{
		key: "lightRain",
		label: "Light Rain",
		file: "/audio/light-rain.mp3",
		gain: 1,
		playback: {
			type: "randomSlice",
			minRatio: 0.5,
			maxRatio: 0.8,
			fadeDuration: 0.08,
			scheduleAhead: 3,
		},
	},
	{
		key: "calmRiver",
		label: "Calm River",
		file: "/audio/calm-river.mp3",
		gain: 1,
		playback: {
			type: "randomSlice",
			minRatio: 0.5,
			maxRatio: 0.75,
			fadeDuration: 0.08,
			scheduleAhead: 4,
		},
	},
	{
		key: "countryside",
		label: "Countryside",
		file: "/audio/countryside.mp3",
		gain: 1,
		playback: {
			type: "randomSlice",
			minRatio: 0.5,
			maxRatio: 0.78,
			fadeDuration: 0.08,
			scheduleAhead: 4,
		},
	},
] as const;

export const SOUNDS: readonly [{ key: "off"; label: "Mute" }, ...readonly AmbientTrack[]] =
	[{ key: "off", label: "Mute" }, ...AMBIENT_TRACKS] as const;

export const ORDER: readonly PhaseKey[] = ["inhale", "hold1", "exhale", "hold2"];

export const LABEL: Readonly<Record<PhaseKey, string>> = {
	inhale: "Inhale",
	hold1: "Hold (Full)",
	exhale: "Exhale",
	hold2: "Hold (Empty)",
} as const;

export const DEFAULT_MODE_INDEX = 1;
export const DEFAULT_VOLUME = 0.25;
export const DEFAULT_SOUND_KEY = (AMBIENT_TRACKS[0]?.key ?? "off") as SoundKey;

export const AUDIO_CONTEXT_CLOSE_DELAY = 0.35;
export const FADE_TAU = 0.05;
export const STOP_DELAY = 0.12;
export const MASTER_FADE_TAU = 0.2;

export const SESSION_PRESETS = [
	{ key: "2m", label: "2 min", duration: 120 },
	{ key: "3m", label: "3 min", duration: 180 },
	{ key: "4m", label: "4 min", duration: 240 },
	{ key: "5m", label: "5 min", duration: 300 },
] as const;

export const DEFAULT_SESSION_PRESET = SESSION_PRESETS[1] ?? SESSION_PRESETS[0];
export const DEFAULT_SESSION_DURATION =
	DEFAULT_SESSION_PRESET?.duration ?? 180;
