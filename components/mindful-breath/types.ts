export type LoopPlaybackConfig = { type: "loop" };

export type RandomSlicePlaybackConfig = {
	type: "randomSlice";
	minRatio: number;
	maxRatio?: number;
	fadeDuration: number;
	scheduleAhead?: number;
};

export type PlaybackConfig = LoopPlaybackConfig | RandomSlicePlaybackConfig;

export type ModePhases = {
	inhale: number;
	hold1: number;
	exhale: number;
	hold2: number;
};

export type Mode = {
	key: string;
	name: string;
	note: string;
	gradient: string;
	phases: ModePhases;
	prompts?: Partial<Record<keyof ModePhases, string>>;
};

export type AmbientTrack = {
	key: string;
	label: string;
	file: string;
	gain: number;
	playback?: PlaybackConfig;
};

export type PhaseKey = keyof Mode["phases"];

export type ActiveSoundKey = AmbientTrack["key"];

export type SoundKey = "off" | ActiveSoundKey;
